const { Guild } = require('../db');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Notifications feeds engine.
 * Polls Twitch / YouTube / Kick / Reddit for new content and announces it
 * in the configured channels. Dependency-free (native fetch + XML/JSON parsing).
 *
 * First poll seeds each feed without announcing, so enabling a feed never
 * spams old content — only items discovered after startup are published.
 */

const UA = 'bot-pro-max/1.0 (dashboard notifications)';
const MAX_ANNOUNCE_PER_POLL = 3;
const SEEN_CAP = 60;

const seen = new Map();
const seeded = new Set();
const ytChannelCache = new Map();
let timer = null;
let running = false;

function memSeen(key) {
  if (!seen.has(key)) seen.set(key, new Set());
  return seen.get(key);
}

function remember(set, id) {
  set.add(id);
  if (set.size > SEEN_CAP) {
    const first = set.values().next().value;
    set.delete(first);
  }
}

function decodeEntities(text = '') {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function renderTemplate(template, vars, fallback) {
  let text = template || fallback;
  for (const [key, value] of Object.entries(vars)) {
    text = text.split(`{${key}}`).join(String(value ?? ''));
  }
  return text;
}

async function resolveYouTubeChannelId(url) {
  const direct = String(url).match(/channel\/(UC[\w-]{20,})/);
  if (direct) return direct[1];
  if (ytChannelCache.has(url)) return ytChannelCache.get(url);

  try {
    const response = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!response.ok) return null;
    const html = await response.text();
    const match =
      html.match(/"channelId":"(UC[\w-]{20,})"/) ||
      html.match(/<meta itemprop="identifier" content="(UC[\w-]{20,})"/) ||
      html.match(/"externalId":"(UC[\w-]{20,})"/);
    const channelId = match?.[1] || null;
    if (channelId) ytChannelCache.set(url, channelId);
    return channelId;
  } catch {
    return null;
  }
}

async function fetchYouTubeItems(entry) {
  const channelId = await resolveYouTubeChannelId(entry.youtubeUrl);
  if (!channelId) return [];

  const response = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, {
    headers: { 'User-Agent': UA }
  });
  if (!response.ok) return [];
  const xml = await response.text();

  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)]
    .map((m) => {
      const block = m[1];
      const id = block.match(/<yt:videoId>([^<]+)</)?.[1];
      if (!id) return null;
      return {
        id,
        title: decodeEntities(block.match(/<title>([^<]*)</)?.[1] || 'New video'),
        channel: decodeEntities(block.match(/<name>([^<]*)</)?.[1] || ''),
        url: `https://www.youtube.com/watch?v=${id}`
      };
    })
    .filter(Boolean);
}

async function fetchRedditItems(entry) {
  const sub = String(entry.subreddit || '').replace(/^\/?r\//i, '').replace(/\W/g, '');
  if (!sub) return [];

  const response = await fetch(`https://www.reddit.com/r/${sub}/new.json?limit=5&raw_json=1`, {
    headers: { 'User-Agent': UA }
  });
  if (!response.ok) return [];
  const json = await response.json();

  return (json?.data?.children || [])
    .map((c) => c?.data)
    .filter(Boolean)
    .map((p) => ({
      id: p.id,
      title: decodeEntities(p.title || ''),
      subreddit: p.subreddit || sub,
      author: p.author || '',
      url: `https://www.reddit.com${p.permalink || `/r/${sub}`}`
    }));
}

let twitchToken = null;
let twitchTokenExpires = 0;

async function getTwitchToken() {
  if (!config.twitchClientId || !config.twitchClientSecret) return null;
  if (twitchToken && Date.now() < twitchTokenExpires) return twitchToken;

  try {
    const response = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.twitchClientId,
        client_secret: config.twitchClientSecret,
        grant_type: 'client_credentials'
      })
    });
    if (!response.ok) return null;
    const json = await response.json();
    twitchToken = json.access_token || null;
    twitchTokenExpires = Date.now() + Math.max(0, (json.expires_in || 3600) - 120) * 1000;
    return twitchToken;
  } catch {
    return null;
  }
}

async function fetchTwitchItems(entry) {
  const token = await getTwitchToken();
  if (!token) return [];

  const login = String(entry.streamer || '').trim().replace(/^@/, '');
  if (!login) return [];

  const response = await fetch(`https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(login)}`, {
    headers: { 'Client-Id': config.twitchClientId, Authorization: `Bearer ${token}` }
  });
  if (!response.ok) return [];
  const json = await response.json();

  return (json?.data || []).map((stream) => ({
    id: stream.id,
    title: stream.title || 'Live now',
    channel: stream.user_name || login,
    url: `https://twitch.tv/${stream.user_login || login}`
  }));
}

