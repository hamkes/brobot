const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const modlog = require('../../systems/modlog');
const config = require('../../config');
const { canModerate, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server')
    
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((opt) =>
      opt.setName('user').setDescription('The member to kick')
        .setRequired(true))
    .addStringOption((opt) =>
      opt.setName('reason').setDescription('Reason for the kick')
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
      const messages = {
        target_is_owner: 'You cannot kick the server owner.',
        target_is_bot: 'You cannot kick me.',
        hierarchy: 'You cannot kick someone with an equal or higher role.',
        bot_hierarchy: 'My role is too low to kick that member.'
      };
      return interaction.reply({ embeds: [errorEmbed(messages[check.reason] || 'Cannot kick that member.')], flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply();

    await member.send({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.danger)
          .setTitle(`You were kicked from ${interaction.guild.name}`)
          .addFields({ name: 'Reason', value: reason })
      ]
    }).catch(() => null);

    try {
      await member.kick(`${interaction.user.tag}: ${reason}`);
    } catch {
      return interaction.editReply({ embeds: [errorEmbed('Failed to kick that member. Check my permissions.')] });
    }

    await modlog.recordModAction({
      guild: interaction.guild,
      guildId: interaction.guild.id,
      action: 'kick',
      targetId: targetUser.id,
      targetTag: targetUser.tag,
      moderatorId: interaction.user.id,
      moderatorTag: interaction.user.tag,
      reason,
      source: 'slash'
    });

    const embed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setDescription(`👢 **${targetUser.tag}** has been kicked.\n**Reason:** ${reason}`);

    await interaction.editReply({ embeds: [embed] });
  }
};
