const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags
} = require('discord.js');
const { Guild } = require('../../db');
const config = require('../../config');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('autorole')
    .setDescription('Manage roles given automatically to new members')
    
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand((sub) =>
      sub.setName('add').setDescription('Add a role to the auto-role list')
        
        .addRoleOption((opt) =>
          opt.setName('role').setDescription('The role to give on join')
            .setRequired(true)))
    .addSubcommand((sub) =>
      sub.setName('remove').setDescription('Remove a role from the auto-role list')
        
        .addRoleOption((opt) =>
          opt.setName('role').setDescription('The role to remove')
            .setRequired(true)))
    .addSubcommand((sub) =>
      sub.setName('list').setDescription('List configured auto-roles')
        ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    let settings = await Guild.findOne({ guildId: interaction.guild.id });
    if (!settings) settings = await Guild.create({ guildId: interaction.guild.id, name: interaction.guild.name });

    if (sub === 'add') {
      const role = interaction.options.getRole('role');

      if (role.position >= interaction.guild.members.me.roles.highest.position) {
        return interaction.reply({ embeds: [errorEmbed('That role is above my highest role, so I cannot assign it.')], flags: MessageFlags.Ephemeral });
      }
      if (role.managed || role.id === interaction.guild.id) {
        return interaction.reply({ embeds: [errorEmbed('That role cannot be assigned by bots.')], flags: MessageFlags.Ephemeral });
      }
      if (settings.autoroles.includes(role.id)) {
        return interaction.reply({ embeds: [errorEmbed('That role is already in the auto-role list.')], flags: MessageFlags.Ephemeral });
      }

      settings.autoroles.push(role.id);
      await settings.save();
      return interaction.reply({ embeds: [successEmbed(`Added ${role} to auto-roles. It will be given to every new member instantly.`)] });
    }

    if (sub === 'remove') {
      const role = interaction.options.getRole('role');
      if (!settings.autoroles.includes(role.id)) {
        return interaction.reply({ embeds: [errorEmbed('That role is not in the auto-role list.')], flags: MessageFlags.Ephemeral });
      }
      settings.autoroles = settings.autoroles.filter((id) => id !== role.id);
      await settings.save();
      return interaction.reply({ embeds: [successEmbed(`Removed ${role} from auto-roles.`)] });
    }

    if (sub === 'list') {
      if (!settings.autoroles.length) {
        return interaction.reply({ embeds: [errorEmbed('No auto-roles configured yet. Use `/autorole add`.')], flags: MessageFlags.Ephemeral });
      }
      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('🤖 Auto Roles')
        .setDescription(settings.autoroles.map((id) => `<@&${id}>`).join('\n'))
        .setFooter({ text: `${settings.autoroles.length} role(s) • given automatically on join` });
      return interaction.reply({ embeds: [embed] });
    }
  }
};
