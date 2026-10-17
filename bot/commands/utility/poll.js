const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a quick reaction poll')
    
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption((opt) =>
      opt.setName('question').setDescription('The poll question')
        .setRequired(true).setMaxLength(256))
    .addStringOption((opt) =>
      opt.setName('option1').setDescription('First option')
        .setRequired(true).setMaxLength(80))
    .addStringOption((opt) =>
      opt.setName('option2').setDescription('Second option')
        .setRequired(true).setMaxLength(80))
    .addStringOption((opt) =>
      opt.setName('option3').setDescription('Third option (optional)')
        .setMaxLength(80))
    .addStringOption((opt) =>
      opt.setName('option4').setDescription('Fourth option (optional)')
        .setMaxLength(80)),

  async execute(interaction) {
    const question = interaction.options.getString('question');
    const options = [
      interaction.options.getString('option1'),
      interaction.options.getString('option2'),
      interaction.options.getString('option3'),
      interaction.options.getString('option4')
    ].filter(Boolean);

    const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(`📊 ${question}`)
      .setDescription(options.map((opt, i) => `${emojis[i]} ${opt}`).join('\n\n'))
      .setFooter({ text: `Poll by ${interaction.user.tag}` });

    await interaction.reply({ embeds: [embed] });
    const message = await interaction.fetchReply();
    for (let i = 0; i < options.length; i++) {
      await message.react(emojis[i]).catch(() => null);
    }
  }
};
