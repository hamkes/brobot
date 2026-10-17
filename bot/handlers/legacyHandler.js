const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { errorEmbed } = require('../utils/helpers');

const registry = new Map();
let loaded = false;

function loadLegacyCommands() {
  const dir = path.join(__dirname, '..', 'legacy');
  if (!fs.existsSync(dir)) return registry;

  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) {
    try {
      const command = require(path.join(dir, file));
      if (!command?.name || typeof command.execute !== 'function') {
        logger.warn(`Skipped legacy command ${file}: missing name or execute()`);
        continue;
      }
      registry.set(command.name.toLowerCase(), command);
      for (const alias of command.aliases || []) {
        registry.set(String(alias).toLowerCase(), command);
      }
    } catch (err) {
      logger.error(`Failed to load legacy command ${file}: ${err.message}`);
    }
  }

  loaded = true;
  logger.info(`Loaded ${listLegacyCommands().length} legacy command(s)`);
  return registry;
}

function listLegacyCommands() {
  return [...new Set(registry.values())].filter((c) => !c.hidden);
}

async function handleLegacyCommand(message, prefix) {
  const args = message.content.slice(prefix.length).trim().split(/\s+/);
  const name = (args.shift() || '').toLowerCase();
  if (!name) return false;

  const command = registry.get(name);
  if (!command) return false;

  try {
    await command.execute(message, args, { prefix, commands: listLegacyCommands() });
  } catch (err) {
    logger.error(`Legacy command "${name}" failed: ${err.stack || err.message}`);
    message.reply({ embeds: [errorEmbed('Something went wrong while running that command.')] }).catch(() => null);
  }
  return true;
}

if (!loaded) loadLegacyCommands();

module.exports = {
  handleLegacyCommand,
  loadLegacyCommands,
  listLegacyCommands,
  legacyRegistry: registry
};
