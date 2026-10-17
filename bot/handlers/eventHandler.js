const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Loads event files from bot/events.
 * Each file exports: { name, aliases?, once?, execute }
 * The ready event also binds to 'clientReady' on discord.js versions
 * that renamed it, with a guard so it only runs once.
 */
function loadEvents(client) {
  const eventsPath = path.join(__dirname, '..', 'events');
  const files = fs.readdirSync(eventsPath).filter((f) => f.endsWith('.js'));

  let count = 0;

  for (const file of files) {
    try {
      delete require.cache[require.resolve(path.join(eventsPath, file))];
      const event = require(path.join(eventsPath, file));

      if (!event?.name || typeof event.execute !== 'function') {
        logger.warn(`Skipped invalid event file: ${file}`);
        continue;
      }

      const names = [event.name, ...(event.aliases || [])];
      const seen = new Set();

      for (const name of names) {
        if (seen.has(name)) continue;
        seen.add(name);

        const wrapped = (...args) => {
          if (event.once) {
            if (wrapped._fired) return;
            wrapped._fired = true;
          }
          Promise.resolve(event.execute(...args)).catch((err) => {
            logger.error(`Event ${name} failed: ${err.stack || err.message}`);
          });
        };

        if (event.once) client.once(name, wrapped);
        else client.on(name, wrapped);
      }

      count++;
    } catch (err) {
      logger.error(`Failed to load event ${file}: ${err.message}`);
    }
  }

  logger.info(`Loaded ${count} event(s)`);
}

module.exports = { loadEvents };
