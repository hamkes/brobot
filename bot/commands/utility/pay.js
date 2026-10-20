const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { Economy } = require('../../db');
const { errorEmbed, successEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pay')
    .setDescription('Transfer some of your credits to another member')
    .addUserOption((opt) =>
      opt.setName('user').setDescription('Member to pay').setRequired(true))
    .addIntegerOption((opt) =>
      opt.setName('amount').setDescription('Credits to transfer').setRequired(true).setMinValue(1).setMaxValue(1000000000)),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    const guildId = interaction.guild.id;

    if (user.id === interaction.user.id) {
      return interaction.reply({ embeds: [errorEmbed('You cannot pay yourself.')], flags: MessageFlags.Ephemeral });
    }
    if (user.bot) {
      return interaction.reply({ embeds: [errorEmbed('Bots do not hold credits here.')], flags: MessageFlags.Ephemeral });
    }

    // Atomic debit: the filter only matches when the balance really covers
    // the payment, so two parallel /pay calls can never overdraw the account.
    const debited = await Economy.findOneAndUpdate(
      { guildId, userId: interaction.user.id, credits: { $gte: amount } },
      { $inc: { credits: -amount } },
      { new: true }
    );
    if (!debited) {
      return interaction.reply({ embeds: [errorEmbed(`Not enough credits — this payment needs **${amount.toLocaleString()}**.`)], flags: MessageFlags.Ephemeral });
    }

    const credited = await Economy.findOneAndUpdate(
      { guildId, userId: user.id },
      { $inc: { credits: amount } },
      { upsert: true, new: true }
    );

    await interaction.reply({
      embeds: [successEmbed(
        `💸 **${interaction.user.tag}** paid **${amount.toLocaleString()}** credits to **${user.tag}**.\n` +
        `Your balance: **${debited.credits.toLocaleString()}** • Their balance: **${credited.credits.toLocaleString()}**`
      )]
    });
  }
};
