const { Client, GatewayIntentBits, Partials } = require('discord.js');
const config = require('./config');
const logger = require('./utils/logger');
const { connectDatabase, BotStatus } = require('./db');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');
const { startPrefixSync } = require('./utils/prefixCache');
const { startInternalServer } = require('./internalServer');
const { startNotifications } = require('./systems/notifications');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildPresences
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.GuildMember,
    Partials.User
  ],
  allowedMentions: { parse: ['users', 'roles'], repliedUser: false }
});

process.on('unhandledRejection', (err) => logger.error(`Unhandled rejection: ${err?.stack || err}`));
process.on('uncaughtException', (err) => logger.error(`Uncaught exception: ${err?.stack || err}`));

async function writeHeartbeat() {
  try {
    await BotStatus.findOneAndUpdate(
      { key: 'main' },
      {
        tag: client.user?.tag,
        avatar: client.user?.displayAvatarURL(),
        guilds: client.guilds.cache.size,
        users: client.guilds.cache.reduce((acc, g) => acc + (g.memberCount || 0), 0),
        channels: client.channels.cache.size,
        commands: client.commands?.size || 0,
        uptime: client.uptime,
        wsPing: client.ws.ping,
        lastHeartbeat: new Date()
      },
      { upsert: true }
    );
  } catch (err) {
    logger.debug(`Heartbeat skipped: ${err.message}`);
  }
}

async function main() {
  if (!config.token || !config.clientId) {
    logger.error('Missing DISCORD_TOKEN or CLIENT_ID in environment (.env file).');
    process.exit(1);
  }

  await connectDatabase();

  loadCommands(client);
  loadEvents(client);

  startPrefixSync(client);
  startInternalServer(client);
  startNotifications(client);

  const commands = [...client.commands.values()].map((c) => c.data.toJSON());
  client.once('ready', () => {
    logger.info(`${commands.length} slash command(s) ready to deploy. Run: npm run deploy`);
  });

  await client.login(config.token);

  setInterval(writeHeartbeat, 30000);
  writeHeartbeat();
}

async function shutdown(signal) {
  logger.warn(`${signal} received — shutting down gracefully...`);
  await BotStatus.findOneAndUpdate({ key: 'main' }, { uptime: 0, lastHeartbeat: new Date() }).catch(() => null);
  client.destroy();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

main().catch((err) => {
  logger.error(`Fatal startup error: ${err.stack || err.message}`);
  process.exit(1);
});

module.exports = client;
