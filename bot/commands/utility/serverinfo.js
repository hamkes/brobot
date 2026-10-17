const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Show information about this server')
    ,

  async execute(interaction) {
    const guild = interaction.guild;
    await guild.fetch();

    const textChannels = guild.channels.cache.filter((c) => c.type === ChannelType.GuildText).size;
    const voiceChannels = guild.channels.cache.filter((c) => c.type === ChannelType.GuildVoice).size;
    const bots = guild.members.cache.filter((m) => m.user.bot).size;
    const humans = guild.memberCount - bots;

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(`📊 ${guild.name}`)
      .setThumbnail(guild.iconURL({ size: 256 }))
      .addFields(
        { name: '🆔 ID', value: guild.id, inline: true },
        { name: '👑 Owner', value: `<@${guild.ownerId}>`, inline: true },
        { name: '📅 Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
        { name: '👥 Members', value: `${guild.memberCount} (${humans} humans, ${bots} bots)`, inline: true },
        { name: '💬 Channels', value: `${textChannels} text · ${voiceChannels} voice`, inline: true },
        { name: '🎭 Roles', value: String(guild.roles.cache.size), inline: true },
        { name: '😀 Emojis', value: String(guild.emojis.cache.size), inline: true },
        { name: '🚀 Boost', value: `Tier ${guild.premiumTier} · ${guild.premiumSubscriptionCount || 0} boosts`, inline: true },
        { name: '✅ Verification', value: String(guild.verificationLevel), inline: true }
      )
      .setFooter({ text: '✨ Brobot' });

    await interaction.reply({ embeds: [embed] });
  }
};
