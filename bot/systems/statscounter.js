const { ChannelType } = require('discord.js');
const { Guild } = require('../db');
const logger = require('../utils/logger');

/**
 * Statistics counters.
 * Keeps voice channels renamed as counters, e.g. "👥 Members: 1,204".
 */

const TEMPLATES = {
  members: '👥 Members: {count}',
  online: '🟢 Online: {count}',
  bots: '🤖 Bots: {count}',
  roles: '🎭 Roles: {count}',
  channels: '💬 Channels: {count}'
};

function countFor(guild, type) {
  switch (type) {
    case 'online': {
      const online = guild.members.cache.filter((m) => m.presence && m.presence.status !== 'offline').size;
      return online || guild.approximatePresenceCount || 0;
    }
    case 'bots':
      return guild.members.cache.filter((m) => m.user.bot).size;
    case 'roles':
      return guild.roles.cache.size;
    case 'channels':
      return guild.channels.cache.size;
    case 'members':
    default:
      return guild.memberCount;
  }
}

async function updateCounters(guild) {
  try {
    const settings = await Guild.findOne({ guildId: guild.id });
    if (!settings?.stats?.enabled || !settings.stats.channels?.length) return;

    for (const counter of settings.stats.channels) {
      const channel = guild.channels.cache.get(counter.channelId)
        || await guild.channels.fetch(counter.channelId).catch(() => null);
      if (!channel) continue;

      const template = TEMPLATES[counter.type] || TEMPLATES.members;
      const name = template.replace('{count}', countFor(guild, counter.type).toLocaleString('en-US'));

      if (channel.name !== name) {
        await channel.setName(name).catch(() => null);
      }
    }
  } catch (err) {
    logger.error(`updateCounters failed (${guild.id}): ${err.message}`);
  }
}

async function ensureCounterChannel(guild, type) {
  const settings = await Guild.findOne({ guildId: guild.id });
  if (!settings) return null;

  if (!settings.stats.enabled) settings.stats.enabled = true;
  const existing = settings.stats.channels.find((c) => c.type === type);
  if (existing) return existing;

  const channel = await guild.channels.create({
    name: (TEMPLATES[type] || TEMPLATES.members).replace('{count}', '0'),
    type: ChannelType.GuildVoice,
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        deny: ['Connect']
      }
    ]
  }).catch(() => null);

  if (!channel) return null;
  settings.stats.channels.push({ channelId: channel.id, type });
  await settings.save();
  return { channelId: channel.id, type };
}

module.exports = { updateCounters, ensureCounterChannel, countFor };
