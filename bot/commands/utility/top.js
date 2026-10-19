const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Level } = require('../../db');
const config = require('../../config');
const { levelFromXp } = require('../../systems/leveling');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('top')
    .setDescription('Display the top members by XP'),

  async execute(interaction) {
    await interaction.deferReply();

    const rows = await Level.find({ guildId: interaction.guild.id, xp: { $gt: 0 } })
      .sort({ xp: -1 })
      .limit(10)
      .lean();

    if (!rows.length) {
      return interaction.editReply({ embeds: [new EmbedBuilder().setColor(config.colors.info).setDescription('No XP recorded yet — start chatting!')] });
    }

    const medals = ['🥇', '🥈', '🥉'];
    const lines = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const { level } = levelFromXp(row.xp);
      const user = await interaction.client.users.fetch(row.userId).catch(() => null);
      const name = user ? user.tag : `Unknown (${row.userId})`;
      lines.push(`${medals[i] || `**#${i + 1}**`} **${name}** — Level **${level}** • ${row.xp.toLocaleString()} XP`);
    }

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(`🏆 Top members in ${interaction.guild.name}`)
      .setDescription(lines.join('\n'))
      .setFooter({ text: '✨ Brobot • Leveling' });

    await interaction.editReply({ embeds: [embed] });
  }
};
