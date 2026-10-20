const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Level } = require('../../db');
const { levelFromXp } = require('../../systems/leveling');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Show your level card')
    
    .addUserOption((opt) =>
      opt.setName('user').setDescription('The user (defaults to you)')
        ),

  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;

    const record = await Level.findOne({ guildId: interaction.guild.id, userId: user.id });
    const xp = record?.xp || 0;
    const { level, progress, needed } = levelFromXp(xp);

    const rank = (await Level.countDocuments({ guildId: interaction.guild.id, xp: { $gt: xp } })) + 1;

    const filled = Math.min(10, Math.floor((progress / needed) * 10));
    const bar = '▰'.repeat(filled) + '▱'.repeat(10 - filled);

    const voiceXp = record?.voiceXp || 0;
    const voice = levelFromXp(voiceXp);
    const voiceRank = voiceXp > 0
      ? (await Level.countDocuments({ guildId: interaction.guild.id, voiceXp: { $gt: voiceXp } })) + 1
      : null;

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setAuthor({ name: `${user.tag}`, iconURL: user.displayAvatarURL() })
      .setTitle(`🏆 Level ${level}`)
      .setDescription(`${bar}  \`${progress}/${needed} XP\``)
      .addFields(
        { name: '⭐ Total XP', value: xp.toLocaleString('en-US'), inline: true },
        { name: '📊 Server rank', value: `#${rank}`, inline: true },
        { name: '💬 Messages', value: String(record?.totalMessages || 0), inline: true },
        { name: '🎙️ Voice Level', value: `**${voice.level}**${voiceRank ? ` • #${voiceRank}` : ''}`, inline: true },
        { name: '🎧 Voice XP', value: voiceXp.toLocaleString('en-US'), inline: true },
        { name: '⏱️ Voice time', value: `${(record?.totalVoiceMinutes || 0).toLocaleString('en-US')} min`, inline: true }
      )
      .setFooter({ text: '✨ Brobot • Leveling' });

    await interaction.reply({ embeds: [embed] });
  }
};
