const { EmbedBuilder } = require('discord.js');
const { Guild, ModAction } = require('../db');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Anti-Raid engine.
 * Detects join bursts and young accounts, optionally kicks offenders,
 * alerts the configured channel and (optionally) triggers lockdown.
 */

const joinCache = new Map();

async function checkJoin(member) {
  try {
    const settings = await Guild.findOne({ guildId: member.guild.id });
    if (!settings?.antiraid?.enabled) return;

    const { joinRateLimit = 10, joinRateInterval = 15, minAccountAgeDays = 7, alertChannelId, lockdown } = settings.antiraid;

    const now = Date.now();
    const key = member.guild.id;
    const joins = (joinCache.get(key) || []).filter((t) => now - t < joinRateInterval * 1000);
    joins.push(now);
    joinCache.set(key, joins);

    const isBurst = joins.length >= joinRateLimit;
    const accountAgeMs = now - member.user.createdTimestamp;
    const isYoungAccount = minAccountAgeDays > 0 && accountAgeMs < minAccountAgeDays * 86400000;

    if (!isBurst && !isYoungAccount) return;

    await alert(member.guild, {
      title: isBurst ? '🚨 Possible Raid Detected' : '⚠️ Suspicious Account Joined',
      description: isBurst
        ? `${joins.length} members joined within ${joinRateInterval}s.`
        : `**${member.user.tag}** joined but the account is only ${Math.floor(accountAgeMs / 3600000)}h old.`
    }, alertChannelId);

    await ModAction.create({
      guildId: member.guild.id,
      action: 'antiraid',
      targetId: member.id,
      targetTag: member.user.tag,
      moderatorId: member.client.user.id,
      moderatorTag: member.client.user.tag,
      reason: isBurst ? 'Join burst detected' : `Account younger than ${minAccountAgeDays} days`,
      source: 'system'
    });

    if (lockdown && member.kickable) {
      await member.kick('Brobot • Anti-Raid').catch(() => null);
    }
  } catch (err) {
    logger.error(`checkJoin failed: ${err.message}`);
  }
}

async function alert(guild, { title, description }, alertChannelId) {
  const channelId = alertChannelId || (await Guild.findOne({ guildId: guild.id }))?.modLogChannelId;
  if (!channelId) return;
  const channel = guild.channels.cache.get(channelId)
    || await guild.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setColor(config.colors.danger)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();

  await channel.send({ embeds: [embed] }).catch(() => null);
}

module.exports = { checkJoin };
