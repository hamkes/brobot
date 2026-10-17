const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const modlog = require('../../systems/modlog');
const config = require('../../config');
const { canModerate, errorEmbed, parseDuration, formatDuration } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server')
    
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((opt) =>
      opt.setName('user').setDescription('The member to ban')
        .setRequired(true))
    .addStringOption((opt) =>
      opt.setName('reason').setDescription('Reason for the ban')
        .setMaxLength(500))
    .addStringOption((opt) =>
      opt.setName('duration').setDescription('Temporary ban duration, e.g. 1d, 12h (leave empty for permanent)')
        )
    .addIntegerOption((opt) =>
      opt.setName('delete_messages').setDescription('Delete recent messages (days, 0-7)')
        .setMinValue(0).setMaxValue(7)),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const durationInput = interaction.options.getString('duration');
    const deleteDays = interaction.options.getInteger('delete_messages') ?? 0;

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (member) {
      const check = canModerate(interaction.guild, interaction.member, member);
      if (!check.ok) {
        const messages = {
          target_is_owner: 'You cannot ban the server owner.',
          target_is_bot: 'You cannot ban me.',
          hierarchy: 'You cannot ban someone with an equal or higher role.',
          bot_hierarchy: 'My role is too low to ban that member.'
        };
        return interaction.reply({ embeds: [errorEmbed(messages[check.reason] || 'Cannot ban that member.')], flags: MessageFlags.Ephemeral });
      }
    }

    let expiresAt = null;
    if (durationInput) {
      const seconds = parseDuration(durationInput);
      if (!seconds) {
        return interaction.reply({ embeds: [errorEmbed('Invalid duration. Examples: `10m`, `12h`, `7d`.')], flags: MessageFlags.Ephemeral });
      }
      expiresAt = new Date(Date.now() + seconds * 1000);
    }

    await interaction.deferReply();

    await targetUser.send({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.danger)
          .setTitle(`You were banned from ${interaction.guild.name}`)
          .addFields(
            { name: 'Reason', value: reason },
            { name: 'Duration', value: durationInput ? `Temporary (${formatDuration(parseDuration(durationInput))})` : 'Permanent' }
          )
      ]
    }).catch(() => null);

    const banOptions = { reason: `${interaction.user.tag}: ${reason}` };
    if (deleteDays > 0) banOptions.deleteMessageSeconds = Math.min(deleteDays, 7) * 86400;

    try {
      await interaction.guild.bans.create(targetUser.id, banOptions);
    } catch {
      return interaction.editReply({ embeds: [errorEmbed('Failed to ban that user. Check my permissions.')] });
    }

    await modlog.recordModAction({
      guild: interaction.guild,
      guildId: interaction.guild.id,
      action: 'ban',
      targetId: targetUser.id,
      targetTag: targetUser.tag,
      moderatorId: interaction.user.id,
      moderatorTag: interaction.user.tag,
      reason,
      duration: durationInput || null,
      source: 'slash',
      expiresAt
    });

    const embed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setDescription(
        `🔨 **${targetUser.tag}** has been banned.\n**Reason:** ${reason}` +
        (durationInput ? `\n**Duration:** ${formatDuration(parseDuration(durationInput))}` : '')
      );

    await interaction.editReply({ embeds: [embed] });

    if (expiresAt) scheduleUnban(interaction.client, interaction.guild.id, targetUser.id, expiresAt, reason);
  }
};

function scheduleUnban(client, guildId, userId, expiresAt, reason) {
  const delay = expiresAt.getTime() - Date.now();
  if (delay <= 0 || delay > 2 ** 31 - 1) return;

  setTimeout(async () => {
    try {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) return;
      await guild.bans.remove(userId, `[Temp Ban Expired] ${reason}`);
      await modlog.recordModAction({
        guild,
        guildId,
        action: 'unban',
        targetId: userId,
        targetTag: '',
        moderatorId: client.user.id,
        moderatorTag: client.user.tag,
        reason: 'Temporary ban expired',
        source: 'system'
      });
    } catch {
      /* guild or ban may be gone */
    }
  }, delay);
}
