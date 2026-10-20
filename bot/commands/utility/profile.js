const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Level, Economy } = require('../../db');
const config = require('../../config');
const { levelFromXp } = require('../../systems/leveling');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Show a member profile card')
    .addUserOption((opt) =>
      opt.setName('user').setDescription('Member to show (default: you)')),

  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    await interaction.deferReply();

    const [levelDoc, economyDoc, higherCount] = await Promise.all([
      Level.findOne({ guildId: interaction.guild.id, userId: user.id }).lean(),
      Economy.findOne({ guildId: interaction.guild.id, userId: user.id }).lean(),
      Level.countDocuments({ guildId: interaction.guild.id, xp: { $gt: 0 } })
    ]);

    const xp = levelDoc?.xp || 0;
    const { level, progress, needed } = levelFromXp(xp);
    const rank = xp > 0 ? (await Level.countDocuments({ guildId: interaction.guild.id, xp: { $gt: xp } })) + 1 : null;

    const voiceXp = levelDoc?.voiceXp || 0;
    const voiceLevel = levelFromXp(voiceXp).level;
    const title = economyDoc?.title?.trim();

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ size: 256 }) })
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: '📊 Level', value: `**${level}**`, inline: true },
        { name: '✨ XP', value: `${progress.toLocaleString()} / ${needed.toLocaleString()}`, inline: true },
        { name: '🏆 Rank', value: rank ? `#${rank} / ${higherCount}` : 'Unranked', inline: true },
        { name: '🎙️ Voice Level', value: `**${voiceLevel}** • ${(levelDoc?.totalVoiceMinutes || 0).toLocaleString()} min`, inline: true },
        { name: '💳 Credits', value: (economyDoc?.credits || 0).toLocaleString(), inline: true },
        { name: '⭐ Reps', value: (economyDoc?.reps || 0).toLocaleString(), inline: true },
        { name: '🎯 Points', value: (economyDoc?.points || 0).toLocaleString(), inline: true },
        { name: '🔥 Daily streak', value: `${(economyDoc?.dailyStreak || 0).toLocaleString()} day${(economyDoc?.dailyStreak || 0) === 1 ? '' : 's'}`, inline: true }
      )
      .setFooter({ text: `✨ Brobot • ${interaction.guild.name}` });

    if (title) embed.setDescription(`✨ *${title}*`);

    await interaction.editReply({ embeds: [embed] });
  }
};
