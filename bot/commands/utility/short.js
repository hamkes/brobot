const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { errorEmbed, successEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('short')
    .setDescription('Shorten a URL')
    .addStringOption((opt) =>
      opt.setName('url').setDescription('The URL to shorten').setRequired(true)),

  async execute(interaction) {
    const input = interaction.options.getString('url').trim();

    let parsed;
    try {
      parsed = new URL(input.startsWith('http') ? input : `https://${input}`);
    } catch {
      return interaction.reply({ embeds: [errorEmbed('That is not a valid URL.')], flags: MessageFlags.Ephemeral });
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return interaction.reply({ embeds: [errorEmbed('Only http(s) URLs can be shortened.')], flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply();

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(parsed.href)}`, { signal: controller.signal });
      clearTimeout(timer);
      const text = (await res.text()).trim();

      if (!res.ok || !text.startsWith('http')) {
        throw new Error(text || `HTTP ${res.status}`);
      }

      await interaction.editReply({ embeds: [successEmbed(`🔗 ${text}`)] });
    } catch (err) {
      await interaction.editReply({ embeds: [errorEmbed('Could not shorten that URL right now. Please try again later.')] });
    }
  }
};
