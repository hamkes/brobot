const { ChannelType } = require('discord.js');
const { Guild } = require('../db');
const logger = require('../utils/logger');

/**
 * Temporary Channels engine (Join-to-Create).
 * Joining the hub voice channel creates a temp channel; it is deleted
 * automatically when it becomes empty.
 */

const ownedChannels = new Map();

async function handleVoiceState(oldState, newState) {
  try {
    const guild = newState.guild || oldState.guild;
    if (!guild) return;

    const settings = await Guild.findOne({ guildId: guild.id });
    const cfg = settings?.tempChannels;
    if (!cfg?.enabled || !cfg.hubChannelId) return;

    if (newState.channelId === cfg.hubChannelId && newState.member) {
      const created = await createTempChannel(guild, newState.member, cfg);
      if (created) {
        ownedChannels.set(created.id, newState.member.id);
        await newState.member.voice.setChannel(created).catch(() => null);
      }
    }

    if (oldState.channelId && ownedChannels.has(oldState.channelId)) {
      const channel = guild.channels.cache.get(oldState.channelId)
        || await guild.channels.fetch(oldState.channelId).catch(() => null);
      if (channel && channel.members.size === 0) {
        ownedChannels.delete(oldState.channelId);
        await channel.delete('Brobot • Empty temporary channel').catch(() => null);
      }
    }
  } catch (err) {
    logger.error(`tempchannels failed: ${err.message}`);
  }
}

async function createTempChannel(guild, member, cfg) {
  const name = (cfg.nameTemplate || "{user.name}'s channel")
    .replace('{user.name}', member.user.username)
    .replace('{user}', member.user.username)
    .slice(0, 90);

  const channel = await guild.channels.create({
    name,
    type: ChannelType.GuildVoice,
    parent: cfg.categoryId || null,
    userLimit: cfg.userLimit || 0
  }).catch(() => null);

  return channel;
}

module.exports = { handleVoiceState };
