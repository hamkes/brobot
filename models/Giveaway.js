const mongoose = require('mongoose');

const giveawaySchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  channelId: { type: String, required: true },
  messageId: { type: String, required: true, unique: true },
  hostId: { type: String, default: '' },
  hostTag: { type: String, default: '' },
  prize: { type: String, required: true },
  winnerCount: { type: Number, default: 1, min: 1, max: 50 },
  endsAt: { type: Date, required: true },
  ended: { type: Boolean, default: false, index: true },
  endedAt: { type: Date, default: null },
  winnerIds: { type: [String], default: [] },
  entries: { type: [String], default: [] },
  requirements: {
    roleId: { type: String, default: null },
    level: { type: Number, default: 0 }
  },
  rerollCount: { type: Number, default: 0 },
  source: { type: String, enum: ['command', 'dashboard'], default: 'command' }
}, { timestamps: true });

giveawaySchema.index({ ended: 1, endsAt: 1 });
giveawaySchema.index({ guildId: 1, ended: 1 });

module.exports = mongoose.model('Giveaway', giveawaySchema);
