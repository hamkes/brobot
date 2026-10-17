const mongoose = require('mongoose');

const botStatusSchema = new mongoose.Schema({
  key: { type: String, default: 'main', unique: true },
  tag: { type: String, default: '' },
  avatar: { type: String, default: null },
  guilds: { type: Number, default: 0 },
  users: { type: Number, default: 0 },
  channels: { type: Number, default: 0 },
  commands: { type: Number, default: 0 },
  uptime: { type: Number, default: 0 },
  wsPing: { type: Number, default: 0 },
  startTime: { type: Date, default: Date.now },
  lastHeartbeat: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('BotStatus', botStatusSchema);
