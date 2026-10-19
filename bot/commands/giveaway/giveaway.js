const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
  EmbedBuilder
} = require('discord.js');
const config = require('../../config');
const logger = require('../../utils/logger');
const { parseDuration, formatDuration, successEmbed, errorEmbed } = require('../../utils/helpers');
const giveaways = require('../../systems/giveaways');

const MAX_DURATION = 60 * 24 * 60 * 60; // 60 days
const MIN_DURATION = 10; // 10 seconds

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Create and manage giveaways')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('start')
        .setDescription('Start a new giveaway')
        .addStringOption((opt) =>
          opt.setName('prize').setDescription('What are you giving away?').setRequired(true).setMaxLength(200))
        .addStringOption((opt) =>
          opt.setName('duration').setDescription('Duration, e.g. 30m, 2h, 3d, 1w').setRequired(true))
        .addIntegerOption((opt) =>
          opt.setName('winners').setDescription('Number of winners (default 1)').setMinValue(1).setMaxValue(20))
        .addChannelOption((opt) =>
          opt.setName('channel').setDescription('Channel to post in (default: current)')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
        .addRoleOption((opt) =>
          opt.setName('required_role').setDescription('Only members with this role can enter'))
        .addIntegerOption((opt) =>
          opt.setName('required_level').setDescription('Minimum level required to enter')
            .setMinValue(1).setMaxValue(500)))
    .addSubcommand((sub) =>
      sub
        .setName('end')
        .setDescription('End a giveaway now and draw the winners')
        .addStringOption((opt) =>
          opt.setName('id').setDescription('Message ID or giveaway ID').setRequired(true)))
    .addSubcommand((sub) =>
      sub
        .setName('reroll')
        .setDescription('Draw new winners for an ended giveaway')
        .addStringOption((opt) =>
          opt.setName('id').setDescription('Message ID or giveaway ID').setRequired(true))
        .addIntegerOption((opt) =>
          opt.setName('winners').setDescription('How many winners to draw').setMinValue(1).setMaxValue(20)))
    .addSubcommand((sub) =>
      sub.setName('list').setDescription('List giveaways in this server')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') return startGiveaway(interaction);
    if (sub === 'end') return endGiveaway(interaction);
    if (sub === 'reroll') return rerollGiveaway(interaction);
    return listGiveaways(interaction);
  }
};

async function startGiveaway(interaction) {
  const prize = interaction.options.getString('prize');
  const durationInput = interaction.options.getString('duration');
  const seconds = parseDuration(durationInput);

  if (!seconds) {
    return interaction.reply({
      embeds: [errorEmbed(`Invalid duration \`${durationInput}\`. Use e.g. \`30m\`, \`2h\`, \`3d\`, \`1w\`.`)],
      flags: MessageFlags.Ephemeral
    });
  }
  if (seconds < MIN_DURATION || seconds > MAX_DURATION) {
    return interaction.reply({
      embeds: [errorEmbed(`Duration must be between ${formatDuration(MIN_DURATION)} and ${formatDuration(MAX_DURATION)}.`)],
      flags: MessageFlags.Ephemeral
    });
  }

  const channel = interaction.options.getChannel('channel') || interaction.channel;
  if (!channel || !channel.isTextBased?.()) {
    return interaction.reply({
      embeds: [errorEmbed('Pick a text channel for the giveaway.')],
      flags: MessageFlags.Ephemeral
    });
  }

  const me = interaction.guild.members.me;
  if (!channel.permissionsFor(me)?.has(['SendMessages', 'EmbedLinks'])) {
    return interaction.reply({
      embeds: [errorEmbed(`I need **Send Messages** and **Embed Links** in ${channel}.`)],
      flags: MessageFlags.Ephemeral
    });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const doc = await giveaways.postGiveaway(interaction.client, {
      channel,
      prize,
      durationMs: seconds * 1000,
      winnerCount: interaction.options.getInteger('winners') || 1,
      hostId: interaction.user.id,
      hostTag: interaction.user.tag,
      requirements: {
        roleId: interaction.options.getRole('required_role')?.id || null,
        level: interaction.options.getInteger('required_level') || 0
      }
    });

    const link = `https://discord.com/channels/${interaction.guild.id}/${channel.id}/${doc.messageId}`;
    return interaction.editReply({
      embeds: [
        successEmbed(
          `Giveaway started in ${channel} for **${prize}** — ends in **${formatDuration(seconds)}**.\n` +
          `${interaction.options.getInteger('winners') || 1} winner(s) · [Jump to message](${link})`
        )
      ]
    });
  } catch (err) {
    logger.error(`Giveaway start failed: ${err.stack || err.message}`);
    return interaction.editReply({ embeds: [errorEmbed('Could not start the giveaway. Check my permissions.')] });
  }
}

