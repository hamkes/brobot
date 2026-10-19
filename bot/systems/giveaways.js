'use strict';
/* ============================================================
   🎉 BroBot — Giveaways engine
   Persistent, restart-safe giveaways with button entries,
   role/level requirements and rerolls.
   ============================================================ */
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags
} = require('discord.js');
const config = require('../config');
const logger = require('../utils/logger');
const { Giveaway, Level } = require('../db');

const ENTER_PREFIX = 'giveaway:enter:';
const MAX_TIMEOUT = 2 ** 31 - 1;
const timers = new Map();

function ts(date) {
  return Math.floor(new Date(date).getTime() / 1000);
}

function requirementsText(gw) {
  const parts = [];
  if (gw?.requirements?.roleId) parts.push(`role <@&${gw.requirements.roleId}>`);
  if (gw?.requirements?.level) parts.push(`level **${gw.requirements.level}**+`);
  return parts.length ? parts.join(' · ') : 'none';
}

function buildEmbed(gw) {
  const ended = Boolean(gw.ended);
  const embed = new EmbedBuilder()
    .setColor(ended ? config.colors.dark : config.colors.primary)
    .setTitle(`${ended ? '🎉 Ended' : '🎉'} ${gw.prize}`)
    .setFooter({ text: `BroBot • Giveaways${gw.rerollCount ? ` • reroll #${gw.rerollCount}` : ''}` });

  if (ended) {
    embed.setDescription(
      gw.winnerIds?.length
        ? `Winners: ${gw.winnerIds.map((id) => `<@${id}>`).join(', ')}`
        : 'No valid entries — no winner this time.'
    );
  } else {
    embed.setDescription('Click **Enter** below to join!\nEnds <t:' + ts(gw.endsAt) + ':R> (<t:' + ts(gw.endsAt) + ':f>)');
  }

  embed.addFields(
    { name: 'Hosted by', value: gw.hostId ? `<@${gw.hostId}>` : 'unknown', inline: true },
    { name: 'Winners', value: String(gw.winnerCount), inline: true },
    { name: 'Entries', value: String(gw.entries?.length || 0), inline: true },
    { name: 'Requirements', value: requirementsText(gw), inline: false }
  );
  return embed;
}

function buildRow(gw) {
  const ended = Boolean(gw.ended);
  const button = new ButtonBuilder()
    .setCustomId(`${ENTER_PREFIX}${gw._id}`)
    .setLabel(ended ? 'Giveaway ended' : 'Enter giveaway')
    .setEmoji('🎉')
    .setStyle(ended ? ButtonStyle.Secondary : ButtonStyle.Primary)
    .setDisabled(ended);
  return new ActionRowBuilder().addComponents(button);
}

function buildPayload(gw) {
  return { embeds: [buildEmbed(gw)], components: [buildRow(gw)] };
}

/* ------------------------------------------------------------
   Creation
   ------------------------------------------------------------ */
async function postGiveaway(client, {
  channel,
  prize,
  durationMs,
  winnerCount = 1,
  hostId = '',
  hostTag = '',
  requirements = {},
  source = 'command'
}) {
  const doc = await Giveaway.create({
    guildId: channel.guild.id,
    channelId: channel.id,
    messageId: `pending-${Date.now()}`,
    hostId,
    hostTag,
    prize,
    winnerCount,
    endsAt: new Date(Date.now() + durationMs),
    requirements: {
      roleId: requirements.roleId || null,
      level: Number(requirements.level || 0)
    },
    source
  });

  const message = await channel.send(buildPayload(doc));
  doc.messageId = message.id;
  await doc.save();

  schedule(client, doc._id);
  return doc;
}

/* ------------------------------------------------------------
   Scheduling (restart-safe; long delays are re-armed)
   ------------------------------------------------------------ */
function clearTimer(id) {
  const key = String(id);
  if (timers.has(key)) {
    clearTimeout(timers.get(key));
    timers.delete(key);
  }
}

function schedule(client, id) {
  const key = String(id);
  clearTimer(key);

  const tick = async () => {
    const gw = await Giveaway.findById(key).catch(() => null);
    if (!gw || gw.ended) {
      timers.delete(key);
      return;
    }
    const delay = new Date(gw.endsAt).getTime() - Date.now();
    if (delay <= 0) {
      timers.delete(key);
      await endGiveaway(client, key).catch((err) =>
        logger.error(`Giveaway ${key} failed to end: ${err.message}`)
      );
      return;
    }
    timers.set(key, setTimeout(tick, Math.min(delay, MAX_TIMEOUT)));
  };

  tick().catch((err) => logger.error(`Giveaway ${key} scheduling failed: ${err.message}`));
}

/* ------------------------------------------------------------
   Eligibility + winner drawing
   ------------------------------------------------------------ */
async function eligibleEntries(guild, gw) {
  let candidates = [...new Set(gw.entries || [])];
  if (!candidates.length || !guild) return candidates;

  const roleId = gw.requirements?.roleId;
  if (roleId) {
    const kept = [];
    for (const id of candidates) {
      const member = guild.members.cache.get(id) || (await guild.members.fetch(id).catch(() => null));
      if (member?.roles?.cache?.has(roleId)) kept.push(id);
    }
    candidates = kept;
  }

  const minLevel = Number(gw.requirements?.level || 0);
  if (minLevel > 0 && candidates.length) {
    const rows = await Level.find({ guildId: gw.guildId, userId: { $in: candidates } }).lean();
    const levels = new Map(rows.map((row) => [row.userId, row.level || 0]));
    candidates = candidates.filter((id) => (levels.get(id) || 0) >= minLevel);
  }

  return candidates;
}

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function drawWinners(guild, gw, count) {
  const pool = await eligibleEntries(guild, gw);
  return shuffle(pool).slice(0, Math.max(0, Math.min(count || gw.winnerCount, pool.length)));
}

/* ------------------------------------------------------------
   Ending / rerolling
   ------------------------------------------------------------ */
async function endGiveaway(client, id, { reroll = false, winnerCount = 0, actor = null } = {}) {
  const gw = await Giveaway.findById(id).catch(() => null);
  if (!gw) return { ok: false, reason: 'not_found' };
  if (gw.ended && !reroll) return { ok: false, reason: 'already_ended' };

  clearTimer(gw._id);

  const channel = await client.channels.fetch(gw.channelId).catch(() => null);
  const guild = channel?.guild || client.guilds.cache.get(gw.guildId) || null;
  const winners = await drawWinners(guild, gw, winnerCount || gw.winnerCount);

  if (reroll) {
    gw.rerollCount += 1;
    gw.winnerIds = winners;
  } else {
    gw.ended = true;
    gw.endedAt = new Date();
    gw.winnerIds = winners;
  }
  await gw.save();

  if (channel) {
    const message = await channel.messages.fetch(gw.messageId).catch(() => null);
    if (message) await message.edit(buildPayload(gw)).catch(() => null);

    const prefix = reroll ? '🔁 **Reroll**' : '🎉 **Giveaway ended**';
    const body = winners.length
      ? `${prefix} — congratulations ${winners.map((w) => `<@${w}>`).join(', ')}! You won **${gw.prize}**.`
      : `${prefix} — no valid entries for **${gw.prize}**, so no winner this time.`;
    await channel.send({ content: body, allowedMentions: { users: winners } }).catch(() => null);
  }

  logger.info(
    `Giveaway ${reroll ? 'rerolled' : 'ended'}: "${gw.prize}" in ${gw.guildId} ` +
    `(${gw.entries.length} entries, ${winners.length} winner(s))${actor ? ` by ${actor}` : ''}`
  );

  return { ok: true, winners, giveaway: gw };
}

/* ------------------------------------------------------------
   Button entries
   ------------------------------------------------------------ */
async function handleGiveawayButton(interaction) {
  const id = interaction.customId.slice(ENTER_PREFIX.length);
  const gw = await Giveaway.findById(id).catch(() => null);
  if (!gw) {
    return interaction.reply({ content: 'This giveaway no longer exists.', flags: MessageFlags.Ephemeral });
  }
  if (gw.ended || new Date(gw.endsAt).getTime() <= Date.now()) {
    return interaction.reply({ content: '⏳ This giveaway has already ended.', flags: MessageFlags.Ephemeral });
  }

  const roleId = gw.requirements?.roleId;
  if (roleId && !interaction.member.roles.cache.has(roleId)) {
    return interaction.reply({
      content: `🔒 You need the <@&${roleId}> role to enter this giveaway.`,
      flags: MessageFlags.Ephemeral
    });
  }

  const minLevel = Number(gw.requirements?.level || 0);
  if (minLevel > 0) {
    const row = await Level.findOne({ guildId: gw.guildId, userId: interaction.user.id }).lean();
    const level = row?.level || 0;
    if (level < minLevel) {
      return interaction.reply({
        content: `🔒 You need level **${minLevel}** to enter (you are level **${level}**).`,
        flags: MessageFlags.Ephemeral
      });
    }
  }

  const updated = await Giveaway.findOneAndUpdate(
    { _id: gw._id, ended: false, entries: { $ne: interaction.user.id } },
    { $push: { entries: interaction.user.id } },
    { new: true }
  );

  if (!updated) {
    return interaction.reply({
      content: `✅ You are already entered. Entries: **${gw.entries.length}**`,
      flags: MessageFlags.Ephemeral
    });
  }

  return interaction.reply({
    content: `🎉 You are in! Entries: **${updated.entries.length}**\nEnds <t:${ts(updated.endsAt)}:R>`,
    flags: MessageFlags.Ephemeral
  });
}

/* ------------------------------------------------------------
   Startup restore + queries used by commands / dashboard
   ------------------------------------------------------------ */
async function restore(client) {
  const active = await Giveaway.find({ ended: false }).lean();
  let scheduled = 0;
  let finished = 0;

  for (const gw of active) {
    if (new Date(gw.endsAt).getTime() <= Date.now()) {
      await endGiveaway(client, gw._id).catch(() => null);
      finished += 1;
    } else {
      schedule(client, gw._id);
      scheduled += 1;
    }
  }

  if (active.length) {
    logger.info(`Giveaways restored: ${active.length} (${scheduled} scheduled, ${finished} ended late)`);
  }
  return { total: active.length, scheduled, finished };
}

function listActive(guildId) {
  return Giveaway.find({ guildId, ended: false }).sort({ endsAt: 1 }).lean();
}

function listForGuild(guildId, limit = 25) {
  return Giveaway.find({ guildId }).sort({ createdAt: -1 }).limit(limit).lean();
}

function findByIdOrMessage(guildId, value) {
  return Giveaway.findOne({ guildId, $or: [{ _id: value }, { messageId: value }] });
}

module.exports = {
  ENTER_PREFIX,
  buildEmbed,
  buildRow,
  buildPayload,
  postGiveaway,
  endGiveaway,
  handleGiveawayButton,
  restore,
  listActive,
  listForGuild,
  findByIdOrMessage,
  eligibleEntries,
  drawWinners
};
