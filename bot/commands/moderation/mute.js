const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const modlog = require('../../systems/modlog');
const config = require('../../config');
const { canModerate, errorEmbed, parseDuration, formatDuration, clampTimeout } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Timeout (mute) a member using Discord Timeout')
    
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) =>
      opt.setName('user').setDescription('The member to mute')
        .setRequired(true))
    .addStringOption((opt) =>
      opt.setName('duration').setDescription('Duration like 10m, 1h, 1d (max 28d)')
        )
    .addStringOption((opt) =>
      opt.setName('reason').setDescription('Reason for the mute')
        .setMaxLength(500)),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const durationInput = interaction.options.getString('duration') || '10m';
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const seconds = parseDuration(durationInput);
    if (!seconds) {
      return interaction.reply({ embeds: [errorEmbed('Invalid duration. Examples: `10m`, `1h`, `1d`.')], flags: MessageFlags.Ephemeral });
    }
    const timeoutSeconds = clampTimeout(seconds);

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!member) {
      return interaction.reply({ embeds: [errorEmbed('That user is not in this server.')], flags: MessageFlags.Ephemeral });
    }

    const check = canModerate(interaction.guild, interaction.member, member);
    if (!check.ok) {
      const messages = {
        target_is_owner: 'You cannot mute the server owner.',
        target_is_bot: 'You cannot mute me.',
        hierarchy: 'You cannot mute someone with an equal or higher role.',
        bot_hierarchy: 'My role is too low to mute that member.'
      };
      return interaction.reply({ embeds: [errorEmbed(messages[check.reason] || 'Cannot mute that member.')], flags: MessageFlags.Ephemeral });
    }

    if (!member.moderatable) {
      return interaction.reply({ embeds: [errorEmbed('I cannot timeout that member.')], flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply();

    await member.timeout(timeoutSeconds * 1000, `${interaction.user.tag}: ${reason}`).catch(() => null);

    await member.send({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.warning)
          .setTitle(`You were muted in ${interaction.guild.name}`)
          .addFields(
            { name: 'Duration', value: formatDuration(timeoutSeconds) },
            { name: 'Reason', value: reason }
          )
      ]
    }).catch(() => null);

    await modlog.recordModAction({
      guild: interaction.guild,
      guildId: interaction.guild.id,
      action: 'timeout',
      targetId: targetUser.id,
      targetTag: targetUser.tag,
      moderatorId: interaction.user.id,
      moderatorTag: interaction.user.tag,
      reason,
      duration: formatDuration(timeoutSeconds),
      source: 'slash'
    });

    const embed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setDescription(`🔇 **${targetUser.tag}** has been muted for **${formatDuration(timeoutSeconds)}**.\n**Reason:** ${reason}`);

    await interaction.editReply({ embeds: [embed] });
  }
};
