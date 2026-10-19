const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, EmbedBuilder } = require('discord.js');
const { Economy } = require('../../db');
const config = require('../../config');
const { errorEmbed, successEmbed } = require('../../utils/helpers');

const PAGE_SIZE = 15;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('points')
    .setDescription('Manage the points of members')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub.setName('set')
        .setDescription('Set the points of a member')
        .addUserOption((opt) => opt.setName('user').setDescription('The member').setRequired(true))
        .addIntegerOption((opt) => opt.setName('amount').setDescription('New amount').setRequired(true).setMinValue(0).setMaxValue(1000000000)))
    .addSubcommand((sub) =>
      sub.setName('increase')
        .setDescription('Increase the points of a member')
        .addUserOption((opt) => opt.setName('user').setDescription('The member').setRequired(true))
        .addIntegerOption((opt) => opt.setName('amount').setDescription('Amount to add').setRequired(true).setMinValue(1).setMaxValue(1000000000)))
    .addSubcommand((sub) =>
      sub.setName('decrease')
        .setDescription('Decrease the points of a member')
        .addUserOption((opt) => opt.setName('user').setDescription('The member').setRequired(true))
        .addIntegerOption((opt) => opt.setName('amount').setDescription('Amount to remove').setRequired(true).setMinValue(1).setMaxValue(1000000000)))
    .addSubcommand((sub) =>
      sub.setName('reset')
        .setDescription('Reset points for a member or everyone')
        .addUserOption((opt) => opt.setName('user').setDescription('Member (omit to reset everyone)')))
    .addSubcommand((sub) =>
      sub.setName('list')
        .setDescription('Show the members with the most points')
        .addIntegerOption((opt) => opt.setName('page').setDescription('Page number').setMinValue(1))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'list') {
      const page = interaction.options.getInteger('page') || 1;
      await interaction.deferReply();

      const [rows, total] = await Promise.all([
        Economy.find({ guildId, points: { $gt: 0 } }).sort({ points: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean(),
        Economy.countDocuments({ guildId, points: { $gt: 0 } })
      ]);

      if (!rows.length) {
        return interaction.editReply({ embeds: [errorEmbed('No points recorded yet.')] });
      }

      const medals = ['🥇', '🥈', '🥉'];
      const lines = rows.map((row, i) => {
        const rank = (page - 1) * PAGE_SIZE + i;
        return `${medals[rank] || `**#${rank + 1}**`} <@${row.userId}> — **${row.points.toLocaleString()}** points`;
      });

      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(`🎯 Points leaderboard — ${interaction.guild.name}`)
        .setDescription(lines.join('\n'))
        .setFooter({ text: `Page ${page}/${Math.max(1, Math.ceil(total / PAGE_SIZE))} • ✨ Brobot` });

      return interaction.editReply({ embeds: [embed] });
    }

    if (sub === 'reset' && !interaction.options.getUser('user')) {
      const result = await Economy.updateMany({ guildId }, { $set: { points: 0 } });
      return interaction.reply({ embeds: [successEmbed(`Reset points for **${result.modifiedCount}** members.`)] });
    }

    const user = interaction.options.getUser('user');
    if (user.bot) {
      return interaction.reply({ embeds: [errorEmbed('Bots do not have points.')], flags: MessageFlags.Ephemeral });
    }

    if (sub === 'reset') {
      await Economy.findOneAndUpdate({ guildId, userId: user.id }, { $set: { points: 0 } }, { upsert: true });
      return interaction.reply({ embeds: [successEmbed(`Reset points for **${user.tag}**.`)] });
    }

    const amount = interaction.options.getInteger('amount');

    if (sub === 'set') {
      const doc = await Economy.findOneAndUpdate(
        { guildId, userId: user.id },
        { $set: { points: amount } },
        { upsert: true, new: true }
      );
      return interaction.reply({ embeds: [successEmbed(`**${user.tag}** now has **${doc.points.toLocaleString()}** points.`)] });
    }

    const delta = sub === 'increase' ? amount : -amount;
    const doc = await Economy.findOneAndUpdate(
      { guildId, userId: user.id },
      [{ $set: { points: { $max: [0, { $add: [{ $ifNull: ['$points', 0] }, delta] }] } } }],
      { upsert: true, new: true }
    );
    return interaction.reply({ embeds: [successEmbed(`**${user.tag}** now has **${doc.points.toLocaleString()}** points.`)] });
  }
};
