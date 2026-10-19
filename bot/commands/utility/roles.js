const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roles')
    .setDescription('Get a list of server roles and member counts'),

  async execute(interaction) {
    const roles = [...interaction.guild.roles.cache.values()]
      .filter((r) => r.id !== interaction.guild.id)
      .sort((a, b) => b.position - a.position)
      .slice(0, 40);

    const lines = roles.map((r) => `${r} — **${r.members.size}** member${r.members.size === 1 ? '' : 's'}`);

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(`Roles of ${interaction.guild.name}`)
      .setDescription(lines.join('\n') || 'No roles found.')
      .setFooter({ text: `✨ Brobot • ${interaction.guild.roles.cache.size - 1} roles total` });

    await interaction.reply({ embeds: [embed] });
  }
};
