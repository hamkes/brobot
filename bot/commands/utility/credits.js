const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Economy } = require('../../db');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('credits')
    .setDescription('Check your credits balance (or someone else\'s)')
    .addUserOption((opt) =>
      opt.setName('user').setDescription('Member to check (default: you)')),

  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;

    const doc = await Economy.findOne({ guildId: interaction.guild.id, userId: user.id }).lean();
    const credits = doc?.credits || 0;

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ size: 128 }) })
      .setDescription(`💳 **${user.username}** has **${credits.toLocaleString()}** credits.`)
      .setFooter({ text: '✨ Brobot • Economy' });

    await interaction.reply({ embeds: [embed] });
  }
};
