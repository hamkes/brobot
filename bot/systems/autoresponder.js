const { Guild } = require('../db');
const logger = require('../utils/logger');

/**
 * Auto Responder engine.
 * Matches message content against configured triggers and replies.
 * Match modes: exact | contains | startsWith
 */

const cooldowns = new Map();

function matches(content, trigger, mode) {
  const c = content.toLowerCase();
  const t = trigger.toLowerCase();
  switch (mode) {
    case 'exact':
      return c === t;
    case 'startsWith':
      return c.startsWith(t);
    case 'contains':
    default:
      return c.includes(t);
  }
}

async function handleAutoResponder(message) {
  try {
    if (!message.guild || message.author.bot) return false;
    if (!message.content) return false;

    const settings = await Guild.findOne({ guildId: message.guild.id });
    if (!settings || !settings.autoresponder?.length) return false;

    for (const entry of settings.autoresponder) {
      if (!entry.trigger || !entry.response) continue;
      if (!matches(message.content, entry.trigger, entry.matchMode)) continue;

      const key = `${message.guild.id}:${entry.trigger.toLowerCase()}`;
      const now = Date.now();
      const last = cooldowns.get(key) || 0;
      if (now - last < 3000) continue;
      cooldowns.set(key, now);

      await message.reply({
        content: entry.response,
        allowedMentions: { repliedUser: false }
      }).catch(() => null);
      return true;
    }
    return false;
  } catch (err) {
    logger.error(`handleAutoResponder failed: ${err.message}`);
    return false;
  }
}

module.exports = { handleAutoResponder };
