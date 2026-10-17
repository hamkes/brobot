const { sendGoodbye } = require('../systems/welcome');
const modlog = require('../systems/modlog');
const { updateCounters } = require('../systems/statscounter');

module.exports = {
  name: 'guildMemberRemove',
  async execute(member) {
    await Promise.allSettled([
      sendGoodbye(member.guild, member),
      modlog.logMemberLeave(member),
      updateCounters(member.guild)
    ]);
  }
};
