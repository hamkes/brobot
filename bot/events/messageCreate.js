const { handleAutoResponder } = require('../systems/autoresponder');
const { handleLeveling } = require('../systems/leveling');
const { handleAutomod } = require('../systems/automod');
const { getPrefix } = require('../utils/prefixCache');
const { handleLegacyCommand } = require('../handlers/legacyHandler');

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    if (message.author.bot || !message.guild) return;

    const moderated = await handleAutomod(message);
    if (moderated) return;

    const prefix = await getPrefix(message.client, message.guild.id);
    if (prefix && message.content.startsWith(prefix)) {
      const handled = await handleLegacyCommand(message, prefix);
      if (handled) return;
    }

    const replied = await handleAutoResponder(message);
    if (replied) return;

    await handleLeveling(message);
  }
};
