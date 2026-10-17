const { EmbedBuilder } = require('discord.js');

/**
 * Available placeholders for welcome / goodbye / autoresponder messages.
 * Example: {user.mention}, {server}, {memberCount}
 */
function buildPlaceholders(guild, member, extra = {}) {
  const count = guild.memberCount ?? 0;
  const user = member?.user || member || null;
  const joinedAt = member?.joinedAt || new Date();

  return {
    '{user}': user ? `${user.username}` : 'Unknown',
    '{user.name}': user ? user.username : 'Unknown',
    '{user.tag}': user ? user.tag : 'Unknown',
    '{user.mention}': user ? `<@${user.id}>` : '',
    '{user.id}': user ? user.id : '',
    '{user.avatar}': user ? user.displayAvatarURL({ size: 256 }) : '',
    '{user.createdAt}': user ? `<t:${Math.floor(user.createdTimestamp / 1000)}:D>` : '',
    '{user.joinedAt}': `<t:${Math.floor(joinedAt.getTime() / 1000)}:D>`,
    '{server}': guild.name,
    '{server.name}': guild.name,
    '{memberCount}': count.toLocaleString('en-US'),
    '{memberCount.raw}': String(count),
    '{boostCount}': String(guild.premiumSubscriptionCount || 0),
    '{boostTier}': String(guild.premiumTier || 0),
    '{createdAt}': `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`,
    ...extra
  };
}

function applyPlaceholders(template, placeholders) {
  if (typeof template !== 'string') return '';
  let output = template;
  for (const [key, value] of Object.entries(placeholders)) {
    output = output.split(key).join(String(value ?? ''));
  }
  return output;
}

function resolveColor(color, fallback = '#5865F2') {
  if (!color) return fallback;
  return String(color).startsWith('#') ? color : `#${color}`;
}

/**
 * Build the welcome/goodbye embed or plain text based on guild config.
 */
function buildMemberMessage({ settings, guild, member, kind = 'welcome' }) {
  const placeholders = buildPlaceholders(guild, member);
  const title = applyPlaceholders(settings.title, placeholders);
  const message = applyPlaceholders(settings.message, placeholders);

  let embed = null;
  if (settings.useEmbed) {
    embed = new EmbedBuilder().setColor(resolveColor(settings.color)).setDescription(message);
    if (title) embed.setTitle(title);
    if (settings.thumbnail && member?.user) embed.setThumbnail(member.user.displayAvatarURL({ size: 256 }));
    if (settings.image) embed.setImage(settings.image);
    embed.setFooter({ text: `${guild.name} • ${kind === 'welcome' ? 'Welcome' : 'Goodbye'}` });
  }

  return { content: settings.useEmbed ? null : message, embed, placeholders };
}

module.exports = {
  buildPlaceholders,
  applyPlaceholders,
  resolveColor,
  buildMemberMessage
};
