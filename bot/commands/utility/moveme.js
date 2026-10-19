const { SlashCommandBuilder, MessageFlags, ChannelType } = require('discord.js');
const { errorEmbed, successEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moveme')
    .setDescription('Move yourself to another voice channel')
    .addChannelOption((opt) =>
      opt.setName('channel').setDescription('Destination voice channel').addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice))
    .addUserOption((opt) =>
      opt.setName('user').setDescription('Move to this member\'s voice channel')),

  async execute(interaction) {
    const ownVoice = interaction.member.voice?.channel;
    if (!ownVoice) {
      return interaction.reply({ embeds: [errorEmbed('Join a voice channel first.')], flags: MessageFlags.Ephemeral });
    }

    let destination = interaction.options.getChannel('channel');
    const targetUser = interaction.options.getUser('user');

    if (!destination && targetUser) {
      const target = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      destination = target?.voice?.channel || null;
      if (!destination) {
        return interaction.reply({ embeds: [errorEmbed('That member is not in a voice channel.')], flags: MessageFlags.Ephemeral });
      }
    }
    destination = destination || ownVoice;

    if (destination.id === ownVoice.id) {
      return interaction.reply({ embeds: [errorEmbed('You are already in that channel.')], flags: MessageFlags.Ephemeral });
    }

    const moved = await interaction.member.voice.setChannel(destination, 'Brobot • /moveme').catch(() => null);
    if (!moved) {
      return interaction.reply({ embeds: [errorEmbed(`I could not move you to ${destination}.`)], flags: MessageFlags.Ephemeral });
    }

    await interaction.reply({ embeds: [successEmbed(`🔊 Moved you to ${destination}.`)], flags: MessageFlags.Ephemeral });
  }
};
