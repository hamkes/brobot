const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const modlog = require('../../systems/modlog');
const { errorEmbed, successEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Remove a timeout from a member')
    
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) =>
      opt.setName('user').setDescription('The member to unmute')
        .setRequired(true))
    .addStringOption((opt) =>
      opt.setName('reason').setDescription('Reason')
        .setMaxLength(500)),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!member) {
      return interaction.reply({ embeds: [errorEmbed('That user is not in this server.')], flags: MessageFlags.Ephemeral });
    }
    if (!member.isCommunicationDisabled()) {
      return interaction.reply({ embeds: [errorEmbed('That member is not muted.')], flags: MessageFlags.Ephemeral });
    }

    await member.timeout(null, `${interaction.user.tag}: ${reason}`).catch(() => null);

    await modlog.recordModAction({
      guild: interaction.guild,
      guildId: interaction.guild.id,
      action: 'untimeout',
      targetId: targetUser.id,
      targetTag: targetUser.tag,
      moderatorId: interaction.user.id,
      moderatorTag: interaction.user.tag,
      reason,
      source: 'slash'
    });

    await interaction.reply({ embeds: [successEmbed(`🔊 **${targetUser.tag}** has been unmuted.`)] });
  }
};
