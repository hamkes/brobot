const { PermissionFlagsBits } = require('discord.js');
const config = require('../config');
const { Guild } = require('../db');
const { getPrefix, setPrefix, isValidPrefix, MAX_PREFIX_LENGTH } = require('../utils/prefixCache');
const { successEmbed, errorEmbed, infoEmbed } = require('../utils/helpers');

module.exports = {
  name: 'prefix',
  aliases: ['setprefix'],
  description: 'View or change the server prefix',
  usage: 'prefix <new prefix | reset>',
  async execute(message, args) {
    const guildId = message.guild.id;
    const current = await getPrefix(message.client, guildId);

    if (!args[0]) {
      return message.reply({
        embeds: [infoEmbed(
          `Prefix for **${message.guild.name}**`,
          `Current prefix: \`${current}\`\nChange it with \`${current}prefix <new>\` or reset with \`${current}prefix reset\`.`
        )]
      });
    }

    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.reply({
        embeds: [errorEmbed('You need the **Manage Server** permission to change the prefix.')]
      });
    }

    const reset = ['reset', 'default'].includes(args[0].toLowerCase());
    const requested = reset ? config.defaultPrefix : args[0];

    if (!isValidPrefix(requested)) {
      return message.reply({
        embeds: [errorEmbed(`Invalid prefix. Use 1–${MAX_PREFIX_LENGTH} characters with no spaces.`)]
      });
    }

    const prefix = requested.trim();

    await Guild.findOneAndUpdate(
      { guildId },
      { $set: { guildId, prefix } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    setPrefix(message.client, guildId, prefix);

    await message.reply({
      embeds: [successEmbed(`Prefix updated to \`${prefix}\` — it applies immediately, no restart needed.`)]
    });
  }
};
