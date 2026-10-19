const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const modlog = require('../../systems/modlog');
const { canModerate, errorEmbed, successEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setnick')
    .setDescription('Change the nickname of a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
    .addUserOption((opt) =>
      opt.setName('user').setDescription('The member to rename').setRequired(true))
    .addStringOption((opt) =>
      opt.setName('nickname').setDescription('New nickname (leave empty to reset)').setMaxLength(32)),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const nickname = interaction.options.getString('nickname');

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!member) {
      return interaction.reply({ embeds: [errorEmbed('That user is not in this server.')], flags: MessageFlags.Ephemeral });
    }

    const check = canModerate(interaction.guild, interaction.member, member);
    if (!check.ok) {
      return interaction.reply({ embeds: [errorEmbed('You cannot rename that member.')], flags: MessageFlags.Ephemeral });
    }

    if (!member.manageable) {
      return interaction.reply({ embeds: [errorEmbed('I cannot rename that member (role hierarchy).')], flags: MessageFlags.Ephemeral });
    }

    const oldNick = member.nickname || member.user.username;

    await member.setNickname(nickname || null, `${interaction.user.tag} • /setnick`).catch(() => null);

    await modlog.recordModAction({
      guild: interaction.guild,
      guildId: interaction.guild.id,
      action: 'kick',
      targetId: targetUser.id,
      targetTag: targetUser.tag,
      moderatorId: interaction.user.id,
      moderatorTag: interaction.user.tag,
      reason: `Nickname: ${oldNick} → ${nickname || member.user.username}`,
      source: 'slash'
    });

    const result = nickname ? `**${targetUser.tag}** is now **${nickname}**` : `Nickname of **${targetUser.tag}** has been reset`;
    await interaction.reply({ embeds: [successEmbed(result)] });
  }
};
