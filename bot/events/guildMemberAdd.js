const { applyAutoRoles } = require('../systems/autorole');
const { sendWelcome } = require('../systems/welcome');
const { checkJoin } = require('../systems/antiraid');
const modlog = require('../systems/modlog');
const { updateCounters } = require('../systems/statscounter');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    await checkJoin(member);

    await Promise.allSettled([
      applyAutoRoles(member.guild, member),
      sendWelcome(member.guild, member),
      modlog.logMemberJoin(member),
      updateCounters(member.guild)
    ]);
  }
};
