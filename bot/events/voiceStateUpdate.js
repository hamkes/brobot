const tempchannels = require('../systems/tempchannels');
const modlog = require('../systems/modlog');
const { updateCounters } = require('../systems/statscounter');
const { handleVoiceState } = require('../systems/leveling');

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState) {
    await handleVoiceState(oldState, newState);

    await tempchannels.handleVoiceState(oldState, newState);

    if (oldState.channelId !== newState.channelId) {
      await modlog.logVoiceState(oldState, newState);
    }

    const wentOnline = !oldState.channelId && newState.channelId;
    const wentOffline = oldState.channelId && !newState.channelId;
    if (wentOnline || wentOffline) {
      await updateCounters(newState.guild);
    }
  }
};
