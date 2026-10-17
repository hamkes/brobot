const { EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  name: 'avatar',
  aliases: ['av'],
  description: 'Show a member avatar (defaults to you)',
  usage: 'avatar [@user | user ID]',
  async execute(message, args) {
    const target =
      message.mentions.users.first() ||
      (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null) ||
      message.author;

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(`${target.username}'s avatar`)
      .setImage(target.displayAvatarURL({ size: 512 }));

    await message.reply({ embeds: [embed] });
  }
};
