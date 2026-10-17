const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits
} = require('discord.js');
const { Guild, Ticket } = require('../db');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Ticket system.
 * Panel button -> creates a private channel for the user.
 * Buttons: Close (staff), Claim (staff).
 */

function buildPanel(settings) {
  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle(`🎫 ${settings.title || 'Support Tickets'}`)
    .setDescription(settings.description || 'Click the button below to open a ticket.')
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket:open')
      .setLabel('Open Ticket')
      .setEmoji('🎫')
      .setStyle(ButtonStyle.Primary)
  );

  return { embeds: [embed], components: [row] };
}

function buildTicketControls() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket:close').setLabel('Close').setEmoji('🔒').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('ticket:claim').setLabel('Claim').setEmoji('🙋').setStyle(ButtonStyle.Success)
  );
}

async function handleTicketButton(interaction) {
  const [, action] = interaction.customId.split(':');
  switch (action) {
    case 'open':
      return openTicket(interaction);
    case 'close':
      return closeTicket(interaction);
    case 'claim':
      return claimTicket(interaction);
    default:
      return interaction.reply({ content: 'Unknown action.', ephemeral: true });
  }
}

async function openTicket(interaction) {
  const guild = interaction.guild;
  const settings = await Guild.findOne({ guildId: guild.id });
  if (!settings?.tickets?.enabled) {
    return interaction.reply({ content: 'Tickets are disabled on this server.', ephemeral: true });
  }

  const existing = await Ticket.findOne({ guildId: guild.id, userId: interaction.user.id, status: 'open' });
  if (existing) {
    return interaction.reply({ content: `You already have an open ticket: <#${existing.channelId}>`, ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  const number = (await Ticket.countDocuments({ guildId: guild.id })) + 1;

  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
    { id: guild.members.me.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] }
  ];
  if (settings.tickets.supportRoleId) {
    overwrites.push({ id: settings.tickets.supportRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
  }

  const channel = await guild.channels.create({
    name: `ticket-${String(number).padStart(4, '0')}`,
    type: ChannelType.GuildText,
    parent: settings.tickets.categoryId || null,
    permissionOverwrites: overwrites
  }).catch(() => null);

  if (!channel) {
    return interaction.editReply({ content: 'I could not create the ticket channel. Check my permissions.' });
  }

  await Ticket.create({
    guildId: guild.id,
    channelId: channel.id,
    userId: interaction.user.id,
    userTag: interaction.user.tag,
    number
  });

  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle(`Ticket #${number}`)
    .setDescription(settings.tickets.openMessage || 'Support will be with you shortly.')
    .setTimestamp();

  await channel.send({
    content: `${interaction.user}${settings.tickets.supportRoleId ? ` <@&${settings.tickets.supportRoleId}>` : ''}`,
    embeds: [embed],
    components: [buildTicketControls()]
  });

  await interaction.editReply({ content: `Your ticket has been created: ${channel}` });
}

async function closeTicket(interaction) {
  const ticket = await Ticket.findOne({ channelId: interaction.channel.id, status: 'open' });
  if (!ticket) return interaction.reply({ content: 'This is not an open ticket.', ephemeral: true });

  const isOwner = ticket.userId === interaction.user.id;
  const isStaff = interaction.member.permissions.has(PermissionFlagsBits.ManageChannels);

  if (!isOwner && !isStaff) {
    return interaction.reply({ content: 'Only the ticket owner or staff can close this ticket.', ephemeral: true });
  }

  ticket.status = 'closed';
  ticket.closedBy = interaction.user.id;
  await ticket.save();

  await interaction.reply({ content: '🔒 Closing ticket in 5 seconds...' });
  setTimeout(() => interaction.channel.delete().catch(() => null), 5000);
}

async function claimTicket(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
    return interaction.reply({ content: 'Only staff can claim tickets.', ephemeral: true });
  }
  const ticket = await Ticket.findOne({ channelId: interaction.channel.id, status: 'open' });
  if (!ticket) return interaction.reply({ content: 'This is not an open ticket.', ephemeral: true });
  if (ticket.claimedBy) {
    return interaction.reply({ content: `Already claimed by <@${ticket.claimedBy}>.`, ephemeral: true });
  }

  ticket.claimedBy = interaction.user.id;
  await ticket.save();

  await interaction.reply({ content: `🙋 ${interaction.user} claimed this ticket.` });
}

module.exports = { buildPanel, handleTicketButton };
