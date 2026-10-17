const modlog = require('../systems/modlog');

module.exports = {
  name: 'guildBanAdd',
  async execute(ban) {
    const executor = await ban.guild
      .fetchAuditLogs({ type: 22, limit: 1 })
      .then((logs) => {
        const entry = logs.entries.first();
        if (entry && entry.target?.id === ban.user.id) return entry.executor;
        return null;
      })
      .catch(() => null);

    await modlog.logBan(executor, ban.user, ban.reason, 'ban');
  }
};
