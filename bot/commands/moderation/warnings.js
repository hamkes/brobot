const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const { Warn } = require('../../db');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('List active warnings for a member')
    
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) =>
      opt.setName('user').setDescription('The member to check')
        .setRequired(true)),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');

    const warns = await Warn.find({ guildId: interaction.guild.id, userId: targetUser.id, active: true })
      .sort({ createdAt: -1 })
      .limit(25);

    if (!warns.length) {
      return interaction.reply({ content: `✅ **${targetUser.tag}** has no active warnings.`, flags: MessageFlags.Ephemeral });
    }

    const embed = new EmbedBuilder()
      .setColor(config.colors.warning)
      .setTitle(`⚠️ Warnings for ${targetUser.tag}`)
      .setDescription(
        warns.map((w, i) =>
          `**${i + 1}.** ${w.reason}\n   ↳ by ${w.moderatorTag || `<@${w.moderatorId}>`} • <t:${Math.floor(w.createdAt.getTime() / 1000)}:R>`
        ).join('\n\n')
      )
      .setFooter({ text: `${warns.length} active warning(s)` });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
};
