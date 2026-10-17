const modlog = require('../systems/modlog');

module.exports = {
  name: 'guildMemberUpdate',
  async execute(oldMember, newMember) {
    if (oldMember.roles.cache.size === newMember.roles.cache.size) return;

    const auditExecutor = await newMember.guild
      .fetchAuditLogs({ type: 25, limit: 1 })
      .then((logs) => logs.entries.first()?.executor)
      .catch(() => null);

    const executor = auditExecutor || newMember.client.user;

    const added = newMember.roles.cache.filter((r) => !oldMember.roles.cache.has(r.id));
    const removed = oldMember.roles.cache.filter((r) => !newMember.roles.cache.has(r.id));

    for (const role of added.values()) {
      await modlog.logRoleChange(executor, newMember, role, 'add');
    }
    for (const role of removed.values()) {
      await modlog.logRoleChange(executor, newMember, role, 'remove');
    }
  }
};
