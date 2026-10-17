const fs = require('fs');
const path = require('path');
const { Collection, SlashCommandBuilder } = require('discord.js');
const logger = require('../utils/logger');

/**
 * Recursively loads slash commands from bot/commands into client.commands.
 */
function loadCommands(client) {
  client.commands = new Collection();

  const commandsPath = path.join(__dirname, '..', 'commands');
  const commandFiles = [];

  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.js')) commandFiles.push(full);
    }
  };
  walk(commandsPath);

  for (const file of commandFiles) {
    try {
      delete require.cache[require.resolve(file)];
      const command = require(file);

      if (!command?.data || typeof command.execute !== 'function') {
        logger.warn(`Skipped invalid command file: ${path.relative(commandsPath, file)}`);
        continue;
      }
      if (!(command.data instanceof SlashCommandBuilder) && typeof command.data.toJSON !== 'function') {
        logger.warn(`Skipped command without valid builder: ${path.relative(commandsPath, file)}`);
        continue;
      }

      client.commands.set(command.data.name, command);
    } catch (err) {
      logger.error(`Failed to load command ${file}: ${err.message}`);
    }
  }

  logger.info(`Loaded ${client.commands.size} command(s)`);
  return client.commands;
}

module.exports = { loadCommands };
