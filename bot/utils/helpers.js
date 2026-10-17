const {
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType
} = require('discord.js');
const config = require('../config');

/**
 * Parse a duration string like 10m, 2h, 1d, 30s into seconds.
 * Returns null when invalid.
 */
function parseDuration(input) {
  if (!input) return null;
  const match = String(input).trim().toLowerCase().match(/^(\d+)\s*(s|m|h|d|w)?$/);
  if (!match) return null;
  const value = parseInt(match[1], 10);
  const unit = match[2] || 'm';
  const multipliers = { s: 1, m: 60, h: 3600, d: 86400, w: 604800 };
  const seconds = value * (multipliers[unit] || 60);
  if (seconds < 1) return null;
  return seconds;
}

/**
 * Human readable duration from seconds, e.g. "1h 30m".
 */
function formatDuration(seconds) {
  if (!seconds || seconds < 0) return '0s';
  const units = [
    ['w', 604800],
    ['d', 86400],
    ['h', 3600],
    ['m', 60],
    ['s', 1]
  ];
  const parts = [];
  let remaining = Math.floor(seconds);
  for (const [label, size] of units) {
    const amount = Math.floor(remaining / size);
    if (amount > 0) {
      parts.push(`${amount}${label}`);
      remaining -= amount * size;
    }
    if (parts.length === 3) break;
  }
  return parts.join(' ') || '0s';
}

const DISCORD_TIMEOUT_MAX = 28 * 24 * 60 * 60;
const DISCORD_TIMEOUT_MIN = 1;

function clampTimeout(seconds) {
  return Math.max(DISCORD_TIMEOUT_MIN, Math.min(DISCORD_TIMEOUT_MAX, seconds));
}

function successEmbed(description) {
  return new EmbedBuilder()
    .setColor(config.colors.success)
    .setDescription(`${config.emojis.success} ${description}`);
}

function errorEmbed(description) {
  return new EmbedBuilder()
    .setColor(config.colors.danger)
    .setDescription(`${config.emojis.error} ${description}`);
}

function infoEmbed(title, description) {
  const embed = new EmbedBuilder().setColor(config.colors.primary);
  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  return embed;
}

/**
 * Check that the bot can moderate the target member (role hierarchy + owner).
 */
function canModerate(guild, executorMember, target) {
  if (!target) return { ok: false, reason: 'target_missing' };
  if (target.id === guild.ownerId) return { ok: false, reason: 'target_is_owner' };
  if (target.id === guild.client.user.id) return { ok: false, reason: 'target_is_bot' };
  if (!executorMember) return { ok: false, reason: 'executor_missing' };
  if (executorMember.id === guild.ownerId) return { ok: true };
  if (executorMember.roles.highest.position <= target.roles.highest.position) {
    return { ok: false, reason: 'hierarchy' };
  }
  const me = guild.members.me;
  if (me.roles.highest.position <= target.roles.highest.position) {
    return { ok: false, reason: 'bot_hierarchy' };
  }
  return { ok: true };
}

const MOD_PERMS = [
  PermissionFlagsBits.BanMembers,
  PermissionFlagsBits.KickMembers,
  PermissionFlagsBits.ModerateMembers,
  PermissionFlagsBits.ManageMessages
];

function hasAnyModPermission(member) {
  return MOD_PERMS.some((perm) => member.permissions.has(perm));
}

/**
 * Sort a list of text/voice channels for dashboard <select> elements.
 */
function sortChannels(channels) {
  return [...channels]
    .filter((c) => [ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildAnnouncement].includes(c.type))
    .sort((a, b) => a.rawPosition - b.rawPosition);
}

module.exports = {
  parseDuration,
  formatDuration,
  clampTimeout,
  successEmbed,
  errorEmbed,
  infoEmbed,
  canModerate,
  hasAnyModPermission,
  sortChannels,
  DISCORD_TIMEOUT_MAX,
  DISCORD_TIMEOUT_MIN
};
