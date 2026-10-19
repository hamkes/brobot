const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ChannelType } = require('discord.js');
const { Guild } = require('../../db');
const { errorEmbed, successEmbed } = require('../../utils/helpers');
const { buildSavedEmbed } = require('../../utils/savedEmbed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Post the saved embed or preview it')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub.setName('post')
        .setDescription('Post the saved embed')
        .addChannelOption((opt) => opt.setName('channel').setDescription('Channel to post in (default: configured)').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)))
    .addSubcommand((sub) =>
      sub.setName('preview')
        .setDescription('Preview the saved embed (only you can see it)')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const settings = await Guild.findOne({ guildId: interaction.guild.id }).lean();

    const payload = buildSavedEmbed(settings, { thumbnailUrl: interaction.guild.iconURL({ size: 256 }) });
    if (!payload) {
      return interaction.reply({ embeds: [errorEmbed('No embed is configured yet. Set it up from the dashboard (Embeds page).')], flags: MessageFlags.Ephemeral });
    }

    if (sub === 'preview') {
      return interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
    }

    const channel = interaction.options.getChannel('channel')
      || interaction.guild.channels.cache.get(settings?.embed?.channelId)
      || interaction.channel;

    if (!channel?.isTextBased?.()) {
      return interaction.reply({ embeds: [errorEmbed('That channel cannot receive messages.')], flags: MessageFlags.Ephemeral });
    }

    const posted = await channel.send(payload).catch(() => null);
    if (!posted) {
      return interaction.reply({ embeds: [errorEmbed(`I could not post the embed in ${channel}.`)], flags: MessageFlags.Ephemeral });
    }

    await interaction.reply({ embeds: [successEmbed(`Embed posted in ${channel}.`)], flags: MessageFlags.Ephemeral });
  }
};
