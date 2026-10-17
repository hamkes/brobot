const config = require('../../bot/config');
const logger = require('../../bot/utils/logger');

const DISCORD_API = 'https://discord.com/api/v10';
const MANAGE_GUILD = 0x20n;
const ADMINISTRATOR = 0x8n;

function canManage(guild) {
  if (guild.owner) return true;
  try {
    const bits = BigInt(guild.permissions || 0);
    return (bits & MANAGE_GUILD) === MANAGE_GUILD || (bits & ADMINISTRATOR) === ADMINISTRATOR;
  } catch {
    return false;
  }
}

function filterManageableGuilds(guilds) {
  return (guilds || []).filter(canManage);
}

function mapSessionGuilds(guilds) {
  return guilds.map((g) => ({
    id: g.id,
    name: g.name,
    icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=64` : null,
    owner: Boolean(g.owner)
  }));
}

async function fetchUserGuilds(accessToken) {
  const response = await fetch(`${DISCORD_API}/users/@me/guilds`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (response.status === 401) {
    const err = new Error('invalid access token');
    err.code = 'token_expired';
    throw err;
  }
  if (!response.ok) {
    const err = new Error(`Discord API ${response.status} on /users/@me/guilds`);
    err.status = response.status;
    throw err;
  }
  return response.json();
}

async function refreshAccessToken(refreshToken) {
  if (!refreshToken) return null;

  const response = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })
  });
  if (!response.ok) return null;

  const tokens = await response.json();
  if (!tokens.access_token) return null;
  return tokens;
}

async function fetchGuildsWithRotation(session) {
  try {
    return { guilds: await fetchUserGuilds(session.accessToken), rotated: false };
  } catch (err) {
    if (err.code !== 'token_expired') throw err;

    const tokens = await refreshAccessToken(session.refreshToken);
    if (!tokens) {
      const authErr = new Error('re-authentication required');
      authErr.code = 'reauth_required';
      throw authErr;
    }

    session.accessToken = tokens.access_token;
    if (tokens.refresh_token) session.refreshToken = tokens.refresh_token;
    logger.info(`OAuth token refreshed for ${session.user?.username || 'user'}`);

    return { guilds: await fetchUserGuilds(tokens.access_token), rotated: true };
  }
}

async function refreshSessionGuilds(session) {
  const { guilds, rotated } = await fetchGuildsWithRotation(session);

  const manageable = filterManageableGuilds(guilds);
  session.guilds = mapSessionGuilds(manageable);
  if (session.user) session.user.guildCount = guilds.length;

  return { guilds: session.guilds, total: guilds.length, rotated };
}

module.exports = {
  DISCORD_API,
  MANAGE_GUILD,
  ADMINISTRATOR,
  canManage,
  filterManageableGuilds,
  mapSessionGuilds,
  fetchUserGuilds,
  refreshAccessToken,
  refreshSessionGuilds
};
