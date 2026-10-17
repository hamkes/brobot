const { Guild } = require('../db');
const logger = require('../utils/logger');

/**
 * Auto Role engine.
 * Instantly assigns preset roles to a member when they join.
 * Skips bot accounts unless autorolesForBots is enabled.
 */

async function applyAutoRoles(guild, member) {
  try {
    if (!member || member.user.bot && !(await shouldApplyToBots(guild.id))) return;

    const settings = await Guild.findOne({ guildId: guild.id });
    if (!settings || !settings.autoroles?.length) return;

    const me = guild.members.me;
    if (!me.permissions.has('ManageRoles')) {
      logger.warn(`AutoRole skipped in ${guild.id}: missing ManageRoles permission`);
      return;
    }

    const applied = [];
    for (const roleId of settings.autoroles) {
      const role = guild.roles.cache.get(roleId)
        || await guild.roles.fetch(roleId).catch(() => null);
      if (!role) continue;
      if (role.position >= me.roles.highest.position) {
        logger.warn(`AutoRole skipped role ${roleId} in ${guild.id}: above bot hierarchy`);
        continue;
      }
      if (member.roles.cache.has(role.id)) continue;
      await member.roles.add(role, 'Brobot • Auto Role').catch(() => null);
      applied.push(role.name);
    }

    if (applied.length) {
      logger.info(`AutoRole: gave [${applied.join(', ')}] to ${member.user.tag} in ${guild.name}`);
    }
  } catch (err) {
    logger.error(`applyAutoRoles failed (${guild.id}): ${err.message}`);
  }
}

async function shouldApplyToBots(guildId) {
  const settings = await Guild.findOne({ guildId });
  return Boolean(settings?.autorolesForBots);
}

module.exports = { applyAutoRoles };
