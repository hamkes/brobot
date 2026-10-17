const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all available commands')
    ,

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('✨ Brobot — Help')
      .setDescription(`An intuitive, beginner-friendly bot. Configure everything from the dashboard: **${config.dashboardUrl}**`)
      .addFields(
        {
          name: '🛡️ Moderation / الإدارة',
          value: [
            '`/ban` `/unban` — ban & unban members',
            '`/kick` — kick a member',
            '`/mute` `/unmute` — Discord timeouts',
            '`/clear` — bulk delete messages',
            '`/warn` `/warnings` `/clearwarns` — warning system'
          ].join('\n')
        },
        {
          name: '🧰 Utility / الخدمات',
          value: [
            '`/ping` — bot latency',
            '`/avatar` `/userinfo` `/serverinfo` — info commands',
            '`/poll` — quick reaction polls',
            '`/rank` — your level card',
            '`/stats` `/ticket-panel` — counters & tickets setup'
          ].join('\n')
        },
        {
          name: '⚙️ Setup / الإعداد',
          value: [
            '`/welcome` — welcome & goodbye messages',
            '`/autorole` — automatic roles for new members'
          ].join('\n')
        }
      )
      .setFooter({ text: '✨ Brobot • Made simple for everyone' });

    await interaction.reply({ embeds: [embed] });
  }
};
