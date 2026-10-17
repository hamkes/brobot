const { EmbedBuilder } = require('discord.js');
const { Guild } = require('../db');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Starboard engine.
 * When a message reaches the star threshold it is reposted to the
 * starboard channel and kept in sync as stars change.
 */

const starboardMessages = new Map();

async function handleReaction(reaction, user, type = 'add') {
  try {
    if (user?.bot) return;
    const message = reaction.message;
    if (!message.guild) return;

    const settings = await Guild.findOne({ guildId: message.guild.id });
    const sb = settings?.starboard;
    if (!sb?.enabled || !sb.channelId) return;
    if (reaction.emoji.name !== sb.emoji) return;
    if (message.channel.id === sb.channelId) return;
    if (message.author?.id === user.id && !sb.selfStar) {
      if (type === 'add') await reaction.users.remove(user.id).catch(() => null);
      return;
    }

    const count = reaction.count ?? 0;
    const key = `${message.guild.id}:${message.id}`;
    const channel = message.guild.channels.cache.get(sb.channelId)
      || await message.guild.channels.fetch(sb.channelId).catch(() => null);
    if (!channel?.isTextBased()) return;

    if (count < (sb.threshold || 3)) {
      const existingId = starboardMessages.get(key);
      if (existingId) {
        const existing = await channel.messages.fetch(existingId).catch(() => null);
        if (existing) await existing.delete().catch(() => null);
        starboardMessages.delete(key);
      }
      return;
    }

    const embed = buildStarEmbed(message, count, sb.emoji);
    const existingId = starboardMessages.get(key);
    if (existingId) {
      const existing = await channel.messages.fetch(existingId).catch(() => null);
      if (existing) {
        await existing.edit({ embeds: [embed] }).catch(() => null);
        return;
      }
    }

    const sent = await channel.send({ content: `${sb.emoji} **${count}** • ${message.channel}`, embeds: [embed] }).catch(() => null);
    if (sent) starboardMessages.set(key, sent.id);
  } catch (err) {
    logger.error(`starboard failed: ${err.message}`);
  }
}

function buildStarEmbed(message, count, emoji) {
  const embed = new EmbedBuilder()
    .setColor(config.colors.warning)
    .setAuthor({ name: message.author?.tag || 'Unknown', iconURL: message.author?.displayAvatarURL() })
    .setDescription(message.content || '*No text content*')
    .setFooter({ text: `${emoji} ${count} • #${message.channel.name}` })
    .setTimestamp(message.createdAt);

  const image = message.attachments?.find((a) => a.contentType?.startsWith('image/'));
  if (image) embed.setImage(image.url);
  return embed;
}

module.exports = { handleReaction };
