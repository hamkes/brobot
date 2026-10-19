const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { canModerate, errorEmbed, successEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vkick')
    .setDescription('Kick a member from a voice channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
    .addUserOption((opt) =>
      opt.setName('user').setDescription('The member to disconnect').setRequired(true)),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!member) {
      return interaction.reply({ embeds: [errorEmbed('That user is not in this server.')], flags: MessageFlags.Ephemeral });
    }
    if (!member.voice.channelId) {
      return interaction.reply({ embeds: [errorEmbed('That member is not in a voice channel.')], flags: MessageFlags.Ephemeral });
    }

    const check = canModerate(interaction.guild, interaction.member, member);
    if (!check.ok) {
      return interaction.reply({ embeds: [errorEmbed('You cannot disconnect that member.')], flags: MessageFlags.Ephemeral });
    }

    await member.voice.disconnect(`${interaction.user.tag} • /vkick`).catch(() => null);
    await interaction.reply({ embeds: [successEmbed(`👢 **${targetUser.tag}** was disconnected from voice.`)] });
  }
};
