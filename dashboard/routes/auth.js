const express = require('express');
const crypto = require('crypto');
const config = require('../../bot/config');
const logger = require('../../bot/utils/logger');
const {
  DISCORD_API,
  filterManageableGuilds,
  mapSessionGuilds
} = require('../utils/discordUser');

const router = express.Router();

const SCOPES = ['identify', 'guilds'];

function buildRedirectUri(req) {
  const base = config.dashboardUrl.replace(/\/$/, '');
  return `${base}/auth/callback`;
}

router.get('/login', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  req.session.oauthState = state;

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: buildRedirectUri(req),
    response_type: 'code',
    scope: SCOPES.join(' '),
    state,
    prompt: 'consent'
  });

  res.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
});

router.get('/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!code || !state || state !== req.session.oauthState) {
    logger.warn('OAuth callback rejected: invalid state or missing code');
    return res.redirect('/');
  }
  delete req.session.oauthState;

  try {
    const tokenResponse = await fetch(`${DISCORD_API}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: buildRedirectUri(req)
      })
    });

    if (!tokenResponse.ok) {
      const text = await tokenResponse.text().catch(() => '');
      throw new Error(`Token exchange failed (${tokenResponse.status}): ${text}`);
    }

    const tokens = await tokenResponse.json();

    const userResponse = await fetch(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    if (!userResponse.ok) throw new Error(`Failed to fetch user (${userResponse.status})`);
    const user = await userResponse.json();

    const guildsResponse = await fetch(`${DISCORD_API}/users/@me/guilds`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const guilds = guildsResponse.ok ? await guildsResponse.json() : [];

    const manageableGuilds = filterManageableGuilds(guilds);

    req.session.user = {
      id: user.id,
      username: user.username,
      globalName: user.global_name || user.username,
      discriminator: user.discriminator,
      avatar: user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
        : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(user.id) % 5n)}.png`,
      guildCount: guilds.length
    };
    req.session.accessToken = tokens.access_token;
    req.session.refreshToken = tokens.refresh_token || null;
    req.session.guilds = mapSessionGuilds(manageableGuilds);

    logger.success(`Dashboard login: ${user.username} (${user.id})`);
    res.redirect('/dashboard');
  } catch (err) {
    logger.error(`OAuth error: ${err.message}`);
    res.redirect('/');
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

module.exports = router;
