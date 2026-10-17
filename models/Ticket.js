const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  channelId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  userTag: { type: String, default: '' },
  number: { type: Number, default: 1 },
  status: { type: String, enum: ['open', 'closed'], default: 'open', index: true },
  claimedBy: { type: String, default: null },
  closedBy: { type: String, default: null },
  transcript: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Ticket', ticketSchema);
