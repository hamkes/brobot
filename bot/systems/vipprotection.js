const { AuditLogEvent, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { Guild } = require('../db');
const config = require('../config');
const logger = require('../utils/logger');
const modlog = require('./modlog');

/**
 * VIP Protection (Anti-Nuke) engine.
 * Watches audit-log entries for dangerous actions (administrator grants,
 * role deletion/creation, role updates) and neutralizes them instantly
 * when the executor is not whitelisted.
 */

const DANGEROUS_EVENTS = new Set([
  AuditLogEvent.MemberRoleUpdate,
  AuditLogEvent.RoleDelete,
  AuditLogEvent.RoleCreate,
  AuditLogEvent.RoleUpdate
]);

function hasAdminRole(role) {
  return Boolean(role?.permissions?.has(PermissionFlagsBits.Administrator));
}

async function isTrusted(guild, settings, executorId, client) {
  if (!executorId) return true;
  if (executorId === client.user.id) return true;
  if (executorId === guild.ownerId) return true;
  if (config.owners.includes(executorId)) return true;

  const protectedIds = settings.vipProtectedRoleIds || [];
  if (!protectedIds.length) return false;

  const member = guild.members.cache.get(executorId)
    || await guild.members.fetch(executorId).catch(() => null);
  return Boolean(member && protectedIds.some((id) => member.roles.cache.has(id)));
}

async function alertChannel(guild, settings) {
  const id = settings.modLogChannelId || settings.logging?.channelId || settings.mainChannelId;
  if (!id) return null;
  const channel = guild.channels.cache.get(id)
    || await guild.channels.fetch(id).catch(() => null);
  return channel?.isTextBased() ? channel : null;
}

async function stripAdminFromRole(guild, role) {
  if (!role) return false;
  try {
    const next = role.permissions.remove(PermissionFlagsBits.Administrator);
    await role.setPermissions(next, 'Brobot • VIP Protection (revert Administrator)');
    return true;
  } catch (err) {
    logger.debug(`VIP: failed to strip admin from ${role?.id}: ${err.message}`);
    return false;
  }
}

async function demoteExecutor(guild, executorId) {
  const member = guild.members.cache.get(executorId)
    || await guild.members.fetch(executorId).catch(() => null);
  if (!member) return false;

  let changed = false;
  for (const role of member.roles.cache.values()) {
    if (role.managed || role.id === guild.id) continue;
    if (!hasAdminRole(role)) continue;
    if (guild.members.me.roles.highest.position <= role.position) continue;
    if (await stripAdminFromRole(guild, role)) changed = true;
  }
  return changed;
}

async function react(entry, settings, client, { title, detail, reverted }) {
  const guild = entry.guild;
  const executorId = entry.executorId;

  const demoted = executorId ? await demoteExecutor(guild, executorId) : false;

  const embed = new EmbedBuilder()
    .setColor(config.colors.danger)
    .setTitle(`💠 VIP Protection • ${title}`)
    .setDescription(detail)
    .addFields(
      { name: 'Executor', value: executorId ? `<@${executorId}> (\`${executorId}\`)` : 'Unknown', inline: true },
      { name: 'Action taken', value: [reverted, demoted && 'Administrator stripped from executor'].filter(Boolean).join('\n') || 'Alert only', inline: true }
    )
    .setFooter({ text: '✨ Brobot • Anti-Nuke' })
    .setTimestamp();

  const channel = await alertChannel(guild, settings);
  if (channel) await channel.send({ embeds: [embed] }).catch(() => null);

  await modlog.recordModAction({
    guild,
    guildId: guild.id,
    action: 'vipprotection',
    targetId: executorId,
    targetTag: '',
    moderatorId: client.user.id,
    moderatorTag: client.user.tag,
    reason: `${title} — ${detail}`,
    source: 'system'
  });

  logger.warn(`VIP Protection [${guild.id}] ${title} by ${executorId}`);
}

async function handleVipAuditEntry(entry, client) {
  if (!entry?.guild || !DANGEROUS_EVENTS.has(entry.action)) return;
  if (!entry.executorId) return;

  const settings = await Guild.findOne({ guildId: entry.guild.id }).catch(() => null);
  if (!settings?.vipProtection) return;
  if (await isTrusted(entry.guild, settings, entry.executorId, client)) return;

  const guild = entry.guild;

  try {
    if (entry.action === AuditLogEvent.MemberRoleUpdate) {
      const permsChange = entry.changes?.find((c) => c.key === 'permissions');
      if (!permsChange) return;

      const gainedAdmin =
        permsChange.newValue?.some?.((p) => p.id === String(PermissionFlagsBits.Administrator)) &&
        !permsChange.oldValue?.some?.((p) => p.id === String(PermissionFlagsBits.Administrator));
      if (!gainedAdmin) return;

      const role = entry.extra;
      const reverted = role ? await stripAdminFromRole(guild, role) : false;
      await react(entry, settings, client, {
        title: 'Administrator grant blocked',
        detail: `**${entry.executor.tag ?? entry.executorId}** tried to grant **Administrator** to ${role ? `role **${role.name}**` : 'a role'}.`,
        reverted: reverted ? 'Administrator permission removed from the role' : null
      });
      return;
    }

    if (entry.action === AuditLogEvent.RoleDelete) {
      const role = entry.target;
      let restored = null;
      try {
        restored = await guild.roles.create({
          name: role?.name || 'restored-role',
          color: role?.color,
          hoist: role?.hoist,
          mentionable: role?.mentionable,
          permissions: role?.permissions,
          reason: 'Brobot • VIP Protection (restore deleted role)'
        });
      } catch (err) {
        logger.debug(`VIP: role restore failed: ${err.message}`);
      }

      await react(entry, settings, client, {
        title: 'Role deletion blocked',
        detail: `**${entry.executor.tag ?? entry.executorId}** deleted role **${role?.name || role?.id}**.`,
        reverted: restored ? `Role **${restored.name}** recreated` : null
      });
      return;
    }

    if (entry.action === AuditLogEvent.RoleCreate) {
      const role = entry.target;
      if (!hasAdminRole(role)) return;

      let deleted = false;
      try {
        await role.delete('Brobot • VIP Protection (backdoor admin role)');
        deleted = true;
      } catch (err) {
        logger.debug(`VIP: backdoor role delete failed: ${err.message}`);
      }

      await react(entry, settings, client, {
        title: 'Backdoor admin role blocked',
        detail: `**${entry.executor.tag ?? entry.executorId}** created role **${role.name}** with **Administrator**.`,
        reverted: deleted ? 'Malicious role deleted' : null
      });
      return;
    }

    if (entry.action === AuditLogEvent.RoleUpdate) {
      const permsChange = entry.changes?.find((c) => c.key === 'permissions');
      if (!permsChange) return;

      const gainedAdmin =
        permsChange.newValue?.some?.((p) => p.id === String(PermissionFlagsBits.Administrator)) &&
        !permsChange.oldValue?.some?.((p) => p.id === String(PermissionFlagsBits.Administrator));
      if (!gainedAdmin) return;

      const role = entry.target;
      const reverted = await stripAdminFromRole(guild, role);
      await react(entry, settings, client, {
        title: 'Administrator escalation blocked',
        detail: `**${entry.executor.tag ?? entry.executorId}** added **Administrator** to role **${role?.name}**.`,
        reverted: reverted ? 'Administrator permission removed from the role' : null
      });
    }
  } catch (err) {
    logger.error(`VIP Protection failed on ${guild.id}: ${err.message}`);
  }
}

module.exports = { handleVipAuditEntry, isTrusted };
