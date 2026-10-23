const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { Level } = require('../../db');
const { errorEmbed, successEmbed } = require('../../utils/helpers');

// BroBot original (v1.3): reset a member's — or the whole server's —
// text / voice leveling progress. Server-wide resets need an explicit
// confirm flag so a stray click can never wipe a leaderboard.
const RESET_SETS = {
  text: { xp: 0, level: 0 },
  voice: { voiceXp: 0, totalVoiceMinutes: 0 },
  all: { xp: 0, level: 0, voiceXp: 0, totalVoiceMinutes: 0 }
};

const TYPE_LABELS = { text: 'text XP', voice: 'voice XP', all: 'text and voice XP' };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reset')
    .setDescription('Reset leveling progress for one member or the whole server')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption((opt) =>
      opt.setName('user').setDescription('The member to reset (omit for a server-wide reset)').setRequired(false))
    .addStringOption((opt) =>
      opt.setName('type').setDescription('What to reset (default: all)')
        .setRequired(false)
        .addChoices(
          { name: 'Text XP', value: 'text' },
          { name: 'Voice XP', value: 'voice' },
          { name: 'All XP', value: 'all' }
        ))
    .addBooleanOption((opt) =>
      opt.setName('confirm').setDescription('Required to confirm a server-wide reset').setRequired(false)),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const type = interaction.options.getString('type') || 'all';
    const confirm = interaction.options.getBoolean('confirm') || false;
    const $set = RESET_SETS[type] || RESET_SETS.all;
    const label = TYPE_LABELS[type] || TYPE_LABELS.all;

    if (user) {
      if (user.bot) {
        return interaction.reply({ embeds: [errorEmbed('Bots do not have XP.')], flags: MessageFlags.Ephemeral });
      }

      // No document yet = nothing stored for this member; report that
      // cleanly instead of creating an empty record just to zero it.
      const existing = await Level.findOne({ guildId: interaction.guild.id, userId: user.id });
      if (!existing) {
        return interaction.reply({
          embeds: [successEmbed(`**${user.tag}** has no stored leveling progress in this server — nothing to reset.`)]
        });
      }

      await Level.updateOne({ guildId: interaction.guild.id, userId: user.id }, { $set });
      return interaction.reply({
        embeds: [successEmbed(`Reset ${label} for **${user.tag}**.`)]
      });
    }

    // Server-wide reset — destructive, so it needs the explicit flag.
    if (!confirm) {
      return interaction.reply({
        embeds: [errorEmbed('A server-wide reset wipes leveling progress for **every** member. Re-run `/reset` with `confirm: true` if you really mean it.')],
        flags: MessageFlags.Ephemeral
      });
    }

    const result = await Level.updateMany({ guildId: interaction.guild.id }, { $set });
    const matched = result.matchedCount ?? result.n ?? 0;
    const modified = result.modifiedCount ?? matched;
    return interaction.reply({
      embeds: [successEmbed(`Reset ${label} server-wide: **${modified}** record(s) updated (${matched} matched).`)]
    });
  }
};
