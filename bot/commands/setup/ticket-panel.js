const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags
} = require('discord.js');
const { Guild } = require('../../db');
const { buildPanel } = require('../../systems/tickets');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-panel')
    .setDescription('Send (or refresh) the ticket panel in a channel')
    
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((opt) =>
      opt.setName('channel').setDescription('Panel channel (defaults to current)')
        
        .addChannelTypes(ChannelType.GuildText))
    .addChannelOption((opt) =>
      opt.setName('category').setDescription('Category where tickets are created')
        
        .addChannelTypes(ChannelType.GuildCategory))
    .addRoleOption((opt) =>
      opt.setName('support_role').setDescription('Role that can see tickets')
        ),

  async execute(interaction) {
    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({ embeds: [errorEmbed('I need the **Manage Channels** permission for tickets.')], flags: MessageFlags.Ephemeral });
    }

    let settings = await Guild.findOne({ guildId: interaction.guild.id });
    if (!settings) settings = await Guild.create({ guildId: interaction.guild.id, name: interaction.guild.name });

    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const category = interaction.options.getChannel('category');
    const supportRole = interaction.options.getRole('support_role');

    settings.tickets.enabled = true;
    settings.tickets.panelChannelId = channel.id;
    if (category) settings.tickets.categoryId = category.id;
    if (supportRole) settings.tickets.supportRoleId = supportRole.id;
    await settings.save();

    const message = await channel.send(buildPanel(settings.tickets));
    settings.tickets.panelMessageId = message.id;
    await settings.save();

    await interaction.reply({
      embeds: [successEmbed(`Ticket panel sent to ${channel}. Members can now open tickets with the button.`)],
      flags: MessageFlags.Ephemeral
    });
  }
};
