const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { Guild, ModAction } = require('../db');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Automod engine.
 * Checks: anti-spam, anti-links, anti-invites, bad words, mass mentions.
 * Actions: delete message + timeout offender + log to mod log channel.
 */

const spamCache = new Map();
const INVITE_REGEX = /(discord\.(gg|io|me|li)\/|discordapp\.com\/invite\/|discord\.com\/invite\/)/i;
const LINK_REGEX = /https?:\/\/[^\s]+/i;

function isExempt(message, settings) {
  if (!message.guild || !message.member) return true;
  if (message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return true;
  if (settings.automod.whitelistChannels?.includes(message.channel.id)) return true;
  if (settings.automod.whitelistRoles?.some((r) => message.member.roles.cache.has(r))) return true;
  return false;
}

function trackSpam(message, settings) {
  const key = `${message.guild.id}:${message.author.id}`;
  const windowMs = (settings.automod.spamInterval || 5) * 1000;
  const now = Date.now();
  const timestamps = (spamCache.get(key) || []).filter((t) => now - t < windowMs);
  timestamps.push(now);
  spamCache.set(key, timestamps);

  if (spamCache.size > 5000) spamCache.clear();
  return timestamps.length >= (settings.automod.spamThreshold || 5);
}

function detectViolation(message, settings) {
  const am = settings.automod;
  const content = message.content || '';

  if (am.antiSpam && trackSpam(message, settings)) return 'spam';
  if (am.antiInvites && INVITE_REGEX.test(content)) return 'invites';
  if (am.antiLinks && LINK_REGEX.test(content)) return 'links';
  if (am.antiMassMention) {
    const mentions = message.mentions.users.size + message.mentions.roles.size;
    if (mentions >= (am.mentionLimit || 5)) return 'mass_mention';
  }
  if (am.antiBadWords && am.badWords?.length) {
    const lower = content.toLowerCase();
    if (am.badWords.some((w) => w && lower.includes(w.toLowerCase()))) return 'bad_words';
  }
  return null;
}

const REASONS = {
  spam: 'Sending spam messages',
  invites: 'Posting Discord invites',
  links: 'Posting links',
  mass_mention: 'Mass mentioning',
  bad_words: 'Using prohibited words'
};

async function handleAutomod(message) {
  try {
    if (!message.guild || message.author.bot || !message.content) return false;

    const settings = await Guild.findOne({ guildId: message.guild.id });
    if (!settings?.automod?.enabled) return false;
    if (isExempt(message, settings)) return false;

    const violation = detectViolation(message, settings);
    if (!violation) return false;

    await message.delete().catch(() => null);

    const reason = REASONS[violation] || 'Automod violation';

    if (message.member.moderatable) {
      const minutes = settings.automod.timeoutMinutes || 10;
      await message.member.timeout(minutes * 60 * 1000, `[Automod] ${reason}`).catch(() => null);
    }

    const warning = await message.channel.send({
      content: `${config.emojis.warning} ${message.author}, your message was removed: **${reason}**.`
    }).catch(() => null);
    if (warning) setTimeout(() => warning.delete().catch(() => null), 6000);

    await ModAction.create({
      guildId: message.guild.id,
      action: violation === 'spam' ? 'automod' : 'automod',
      targetId: message.author.id,
      targetTag: message.author.tag,
      moderatorId: message.client.user.id,
      moderatorTag: message.client.user.tag,
      reason,
      source: 'automod'
    });

    await logAutomod(message, settings, reason);
    return true;
  } catch (err) {
    logger.error(`handleAutomod failed: ${err.message}`);
    return false;
  }
}

async function logAutomod(message, settings, reason) {
  const channelId = settings.modLogChannelId || settings.logging?.channelId;
  if (!channelId) return;
  const channel = message.guild.channels.cache.get(channelId);
  if (!channel?.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setColor(config.colors.danger)
    .setTitle('🛡️ Automod Action')
    .addFields(
      { name: 'User', value: `${message.author.tag} (${message.author.id})`, inline: true },
      { name: 'Channel', value: `${message.channel}`, inline: true },
      { name: 'Reason', value: reason, inline: true }
    )
    .setTimestamp();

  await channel.send({ embeds: [embed] }).catch(() => null);
}

module.exports = { handleAutomod };
