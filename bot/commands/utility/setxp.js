const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { Level } = require('../../db');
const { errorEmbed, successEmbed } = require('../../utils/helpers');
const { levelFromXp } = require('../../systems/leveling');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setxp')
    .setDescription('Set the XP of a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption((opt) =>
      opt.setName('user').setDescription('The member').setRequired(true))
    .addIntegerOption((opt) =>
      opt.setName('amount').setDescription('New XP amount').setRequired(true).setMinValue(0).setMaxValue(1000000000)),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');

    if (user.bot) {
      return interaction.reply({ embeds: [errorEmbed('Bots do not have XP.')], flags: MessageFlags.Ephemeral });
    }

    const { level } = levelFromXp(amount);
    await Level.findOneAndUpdate(
      { guildId: interaction.guild.id, userId: user.id },
      { $set: { xp: amount, level } },
      { upsert: true }
    );

    await interaction.reply({ embeds: [successEmbed(`Set **${user.tag}** to **${amount.toLocaleString()} XP** (level **${level}**).`)] });
  }
};
