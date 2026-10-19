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
            '`/warn` `/warnings` `/clearwarns` — warning system',
            '`/setnick` `/role` — nicknames & roles',
            '`/vkick` `/move` `/lock` `/unlock` `/slowmode` — channel control',
            '`/points` — manage member points'
          ].join('\n')
        },
        {
          name: '🧰 Utility / الخدمات',
          value: [
            '`/ping` — bot latency',
            '`/avatar` `/userinfo` `/serverinfo` — info commands',
            '`/poll` — quick reaction polls',
            '`/rank` `/top` `/profile` — level cards & leaderboards',
            '`/roles` `/moveme` `/short` — server tools',
            '`/credits` `/rep` — economy',
            '`/colors` `/color` — self-assignable colors',
            '`/stats` `/ticket-panel` — counters & tickets setup'
          ].join('\n')
        },
        {
          name: '⚙️ Setup / الإعداد',
          value: [
            '`/welcome` — welcome & goodbye messages',
            '`/autorole` — automatic roles for new members',
            '`/embed` — post the embed saved from the dashboard',
            '`/setxp` `/setlevel` — manage member levels'
          ].join('\n')
        }
      )
      .setFooter({ text: '✨ Brobot • Made simple for everyone' });

    await interaction.reply({ embeds: [embed] });
  }
};
