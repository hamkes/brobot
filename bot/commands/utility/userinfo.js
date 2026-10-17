const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Warn } = require('../../db');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Show detailed info about a user')
    
    .addUserOption((opt) =>
      opt.setName('user').setDescription('The user (defaults to you)')
        ),

  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    const warns = await Warn.countDocuments({ guildId: interaction.guild.id, userId: user.id, active: true });

    const roles = member
      ? member.roles.cache.filter((r) => r.id !== interaction.guild.id).sort((a, b) => b.position - a.position)
      : null;

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(`👤 ${user.tag}`)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: '🆔 ID', value: user.id, inline: true },
        { name: '🤖 Bot', value: user.bot ? 'Yes' : 'No', inline: true },
        { name: '⚠️ Active warns', value: String(warns), inline: true },
        { name: '📅 Account created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:D>`, inline: true }
      );

    if (member) {
      embed.addFields(
        { name: '📥 Joined server', value: member.joinedAt ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:D>` : 'Unknown', inline: true },
        { name: '🎭 Highest role', value: member.roles.highest ? `${member.roles.highest}` : 'None', inline: true },
        {
          name: `🎨 Roles (${roles.size})`,
          value: roles.size ? roles.map((r) => `${r}`).slice(0, 15).join(' ') + (roles.size > 15 ? ` +${roles.size - 15} more` : '') : 'None'
        }
      );
    }

    await interaction.reply({ embeds: [embed] });
  }
};
