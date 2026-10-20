const express = require('express');
const config = require('../../bot/config');
const logger = require('../../bot/utils/logger');
const { Guild, Warn, ModAction, DashLog, Level, Ticket, BotStatus, Economy } = require('../../bot/db');
const economyService = require('../../bot/systems/economyService');
const { isValidPrefix } = require('../../bot/utils/prefixCache');
const { refreshSessionGuilds } = require('../utils/discordUser');

const router = express.Router();

const DISCORD_API = 'https://discord.com/api/v10';

async function botFetch(path, options = {}) {
  const response = await fetch(`${DISCORD_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bot ${config.token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    const error = new Error(`Discord API ${response.status} on ${path}: ${text}`);
    error.status = response.status;
    throw error;
  }
  return response.status === 204 ? null : response.json();
}

function requireAuth(req, res, next) {
  if (!req.session?.user) return res.status(401).json({ error: 'unauthorized' });
  next();
}

async function requireGuildAccess(req, res, next) {
  const guildId = req.params.guildId;
  if (!/^\d{17,20}$/.test(guildId)) return res.status(400).json({ error: 'invalid_guild_id' });

  const allowed = req.session.guilds?.some((g) => g.id === guildId);
  if (!allowed) return res.status(403).json({ error: 'no_access' });

  const exists = await Guild.exists({ guildId, inGuild: { $ne: false } });
  if (!exists) return res.status(404).json({ error: 'bot_not_in_guild' });

  req.guildId = guildId;
  next();
}

router.get('/stats', async (req, res) => {
  try {
    const status = await BotStatus.findOne({ key: 'main' }).lean();
    const online = status?.lastHeartbeat && Date.now() - new Date(status.lastHeartbeat).getTime() < 90000;

    res.json({
      online: Boolean(online),
      tag: status?.tag || 'Brobot#0000',
      avatar: status?.avatar || null,
      guilds: status?.guilds || 0,
      users: status?.users || 0,
      channels: status?.channels || 0,
      commands: status?.commands || 0,
      uptime: online ? status?.uptime || 0 : 0,
      wsPing: status?.wsPing || 0
    });
  } catch (err) {
    logger.error(`GET /stats failed: ${err.message}`);
    res.status(500).json({ error: 'internal_error' });
  }
});

router.use(requireAuth);

router.get('/me', (req, res) => {
  res.json({
    user: req.session.user,
    guilds: req.session.guilds || [],
    isOwner: config.owners.includes(req.session.user.id)
  });
});

/* ---------- Personal economy (v1.2): daily + credits store ----------
   These act on the *signed-in user's own* economy records. The guildId
   must be a server where that user actually has a record, so nobody can
   act on a server they have never earned anything in. */

function personalGuildId(req, res) {
  const guildId = String(req.body?.guildId || '');
  if (!/^\d{17,20}$/.test(guildId)) {
    res.status(400).json({ error: 'invalid_guild_id' });
    return null;
  }
  return guildId;
}

router.post('/me/daily', async (req, res) => {
  try {
    const guildId = personalGuildId(req, res);
    if (!guildId) return;
    const result = await economyService.claimDaily(guildId, req.session.user.id);
    if (!result.ok) return res.status(409).json({ error: result.reason, nextClaimInSeconds: result.nextClaimInSeconds });
    res.json(result);
  } catch (err) {
    logger.error(`POST /me/daily failed: ${err.message}`);
    res.status(500).json({ error: 'internal_error' });
  }
});

router.post('/me/store/buy', async (req, res) => {
  try {
    const guildId = personalGuildId(req, res);
    if (!guildId) return;
    const result = await economyService.buyItem(guildId, req.session.user.id, String(req.body?.itemId || ''));
    if (!result.ok) return res.status(400).json({ error: result.reason, balance: result.balance, price: result.price });
    res.json({ ok: true, balance: result.balance, item: { id: result.item.id, kind: result.item.kind } });
  } catch (err) {
    logger.error(`POST /me/store/buy failed: ${err.message}`);
    res.status(500).json({ error: 'internal_error' });
  }
});

router.post('/me/store/equip', async (req, res) => {
  try {
    const guildId = personalGuildId(req, res);
    if (!guildId) return;
    const result = await economyService.equipBackground(guildId, req.session.user.id, String(req.body?.itemId || ''));
    if (!result.ok) return res.status(400).json({ error: result.reason });
    res.json({ ok: true, item: { id: result.item.id, kind: 'background' } });
  } catch (err) {
    logger.error(`POST /me/store/equip failed: ${err.message}`);
    res.status(500).json({ error: 'internal_error' });
  }
});

async function withBotPresence(guilds) {
  const ids = guilds.map((g) => g.id);
  const known = await Guild.find(
    { guildId: { $in: ids }, inGuild: { $ne: false } },
    { guildId: 1 }
  ).lean();
  const knownSet = new Set(known.map((g) => g.guildId));

  return guilds.map((g) => ({
    ...g,
    botPresent: knownSet.has(g.id)
  }));
}

router.get('/guilds', async (req, res) => {
  try {
    res.json(await withBotPresence(req.session.guilds || []));
  } catch (err) {
    logger.error(`GET /guilds failed: ${err.message}`);
    res.status(500).json({ error: 'internal_error' });
  }
});

router.post('/user/guilds/refresh', async (req, res) => {
  try {
    const { guilds, total } = await refreshSessionGuilds(req.session);

    logger.info(
      `Guilds refreshed for ${req.session.user.username}: ${guilds.length} manageable / ${total} total`
    );
    res.json(await withBotPresence(guilds));
  } catch (err) {
    if (err.code === 'reauth_required') {
      logger.warn(`Guild refresh for ${req.session.user.username} requires re-login`);
      return res.status(401).json({ error: 'reauth_required' });
    }
    logger.error(`POST /user/guilds/refresh failed: ${err.message}`);
    res.status(502).json({ error: 'discord_error' });
  }
});

async function getSettings(guildId) {
  return Guild.findOneAndUpdate(
    { guildId },
    { $setOnInsert: { guildId } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

router.get('/guild/:guildId/settings', requireGuildAccess, async (req, res) => {
  try {
    const settings = await getSettings(req.guildId);
    res.json(sanitizeSettings(settings.toObject()));
  } catch (err) {
    logger.error(`GET settings failed: ${err.message}`);
    res.status(500).json({ error: 'internal_error' });
  }
});

const BLOCKED_KEYS = new Set(['guildId', '_id', '__v', 'id', 'createdAt', 'updatedAt', 'premium']);

router.patch('/guild/:guildId/settings', requireGuildAccess, async (req, res) => {
  try {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ error: 'invalid_body' });
    }

    const settings = await getSettings(req.guildId);
    const changed = [];

    for (const [key, value] of Object.entries(body)) {
      if (BLOCKED_KEYS.has(key)) continue;
      if (key.startsWith('$') || key.includes('.') || key.includes('\u0000')) continue;
      if (!(key in settings)) continue;

      if (key === 'prefix') {
        if (!isValidPrefix(value)) return res.status(400).json({ error: 'invalid_prefix' });
        mergeInto(settings, key, value.trim());
        changed.push(key);
        continue;
      }

      mergeInto(settings, key, value);
      changed.push(key);
    }

    if (!changed.length) return res.status(400).json({ error: 'no_valid_sections' });

    await settings.save();

    if (changed.includes('prefix')) {
      notifyPrefixChange(req.guildId, settings.prefix);
    }

    await DashLog.create({
      guildId: req.guildId,
      userId: req.session.user.id,
      userTag: req.session.user.username,
      section: changed.join(','),
      action: 'settings_update',
      details: `Updated: ${changed.join(', ')}`
    });

    res.json({ ok: true, changed, settings: sanitizeSettings(settings.toObject()) });
  } catch (err) {
    logger.error(`PATCH settings failed: ${err.stack || err.message}`);
    res.status(500).json({ error: 'internal_error' });
  }
});

async function notifyPrefixChange(guildId, prefix) {
  try {
    const response = await fetch(`http://127.0.0.1:${config.internalPort}/internal/prefix`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guildId, prefix }),
      signal: AbortSignal.timeout(2000)
    });
    if (response.ok) {
      logger.info(`Prefix pushed to bot live → guild ${guildId} now uses "${prefix}"`);
    } else {
      logger.debug(`Prefix push rejected (HTTP ${response.status}) for guild ${guildId}`);
    }
  } catch (err) {
    logger.debug(`Prefix push skipped (bot offline? DB sync will catch up): ${err.message}`);
  }
}

