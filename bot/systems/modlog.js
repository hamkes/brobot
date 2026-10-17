const { EmbedBuilder } = require('discord.js');
const { Guild, ModAction } = require('../db');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Logging engine.
 * Sends detailed event embeds (messages, members, roles, voice, bans) to the
 * configured log channel, and records moderation actions for the dashboard.
 */

async function getLogChannel(guild, eventKey) {
  const settings = await Guild.findOne({ guildId: guild.id });
  if (!settings?.logging?.enabled || !settings.logging.channelId) return null;
  if (eventKey && settings.logging.events?.[eventKey] === false) return null;

  const channel = guild.channels.cache.get(settings.logging.channelId)
    || await guild.channels.fetch(settings.logging.channelId).catch(() => null);
  return channel?.isTextBased() ? channel : null;
}

async function send(guild, eventKey, embed) {
  try {
    const channel = await getLogChannel(guild, eventKey);
    if (!channel) return;
    await channel.send({ embeds: [embed] });
  } catch (err) {
    logger.error(`modlog send failed (${guild?.id}): ${err.message}`);
  }
}

function base(title, color = config.colors.info) {
  return new EmbedBuilder().setColor(color).setTitle(title).setTimestamp();
}

async function logMessageDelete(message) {
  if (!message.guild || message.author?.bot) return;
  const embed = base('🗑️ Message Deleted', config.colors.danger)
    .setDescription(`**Author:** ${message.author?.tag ?? 'Unknown'}\n**Channel:** ${message.channel}\n\n**Content:**\n${truncate(message.content || '*No text content*')}`);
  await send(message.guild, 'messageDelete', embed);
}

async function logMessageEdit(oldMessage, newMessage) {
  if (!newMessage.guild || newMessage.author?.bot) return;
  const embed = base('✏️ Message Edited', config.colors.warning)
    .setDescription(`**Author:** ${newMessage.author.tag}\n**Channel:** ${newMessage.channel}\n[Jump to message](${newMessage.url})`)
    .addFields(
      { name: 'Before', value: truncate(oldMessage.content || '*empty*') },
      { name: 'After', value: truncate(newMessage.content || '*empty*') }
    );
  await send(newMessage.guild, 'messageEdit', embed);
}

async function logMemberJoin(member) {
  const embed = base('📥 Member Joined', config.colors.success)
    .setDescription(`**${member.user.tag}** ${member}\nAccount created <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`)
    .setFooter({ text: `ID: ${member.id} • Members: ${member.guild.memberCount}` })
    .setThumbnail(member.user.displayAvatarURL());
  await send(member.guild, 'memberJoin', embed);
}

async function logMemberLeave(member) {
  const roles = member.roles?.cache?.filter((r) => r.id !== member.guild.id).map((r) => r.name).join(', ');
  const embed = base('📤 Member Left', config.colors.danger)
    .setDescription(`**${member.user.tag}** (${member.user.id})`)
    .addFields({ name: 'Roles', value: truncate(roles || 'None') })
    .setThumbnail(member.user.displayAvatarURL());
  await send(member.guild, 'memberLeave', embed);
}

async function logRoleChange(executor, member, role, type) {
  const embed = base(type === 'add' ? '➕ Role Added' : '➖ Role Removed', type === 'add' ? config.colors.success : config.colors.warning)
    .setDescription(`**${member.user.tag}** ${type === 'add' ? 'received' : 'lost'} role **${role.name}**`)
    .addFields({ name: 'Executor', value: executor ? `${executor.tag} (${executor.id})` : 'Unknown' });
  await send(member.guild, 'roleChanges', embed);
}

async function logVoiceState(oldState, newState) {
  const member = newState.member;
  if (!member) return;
  const embed = base('🔊 Voice Update', config.colors.info)
    .setDescription(`**${member.user.tag}**`)
    .addFields(
      { name: 'Before', value: oldState.channel ? `🔊 ${oldState.channel.name}` : '❌ Disconnected', inline: true },
      { name: 'After', value: newState.channel ? `🔊 ${newState.channel.name}` : '❌ Disconnected', inline: true }
    );
  await send(newState.guild, 'voice', embed);
}

async function logBan(executor, target, reason, kind = 'ban') {
  const embed = base(kind === 'ban' ? '🔨 Member Banned' : '♻️ Member Unbanned', kind === 'ban' ? config.colors.danger : config.colors.success)
    .setDescription(`**${target.tag ?? target.username ?? target}** (${target.id ?? ''})`)
    .addFields(
      { name: 'Executor', value: executor ? `${executor.tag} (${executor.id})` : 'Unknown', inline: true },
      { name: 'Reason', value: reason || 'No reason provided', inline: true }
    );
  await send(executor?.guild || target.guild, 'bans', embed);
}

async function recordModAction(data) {
  try {
    const last = await ModAction.findOne({ guildId: data.guildId }).sort({ caseId: -1 });
    const caseId = (last?.caseId || 0) + 1;
    const action = await ModAction.create({ ...data, caseId });

    const embed = base(`📋 Case #${caseId} • ${data.action.toUpperCase()}`, config.colors.primary)
      .addFields(
        { name: 'Target', value: data.targetTag ? `${data.targetTag} (${data.targetId})` : '—', inline: true },
        { name: 'Moderator', value: data.moderatorTag ? `${data.moderatorTag} (${data.moderatorId})` : '—', inline: true },
        { name: 'Reason', value: data.reason || 'No reason provided' }
      );
    if (data.duration) embed.addFields({ name: 'Duration', value: data.duration, inline: true });

    if (data.guild) await send(data.guild, 'modActions', embed);
    return action;
  } catch (err) {
    logger.error(`recordModAction failed: ${err.message}`);
    return null;
  }
}

function truncate(text, max = 1000) {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

module.exports = {
  send,
  logMessageDelete,
  logMessageEdit,
  logMemberJoin,
  logMemberLeave,
  logRoleChange,
  logVoiceState,
  logBan,
  recordModAction
};
