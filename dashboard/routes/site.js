const express = require('express');
const path = require('path');
const fs = require('fs');
const config = require('../../bot/config');
const logger = require('../../bot/utils/logger');
const { FEATURES, LEGAL, legalSections } = require('../data/site');
const { Guild, Level, Economy } = require('../../bot/db');
const { levelFromXp } = require('../../bot/systems/leveling');
const storeCatalog = require('../../models/storeCatalog');
const economyService = require('../../bot/systems/economyService');

const router = express.Router();

function collectCommands() {
  const root = path.join(__dirname, '..', '..', 'bot', 'commands');
  const groups = [];

  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(root, entry.name);
    const commands = [];

    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js')).sort()) {
      try {
        const command = require(path.join(dir, file));
        const json = command.data.toJSON();
        commands.push({
          name: `/${json.name}`,
          description: json.description,
          subcommands: (json.options || [])
            .filter((o) => o.type === 1)
            .map((o) => o.name)
        });
      } catch (err) {
        logger.warn(`[site] Skipped command ${entry.name}/${file}: ${err.message}`);
      }
    }

    if (commands.length) groups.push({ category: entry.name, commands });
  }

  return groups;
}

function baseLocals(req, extra = {}) {
  return {
    loggedIn: Boolean(req.session.user),
    user: req.session.user || null,
    loginUrl: '/auth/login',
    inviteUrl: config.inviteUrl,
    ...extra
  };
}

router.get('/commands', (req, res) => {
  res.render('commands', baseLocals(req, {
    title: 'Commands • Brobot',
    description: 'Every Brobot slash command, grouped by category.',
    active: 'commands',
    groups: collectCommands()
  }));
});

/* ---------- Personal dashboard (v1.2) ----------
   The signed-in member's own page: their credits / level / rank /
   reputation cards, a per-server Top 100, the credits store and a
   web daily-claim button. All BroBot-original presentation. */