function mergeInto(doc, key, value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    doc[key] = value;
    return;
  }

  const target = doc[key];
  if (!target || typeof target.toObject === 'function') {
    doc[key] = mergeObjects(target?.toObject?.() || {}, value);
  } else if (typeof target === 'object') {
    doc[key] = mergeObjects(target, value);
  } else {
    doc[key] = value;
  }
}

function mergeObjects(target, source) {
  const output = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (key.startsWith('$') || key.includes('.') || ['__proto__', 'constructor', 'prototype'].includes(key)) continue;
    if (value && typeof value === 'object' && !Array.isArray(value) &&
        output[key] && typeof output[key] === 'object' && !Array.isArray(output[key])) {
      output[key] = mergeObjects(output[key], value);
    } else {
      output[key] = value;
    }
  }
  return output;
}

function sanitizeSettings(obj) {
  const clean = { ...obj };
  delete clean._id;
  delete clean.__v;
  return clean;
}

router.get('/guild/:guildId/meta', requireGuildAccess, async (req, res) => {
  try {
    const [channels, roles, guild] = await Promise.all([
      botFetch(`/guilds/${req.guildId}/channels`),
      botFetch(`/guilds/${req.guildId}/roles`),
      botFetch(`/guilds/${req.guildId}?with_counts=true`)
    ]);

    res.json({
      guild: {
        id: guild.id,
        name: guild.name,
        icon: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128` : null,
        memberCount: guild.approximate_member_count || 0,
        presenceCount: guild.approximate_presence_count || 0,
        description: guild.description || null
      },
      channels: channels
        .filter((c) => [0, 2, 5, 15].includes(c.type))
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map((c) => ({ id: c.id, name: c.name, type: c.type })),
      categories: channels
        .filter((c) => c.type === 4)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map((c) => ({ id: c.id, name: c.name })),
      roles: roles
        .filter((r) => r.name !== '@everyone' && !r.managed)
        .sort((a, b) => b.position - a.position)
        .map((r) => ({ id: r.id, name: r.name, color: r.color, position: r.position }))
    });
  } catch (err) {
    logger.error(`GET meta failed: ${err.message}`);
    if (err.status === 404 || err.status === 403) {
      return res.status(404).json({ error: 'bot_not_in_guild' });
    }
    res.status(500).json({ error: 'internal_error' });
  }
});

router.get('/guild/:guildId/overview', requireGuildAccess, async (req, res) => {
  try {
    const [settings, activeWarns, modActions24h, openTickets, levels, modActionRecent, dashRecent] = await Promise.all([
      getSettings(req.guildId),
      Warn.countDocuments({ guildId: req.guildId, active: true }),
      ModAction.countDocuments({ guildId: req.guildId, createdAt: { $gte: new Date(Date.now() - 86400000) } }),
      Ticket.countDocuments({ guildId: req.guildId, status: 'open' }),
      Level.countDocuments({ guildId: req.guildId }),
      ModAction.find({ guildId: req.guildId }).sort({ createdAt: -1 }).limit(5).lean(),
      DashLog.find({ guildId: req.guildId }).sort({ createdAt: -1 }).limit(5).lean()
    ]);

    const s = settings.toObject();
    const activeFeatures = [];
    if (s.welcome?.enabled) activeFeatures.push('welcome');
    if (s.goodbye?.enabled) activeFeatures.push('goodbye');
    if (s.autoroles?.length) activeFeatures.push('autorole');
    if (s.autoresponder?.length) activeFeatures.push('autoresponder');
    if (s.leveling?.enabled) activeFeatures.push('leveling');
    if (s.logging?.enabled) activeFeatures.push('logs');
    if (s.automod?.enabled) activeFeatures.push('automod');
    if (s.antiraid?.enabled) activeFeatures.push('antiraid');
    if (s.tickets?.enabled) activeFeatures.push('tickets');
    if (s.starboard?.enabled) activeFeatures.push('starboard');
    if (s.tempChannels?.enabled) activeFeatures.push('tempchannels');
    if (s.stats?.enabled) activeFeatures.push('stats');
    if (s.selfRoles?.enabled) activeFeatures.push('selfroles');

    let guildInfo = null;
    try {
      guildInfo = await botFetch(`/guilds/${req.guildId}?with_counts=true`);
    } catch { /* optional */ }

    res.json({
      guild: guildInfo
        ? {
            memberCount: guildInfo.approximate_member_count || 0,
            presenceCount: guildInfo.approximate_presence_count || 0,
            name: guildInfo.name
          }
        : { memberCount: 0, presenceCount: 0, name: s.name },
      stats: { activeWarns, modActions24h, openTickets, membersTracked: levels },
      activeFeatures,
      recentModActions: modActionRecent,
      recentDashLogs: dashRecent,
      premium: Boolean(s.premium)
    });
  } catch (err) {
    logger.error(`GET overview failed: ${err.message}`);
    res.status(500).json({ error: 'internal_error' });
  }
});

router.get('/guild/:guildId/logs', requireGuildAccess, async (req, res) => {
  try {
    const type = req.query.type === 'mods' ? 'mods' : 'dashboard';
    const limit = Math.min(Number(req.query.limit) || 50, 100);

    const logs = type === 'mods'
      ? await ModAction.find({ guildId: req.guildId }).sort({ createdAt: -1 }).limit(limit).lean()
      : await DashLog.find({ guildId: req.guildId }).sort({ createdAt: -1 }).limit(limit).lean();

    res.json({ type, logs });
  } catch (err) {
    logger.error(`GET logs failed: ${err.message}`);
    res.status(500).json({ error: 'internal_error' });
  }
});

router.get('/guild/:guildId/leaderboard', requireGuildAccess, async (req, res) => {
  try {
    const rows = await Level.find({ guildId: req.guildId }).sort({ xp: -1 }).limit(25).lean();
    res.json({ rows });
  } catch (err) {
    logger.error(`GET leaderboard failed: ${err.message}`);
    res.status(500).json({ error: 'internal_error' });
  }
});

router.post('/guild/:guildId/tickets/panel', requireGuildAccess, async (req, res) => {
  try {
    const settings = await getSettings(req.guildId);
    const channelId = settings.tickets?.panelChannelId || req.body?.channelId;
    if (!channelId) return res.status(400).json({ error: 'no_panel_channel' });

    const { buildPanel } = require('../../bot/systems/tickets');
    const panel = buildPanel(settings.tickets);
    const payload = {
      embeds: panel.embeds.map((e) => e.toJSON()),
      components: panel.components.map((c) => c.toJSON())
    };

    const message = await botFetch(`/channels/${channelId}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    settings.tickets.panelMessageId = message.id;
    await settings.save();

    await DashLog.create({
      guildId: req.guildId,
      userId: req.session.user.id,
      userTag: req.session.user.username,
      section: 'tickets',
      action: 'ticket_panel_sent',
      details: `Panel sent to channel ${channelId}`
    });

    res.json({ ok: true, messageId: message.id });
  } catch (err) {
    logger.error(`POST ticket panel failed: ${err.message}`);
    res.status(500).json({ error: 'send_failed', detail: err.message });
  }
});

router.post('/guild/:guildId/premium', requireGuildAccess, async (req, res) => {
  try {
    const settings = await getSettings(req.guildId);
    settings.premium = Boolean(req.body?.premium);
    await settings.save();

    await DashLog.create({
      guildId: req.guildId,
      userId: req.session.user.id,
      userTag: req.session.user.username,
      section: 'premium',
      action: 'premium_update',
      details: `Premium set to ${settings.premium}`
    });

    res.json({ ok: true, premium: settings.premium });
  } catch (err) {
    logger.error(`POST premium failed: ${err.message}`);
    res.status(500).json({ error: 'internal_error' });
  }
});

/* ---------- Server Builder ---------- */

router.get('/guild/:guildId/builder/templates', requireGuildAccess, (req, res) => {
  const { templates } = require('../../bot/engines/templates');
  res.json({ ok: true, templates });
});

router.post('/guild/:guildId/builder/apply', requireGuildAccess, async (req, res) => {
  try {
    const { templateId, mode, confirmName } = req.body || {};

    const result = await botInternal('/internal/builder/start', {
      method: 'POST',
      body: JSON.stringify({ guildId: req.guildId, templateId, mode, confirmName })
    });

    if (!result.ok) {
      const status = result.status === 0 ? 503 : result.status;
      return res.status(status).json({ error: result.data.error || 'builder_failed' });
    }

    await DashLog.create({
      guildId: req.guildId,
      userId: req.session.user.id,
      userTag: req.session.user.username,
      section: 'server-builder',
      action: 'builder_apply',
      details: `Template "${templateId}" applied (${mode || 'append'} mode, job ${result.data.jobId})`
    });

    res.json({ ok: true, jobId: result.data.jobId });
  } catch (err) {
    logger.error(`POST builder apply failed: ${err.message}`);
    res.status(500).json({ error: 'internal_error' });
  }
});

router.get('/guild/:guildId/builder/status/:jobId', requireGuildAccess, async (req, res) => {
  try {
    const result = await botInternal(
      `/internal/builder/status?jobId=${encodeURIComponent(req.params.jobId)}`
    );

    if (!result.ok) {
      const status = result.status === 0 ? 503 : result.status;
      return res.status(status).json({ error: result.data.error || 'builder_failed' });
    }

    const job = result.data.job;
    if (!job || job.guildId !== req.guildId) {
      return res.status(404).json({ error: 'job_not_found' });
    }

    res.json({ ok: true, job });
  } catch (err) {
    logger.error(`GET builder status failed: ${err.message}`);
    res.status(500).json({ error: 'internal_error' });
  }
});

async function botInternal(path, options = {}) {
  try {
    const response = await fetch(`http://127.0.0.1:${config.internalPort}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      signal: AbortSignal.timeout(5000)
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, data };
  } catch (err) {
    logger.debug(`Internal bot call failed (${path}): ${err.message}`);
    return { ok: false, status: 0, data: { error: 'bot_offline' } };
  }
}

router.post('/guild/:guildId/selfroles/panel', requireGuildAccess, async (req, res) => {
  try {
    const settings = await getSettings(req.guildId);
    const channelId = settings.selfRoles?.channelId || req.body?.channelId;
    if (!channelId) return res.status(400).json({ error: 'no_panel_channel' });
    if (!settings.selfRoles?.roles?.length) return res.status(400).json({ error: 'no_roles_configured' });

    const roles = settings.selfRoles.roles.slice(0, 25);
    const rows = [];
    for (let i = 0; i < roles.length; i += 5) {
      rows.push({
        type: 1,
        components: roles.slice(i, i + 5).map((roleId) => ({
          type: 2,
          style: 2,
          label: `@${roleId}`,
          custom_id: `selfrole:${roleId}`
        }))
      });
    }

    const message = await botFetch(`/channels/${channelId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        embeds: [{
          title: '🎭 Self-Assignable Roles',
          description: 'Click a button below to add or remove a role for yourself.',
          color: 0x5865f2
        }],
        components: rows
      })
    });

    settings.selfRoles.enabled = true;
    settings.selfRoles.messageId = message.id;
    await settings.save();

    await DashLog.create({
      guildId: req.guildId,
      userId: req.session.user.id,
      userTag: req.session.user.username,
      section: 'selfroles',
      action: 'selfroles_panel_sent',
      details: `Panel sent to ${channelId}`
    });

    res.json({ ok: true, messageId: message.id });
  } catch (err) {
    logger.error(`POST selfroles panel failed: ${err.message}`);
    res.status(500).json({ error: 'send_failed' });
  }
});

