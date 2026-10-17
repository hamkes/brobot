const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const modlog = require('../../systems/modlog');
const { errorEmbed, successEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Bulk delete messages in this channel')
    
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((opt) =>
      opt.setName('amount').setDescription('Number of messages to delete (1-100)')
        
        .setRequired(true).setMinValue(1).setMaxValue(100))
    .addUserOption((opt) =>
      opt.setName('user').setDescription('Only delete messages from this user')
        ),

  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');
    const targetUser = interaction.options.getUser('user');

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    let messages = await interaction.channel.messages.fetch({ limit: 100 });
    if (targetUser) {
      messages = messages.filter((m) => m.author.id === targetUser.id);
    }
    const toDelete = [...messages.values()].slice(0, amount);

    const twoWeeksAgo = Date.now() - 14 * 86400000;
    const deletable = toDelete.filter((m) => m.createdTimestamp > twoWeeksAgo);
    const skipped = toDelete.length - deletable.length;

    if (!deletable.length) {
      return interaction.editReply({ embeds: [errorEmbed('No deletable messages found (messages older than 14 days cannot be bulk deleted).')] });
    }

    const deleted = await interaction.channel.bulkDelete(deletable, true).catch(() => null);
    if (!deleted) {
      return interaction.editReply({ embeds: [errorEmbed('Failed to delete messages. Check my permissions.')] });
    }

    await modlog.recordModAction({
      guild: interaction.guild,
      guildId: interaction.guild.id,
      action: 'purge',
      targetId: targetUser?.id || null,
      targetTag: targetUser?.tag || '',
      moderatorId: interaction.user.id,
      moderatorTag: interaction.user.tag,
      reason: `Cleared ${deleted.size} messages${targetUser ? ` from ${targetUser.tag}` : ''} in #${interaction.channel.name}`,
      source: 'slash'
    });

    await interaction.editReply({
      embeds: [successEmbed(`Deleted **${deleted.size}** message(s)${skipped ? ` (${skipped} skipped: older than 14 days)` : ''}.`)]
    });
  }
};
