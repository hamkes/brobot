const { Guild } = require('../db');
const { buildMemberMessage } = require('../utils/placeholders');
const logger = require('../utils/logger');

/**
 * Welcome & Goodbye engine.
 * Triggered from guildMemberAdd / guildMemberRemove events.
 * Sends a custom embed (or plain text) with placeholder support:
 * {user}, {user.mention}, {server}, {memberCount} ...
 */

async function getSettings(guildId) {
  let settings = await Guild.findOne({ guildId });
  if (!settings) settings = await Guild.create({ guildId });
  return settings;
}

async function sendWelcome(guild, member) {
  try {
    const settings = await getSettings(guild.id);
    const cfg = settings.welcome;
    if (!cfg?.enabled || !cfg?.channelId) return;

    const channel = guild.channels.cache.get(cfg.channelId)
      || await guild.channels.fetch(cfg.channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    const { content, embed } = buildMemberMessage({
      settings: cfg,
      guild,
      member,
      kind: 'welcome'
    });

    await channel.send({
      content: content ? content : undefined,
      embeds: embed ? [embed] : []
    });

    if (cfg.dmUser) {
      const dmEmbed = buildMemberMessage({ settings: cfg, guild, member, kind: 'welcome' }).embed;
      await member.send({
        content: dmEmbed ? undefined : `Welcome to **${guild.name}**!`,
        embeds: dmEmbed ? [dmEmbed] : []
      }).catch(() => null);
    }
  } catch (err) {
    logger.error(`sendWelcome failed (${guild.id}): ${err.message}`);
  }
}

async function sendGoodbye(guild, member) {
  try {
    const settings = await getSettings(guild.id);
    const cfg = settings.goodbye;
    if (!cfg?.enabled || !cfg?.channelId) return;

    const channel = guild.channels.cache.get(cfg.channelId)
      || await guild.channels.fetch(cfg.channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    const { content, embed } = buildMemberMessage({
      settings: cfg,
      guild,
      member,
      kind: 'goodbye'
    });

    await channel.send({
      content: content ? content : undefined,
      embeds: embed ? [embed] : []
    });
  } catch (err) {
    logger.error(`sendGoodbye failed (${guild.id}): ${err.message}`);
  }
}

module.exports = { getSettings, sendWelcome, sendGoodbye };
