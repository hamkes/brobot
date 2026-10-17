const config = require('../config');
const logger = require('./logger');
const { Guild } = require('../db');

const PREFIX_TTL = 60 * 1000;
const POLL_INTERVAL = 5 * 1000;
const MAX_PREFIX_LENGTH = 8;

let pollTimer = null;

function ensureMap(client) {
  if (!client.prefixes) client.prefixes = new Map();
  return client.prefixes;
}

function isValidPrefix(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_PREFIX_LENGTH) return false;
  return !/\s/.test(trimmed);
}

function normalizePrefix(value) {
  return isValidPrefix(value) ? value.trim() : config.defaultPrefix;
}

async function getPrefix(client, guildId) {
  const map = ensureMap(client);

  const cached = map.get(guildId);
  if (cached && Date.now() - cached.fetchedAt < PREFIX_TTL) {
    return cached.prefix;
  }

  try {
    const doc = await Guild.findOne({ guildId }, { prefix: 1 }).lean();
    const prefix = normalizePrefix(doc?.prefix);
    map.set(guildId, { prefix, fetchedAt: Date.now() });
    return prefix;
  } catch (err) {
    logger.debug(`Prefix fetch failed for ${guildId}: ${err.message}`);
    return cached?.prefix || config.defaultPrefix;
  }
}

function getCachedPrefix(client, guildId) {
  const map = ensureMap(client);
  return map.get(guildId)?.prefix || config.defaultPrefix;
}

function setPrefix(client, guildId, prefix) {
  if (!isValidPrefix(prefix)) return false;
  ensureMap(client).set(guildId, { prefix: prefix.trim(), fetchedAt: Date.now() });
  return true;
}

function invalidatePrefix(client, guildId) {
  ensureMap(client).delete(guildId);
}

async function primePrefixes(client) {
  const map = ensureMap(client);
  const docs = await Guild.find({}, { guildId: 1, prefix: 1 }).lean();
  for (const doc of docs) {
    map.set(doc.guildId, { prefix: normalizePrefix(doc.prefix), fetchedAt: Date.now() });
  }
  logger.info(`Prefix cache primed (${docs.length} guild(s))`);
  return docs.length;
}

function startPrefixSync(client) {
  if (pollTimer) return;

  primePrefixes(client).catch((err) => logger.warn(`Prefix cache prime failed: ${err.message}`));

  let lastPoll = new Date();

  pollTimer = setInterval(async () => {
    const since = lastPoll;
    lastPoll = new Date();
    try {
      const changed = await Guild.find({ updatedAt: { $gt: since } }, { guildId: 1, prefix: 1 }).lean();
      for (const doc of changed) {
        ensureMap(client).set(doc.guildId, { prefix: normalizePrefix(doc.prefix), fetchedAt: Date.now() });
      }
    } catch (err) {
      logger.debug(`Prefix sync poll failed: ${err.message}`);
    }
  }, POLL_INTERVAL);

  if (pollTimer.unref) pollTimer.unref();
  logger.success(`Prefix sync active (every ${POLL_INTERVAL / 1000}s, live push on 127.0.0.1:${config.internalPort})`);
}

function stopPrefixSync() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

module.exports = {
  getPrefix,
  getCachedPrefix,
  setPrefix,
  invalidatePrefix,
  primePrefixes,
  startPrefixSync,
  stopPrefixSync,
  isValidPrefix,
  normalizePrefix,
  MAX_PREFIX_LENGTH
};
