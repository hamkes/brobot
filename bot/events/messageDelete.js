const modlog = require('../systems/modlog');

module.exports = {
  name: 'messageDelete',
  async execute(message) {
    await modlog.logMessageDelete(message);
  }
};
