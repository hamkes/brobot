const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { Economy } = require('../../db');
const config = require('../../config');
const { errorEmbed, formatDuration } = require('../../utils/helpers');

/**
 * /daily — BroBot's daily credits claim (original economy loop).
 *
 * One claim per UTC calendar day. Keeping the streak alive (claiming on
 * consecutive days) grows a small bonus, so regulars earn a little more
 * without any paid tiers:
 *   reward = BASE + random(0..RANDOM_SPREAD) + min(streak, CAP) * STREAK_STEP
 */
const BASE = 500;
const RANDOM_SPREAD = 250;
const STREAK_STEP = 50;
const STREAK_BONUS_CAP = 20; // streak days counted toward the bonus

function startOfUtcDay(date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily credits (streaks earn a bonus)'),

  async execute(interaction) {
    const now = new Date();
    const today = startOfUtcDay(now);

    const doc = await Economy.findOne({ guildId: interaction.guild.id, userId: interaction.user.id });

    if (doc?.lastDailyAt && startOfUtcDay(new Date(doc.lastDailyAt)) === today) {
      const nextClaimIn = Math.ceil((today + 24 * 60 * 60 * 1000 - now.getTime()) / 1000);
      return interaction.reply({
        embeds: [errorEmbed(`You already claimed today's credits. Come back in **${formatDuration(nextClaimIn)}**.`)],
        flags: MessageFlags.Ephemeral
      });
    }

    const yesterday = today - 24 * 60 * 60 * 1000;
    const streakContinues = doc?.lastDailyAt && startOfUtcDay(new Date(doc.lastDailyAt)) === yesterday;
    const streak = streakContinues ? (doc.dailyStreak || 0) + 1 : 1;

    const bonus = Math.min(streak, STREAK_BONUS_CAP) * STREAK_STEP;
    const reward = BASE + Math.floor(Math.random() * (RANDOM_SPREAD + 1)) + bonus;

    const updated = await Economy.findOneAndUpdate(
      { guildId: interaction.guild.id, userId: interaction.user.id },
      { $inc: { credits: reward }, $set: { lastDailyAt: now, dailyStreak: streak } },
      { upsert: true, new: true }
    );

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL({ size: 128 }) })
      .setDescription(
        `💳 You claimed **${reward.toLocaleString()}** credits!\n` +
        `🔥 Daily streak: **${streak}** day${streak === 1 ? '' : 's'} • Balance: **${updated.credits.toLocaleString()}** credits.`
      )
      .setFooter({ text: '✨ Brobot • Daily' });

    await interaction.reply({ embeds: [embed] });
  }
};
