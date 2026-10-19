const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { errorEmbed, successEmbed } = require('../../utils/helpers');

function canManageRole(interaction, role) {
  if (role.managed) return 'That role is managed by an integration and cannot be assigned manually.';
  if (role.position >= interaction.guild.members.me.roles.highest.position) {
    return 'I cannot manage that role (it is above my highest role).';
  }
  const isOwner = interaction.user.id === interaction.guild.ownerId;
  if (!isOwner && role.position >= interaction.member.roles.highest.position) {
    return 'You cannot manage a role that is equal to or above your highest role.';
  }
  return null;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role')
    .setDescription('Give or remove a role from a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand((sub) =>
      sub.setName('give')
        .setDescription('Give a role to a member')
        .addUserOption((opt) => opt.setName('user').setDescription('The member').setRequired(true))
        .addRoleOption((opt) => opt.setName('role').setDescription('The role to give').setRequired(true)))
    .addSubcommand((sub) =>
      sub.setName('remove')
        .setDescription('Remove a role from a member')
        .addUserOption((opt) => opt.setName('user').setDescription('The member').setRequired(true))
        .addRoleOption((opt) => opt.setName('role').setDescription('The role to remove').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const user = interaction.options.getUser('user');
    const role = interaction.options.getRole('role');

    const problem = canManageRole(interaction, role);
    if (problem) {
      return interaction.reply({ embeds: [errorEmbed(problem)], flags: MessageFlags.Ephemeral });
    }

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      return interaction.reply({ embeds: [errorEmbed('That user is not in this server.')], flags: MessageFlags.Ephemeral });
    }

    const reason = `${interaction.user.tag} • /role ${sub}`;

    if (sub === 'give') {
      if (member.roles.cache.has(role.id)) {
        return interaction.reply({ embeds: [errorEmbed(`**${user.tag}** already has ${role}.`)], flags: MessageFlags.Ephemeral });
      }
      const added = await member.roles.add(role, reason).catch(() => null);
      if (!added) {
        return interaction.reply({ embeds: [errorEmbed('I could not add that role.')], flags: MessageFlags.Ephemeral });
      }
      return interaction.reply({ embeds: [successEmbed(`➕ Gave ${role} to **${user.tag}**.`)] });
    }

    if (!member.roles.cache.has(role.id)) {
      return interaction.reply({ embeds: [errorEmbed(`**${user.tag}** does not have ${role}.`)], flags: MessageFlags.Ephemeral });
    }
    const removed = await member.roles.remove(role, reason).catch(() => null);
    if (!removed) {
      return interaction.reply({ embeds: [errorEmbed('I could not remove that role.')], flags: MessageFlags.Ephemeral });
    }
    return interaction.reply({ embeds: [successEmbed(`➖ Removed ${role} from **${user.tag}**.`)] });
  }
};
