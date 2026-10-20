const mongoose = require('mongoose');

const levelSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 0 },
  totalMessages: { type: Number, default: 0 },
  lastMessageAt: { type: Date, default: null },
  voiceXp: { type: Number, default: 0 },
  totalVoiceMinutes: { type: Number, default: 0 }
}, { timestamps: true });

levelSchema.index({ guildId: 1, userId: 1 }, { unique: true });
levelSchema.index({ guildId: 1, xp: -1 });
levelSchema.index({ guildId: 1, voiceXp: -1 });

module.exports = mongoose.model('Level', levelSchema);
