const { EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  name: 'ping',
  aliases: ['pong'],
  description: 'Check the bot latency',
  usage: 'ping',
  async execute(message) {
    const sent = await message.reply({
      embeds: [new EmbedBuilder().setColor(config.colors.primary).setDescription('🏓 Pinging…')]
    });

    const roundtrip = sent.createdTimestamp - message.createdTimestamp;
    const ws = Math.round(message.client.ws.ping);

    await sent.edit({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.success)
          .setDescription(`🏓 Pong! Roundtrip: **${roundtrip}ms** • WebSocket: **${ws}ms**`)
      ]
    });
  }
};
