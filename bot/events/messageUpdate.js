const modlog = require('../systems/modlog');

module.exports = {
  name: 'messageUpdate',
  async execute(oldMessage, newMessage) {
    if (!oldMessage.content || !newMessage.content) return;
    if (oldMessage.content === newMessage.content) return;
    if (oldMessage.partial || newMessage.partial) return;

    await modlog.logMessageEdit(oldMessage, newMessage);
  }
};
