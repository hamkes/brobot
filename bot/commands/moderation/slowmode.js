const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ChannelType } = require('discord.js');
const { parseDuration, formatDuration, errorEmbed, successEmbed } = require('../../utils/helpers');

const MAX_SLOWMODE_SECONDS = 6 * 60 * 60;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Enable or disable slowmode on a channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addStringOption((opt) =>
      opt.setName('duration').setDescription('Duration like 5s, 10m — or "off" to disable').setRequired(true))
    .addChannelOption((opt) =>
      opt.setName('channel').setDescription('Channel (default: current)').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)),

  async execute(interaction) {
    const input = interaction.options.getString('duration').trim().toLowerCase();
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    let seconds = 0;
    if (input !== 'off' && input !== '0') {
      seconds = parseDuration(input);
      if (!seconds) {
        return interaction.reply({ embeds: [errorEmbed('Invalid duration. Examples: `5s`, `10m`, `1h` — or `off`.')], flags: MessageFlags.Ephemeral });
      }
    }
    const clamped = Math.min(seconds, MAX_SLOWMODE_SECONDS);

    await channel.setRateLimitPerUser(clamped, `${interaction.user.tag} • /slowmode`).catch(() => null);

    const message = clamped === 0
      ? `Slowmode disabled in ${channel}.`
      : `🐌 Slowmode in ${channel} set to **${formatDuration(clamped)}**.`;
    await interaction.reply({ embeds: [successEmbed(message)] });
  }
};
