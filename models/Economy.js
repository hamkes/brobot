const mongoose = require('mongoose');

const economySchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  credits: { type: Number, default: 0 },
  points: { type: Number, default: 0 },
  reps: { type: Number, default: 0 },
  lastRepAt: { type: Date, default: null },
  lastDailyAt: { type: Date, default: null },
  dailyStreak: { type: Number, default: 0 },
  title: { type: String, default: '', maxlength: 80 }
}, { timestamps: true });

economySchema.index({ guildId: 1, userId: 1 }, { unique: true });
economySchema.index({ guildId: 1, credits: -1 });
economySchema.index({ guildId: 1, points: -1 });

module.exports = mongoose.model('Economy', economySchema);