router.get('/my', async (req, res) => {
  if (!req.session.user) return res.redirect('/auth/login');
  try {
    const userId = req.session.user.id;

    const [economyRows, levelRows] = await Promise.all([
      Economy.find({ userId }).lean(),
      Level.find({ userId }).lean()
    ]);

    const guildIds = [...new Set([...economyRows, ...levelRows].map((r) => r.guildId))];
    const guildDocs = guildIds.length
      ? await Guild.find({ guildId: { $in: guildIds } }, { guildId: 1, name: 1, icon: 1 }).lean()
      : [];
    const guildName = new Map(guildDocs.map((g) => [g.guildId, g.name || g.guildId]));

    const servers = (await Promise.all(guildIds.map(async (guildId) => {
      const eco = economyRows.find((r) => r.guildId === guildId) || {};
      const lvl = levelRows.find((r) => r.guildId === guildId) || {};
      const { level } = levelFromXp(lvl.xp || 0);
      const xp = lvl.xp || 0;
      const rank = xp > 0
        ? (await Level.countDocuments({ guildId, xp: { $gt: xp } })) + 1
        : null;
      return {
        guildId,
        name: guildName.get(guildId) || guildId,
        credits: eco.credits || 0,
        reps: eco.reps || 0,
        points: eco.points || 0,
        title: eco.title || '',
        dailyStreak: eco.dailyStreak || 0,
        xp,
        level,
        rank,
        voiceXp: lvl.voiceXp || 0,
        voiceLevel: levelFromXp(lvl.voiceXp || 0).level,
        ownedBackgrounds: eco.ownedBackgrounds?.length ? eco.ownedBackgrounds : ['default'],
        equippedBackground: eco.equippedBackground || 'default',
        ownedBadges: eco.ownedBadges || []
      };
    }))).sort((a, b) => b.credits - a.credits);

    const selected = servers.find((s) => s.guildId === req.query.guild) || servers[0] || null;

    let boards = null;
    if (selected) {
      const [topXp, topCredits, topReps] = await Promise.all([
        Level.find({ guildId: selected.guildId, xp: { $gt: 0 } }).sort({ xp: -1 }).limit(100).lean(),
        Economy.find({ guildId: selected.guildId, credits: { $gt: 0 } }).sort({ credits: -1 }).limit(100).lean(),
        Economy.find({ guildId: selected.guildId, reps: { $gt: 0 } }).sort({ reps: -1 }).limit(100).lean()
      ]);
      const nameOf = await resolveGuildUsernames(selected.guildId, config);
      const decorate = (rows, format) => rows.map((row, i) => ({
        rank: i + 1,
        name: nameOf(row.userId),
        isYou: row.userId === userId,
        detail: format(row)
      }));
      boards = {
        xp: decorate(topXp, (r) => `Level ${levelFromXp(r.xp).level} • ${r.xp.toLocaleString()} XP`),
        credits: decorate(topCredits, (r) => `${r.credits.toLocaleString()} credits`),
        reps: decorate(topReps, (r) => `${r.reps.toLocaleString()} reps`)
      };
    }

    const totals = {
      credits: servers.reduce((sum, s) => sum + s.credits, 0),
      reps: servers.reduce((sum, s) => sum + s.reps, 0),
      bestLevel: servers.reduce((max, s) => Math.max(max, s.level), 0),
      serverCount: servers.length
    };

    // Daily state for the selected server, computed with the same
    // UTC-day rule the bot command and the API share.
    let daily = null;
    if (selected) {
      const eco = economyRows.find((r) => r.guildId === selected.guildId);
      const claimedToday = eco?.lastDailyAt &&
        economyService.startOfUtcDay(new Date(eco.lastDailyAt)) === economyService.startOfUtcDay(new Date());
      daily = { claimed: Boolean(claimedToday), streak: eco?.dailyStreak || 0 };
    }

    res.render('my', baseLocals(req, {
      title: 'My Profile • BroBot',
      description: 'Your BroBot profile: credits, level, rank, reputation, leaderboards and the credits store.',
      active: 'my',
      servers,
      selected,
      boards,
      totals,
      daily,
      catalog: storeCatalog
    }));
  } catch (err) {
    logger.error(`GET /my failed: ${err.message}`);
    res.status(500).redirect('/');
  }
});

/** Best-effort username lookup for a guild's leaderboard, via one
    Discord REST call for the member list. Falls back to a short ID. */
async function resolveGuildUsernames(guildId, cfg) {
  const fallback = (id) => `User …${String(id).slice(-4)}`;
  try {
    if (!cfg.token) return fallback;
    const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members?limit=1000`, {
      headers: { Authorization: `Bot ${cfg.token}` }
    });
    if (!response.ok) return fallback;
    const members = await response.json();
    const map = new Map(members.map((m) => [m.user.id, m.user.global_name || m.user.username]));
    return (id) => map.get(id) || fallback(id);
  } catch {
    return fallback;
  }
}

router.get('/pricing', (req, res) => {
  res.render('pricing', baseLocals(req, {
    title: 'Pricing • Brobot',
    description: 'Brobot pricing — Free, Premium and Ultra plans.',
    active: 'pricing'
  }));
});

router.get('/premium', (req, res) => res.redirect('/pricing'));

for (const slug of Object.keys(FEATURES)) {
  router.get(`/features/${slug}`, (req, res) => {
    const feature = FEATURES[slug];
    res.render('feature', baseLocals(req, {
      title: `${feature.key.replace('feat_', '')} • Brobot`,
      description: 'Brobot feature overview.',
      active: 'features',
      slug,
      feature
    }));
  });
}

for (const slug of Object.keys(LEGAL)) {
  router.get(`/${slug}`, (req, res) => {
    const doc = LEGAL[slug];
    res.render('legal', baseLocals(req, {
      title: `Brobot — ${slug.replace(/-/g, ' ')}`,
      description: `Brobot ${slug.replace(/-/g, ' ')}.`,
      active: '',
      doc,
      sections: legalSections(doc)
    }));
  });
}

module.exports = router;
