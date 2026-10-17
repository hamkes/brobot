const { Guild, Level } = require('../db');
const logger = require('../utils/logger');

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

async function handleLeveling(message) {
  try {
    if (!message.guild || message.author.bot || !message.content) return;
    if (message.content.length < 2) return;

    const settings = await Guild.findOne({ guildId: message.guild.id });
    if (!settings?.leveling?.enabled) return;

    const { xpPerMessage = 15, cooldown = 60, announceChannelId, rewards = [], stackRewards = true } = settings.leveling;

    let record = await Level.findOne({ guildId: message.guild.id, userId: message.author.id });
    if (!record) record = await Level.create({ guildId: message.guild.id, userId: message.author.id });

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
      await onLevelUp({ message, guild: message.guild, member: message.member, level, announceChannelId, rewards, stackRewards });
    }
  } catch (err) {
    logger.error(`handleLeveling failed: ${err.message}`);
  }
}

async function onLevelUp({ message, guild, member, level, announceChannelId, rewards, stackRewards }) {
  const channel = announceChannelId
    ? (guild.channels.cache.get(announceChannelId) || await guild.channels.fetch(announceChannelId).catch(() => null))
    : message.channel;

  if (channel?.isTextBased()) {
    await channel.send(`🎉 Congratulations ${member}, you reached **Level ${level}**!`).catch(() => null);
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

module.exports = { handleLeveling, xpForLevel, totalXpForLevel, levelFromXp };
