const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { Economy } = require('../../db');
const { errorEmbed, successEmbed, formatDuration } = require('../../utils/helpers');

const REP_COOLDOWN_MS = 24 * 60 * 60 * 1000;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rep')
    .setDescription('Give a reputation point to a member (once every 24h)')
    .addUserOption((opt) =>
      opt.setName('user').setDescription('The member to give a rep').setRequired(true)),

  async execute(interaction) {
    const user = interaction.options.getUser('user');

    if (user.id === interaction.user.id) {
      return interaction.reply({ embeds: [errorEmbed('You cannot give a rep to yourself.')], flags: MessageFlags.Ephemeral });
    }
    if (user.bot) {
      return interaction.reply({ embeds: [errorEmbed('Bots do not have reputation here.')], flags: MessageFlags.Ephemeral });
    }

    const self = await Economy.findOne({ guildId: interaction.guild.id, userId: interaction.user.id }).lean();
    if (self?.lastRepAt) {
      const elapsed = Date.now() - new Date(self.lastRepAt).getTime();
      if (elapsed < REP_COOLDOWN_MS) {
        const left = Math.ceil((REP_COOLDOWN_MS - elapsed) / 1000);
        return interaction.reply({ embeds: [errorEmbed(`You already gave a rep recently. Try again in **${formatDuration(left)}**.`)], flags: MessageFlags.Ephemeral });
      }
    }

    await Economy.findOneAndUpdate(
      { guildId: interaction.guild.id, userId: interaction.user.id },
      { $set: { lastRepAt: new Date() } },
      { upsert: true }
    );
    const updated = await Economy.findOneAndUpdate(
      { guildId: interaction.guild.id, userId: user.id },
      { $inc: { reps: 1 } },
      { upsert: true, new: true }
    );

    await interaction.reply({ embeds: [successEmbed(`⭐ **${interaction.user.tag}** gave a rep to **${user.tag}** — they now have **${updated.reps.toLocaleString()}** reps!`)] });
  }
};
