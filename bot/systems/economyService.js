const { Economy } = require('../db');
const { findItem, findBackground } = require('../../models/storeCatalog');

/**
 * Shared economy service (v1.2) — one source of truth used by the
 * Discord bot (/daily) and the web dashboard (personal page, store).
 *
 * Daily formula (BroBot original, unchanged from v1.1):
 *   reward = 500 + random(0..250) + min(streak, 20) * 50
 * One claim per UTC calendar day; claiming on consecutive days
 * grows the streak.
 */
const DAILY_BASE = 500;
const DAILY_RANDOM_SPREAD = 250;
const DAILY_STREAK_STEP = 50;
const DAILY_STREAK_BONUS_CAP = 20;

function startOfUtcDay(date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

async function claimDaily(guildId, userId, now = new Date()) {
  const today = startOfUtcDay(now);
  const doc = await Economy.findOne({ guildId, userId });

  if (doc?.lastDailyAt && startOfUtcDay(new Date(doc.lastDailyAt)) === today) {
    return {
      ok: false,
      reason: 'already_claimed',
      nextClaimInSeconds: Math.ceil((today + 24 * 60 * 60 * 1000 - now.getTime()) / 1000),
      streak: doc.dailyStreak || 0,
      balance: doc.credits || 0
    };
  }

  const yesterday = today - 24 * 60 * 60 * 1000;
  const streakContinues = doc?.lastDailyAt && startOfUtcDay(new Date(doc.lastDailyAt)) === yesterday;
  const streak = streakContinues ? (doc.dailyStreak || 0) + 1 : 1;

  const bonus = Math.min(streak, DAILY_STREAK_BONUS_CAP) * DAILY_STREAK_STEP;
  const reward = DAILY_BASE + Math.floor(Math.random() * (DAILY_RANDOM_SPREAD + 1)) + bonus;

  const updated = await Economy.findOneAndUpdate(
    { guildId, userId },
    { $inc: { credits: reward }, $set: { lastDailyAt: now, dailyStreak: streak } },
    { upsert: true, new: true }
  );

  return { ok: true, reward, streak, balance: updated.credits };
}

/**
 * Buy a store item (background or badge) with credits.
 * The debit is atomic: the query only matches when the balance
 * really covers the price, so parallel buys cannot overdraw.
 */
async function buyItem(guildId, userId, itemId) {
  const item = findItem(itemId);
  if (!item) return { ok: false, reason: 'unknown_item' };
  if (item.price <= 0) return { ok: false, reason: 'not_for_sale' };

  const doc = await Economy.findOne({ guildId, userId }).lean();
  const owned = item.kind === 'background' ? (doc?.ownedBackgrounds || ['default']) : (doc?.ownedBadges || []);
  if (owned.includes(itemId)) return { ok: false, reason: 'already_owned', balance: doc?.credits || 0 };

  const field = item.kind === 'background' ? 'ownedBackgrounds' : 'ownedBadges';
  const debited = await Economy.findOneAndUpdate(
    { guildId, userId, credits: { $gte: item.price } },
    { $inc: { credits: -item.price }, $addToSet: { [field]: itemId } },
    { new: true }
  );
  if (!debited) return { ok: false, reason: 'insufficient_credits', balance: doc?.credits || 0, price: item.price };

  return { ok: true, item, balance: debited.credits };
}

async function equipBackground(guildId, userId, backgroundId) {
  const item = findBackground(backgroundId);
  if (!item) return { ok: false, reason: 'unknown_item' };

  const doc = await Economy.findOne({ guildId, userId }).lean();
  const owned = doc?.ownedBackgrounds || ['default'];
  if (!owned.includes(backgroundId)) return { ok: false, reason: 'not_owned' };

  await Economy.findOneAndUpdate(
    { guildId, userId },
    { $set: { equippedBackground: backgroundId } },
    { upsert: true }
  );
  return { ok: true, item };
}

module.exports = {
  claimDaily,
  buyItem,
  equipBackground,
  startOfUtcDay,
  DAILY_BASE,
  DAILY_RANDOM_SPREAD,
  DAILY_STREAK_STEP,
  DAILY_STREAK_BONUS_CAP
};
