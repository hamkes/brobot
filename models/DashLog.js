const mongoose = require('mongoose');

const dashLogSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  userId: { type: String, required: true },
  userTag: { type: String, default: '' },
  section: { type: String, default: 'general' },
  action: { type: String, required: true },
  details: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now, index: true }
});

dashLogSchema.index({ guildId: 1, createdAt: -1 });

module.exports = mongoose.model('DashLog', dashLogSchema);
