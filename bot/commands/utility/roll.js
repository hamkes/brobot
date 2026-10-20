const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roll')
    .setDescription('Roll some dice')
    .addIntegerOption((opt) =>
      opt.setName('sides').setDescription('Sides per die (default: 6)').setMinValue(2).setMaxValue(1000))
    .addIntegerOption((opt) =>
      opt.setName('count').setDescription('How many dice (default: 1)').setMinValue(1).setMaxValue(25)),

  async execute(interaction) {
    const sides = interaction.options.getInteger('sides') || 6;
    const count = interaction.options.getInteger('count') || 1;

    const rolls = Array.from({ length: count }, () => 1 + Math.floor(Math.random() * sides));
    const total = rolls.reduce((sum, roll) => sum + roll, 0);

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL({ size: 128 }) })
      .setDescription(
        count === 1
          ? `🎲 Rolled a **d${sides}** → **${total}**`
          : `🎲 Rolled **${count} × d${sides}** → ${rolls.join(' + ')} = **${total}**`
      )
      .setFooter({ text: '✨ Brobot • Roll' });

    await interaction.reply({ embeds: [embed] });
  }
};
