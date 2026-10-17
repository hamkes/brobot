const { ActivityType } = require('discord.js');
const { Guild, ModAction } = require('../db');
const { updateCounters } = require('../systems/statscounter');
const modlog = require('../systems/modlog');
const logger = require('../utils/logger');

module.exports = {
  name: 'ready',
  aliases: ['clientReady'],
  once: true,
  async execute(client) {
    logger.success(`Logged in as ${client.user.tag} (${client.user.id})`);

    client.user.setPresence({
      activities: [{ name: '✨ Brobot | /help', type: ActivityType.Watching }],
      status: 'online'
    });

    for (const guild of client.guilds.cache.values()) {
      await Guild.findOneAndUpdate(
        { guildId: guild.id },
        { name: guild.name, icon: guild.iconURL(), ownerId: guild.ownerId, inGuild: true },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).catch(() => null);
    }

    const activeIds = [...client.guilds.cache.keys()];
    const stale = await Guild.updateMany(
      { guildId: { $nin: activeIds }, inGuild: { $ne: false } },
      { inGuild: false }
    ).catch(() => null);
    if (stale?.modifiedCount) {
      logger.info(`Marked ${stale.modifiedCount} guild(s) left while the bot was offline`);
    }

    await sweepExpiredTempBans(client);

    const refreshCounters = async () => {
      for (const guild of client.guilds.cache.values()) {
        await updateCounters(guild);
      }
    };
    await refreshCounters();
    setInterval(refreshCounters, 5 * 60 * 1000);

    logger.info(`Serving ${client.guilds.cache.size} guild(s), ${client.users.cache.size} cached users`);
  }
};

/**
 * Temp bans scheduled with setTimeout are lost on restart — unban any
 * expired ones that are still recorded in the database.
 */
async function sweepExpiredTempBans(client) {
  try {
    const expired = await ModAction.find({
      action: 'ban',
      expiresAt: { $ne: null, $lte: new Date() }
    });
    if (!expired.length) return;

    for (const record of expired) {
      const guild = client.guilds.cache.get(record.guildId);
      if (guild) {
        try {
          await guild.bans.remove(record.targetId, `[Temp Ban Expired] ${record.reason || ''}`);
          await modlog.recordModAction({
            guild,
            guildId: record.guildId,
            action: 'unban',
            targetId: record.targetId,
            targetTag: record.targetTag,
            moderatorId: client.user.id,
            moderatorTag: client.user.tag,
            reason: 'Temporary ban expired (restart catch-up)',
            source: 'system'
          });
        } catch {
          /* ban may already be gone */
        }
      }
      record.expiresAt = null;
      await record.save().catch(() => null);
    }

    logger.info(`Swept ${expired.length} expired temporary ban(s)`);
  } catch (err) {
    logger.debug(`Temp ban sweep skipped: ${err.message}`);
  }
}
