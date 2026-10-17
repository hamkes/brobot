const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags
} = require('discord.js');
const { Guild } = require('../../db');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Setup welcome & goodbye messages')
    
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub.setName('channel').setDescription('Set the welcome/goodbye channel')
        
        .addChannelOption((opt) =>
          opt.setName('channel').setDescription('The channel')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
        .addStringOption((opt) =>
          opt.setName('mode').setDescription('Welcome or goodbye')
            
            .addChoices(
              { name: 'Welcome (ترحيب)', value: 'welcome' },
              { name: 'Goodbye (توديع)', value: 'goodbye' }
            )))
    .addSubcommand((sub) =>
      sub.setName('message').setDescription('Set a custom message with placeholders')
        
        .addStringOption((opt) =>
          opt.setName('text').setDescription('e.g. Welcome {user.mention} to {server}!')
            
            .setRequired(true).setMaxLength(1500))
        .addStringOption((opt) =>
          opt.setName('mode').setDescription('Welcome or goodbye')
            
            .addChoices(
              { name: 'Welcome (ترحيب)', value: 'welcome' },
              { name: 'Goodbye (توديع)', value: 'goodbye' }
            )))
    .addSubcommand((sub) =>
      sub.setName('toggle').setDescription('Enable or disable welcome/goodbye messages')
        
        .addBooleanOption((opt) =>
          opt.setName('enabled').setDescription('Enabled?')
            .setRequired(true))
        .addStringOption((opt) =>
          opt.setName('mode').setDescription('Welcome or goodbye')
            
            .addChoices(
              { name: 'Welcome (ترحيب)', value: 'welcome' },
              { name: 'Goodbye (توديع)', value: 'goodbye' }
            )))
    .addSubcommand((sub) =>
      sub.setName('preview').setDescription('Preview the welcome message')
        ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const mode = interaction.options.getString('mode') || 'welcome';

    let settings = await Guild.findOne({ guildId: interaction.guild.id });
    if (!settings) settings = await Guild.create({ guildId: interaction.guild.id, name: interaction.guild.name });

    if (sub === 'channel') {
      const channel = interaction.options.getChannel('channel');
      settings[mode].channelId = channel.id;
      settings[mode].enabled = true;
      await settings.save();
      return interaction.reply({ embeds: [successEmbed(`${mode === 'welcome' ? 'Welcome' : 'Goodbye'} channel set to ${channel} and enabled.`)] });
    }

    if (sub === 'message') {
      const text = interaction.options.getString('text');
      settings[mode].message = text;
      settings[mode].useEmbed = true;
      await settings.save();
      return interaction.reply({ embeds: [successEmbed(`Custom ${mode} message saved:\n\n${text}`)] });
    }

    if (sub === 'toggle') {
      const enabled = interaction.options.getBoolean('enabled');
      if (enabled && !settings[mode].channelId) {
        return interaction.reply({ embeds: [errorEmbed('Set a channel first with `/welcome channel`.')], flags: MessageFlags.Ephemeral });
      }
      settings[mode].enabled = enabled;
      await settings.save();
      return interaction.reply({ embeds: [successEmbed(`${mode === 'welcome' ? 'Welcome' : 'Goodbye'} messages are now **${enabled ? 'enabled' : 'disabled'}**.`)] });
    }

    if (sub === 'preview') {
      const { buildMemberMessage } = require('../../utils/placeholders');
      const { content, embed } = buildMemberMessage({
        settings: settings.welcome,
        guild: interaction.guild,
        member: interaction.member,
        kind: 'welcome'
      });
      return interaction.reply({ content: content || undefined, embeds: embed ? [embed] : [] });
    }
  }
};
