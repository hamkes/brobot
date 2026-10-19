const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../db');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('colors')
    .setDescription('Get a list of the available color roles'),

  async execute(interaction) {
    const settings = await Guild.findOne({ guildId: interaction.guild.id }).lean();
    const palette = (settings?.colorRoles || [])
      .map((id) => interaction.guild.roles.cache.get(id))
      .filter(Boolean);

    if (!palette.length) {
      const embed = new EmbedBuilder()
        .setColor(config.colors.info)
        .setDescription('No color roles configured yet. An admin can set them up from the dashboard.');
      return interaction.reply({ embeds: [embed] });
    }

    const lines = palette.map((role, i) => `**${i + 1}.** ${role}`);
    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(`🎨 Color roles — ${interaction.guild.name}`)
      .setDescription(`${lines.join('\n')}\n\nUse \`/color <number>\` to pick your color.`)
      .setFooter({ text: '✨ Brobot • Colors' });

    await interaction.reply({ embeds: [embed] });
  }
};
