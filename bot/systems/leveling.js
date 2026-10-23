const { Guild, Level } = require('../db');
const logger = require('../utils/logger');
const { buildPlaceholders, applyPlaceholders } = require('../utils/placeholders');

/**
 * Leveling engine.
 * Grants XP for messages, announces level-ups and applies role rewards.
 * XP needed for next level: 5 * (level^2) + 50 * level + 100 (MEE6-style curve).
 */

function xpForLevel(level) {
  return 5 * (level ** 2) + 50 * level + 100;
}

function totalXpForLevel(level) {
  let total = 0;
  for (let i = 0; i < level; i++) total += xpForLevel(i);
  return total;
}

function levelFromXp(totalXp) {
  let level = 0;
  let remaining = totalXp;
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level++;
  }
  return { level, progress: remaining, needed: xpForLevel(level) };
}

/** Role ids of a member, tolerant of discord.js members and plain test doubles. */
function roleIdsOf(member) {
  if (!member) return [];
  if (Array.isArray(member.roleIds)) return member.roleIds.map(String);
  const roles = member.roles;
  if (!roles) return [];
  if (Array.isArray(roles)) return roles.map((r) => String(typeof r === 'string' ? r : r.id));
  const cache = roles.cache || roles;
  if (cache && typeof cache.keys === 'function') return [...cache.keys()].map(String);
  if (Array.isArray(cache)) return cache.map((r) => String(typeof r === 'string' ? r : r.id));
  return [];
}

function memberHasRole(member, roleId) {
  if (!member?.roles) return false;
  if (member.roles.cache && typeof member.roles.cache.has === 'function') return member.roles.cache.has(roleId);
  if (typeof member.roles.has === 'function') return member.roles.has(roleId);
  return roleIdsOf(member).includes(String(roleId));
}

/**
 * Pure check: is XP blocked for this channel / member under the guild's
 * leveling config? (v1.3 — NO-XP channels and NO-XP roles.)
 */
function isXpBlocked(levelingCfg, { channelId, roleIds } = {}) {
  if (!levelingCfg) return false;
  const blockedChannels = levelingCfg.noXpChannelIds || [];
  if (channelId && blockedChannels.map(String).includes(String(channelId))) return true;
  const blockedRoles = levelingCfg.noXpRoleIds || [];
  if (!blockedRoles.length || !roleIds?.length) return false;
  const blocked = new Set(blockedRoles.map(String));
  return roleIds.some((id) => blocked.has(String(id)));
}

/**
 * Render the level-up announcement. A guild may set its own template in
 * `leveling.announceMessage` (placeholders + `{level}`); empty means the
 * built-in BroBot default text below.
 */
function buildLevelUpMessage(cfg, guild, member, level) {
  const template = cfg?.announceMessage;
  if (typeof template === 'string' && template.trim()) {
    const placeholders = buildPlaceholders(guild, member, { '{level}': level });
    return applyPlaceholders(template, placeholders);
  }
  return `🎉 Congratulations ${member}, you reached **Level ${level}**!`;
}

async function handleLeveling(message) {
  try {
    if (!message.guild || message.author.bot || !message.content) return;
    if (message.content.length < 2) return;

    const settings = await Guild.findOne({ guildId: message.guild.id });
    if (!settings?.leveling?.enabled) return;

    const { xpPerMessage = 15, cooldown = 60, announceChannelId, rewards = [], stackRewards = true, announceMessage = '' } = settings.leveling;

    let record = await Level.findOne({ guildId: message.guild.id, userId: message.author.id });
    if (!record) record = await Level.create({ guildId: message.guild.id, userId: message.author.id });

    // v1.3: NO-XP channels / roles earn nothing — the message still counts.
    if (isXpBlocked(settings.leveling, { channelId: message.channel?.id, roleIds: roleIdsOf(message.member) })) {
      record.totalMessages += 1;
      await record.save();
      return;
    }

    const now = Date.now();
    if (record.lastMessageAt && now - new Date(record.lastMessageAt).getTime() < cooldown * 1000) {
      record.totalMessages += 1;
      await record.save();
      return;
    }

    const gained = xpPerMessage + Math.floor(Math.random() * Math.max(1, Math.floor(xpPerMessage / 2)));
    const previousLevel = record.level;

    record.xp += gained;
    record.totalMessages += 1;
    record.lastMessageAt = new Date(now);

    const { level } = levelFromXp(record.xp);
    record.level = level;
    await record.save();

    if (level > previousLevel) {
      await onLevelUp({ message, guild: message.guild, member: message.member, level, announceChannelId, rewards, stackRewards, announceMessage });
    }
  } catch (err) {
    logger.error(`handleLeveling failed: ${err.message}`);
  }
}

