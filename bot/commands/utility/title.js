const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { Economy } = require('../../db');
const { errorEmbed, successEmbed } = require('../../utils/helpers');

const MAX_TITLE_LENGTH = 80;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('title')
    .setDescription('Set the personal title shown on your profile card')
    .addSubcommand((sub) =>
      sub.setName('set')
        .setDescription('Set your profile title')
        .addStringOption((opt) =>
          opt.setName('text').setDescription(`Your title (max ${MAX_TITLE_LENGTH} characters)`).setRequired(true).setMaxLength(MAX_TITLE_LENGTH)))
    .addSubcommand((sub) =>
      sub.setName('show')
        .setDescription('Show your current profile title'))
    .addSubcommand((sub) =>
      sub.setName('clear')
        .setDescription('Remove your profile title')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const filter = { guildId: interaction.guild.id, userId: interaction.user.id };

    if (sub === 'show') {
      const doc = await Economy.findOne(filter).lean();
      const title = doc?.title?.trim();
      return interaction.reply({
        embeds: [title ? successEmbed(`Your profile title is: **${title}**`) : errorEmbed('You have no profile title yet — set one with `/title set`.')],
        flags: MessageFlags.Ephemeral
      });
    }

    if (sub === 'clear') {
      await Economy.findOneAndUpdate(filter, { $set: { title: '' } }, { upsert: true });
      return interaction.reply({ embeds: [successEmbed('Your profile title was cleared.')] });
    }

    // Keep titles plain text: no links, no mass pings, no newlines.
    const text = interaction.options.getString('text')
      .replace(/https?:\/\/\S+/gi, '')
      .replace(/@(everyone|here)/gi, '')
      .replace(/[\r\n]+/g, ' ')
      .trim();

    if (!text) {
      return interaction.reply({ embeds: [errorEmbed('That title is empty after cleaning — try plain text.')], flags: MessageFlags.Ephemeral });
    }

    await Economy.findOneAndUpdate(filter, { $set: { title: text } }, { upsert: true });
    await interaction.reply({ embeds: [successEmbed(`Profile title set to: **${text}** — see it on \`/profile\`.`)] });
  }
};
