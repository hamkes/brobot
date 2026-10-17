const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const modlog = require('../../systems/modlog');
const { errorEmbed, successEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user by ID')
    
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption((opt) =>
      opt.setName('user_id').setDescription('The ID of the banned user')
        .setRequired(true))
    .addStringOption((opt) =>
      opt.setName('reason').setDescription('Reason')
        .setMaxLength(500)),

  async execute(interaction) {
    const userId = interaction.options.getString('user_id').trim();
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!/^\d{17,20}$/.test(userId)) {
      return interaction.reply({ embeds: [errorEmbed('Please provide a valid user ID.')], flags: MessageFlags.Ephemeral });
    }

    const ban = await interaction.guild.bans.fetch(userId).catch(() => null);
    if (!ban) {
      return interaction.reply({ embeds: [errorEmbed('That user is not banned.')], flags: MessageFlags.Ephemeral });
    }

    await interaction.guild.bans.remove(userId, `${interaction.user.tag}: ${reason}`).catch(() => null);

    await modlog.recordModAction({
      guild: interaction.guild,
      guildId: interaction.guild.id,
      action: 'unban',
      targetId: userId,
      targetTag: ban.user.tag,
      moderatorId: interaction.user.id,
      moderatorTag: interaction.user.tag,
      reason,
      source: 'slash'
    });

    await interaction.reply({ embeds: [successEmbed(`♻️ **${ban.user.tag}** has been unbanned.`)] });
  }
};