async function onLevelUp({ message, guild, member, level, announceChannelId, rewards, stackRewards, announceMessage }) {
  const channel = announceChannelId
    ? (guild.channels.cache.get(announceChannelId) || await guild.channels.fetch(announceChannelId).catch(() => null))
    : message.channel;

  if (channel?.isTextBased()) {
    await channel.send(buildLevelUpMessage({ announceMessage }, guild, member, level)).catch(() => null);
  }

  const unlocked = rewards.filter((r) => r.level <= level);
  if (!unlocked.length) return;

  const toApply = stackRewards ? unlocked : [unlocked[unlocked.length - 1]];
  for (const reward of toApply) {
    const role = guild.roles.cache.get(reward.roleId) || await guild.roles.fetch(reward.roleId).catch(() => null);
    if (!role) continue;
    if (guild.members.me.roles.highest.position <= role.position) continue;
    if (member.roles.cache.has(role.id)) continue;
    await member.roles.add(role, `Brobot • Level ${level} reward`).catch(() => null);
  }
}

/**
 * Voice XP (BroBot original — added in the v1.1 gap pass).
 *
 * Join/leave/switch timestamps are tracked in memory; when a member leaves
 * a voice channel (or moves), the finished session is settled: whole
 * minutes are stored on the Level record and converted to XP at the
 * guild's `leveling.voiceXpPerMinute` rate. Sessions shorter than a
 * minute, bots, and time in the guild's AFK channel earn nothing.
 * A restart simply drops any open session — it never invents minutes.
 */
const voiceSessions = new Map(); // `${guildId}:${userId}` -> { joinedAt, channelId }

function voiceSessionKey(guildId, userId) {
  return `${guildId}:${userId}`;
}

function isCountableChannel(guild, channelId) {
  return Boolean(channelId) && channelId !== guild.afkChannelId;
}

async function settleVoiceSession(guild, userId, joinedAt, opts = {}) {
  const minutes = Math.floor((Date.now() - joinedAt) / 60000);
  if (minutes < 1) return null;

  const settings = await Guild.findOne({ guildId: guild.id });
  if (!settings?.leveling?.enabled) return null;

  const cfg = settings.leveling;
  // v1.3: NO-XP channels / roles earn no voice XP either.
  if (isXpBlocked(cfg, { channelId: opts.channelId, roleIds: roleIdsOf(opts.member) })) return null;

  const xpPerMinute = cfg.voiceXpPerMinute ?? 10;
  const gained = minutes * xpPerMinute;
  if (gained <= 0) return null;

  const record = await Level.findOneAndUpdate(
    { guildId: guild.id, userId },
    { $inc: { voiceXp: gained, totalVoiceMinutes: minutes } },
    { upsert: true, new: true }
  );

  // v1.3: voice-level role rewards, mirroring the text-level rewards.
  const previousVoiceLevel = levelFromXp(record.voiceXp - gained).level;
  const newVoiceLevel = levelFromXp(record.voiceXp).level;
  if (newVoiceLevel > previousVoiceLevel && opts.member && (cfg.voiceRewards || []).length) {
    const unlocked = cfg.voiceRewards.filter((r) => r.level <= newVoiceLevel);
    const toApply = cfg.stackRewards !== false ? unlocked : (unlocked.length ? [unlocked[unlocked.length - 1]] : []);
    for (const reward of toApply) {
      let role = guild.roles?.cache?.get(reward.roleId) || null;
      if (!role && typeof guild.roles?.fetch === 'function') {
        role = await guild.roles.fetch(reward.roleId).catch(() => null);
      }
      if (!role) continue;
      const botHighest = guild.members?.me?.roles?.highest?.position;
      if (typeof botHighest === 'number' && botHighest <= role.position) continue;
      if (memberHasRole(opts.member, role.id)) continue;
      await opts.member.roles.add(role, 'BroBot • Voice level reward').catch(() => null);
    }
  }

  return { minutes, gained, voiceXp: record.voiceXp };
}

async function handleVoiceState(oldState, newState) {
  try {
    const guild = newState.guild || oldState.guild;
    const member = newState.member || oldState.member;
    if (!guild || !member || member.user?.bot) return;

    const key = voiceSessionKey(guild.id, member.id);
    const oldChannelId = oldState.channelId || null;
    const newChannelId = newState.channelId || null;
    if (oldChannelId === newChannelId) return; // mute/deafen updates etc.

    if (oldChannelId && isCountableChannel(guild, oldChannelId)) {
      const session = voiceSessions.get(key);
      if (session && session.channelId === oldChannelId) {
        voiceSessions.delete(key);
        await settleVoiceSession(guild, member.id, session.joinedAt, { channelId: oldChannelId, member });
      }
    }

    if (newChannelId && isCountableChannel(guild, newChannelId)) {
      voiceSessions.set(key, { joinedAt: Date.now(), channelId: newChannelId });
    }
  } catch (err) {
    logger.error(`handleVoiceState (leveling) failed: ${err.message}`);
  }
}

module.exports = { handleLeveling, handleVoiceState, settleVoiceSession, isXpBlocked, buildLevelUpMessage, xpForLevel, totalXpForLevel, levelFromXp };
