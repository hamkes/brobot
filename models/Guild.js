const mongoose = require('mongoose');

const welcomeSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  channelId: { type: String, default: null },
  useEmbed: { type: Boolean, default: true },
  title: { type: String, default: 'Welcome {user}!' },
  message: {
    type: String,
    default: 'Welcome to **{server}**, {user.mention}! You are member #{memberCount}.'
  },
  color: { type: String, default: '#5865F2' },
  image: { type: String, default: null },
  thumbnail: { type: Boolean, default: true },
  dmUser: { type: Boolean, default: false }
}, { _id: false });

const goodbyeSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  channelId: { type: String, default: null },
  useEmbed: { type: Boolean, default: true },
  title: { type: String, default: 'Goodbye {user.name}' },
  message: {
    type: String,
    default: '**{user.tag}** has left **{server}**. We are now {memberCount} members.'
  },
  color: { type: String, default: '#ED4245' },
  image: { type: String, default: null },
  thumbnail: { type: Boolean, default: true }
}, { _id: false });

const loggingSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  channelId: { type: String, default: null },
  events: {
    messageDelete: { type: Boolean, default: true },
    messageEdit: { type: Boolean, default: true },
    memberJoin: { type: Boolean, default: true },
    memberLeave: { type: Boolean, default: true },
    roleChanges: { type: Boolean, default: true },
    voice: { type: Boolean, default: true },
    bans: { type: Boolean, default: true },
    channels: { type: Boolean, default: false },
    modActions: { type: Boolean, default: true }
  }
}, { _id: false });

const automodSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  antiSpam: { type: Boolean, default: true },
  spamThreshold: { type: Number, default: 5 },
  spamInterval: { type: Number, default: 5 },
  antiLinks: { type: Boolean, default: false },
  antiInvites: { type: Boolean, default: false },
  antiBadWords: { type: Boolean, default: false },
  badWords: { type: [String], default: [] },
  antiMassMention: { type: Boolean, default: true },
  mentionLimit: { type: Number, default: 5 },
  timeoutMinutes: { type: Number, default: 10 },
  whitelistChannels: { type: [String], default: [] },
  whitelistRoles: { type: [String], default: [] }
}, { _id: false });

const antiraidSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  joinRateLimit: { type: Number, default: 10 },
  joinRateInterval: { type: Number, default: 15 },
  minAccountAgeDays: { type: Number, default: 7 },
  lockdown: { type: Boolean, default: false },
  alertChannelId: { type: String, default: null }
}, { _id: false });

const levelingSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  xpPerMessage: { type: Number, default: 15 },
  voiceXpPerMinute: { type: Number, default: 10 },
  cooldown: { type: Number, default: 60 },
  announceChannelId: { type: String, default: null },
  stackRewards: { type: Boolean, default: true },
  rewards: {
    type: [{ level: Number, roleId: String }],
    default: []
  },
  noXpChannelIds: { type: [String], default: [] },
  noXpRoleIds: { type: [String], default: [] },
  announceMessage: { type: String, default: '' },
  voiceRewards: {
    type: [{ level: Number, roleId: String }],
    default: []
  }
}, { _id: false });

const statsSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  channels: {
    type: [{ channelId: String, type: { type: String, enum: ['members', 'online', 'bots', 'roles', 'channels'] } }],
    default: []
  }
}, { _id: false });

const ticketSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  categoryId: { type: String, default: null },
  panelChannelId: { type: String, default: null },
  supportRoleId: { type: String, default: null },
  panelMessageId: { type: String, default: null },
  title: { type: String, default: 'Support Tickets' },
  description: { type: String, default: 'Click the button below to open a ticket.' },
  openMessage: { type: String, default: 'Thank you for opening a ticket. Support will be with you shortly.' }
}, { _id: false });

const starboardSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  channelId: { type: String, default: null },
  emoji: { type: String, default: '⭐' },
  threshold: { type: Number, default: 3 },
  selfStar: { type: Boolean, default: false }
}, { _id: false });

const tempChannelsSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  hubChannelId: { type: String, default: null },
  categoryId: { type: String, default: null },
  nameTemplate: { type: String, default: "{user.name}'s channel" },
  userLimit: { type: Number, default: 0 }
}, { _id: false });

const selfRolesSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  channelId: { type: String, default: null },
  messageId: { type: String, default: null },
  roles: { type: [String], default: [] }
}, { _id: false });

const embedSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  name: { type: String, default: 'Announcement' },
  channelId: { type: String, default: null },
  content: { type: String, default: '' },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
      color: { type: String, default: '#5865f2' },
  image: { type: String, default: null },
  footer: { type: String, default: '' },
  thumbnail: { type: Boolean, default: false }
}, { _id: false });

const notificationsSchema = new mongoose.Schema({
  twitch: {
    type: [{ channelId: String, streamer: String, message: { type: String, default: '🔴 **{streamer}** is now live!' } }],
    default: []
  },
  youtube: {
    type: [{ channelId: String, youtubeUrl: String, message: { type: String, default: '📹 New video: **{title}** by {channel}' } }],
    default: []
  },
  kick: {
    type: [{ channelId: String, streamer: String, message: { type: String, default: '🟢 **{streamer}** is live on Kick!' } }],
    default: []
  },
  reddit: {
    type: [{ channelId: String, subreddit: String, message: { type: String, default: '📮 New post in r/{subreddit}: **{title}**' } }],
    default: []
  }
}, { _id: false });

const guildSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true, index: true },
  name: { type: String, default: '' },
  icon: { type: String, default: null },
  ownerId: { type: String, default: null },
  inGuild: { type: Boolean, default: true },
  locale: { type: String, enum: ['en', 'ar'], default: 'en' },
  prefix: { type: String, default: '!' },
  mainChannelId: { type: String, default: null },
  modLogChannelId: { type: String, default: null },
  premium: { type: Boolean, default: false },
  vipProtection: { type: Boolean, default: false },
  vipProtectedRoleIds: { type: [String], default: [] },
  welcome: { type: welcomeSchema, default: () => ({}) },
  goodbye: { type: goodbyeSchema, default: () => ({}) },
  logging: { type: loggingSchema, default: () => ({}) },
  automod: { type: automodSchema, default: () => ({}) },
  antiraid: { type: antiraidSchema, default: () => ({}) },
  leveling: { type: levelingSchema, default: () => ({}) },
  stats: { type: statsSchema, default: () => ({}) },
  tickets: { type: ticketSchema, default: () => ({}) },
  starboard: { type: starboardSchema, default: () => ({}) },
  tempChannels: { type: tempChannelsSchema, default: () => ({}) },
  selfRoles: { type: selfRolesSchema, default: () => ({}) },
  embed: { type: embedSchema, default: () => ({}) },
  notifications: { type: notificationsSchema, default: () => ({}) },
  autoroles: { type: [String], default: [] },
  autorolesForBots: { type: Boolean, default: false },
  autoresponder: {
    type: [{ trigger: String, response: String, matchMode: { type: String, enum: ['exact', 'contains', 'startsWith'], default: 'contains' } }],
    default: []
  },
  colorRoles: { type: [String], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Guild', guildSchema);
