const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags
} = require('discord.js');
const { Guild } = require('../../db');
const { ensureCounterChannel, countFor } = require('../../systems/statscounter');
const config = require('../../config');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Manage server statistics counters')
    
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub.setName('add').setDescription('Create a counter channel')
        
        .addStringOption((opt) =>
          opt.setName('type').setDescription('What to count')
            .setRequired(true)
            .addChoices(
              { name: 'Members (الأعضاء)', value: 'members' },
              { name: 'Online (المتصلين)', value: 'online' },
              { name: 'Bots (البوتات)', value: 'bots' },
              { name: 'Roles (الرتب)', value: 'roles' },
              { name: 'Channels (الرومات)', value: 'channels' }
            )))
    .addSubcommand((sub) =>
      sub.setName('list').setDescription('List counter channels')
        ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'add') {
      if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return interaction.reply({ embeds: [errorEmbed('I need the **Manage Channels** permission.')], flags: MessageFlags.Ephemeral });
      }
      const type = interaction.options.getString('type');
      const created = await ensureCounterChannel(interaction.guild, type);
      if (!created) {
        return interaction.reply({ embeds: [errorEmbed('Failed to create the counter channel.')], flags: MessageFlags.Ephemeral });
      }
      return interaction.reply({ embeds: [successEmbed(`Counter created: <#${created.channelId}> (**${type}**). It now shows **${countFor(interaction.guild, type).toLocaleString('en-US')}**.`)] });
    }

    if (sub === 'list') {
      const settings = await Guild.findOne({ guildId: interaction.guild.id });
      const counters = settings?.stats?.channels || [];
      if (!counters.length) {
        return interaction.reply({ embeds: [errorEmbed('No counters yet. Use `/stats add`.')], flags: MessageFlags.Ephemeral });
      }
      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('📊 Statistics Counters')
        .setDescription(counters.map((c) => `• <#${c.channelId}> — \`${c.type}\``).join('\n'));
      return interaction.reply({ embeds: [embed] });
    }
  }
};
