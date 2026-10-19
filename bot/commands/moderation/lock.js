const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ChannelType } = require('discord.js');
const { errorEmbed, successEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Disable @everyone from sending messages in a channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption((opt) =>
      opt.setName('channel').setDescription('Channel to lock (default: current)').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
    .addStringOption((opt) =>
      opt.setName('reason').setDescription('Reason for locking').setMaxLength(300)),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const reason = interaction.options.getString('reason') || `Locked by ${interaction.user.tag}`;

    if (!channel?.permissionOverwrites) {
      return interaction.reply({ embeds: [errorEmbed('That channel cannot be locked.')], flags: MessageFlags.Ephemeral });
    }

    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false }, { reason }).catch(() => null);
    await interaction.reply({ embeds: [successEmbed(`🔒 ${channel} is now locked.`)] });
  }
};
