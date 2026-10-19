const express = require('express');
const path = require('path');
const fs = require('fs');
const config = require('../../bot/config');
const logger = require('../../bot/utils/logger');
const { FEATURES, LEGAL, legalSections } = require('../data/site');

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
