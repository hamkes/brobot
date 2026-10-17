const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { Warn } = require('../../db');
const modlog = require('../../systems/modlog');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clearwarns')
    .setDescription('Clear all active warnings for a member')
    
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) =>
      opt.setName('user').setDescription('The member whose warnings to clear')
        .setRequired(true)),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');

    const result = await Warn.updateMany(
      { guildId: interaction.guild.id, userId: targetUser.id, active: true },
      { active: false, clearedAt: new Date(), clearedBy: interaction.user.id }
    );

    if (!result.modifiedCount) {
      return interaction.reply({ embeds: [errorEmbed(`**${targetUser.tag}** has no active warnings.`)], flags: MessageFlags.Ephemeral });
    }

    await modlog.recordModAction({
      guild: interaction.guild,
      guildId: interaction.guild.id,
      action: 'clearwarns',
      targetId: targetUser.id,
      targetTag: targetUser.tag,
      moderatorId: interaction.user.id,
      moderatorTag: interaction.user.tag,
      reason: `Cleared ${result.modifiedCount} warning(s)`,
      source: 'slash'
    });

    await interaction.reply({ embeds: [successEmbed(`Cleared **${result.modifiedCount}** warning(s) for **${targetUser.tag}**.`)] });
  }
};
