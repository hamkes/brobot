const { EmbedBuilder } = require('discord.js');
const { Guild } = require('../db');
const config = require('../config');

module.exports = {
  name: 'guildBanRemove',
  async execute(ban) {
    const settings = await Guild.findOne({ guildId: ban.guild.id });
    if (!settings?.logging?.enabled || !settings.logging.channelId) return;
    if (settings.logging.events?.bans === false) return;

    const channel = ban.guild.channels.cache.get(settings.logging.channelId)
      || await ban.guild.channels.fetch(settings.logging.channelId).catch(() => null);
    if (!channel?.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setTitle('♻️ Member Unbanned')
      .setDescription(`**${ban.user.tag}** (${ban.user.id})`)
      .setTimestamp();

    await channel.send({ embeds: [embed] }).catch(() => null);
  }
};
