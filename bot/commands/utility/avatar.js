const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Show a user avatar')
    
    .addUserOption((opt) =>
      opt.setName('user').setDescription('The user (defaults to you)')
        ),

  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(`${user.username}'s avatar`)
      .setImage(user.displayAvatarURL({ size: 1024 }))
      .setFooter({ text: user.tag });

    await interaction.reply({ embeds: [embed] });
  }
};
