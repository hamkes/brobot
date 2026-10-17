const { EmbedBuilder } = require('discord.js');
const { Guild } = require('../db');
const config = require('../config');
const logger = require('../utils/logger');

module.exports = {
  name: 'guildCreate',
  async execute(guild) {
    await Guild.findOneAndUpdate(
      { guildId: guild.id },
      { name: guild.name, icon: guild.iconURL(), ownerId: guild.ownerId, inGuild: true },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).catch(() => null);

    logger.success(
      `Joined guild: ${guild.name} (${guild.id}) • ${guild.memberCount} members • recorded in DB (botPresent ready)`
    );

    try {
      const systemChannel = guild.systemChannel;
      if (!systemChannel) return;

      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('✨ Thanks for adding Brobot!')
        .setDescription(
          'I am ready to help you with **moderation**, **welcome messages** and **auto roles**!\n\n' +
          '**Quick start**\n' +
          '• `/welcome setup` — customize welcome & goodbye messages\n' +
          '• `/autorole add` — give new members roles automatically\n' +
          '• `/help` — see every command\n\n' +
          `Configure everything from the web dashboard: **${config.dashboardUrl}**`
        )
        .setFooter({ text: '✨ Brobot' });

      await systemChannel.send({ embeds: [embed] });
    } catch (err) {
      logger.debug(`guildCreate greeting skipped: ${err.message}`);
    }
  }
};
