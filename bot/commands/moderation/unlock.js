const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ChannelType } = require('discord.js');
const { errorEmbed, successEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Allow @everyone to send messages in a channel again')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption((opt) =>
      opt.setName('channel').setDescription('Channel to unlock (default: current)').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    if (!channel?.permissionOverwrites) {
      return interaction.reply({ embeds: [errorEmbed('That channel cannot be unlocked.')], flags: MessageFlags.Ephemeral });
    }

    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null }, { reason: `${interaction.user.tag} • /unlock` }).catch(() => null);
    await interaction.reply({ embeds: [successEmbed(`🔓 ${channel} is now unlocked.`)] });
  }
};
