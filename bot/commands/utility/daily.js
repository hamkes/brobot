const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const config = require('../../config');
const { errorEmbed, formatDuration } = require('../../utils/helpers');
const { claimDaily } = require('../../systems/economyService');

/**
 * /daily — BroBot's daily credits claim.
 * The claim logic itself lives in systems/economyService so the web
 * dashboard's daily button and this command can never drift apart.
 */
module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily credits (streaks earn a bonus)'),

  async execute(interaction) {
    const result = await claimDaily(interaction.guild.id, interaction.user.id);

    if (!result.ok) {
      return interaction.reply({
        embeds: [errorEmbed(`You already claimed today's credits. Come back in **${formatDuration(result.nextClaimInSeconds)}**.`)],
        flags: MessageFlags.Ephemeral
      });
    }

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL({ size: 128 }) })
      .setDescription(
        `💳 You claimed **${result.reward.toLocaleString()}** credits!\n` +
        `🔥 Daily streak: **${result.streak}** day${result.streak === 1 ? '' : 's'} • Balance: **${result.balance.toLocaleString()}** credits.`
      )
      .setFooter({ text: '✨ Brobot • Daily' });

    await interaction.reply({ embeds: [embed] });
  }
};
