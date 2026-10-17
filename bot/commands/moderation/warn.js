const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const { Warn } = require('../../db');
const modlog = require('../../systems/modlog');
const config = require('../../config');
const { errorEmbed, canModerate } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member')
    
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) =>
      opt.setName('user').setDescription('The member to warn')
        .setRequired(true))
    .addStringOption((opt) =>
      opt.setName('reason').setDescription('Reason for the warning')
        .setMaxLength(500)),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!member) {
      return interaction.reply({ embeds: [errorEmbed('That user is not in this server.')], flags: MessageFlags.Ephemeral });
    }

    const check = canModerate(interaction.guild, interaction.member, member);
    if (!check.ok) {
      return interaction.reply({ embeds: [errorEmbed('You cannot warn that member.')], flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply();

    const warn = await Warn.create({
      guildId: interaction.guild.id,
      userId: targetUser.id,
      moderatorId: interaction.user.id,
      moderatorTag: interaction.user.tag,
      reason
    });

    const activeCount = await Warn.countDocuments({ guildId: interaction.guild.id, userId: targetUser.id, active: true });

    await modlog.recordModAction({
      guild: interaction.guild,
      guildId: interaction.guild.id,
      action: 'warn',
      targetId: targetUser.id,
      targetTag: targetUser.tag,
      moderatorId: interaction.user.id,
      moderatorTag: interaction.user.tag,
      reason,
      source: 'slash'
    });

    await member.send({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.warning)
          .setTitle(`You were warned in ${interaction.guild.name}`)
          .addFields(
            { name: 'Reason', value: reason },
            { name: 'Total active warnings', value: String(activeCount) }
          )
      ]
    }).catch(() => null);

    const embed = new EmbedBuilder()
      .setColor(config.colors.warning)
      .setDescription(`⚠️ **${targetUser.tag}** has been warned (warning #${activeCount}).\n**Reason:** ${reason}`)
      .setFooter({ text: `Warning ID: ${warn.id}` });

    await interaction.editReply({ embeds: [embed] });
  }
};
