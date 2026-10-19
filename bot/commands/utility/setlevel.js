const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { Level } = require('../../db');
const { errorEmbed, successEmbed } = require('../../utils/helpers');
const { totalXpForLevel } = require('../../systems/leveling');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setlevel')
    .setDescription('Set the level of a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption((opt) =>
      opt.setName('user').setDescription('The member').setRequired(true))
    .addIntegerOption((opt) =>
      opt.setName('level').setDescription('New level').setRequired(true).setMinValue(0).setMaxValue(1000)),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const level = interaction.options.getInteger('level');

    if (user.bot) {
      return interaction.reply({ embeds: [errorEmbed('Bots do not have levels.')], flags: MessageFlags.Ephemeral });
    }

    await Level.findOneAndUpdate(
      { guildId: interaction.guild.id, userId: user.id },
      { $set: { xp: totalXpForLevel(level), level } },
      { upsert: true }
    );

    await interaction.reply({ embeds: [successEmbed(`Set **${user.tag}** to level **${level}**.`)] });
  }
};
