const mongoose = require('mongoose');

const warnSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  moderatorId: { type: String, required: true },
  moderatorTag: { type: String, default: '' },
  reason: { type: String, default: 'No reason provided' },
  active: { type: Boolean, default: true },
  caseId: { type: Number, default: 0 },
  clearedAt: { type: Date, default: null },
  clearedBy: { type: String, default: null }
}, { timestamps: true });

warnSchema.index({ guildId: 1, userId: 1, active: 1 });

module.exports = mongoose.model('Warn', warnSchema);
