const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Level, Economy } = require('../../db');
const config = require('../../config');
const { levelFromXp } = require('../../systems/leveling');

const TYPES = {
  text: {
    label: 'Text XP',
    emoji: '💬',
    load: (guildId) => Level.find({ guildId, xp: { $gt: 0 } }).sort({ xp: -1 }).limit(10).lean(),
    format: (row) => `Level **${levelFromXp(row.xp).level}** • ${row.xp.toLocaleString()} XP`
  },
  voice: {
    label: 'Voice XP',
    emoji: '🎙️',
    load: (guildId) => Level.find({ guildId, voiceXp: { $gt: 0 } }).sort({ voiceXp: -1 }).limit(10).lean(),
    format: (row) => `Voice Level **${levelFromXp(row.voiceXp).level}** • ${row.voiceXp.toLocaleString()} XP • ${(row.totalVoiceMinutes || 0).toLocaleString()} min`
  },
  credits: {
    label: 'Credits',
    emoji: '💳',
    load: (guildId) => Economy.find({ guildId, credits: { $gt: 0 } }).sort({ credits: -1 }).limit(10).lean(),
    format: (row) => `**${row.credits.toLocaleString()}** credits`
  },
  reps: {
    label: 'Reputation',
    emoji: '⭐',
    load: (guildId) => Economy.find({ guildId, reps: { $gt: 0 } }).sort({ reps: -1 }).limit(10).lean(),
    format: (row) => `**${row.reps.toLocaleString()}** reps`
  }
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('top')
    .setDescription('Display a server leaderboard')
    .addStringOption((opt) =>
      opt.setName('type')
        .setDescription('What to rank by (default: text XP)')
        .addChoices(
          { name: 'Text XP', value: 'text' },
          { name: 'Voice XP', value: 'voice' },
          { name: 'Credits', value: 'credits' },
          { name: 'Reputation', value: 'reps' }
        )),

  async execute(interaction) {
    await interaction.deferReply();

    const type = TYPES[interaction.options.getString('type') || 'text'];
    const rows = await type.load(interaction.guild.id);

    if (!rows.length) {
      return interaction.editReply({ embeds: [new EmbedBuilder().setColor(config.colors.info).setDescription(`No ${type.label} recorded yet — start chatting!`)] });
    }

    const medals = ['🥇', '🥈', '🥉'];
    const lines = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const user = await interaction.client.users.fetch(row.userId).catch(() => null);
      const name = user ? user.tag : `Unknown (${row.userId})`;
      lines.push(`${medals[i] || `**#${i + 1}**`} **${name}** — ${type.format(row)}`);
    }

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(`🏆 Top members in ${interaction.guild.name} — ${type.emoji} ${type.label}`)
      .setDescription(lines.join('\n'))
      .setFooter({ text: '✨ Brobot • Leaderboards' });

    await interaction.editReply({ embeds: [embed] });
  }
};
