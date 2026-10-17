const mongoose = require('mongoose');

const modActionSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  caseId: { type: Number, default: 0 },
  action: {
    type: String,
    required: true,
    enum: ['ban', 'unban', 'kick', 'timeout', 'untimeout', 'warn', 'clearwarns', 'purge', 'automod', 'antiraid', 'vipprotection']
  },
  targetId: { type: String, default: null },
  targetTag: { type: String, default: '' },
  moderatorId: { type: String, default: null },
  moderatorTag: { type: String, default: '' },
  reason: { type: String, default: 'No reason provided' },
  duration: { type: String, default: null },
  expiresAt: { type: Date, default: null, index: true },
  source: { type: String, enum: ['slash', 'dashboard', 'automod', 'system'], default: 'slash' }
}, { timestamps: true });

modActionSchema.index({ guildId: 1, createdAt: -1 });

module.exports = mongoose.model('ModAction', modActionSchema);
