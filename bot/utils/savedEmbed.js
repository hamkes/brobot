const { EmbedBuilder } = require('discord.js');
const config = require('../config');

function hexToInt(hex) {
  if (typeof hex !== 'string') return config.colors.primary;
  const parsed = Number.parseInt(hex.replace('#', ''), 16);
  return Number.isFinite(parsed) ? parsed : config.colors.primary;
}

function isValidImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Build message payload { content, embeds } from the guild's saved embed settings.
 * Returns null when nothing is configured.
 */
function buildSavedEmbed(settings, { thumbnailUrl = null } = {}) {
  const saved = settings?.embed;
  if (!saved) return null;

  const hasContent = Boolean((saved.content || '').trim());
  const hasEmbed = Boolean(
    (saved.title || '').trim() ||
    (saved.description || '').trim() ||
    isValidImageUrl(saved.image)
  );
  if (!hasContent && !hasEmbed) return null;

  const payload = {};
  if (hasContent) payload.content = saved.content;

  if (hasEmbed) {
    const embed = new EmbedBuilder().setColor(hexToInt(saved.color));
    if (saved.title) embed.setTitle(saved.title);
    if (saved.description) embed.setDescription(saved.description);
    if (isValidImageUrl(saved.image)) embed.setImage(saved.image);
    if (saved.footer) embed.setFooter({ text: saved.footer });
    if (saved.thumbnail && thumbnailUrl) embed.setThumbnail(thumbnailUrl);
    payload.embeds = [embed];
  }

  return payload;
}

module.exports = { buildSavedEmbed, hexToInt, isValidImageUrl };
