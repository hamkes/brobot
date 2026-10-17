const { Guild } = require('../db');
const logger = require('../utils/logger');

module.exports = {
  name: 'guildDelete',
  async execute(guild) {
    if (!guild.available) {
      logger.warn(`Guild ${guild.id} is temporarily unavailable (Discord outage) — keeping settings`);
      return;
    }

    await Guild.updateOne({ guildId: guild.id }, { inGuild: false }).catch(() => null);

    logger.info(`Left guild: ${guild.name} (${guild.id}) — marked inactive in DB (settings preserved)`);
  }
};
