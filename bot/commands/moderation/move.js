const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ChannelType } = require('discord.js');
const { canModerate, errorEmbed, successEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('move')
    .setDescription('Move a member to another voice channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
    .addUserOption((opt) =>
      opt.setName('user').setDescription('The member to move').setRequired(true))
    .addChannelOption((opt) =>
      opt.setName('channel').setDescription('Destination voice channel').addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const channel = interaction.options.getChannel('channel') || interaction.member.voice.channel;

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!member) {
      return interaction.reply({ embeds: [errorEmbed('That user is not in this server.')], flags: MessageFlags.Ephemeral });
    }
    if (!channel) {
      return interaction.reply({ embeds: [errorEmbed('Provide a destination channel or join a voice channel first.')], flags: MessageFlags.Ephemeral });
    }

    const check = canModerate(interaction.guild, interaction.member, member);
    if (!check.ok) {
      return interaction.reply({ embeds: [errorEmbed('You cannot move that member.')], flags: MessageFlags.Ephemeral });
    }

    const moved = await member.voice.setChannel(channel, `${interaction.user.tag} • /move`).catch(() => null);
    if (!moved) {
      return interaction.reply({ embeds: [errorEmbed(`I could not move that member to ${channel}.`)], flags: MessageFlags.Ephemeral });
    }

    await interaction.reply({ embeds: [successEmbed(`🔊 Moved **${targetUser.tag}** to ${channel}.`)] });
  }
};