async function fetchKickItems(entry) {
  const slug = String(entry.streamer || '').trim().replace(/^@/, '').replace(/\W/g, '');
  if (!slug) return [];

  const response = await fetch(`https://kick.com/api/v2/channels/${slug}`, {
    headers: { 'User-Agent': UA, Accept: 'application/json' }
  });
  if (!response.ok) return [];
  const json = await response.json();

  const live = json?.livestream;
  if (!live?.id) return [];

  return [{
    id: String(live.id),
    title: live.session_title || 'Live now',
    channel: json.slug || slug,
    url: `https://kick.com/${json.slug || slug}`
  }];
}

const FETCHERS = {
  youtube: { fetchItems: fetchYouTubeItems, fallback: '📹 New video: **{title}** — {url}' },
  reddit: { fetchItems: fetchRedditItems, fallback: '📮 New post in r/{subreddit}: **{title}** — {url}' },
  twitch: { fetchItems: fetchTwitchItems, fallback: '🟣 **{channel}** is now live: **{title}** — {url}' },
  kick: { fetchItems: fetchKickItems, fallback: '🟢 **{channel}** is now live: **{title}** — {url}' }
};

async function announce(guild, entry, item, type) {
  const channel = guild.channels.cache.get(entry.channelId)
    || await guild.channels.fetch(entry.channelId).catch(() => null);
  if (!channel?.isTextBased()) return;

  const vars = {
    title: item.title,
    url: item.url,
    channel: item.channel || '',
    subreddit: item.subreddit || '',
    author: item.author || '',
    server: guild.name
  };

  await channel.send({
    content: renderTemplate(entry.message, vars, FETCHERS[type].fallback),
    allowedMentions: { parse: [] }
  });
}

async function pollEntry(guild, type, entry) {
  const key = `${guild.id}:${type}:${entry[type === 'youtube' || type === 'reddit' ? (type === 'youtube' ? 'youtubeUrl' : 'subreddit') : 'streamer']}`;

  let items;
  try {
    items = await FETCHERS[type].fetchItems(entry);
  } catch (err) {
    logger.debug(`Notifications: ${type} fetch failed for ${guild.id}: ${err.message}`);
    return;
  }

  const set = memSeen(key);

  if (!seeded.has(key)) {
    seeded.add(key);
    for (const item of items.slice(0, SEEN_CAP)) set.add(item.id);
    logger.debug(`Notifications: seeded ${set.size} item(s) for ${key}`);
    return;
  }

  if (!items.length) return;

  const fresh = items.filter((item) => !set.has(item.id)).reverse().slice(0, MAX_ANNOUNCE_PER_POLL);
  for (const item of fresh) {
    try {
      await announce(guild, entry, item, type);
      logger.info(`Notifications: announced ${type} item for guild ${guild.id}`);
    } catch (err) {
      logger.debug(`Notifications: announce failed for ${guild.id}: ${err.message}`);
    }
    remember(set, item.id);
  }
  for (const item of items) remember(set, item.id);
}

async function pollAll(client) {
  if (running) return;
  running = true;

  try {
    const guilds = await Guild.find({
      $or: [
        { 'notifications.youtube': { $ne: [] } },
        { 'notifications.reddit': { $ne: [] } },
        { 'notifications.twitch': { $ne: [] } },
        { 'notifications.kick': { $ne: [] } }
      ]
    });

    for (const settings of guilds) {
      const guild = client.guilds.cache.get(settings.guildId);
      if (!guild) continue;

      for (const type of Object.keys(FETCHERS)) {
        for (const entry of settings.notifications?.[type] || []) {
          if (!entry.channelId) continue;
          await pollEntry(guild, type, entry);
          await new Promise((r) => setTimeout(r, 1200));
        }
      }
    }
  } catch (err) {
    logger.error(`Notifications poll failed: ${err.message}`);
  } finally {
    running = false;
  }
}

function startNotifications(client) {
  if (timer) return timer;

  const interval = Math.max(30000, config.notificationsIntervalMs);
  timer = setInterval(() => pollAll(client), interval);
  if (timer.unref) timer.unref();

  logger.info(`Notifications engine active — polling every ${Math.round(interval / 1000)}s`);
  return timer;
}

module.exports = { startNotifications, pollAll };
