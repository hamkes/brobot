const { EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  name: 'help',
  aliases: ['h', 'commands'],
  description: 'List all legacy text commands',
  usage: 'help',
  async execute(message, args, ctx) {
    const lines = ctx.commands
      .filter((c) => c.name !== 'help')
      .map((c) => `\`${ctx.prefix}${c.name}\` — ${c.description || 'No description'}`);

    lines.unshift(`\`${ctx.prefix}help\` — List all legacy text commands`);

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('✨ Brobot — Text Commands')
      .setDescription(lines.join('\n'))
      .setFooter({ text: `Prefix: ${ctx.prefix} • All commands also exist as slash commands (type /)` });

    await message.reply({ embeds: [embed] });
  }
};
