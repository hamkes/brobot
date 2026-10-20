# BroBot — Gap Analysis vs. ProBot-style feature sets

_Date: 2026-10-20 · Method: feature-level comparison only. ProBot's public
documentation and public command lists were read for **what** each feature
does (the idea). No ProBot code, assets, artwork, card designs, texts or
dashboard layouts were copied — every implementation below is original
BroBot code in BroBot's own white + violet, bilingual (EN/AR) design._

## Already present in BroBot before this pass

| Feature idea | BroBot status |
|---|---|
| Moderation: ban / unban / kick / mute / unmute / clear / warn / warnings / clearwarns | ✅ Full, with case log (`ModAction`) |
| Channel control: lock / unlock / slowmode / move / vkick / setnick / role | ✅ |
| Welcome & goodbye (embed/text, placeholders, DM, image URL) | ✅ |
| Auto-role on join | ✅ |
| Leveling from text messages, `/rank`, role rewards | ✅ |
| `/profile`, `/credits` (balance view), `/rep` (24h cooldown), `/points` | ✅ |
| `/top` (text-XP leaderboard) | ✅ |
| `/color` / `/colors`, self-assignable roles | ✅ |
| `/moveme`, `/short`, `/avatar`, `/userinfo`, `/serverinfo`, `/roles`, `/poll`, `/embed` | ✅ |
| `/setxp`, `/setlevel` (admin) | ✅ |
| Automod, anti-raid, anti-nuke (VIP protection), logging | ✅ |
| Tickets, starboard, temp voice channels, server stats counters | ✅ |
| Giveaways (persistent, reroll, requirements) | ✅ |
| Social notifications (Twitch / YouTube / Kick / Reddit) | ✅ |
| Server Builder templates, auto-responder, temp links | ✅ |
| Bilingual dashboard EN/AR with RTL | ✅ (ProBot does not offer an Arabic dashboard — this is a BroBot advantage) |

## Gaps found — and what was done in this pass (v1.1)

| # | Gap | Why it matters | This pass |
|---|---|---|---|
| 1 | **No way to earn credits.** `/credits` only displayed a balance that nothing ever increased. ProBot-style bots have a `/daily` claim as the core economy loop. | Economy was display-only / dead | ✅ Added `/daily`: one claim per UTC day, base + streak bonus, streak tracking (`lastDailyAt`, `dailyStreak` on `Economy`) |
| 2 | **No credit transfer between members.** | Credits are social only if they can move | ✅ Added `/pay`: atomic, balance-checked transfer (cannot go negative, no self/bot payments) |
| 3 | **No profile title.** ProBot-style profiles let members set a short personal title shown on the profile card. | `/profile` had no personalisation | ✅ Added `/title` (set / show / clear, max 80 chars); title is shown on `/profile` |
| 4 | **Text-only leveling.** ProBot's level system tracks **voice** activity as well as text. BroBot's `Level` had no voice fields and `voiceStateUpdate` awarded nothing. | Voice communities got no progression | ✅ Added voice XP: `voiceXp`, `totalVoiceMinutes` on `Level`, `leveling.voiceXpPerMinute` (default 10 XP/min) on guild settings; sessions tracked on join/leave/switch, AFK channel and bots excluded, minimum 1 minute |
| 5 | **`/top` only ranked text XP.** | Credits / reps / voice leaders were invisible | ✅ `/top` now takes an optional `type`: `text` (default), `voice`, `credits`, `reps` |
| 6 | **No `/roll`.** A small, standard dice command in ProBot-style command lists. | Minor utility gap | ✅ Added `/roll` (configurable dice count and sides) |

`/rank` and `/profile` were also extended to show voice level and voice
time, and `/help` lists the new commands. New slash commands appear
automatically on the dashboard **Commands** page, which is generated from
the command files.

## Intentional differences (not gaps)

- **Per-server data, not global.** ProBot keeps a global profile/credits
  across servers. BroBot stores economy and levels **per guild**, like
  everything else in its data model. This keeps a server's economy
  self-contained and is a deliberate design choice, not a missing feature.
- **No paid membership tiers.** ProBot sells Silver/Gold/Diamond tiers
  that multiply daily/rep amounts. BroBot is MIT-licensed and free; the
  streak bonus in `/daily` rewards regulars without a paywall.
- **Original presentation.** Rank/profile output uses BroBot's existing
  embed style and violet identity — no ProBot card artwork or layout.

## v1.2 pass (2026-10-20) — personal dashboard, store, landing

Requested after a side-by-side look at bot-site landings in this class:
make BroBot's site *better*, with a similar modern feel — still 100%
original code, copy and assets.

| Gap (from the comparison) | v1.2 |
|---|---|
| BroBot's dashboard was admin-only; a member had no page of their own (ProBot-style sites show the member their Credits / Level / Rank / Reputation cards) | ✅ New `/my` personal dashboard: cards for credits, level, server rank, reputation, voice level + server picker |
| No credits store — credits earned from `/daily` had nothing to buy | ✅ Original Credits Store on `/my`: 8 gradient profile backgrounds + 6 badges (`models/storeCatalog.js`), bought per-server with credits, equipped background + badges shown on `/profile` |
| Leaderboards only existed as Discord commands | ✅ Top 100 web boards on `/my`: XP / richest / reputation, with best-effort username resolution and "you" highlighting |
| Daily reward only claimable in Discord | ✅ Web claim button on `/my`; bot and web share one implementation (`bot/systems/economyService.js`) so the streak math can never drift |
| Landing hero was a split layout | ✅ Centered hero (v2): pill, large gradient headline, dual CTAs, product mock below, live stats — BroBot's own copy in EN/AR |

Verified: syntax + EJS compile clean, all 45 commands still load,
8/8 new functional tests (service daily, bot daily via service, store
buy / already-owned / insufficient-funds, equip owned / refuse unowned,
`/profile` cosmetics, `/my` render), plus a live server smoke test
(home renders the v2 hero, `/my` redirects to login when signed out).

## Still open (not in this pass)

- Welcome **image-card rendering** (drawing the member's avatar/name onto
  a generated image) — BroBot currently sends an embed with an optional
  static image URL. Needs an image-rendering dependency decision.
- Voice-level **role rewards** — voice XP is tracked and displayed, but
  role rewards still trigger from text level only.
- Reaction-role mode for self-roles — BroBot's panels use buttons and
  select menus, which are the modern Discord pattern.