async function endGiveaway(interaction) {
  const id = interaction.options.getString('id');
  const gw = await giveaways.findByIdOrMessage(interaction.guild.id, id);
  if (!gw) {
    return interaction.reply({ embeds: [errorEmbed('No giveaway found with that ID in this server.')], flags: MessageFlags.Ephemeral });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const result = await giveaways.endGiveaway(interaction.client, gw._id, { actor: interaction.user.tag });

  if (!result.ok) {
    return interaction.editReply({ embeds: [errorEmbed('That giveaway has already ended.')] });
  }

  const winners = result.winners.length
    ? result.winners.map((w) => `<@${w}>`).join(', ')
    : 'No valid entries';
  return interaction.editReply({ embeds: [successEmbed(`Giveaway ended. Winners: ${winners}`)] });
}

async function rerollGiveaway(interaction) {
  const id = interaction.options.getString('id');
  const gw = await giveaways.findByIdOrMessage(interaction.guild.id, id);
  if (!gw) {
    return interaction.reply({ embeds: [errorEmbed('No giveaway found with that ID in this server.')], flags: MessageFlags.Ephemeral });
  }
  if (!gw.ended) {
    return interaction.reply({ embeds: [errorEmbed('End the giveaway first, then reroll it.')], flags: MessageFlags.Ephemeral });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const count = interaction.options.getInteger('winners') || gw.winnerCount;
  const result = await giveaways.endGiveaway(interaction.client, gw._id, {
    reroll: true,
    winnerCount: count,
    actor: interaction.user.tag
  });

  if (!result.ok) {
    return interaction.editReply({ embeds: [errorEmbed('Could not reroll that giveaway.')] });
  }

  const winners = result.winners.length
    ? result.winners.map((w) => `<@${w}>`).join(', ')
    : 'No valid entries';
  return interaction.editReply({ embeds: [successEmbed(`Rerolled. New winners: ${winners}`)] });
}

async function listGiveaways(interaction) {
  const rows = await giveaways.listForGuild(interaction.guild.id, 15);
  if (!rows.length) {
    return interaction.reply({ embeds: [errorEmbed('No giveaways in this server yet. Use `/giveaway start`.')], flags: MessageFlags.Ephemeral });
  }

  const active = rows.filter((r) => !r.ended);
  const ended = rows.filter((r) => r.ended);

  const line = (gw) => {
    const status = gw.ended
      ? `ended${gw.winnerIds?.length ? ` · ${gw.winnerIds.length} winner(s)` : ' · no winners'}`
      : `ends <t:${Math.floor(new Date(gw.endsAt).getTime() / 1000)}:R> · ${gw.entries.length} entries`;
    return `• **${gw.prize}** — ${status} · \`${gw.messageId}\``;
  };

  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle('🎉 Giveaways')
    .setFooter({ text: 'BroBot • Giveaways' });

  if (active.length) embed.addFields({ name: `Active (${active.length})`, value: active.slice(0, 8).map(line).join('\n') });
  if (ended.length) embed.addFields({ name: `Recent (${ended.length})`, value: ended.slice(0, 6).map(line).join('\n') });

  return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
