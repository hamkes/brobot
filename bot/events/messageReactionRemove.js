const { handleReaction } = require('../systems/starboard');

module.exports = {
  name: 'messageReactionRemove',
  async execute(reaction, user) {
    if (reaction.partial) {
      await reaction.fetch().catch(() => null);
    }
    await handleReaction(reaction, user, 'remove');
  }
};
