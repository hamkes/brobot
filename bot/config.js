require('dotenv').config();

const clientId = process.env.CLIENT_ID || '';
const DEFAULT_INVITE_URL = 'https://discord.com/oauth2/authorize?client_id=1560732520499257495&permissions=8&integration_type=0&scope=bot';

module.exports = {
  token: process.env.DISCORD_TOKEN || '',
  clientId,
  clientSecret: process.env.CLIENT_SECRET || '',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/brobot',
  dashboardUrl: process.env.DASHBOARD_URL || 'http://localhost:3000',
  port: Number(process.env.PORT || 3000),
  internalPort: Number(process.env.INTERNAL_PORT || 3001),
  sessionSecret: process.env.SESSION_SECRET || 'change-me-in-production',
  devGuildId: process.env.DEV_GUILD_ID || null,
  owners: (process.env.OWNER_IDS || '').split(',').map((s) => s.trim()).filter(Boolean),
  inviteUrl:
    process.env.BOT_INVITE_URL ||
    (clientId
      ? `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=8&integration_type=0&scope=bot`
      : DEFAULT_INVITE_URL),
  colors: {
    primary: 0x7c3aed,
    success: 0x57f287,
    warning: 0xfee75c,
    danger: 0xed4245,
    info: 0x5dadec,
    dark: 0x2b2d31
  },
  defaultPrefix: '!',
  builderDelayMs: Number(process.env.BUILDER_DELAY_MS || 700),
  notificationsIntervalMs: Number(process.env.NOTIFICATIONS_INTERVAL_MS || 90000),
  twitchClientId: process.env.TWITCH_CLIENT_ID || '',
  twitchClientSecret: process.env.TWITCH_CLIENT_SECRET || '',
  emojis: {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
    star: '⭐',
    ticket: '🎫'
  }
};
