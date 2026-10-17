const { handleVipAuditEntry } = require('../systems/vipprotection');

module.exports = {
  name: 'guildAuditLogEntryCreate',
  async execute(entry, guild) {
    await handleVipAuditEntry(entry, guild.client);
  }
};