router.post('/guild/:guildId/colorroles/panel', requireGuildAccess, async (req, res) => {
  try {
    const settings = await getSettings(req.guildId);
    const channelId = req.body?.channelId || settings.selfRoles?.channelId;
    if (!channelId) return res.status(400).json({ error: 'no_panel_channel' });
    if (!settings.colorRoles?.length) return res.status(400).json({ error: 'no_colors_configured' });

    const roleIds = settings.colorRoles.slice(0, 25);
    const names = await botFetch(`/guilds/${req.guildId}/roles`);
    const nameMap = new Map(names.map((r) => [r.id, r.name]));

    const message = await botFetch(`/channels/${channelId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        embeds: [{
          title: '🎨 Color Roles',
          description: 'Pick a color from the menu below.',
          color: 0x5865f2
        }],
        components: [{
          type: 1,
          components: [{
            type: 3,
            custom_id: 'colorrole',
            placeholder: 'Choose your color...',
            options: roleIds.map((id) => ({
              label: (nameMap.get(id) || 'Color').slice(0, 90),
              value: id
            }))
          }]
        }]
      })
    });

    await DashLog.create({
      guildId: req.guildId,
      userId: req.session.user.id,
      userTag: req.session.user.username,
      section: 'colors',
      action: 'color_panel_sent',
      details: `Panel sent to ${channelId}`
    });

    res.json({ ok: true, messageId: message.id });
  } catch (err) {
    logger.error(`POST colorroles panel failed: ${err.message}`);
    res.status(500).json({ error: 'send_failed' });
  }
});

router.post('/guild/:guildId/templink', requireGuildAccess, async (req, res) => {
  try {
    const { channelId, maxAge, maxUses } = req.body || {};
    if (!channelId) return res.status(400).json({ error: 'no_channel' });

    const age = Math.min(Math.max(Number(maxAge) || 3600, 60), 604800);
    const uses = Math.min(Math.max(Number(maxUses) || 1, 1), 100);

    const invite = await botFetch(`/channels/${channelId}/invites`, {
      method: 'POST',
      body: JSON.stringify({ max_age: age, max_uses: uses, unique: true })
    });

    await DashLog.create({
      guildId: req.guildId,
      userId: req.session.user.id,
      userTag: req.session.user.username,
      section: 'templink',
      action: 'temp_link_created',
      details: `Invite ${invite.code} (${uses} uses, ${age}s) in ${channelId}`
    });

    res.json({ ok: true, code: invite.code, url: `https://discord.gg/${invite.code}`, maxAge: age, maxUses: uses });
  } catch (err) {
    logger.error(`POST templink failed: ${err.message}`);
    res.status(500).json({ error: 'create_failed' });
  }
});

router.post('/guild/:guildId/stats/counters', requireGuildAccess, async (req, res) => {
  try {
    const type = ['members', 'online', 'bots', 'roles', 'channels'].includes(req.body?.type) ? req.body.type : 'members';

    let settings = await getSettings(req.guildId);
    try {
      settings = await Guild.findOne({ guildId: req.guildId });
      settings.name = (await botFetch(`/guilds/${req.guildId}`)).name;
    } catch { /* name is cosmetic */ }

    const existingCount = settings.stats.channels.length;
    const templates = {
      members: '👥 Members: 0',
      online: '🟢 Online: 0',
      bots: '🤖 Bots: 0',
      roles: '🎭 Roles: 0',
      channels: '💬 Channels: 0'
    };

    const channel = await botFetch(`/guilds/${req.guildId}/channels`, {
      method: 'POST',
      body: JSON.stringify({
        name: templates[type],
        type: 2,
        position: existingCount
      })
    });

    settings.stats.enabled = true;
    settings.stats.channels.push({ channelId: channel.id, type });
    await settings.save();

    await DashLog.create({
      guildId: req.guildId,
      userId: req.session.user.id,
      userTag: req.session.user.username,
      section: 'stats',
      action: 'counter_created',
      details: `${type} counter channel ${channel.id}`
    });

    res.json({ ok: true, channelId: channel.id, type });
  } catch (err) {
    logger.error(`POST stats counter failed: ${err.message}`);
    res.status(500).json({ error: 'create_failed' });
  }
});

router.delete('/guild/:guildId/stats/counters/:channelId', requireGuildAccess, async (req, res) => {
  try {
    const channelId = req.params.channelId;
    const settings = await getSettings(req.guildId);

    settings.stats.channels = settings.stats.channels.filter((c) => c.channelId !== channelId);
    await settings.save();

    await botFetch(`/channels/${channelId}`, { method: 'DELETE' }).catch(() => null);

    await DashLog.create({
      guildId: req.guildId,
      userId: req.session.user.id,
      userTag: req.session.user.username,
      section: 'stats',
      action: 'counter_deleted',
      details: `Removed counter ${channelId}`
    });

    res.json({ ok: true });
  } catch (err) {
    logger.error(`DELETE stats counter failed: ${err.message}`);
    res.status(500).json({ error: 'internal_error' });
  }
});

module.exports = router;
