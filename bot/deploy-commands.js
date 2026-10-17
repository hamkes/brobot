require('dotenv').config();
const { REST, Routes, Client } = require('discord.js');
const config = require('./config');
const logger = require('./utils/logger');
const { loadCommands } = require('./handlers/commandHandler');

async function deploy() {
  if (!config.token || !config.clientId) {
    logger.error('Missing DISCORD_TOKEN or CLIENT_ID in environment (.env file).');
    process.exit(1);
  }

  const client = new Client({ intents: [] });
  loadCommands(client);

  const body = [...client.commands.values()].map((c) => c.data.toJSON());
  const rest = new REST({ version: '10' }).setToken(config.token);

  try {
    if (config.devGuildId) {
      await rest.put(Routes.applicationGuildCommands(config.clientId, config.devGuildId), { body });
      logger.success(`Deployed ${body.length} guild command(s) to ${config.devGuildId}`);
    } else {
      await rest.put(Routes.applicationCommands(config.clientId), { body });
      logger.success(`Deployed ${body.length} global command(s)`);
    }
  } catch (err) {
    logger.error(`Deploy failed: ${err.message}`);
    process.exit(1);
  }
}

deploy();
