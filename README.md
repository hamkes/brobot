# ✨ Brobot

An intuitive, beginner-friendly Discord bot **and** web dashboard with a clean, modern **white + violet** design. Built for beginners and server admins who want an effortless setup for **moderation**, **welcome messages** and **auto-roles**.

> 🎯 **Dual language everywhere** — English (LTR) & العربية (RTL) with one-click toggle in both the bot (command localizations) and the dashboard.

> 🚀 **Brobot v1.0** — fully audited and production-ready.

---

## 🗂️ Project Structure

```
Brobot/
├── bot/                          # Discord bot (discord.js v14)
│   ├── index.js                  # Entry: client, intents, heartbeat
│   ├── config.js                 # Env-based configuration
│   ├── db.js                     # MongoDB connection + model exports
│   ├── deploy-commands.js        # Slash command deployment script
│   ├── internalServer.js         # Loopback listener: live prefix-sync pushes
│   ├── handlers/
│   │   ├── commandHandler.js     # Recursive slash command loader
│   │   ├── legacyHandler.js      # Prefix ($) command loader + dispatcher
│   │   └── eventHandler.js       # Event loader (with ready/clientReady bridge)
│   ├── commands/
│   │   ├── moderation/           # kick, ban, unban, mute, unmute, clear,
│   │   │                         # warn, warnings, clearwarns
│   │   ├── utility/              # ping, avatar, userinfo, serverinfo, poll,
│   │   │                         # rank, help
│   │   └── setup/                # welcome, autorole, ticket-panel, stats
│   ├── legacy/                   # Prefix text commands (ping, avatar, help,
│   │                             # prefix — use the guild's custom prefix)
│   ├── events/                   # guildMemberAdd/Remove, messageCreate/Delete/
│   │                             # Update, interactionCreate, voiceStateUpdate,
│   │                             # messageReactionAdd/Remove, guildCreate,
│   │                             # guildDelete, guildBanAdd/Remove,
│   │                             # guildMemberUpdate, guildAuditLogEntryCreate, ready
│   ├── systems/                  # Engines (the heart of the bot)
│   │   ├── welcome.js            # Welcome & Goodbye engine
│   │   ├── autorole.js           # Auto Role engine
│   │   ├── autoresponder.js      # Trigger → response engine
│   │   ├── leveling.js           # XP, levels, role rewards
│   │   ├── automod.js            # Anti-spam / links / invites / bad words
│   │   ├── antiraid.js           # Join-burst & account-age detection
│   │   ├── modlog.js             # Event logging + mod action recorder
│   │   ├── tickets.js            # Button-based ticket system
│   │   ├── starboard.js          # Star highlight engine
│   │   ├── tempchannels.js       # Join-to-Create voice channels
│   │   ├── statscounter.js       # Member-count voice channels
│   │   ├── vipprotection.js      # Anti-nuke: admin grants & role deletions
│   │   └── notifications.js      # Twitch/YouTube/Kick/Reddit feed pollers
│   ├── engines/
│   │   ├── templates.js          # Server Builder: 4 ready-made layouts (bilingual)
│   │   └── serverBuilder.js      # Server Builder: job engine (roles/channels/DB links)
│   └── utils/                    # logger, helpers, placeholders, prefixCache
├── models/                       # MongoDB (Mongoose) schemas
│   ├── Guild.js                  # All per-server settings
│   ├── Warn.js                   # Warning system
│   ├── ModAction.js              # Mod action history (cases)
│   ├── DashLog.js                # Control Panel Logs
│   ├── Level.js                  # XP/level records
│   ├── Ticket.js                 # Ticket records
│   └── BotStatus.js              # Bot heartbeat for dashboard status
├── dashboard/                    # Web dashboard (Express + EJS)
│   ├── server.js                 # Express server, sessions, views
│   ├── routes/
│   │   ├── auth.js               # Discord OAuth2 ("Login with Discord")
│   │   └── api.js                # REST API (settings, logs, panels, invites)
│   ├── utils/
│   │   └── discordUser.js        # OAuth guild fetch/filter + token rotation
│   ├── views/
│   │   ├── index.ejs             # Landing page (bilingual, RTL-ready)
│   │   └── dashboard.ejs         # Dashboard shell (clean violet sidebar)
│   └── public/
│       ├── favicon.svg           # Brobot logo mark
│       ├── css/style.css         # Clean white + violet design system + RTL
│       └── js/
│           ├── i18n.js           # EN/AR dictionary + language switcher
│           ├── ui.js             # UI components & form helpers
│           ├── pages.js          # All dashboard sections
│           ├── dashboard.js      # Sidebar, guild picker, routing
│           └── app.js            # Landing page logic
├── package.json
├── .env.example
└── README.md
```

---

## 🚀 Quick Start

### 1. Requirements
- **Node.js 18+** (tested on modern Node)
- **MongoDB** running locally (`mongodb://127.0.0.1:27017`) or a MongoDB Atlas URI

### 2. Install
```bash
npm install
```

### 3. Create the Discord Application
1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) → **New Application**.
2. **Bot** tab → copy the **Token** → `DISCORD_TOKEN`.
3. **OAuth2** tab → copy **Client ID** (`CLIENT_ID`) and **Client Secret** (`CLIENT_SECRET`).
4. In **OAuth2 → Redirects**, add exactly:
   ```
   http://localhost:3000/auth/callback
   ```
5. Enable these **Privileged Gateway Intents** (Bot tab):
   - ✅ Server Members Intent
   - ✅ Message Content Intent
   - ✅ Presence Intent (for the "Online" counter)

### 4. Invite the bot
Use the OAuth2 URL generator with scopes `bot` + `applications.commands` and permissions:
`Administrator` (easiest for beginners) — or at minimum:
`Manage Roles, Kick Members, Ban Members, Moderate Members, Manage Messages, Manage Channels, Manage Guild, Read/Send Messages, Embed Links, Add Reactions, Connect, Move Members`.

### 5. Configure
```bash
cp .env.example .env
```
Fill in `DISCORD_TOKEN`, `CLIENT_ID`, `CLIENT_SECRET`. Tip: set `DEV_GUILD_ID` while developing — slash commands deploy instantly to that guild.

### 6. Deploy slash commands
```bash
npm run deploy
```

### 7. Run everything
```bash
# Bot + Dashboard together
npm run dev

# …or separately
npm run bot
npm run dashboard
```
- Bot logs into Discord
- Dashboard runs at **http://localhost:3000**

---

## 🎨 Dashboard (clean violet sidebar)

Login with **Discord OAuth2**. Everything is grouped into a clean sidebar, fully bilingual:

| Section | Pages |
|---|---|
| **GENERAL** | Overview · Server Settings · Embed Messages (live preview builder) · Get Premium |
| **MODULE SETTINGS** | Utility · **Welcome & Goodbye** ⭐ · Auto Responder · Leveling · **Auto Roles** ⭐ · Colors · Self-Assignable Roles · Starboard · Temporary Channels · Temp Link · Statistics · Tickets |
| **MODERATION** | **Moderation** ⭐ · Logs · Automod · Anti-Raid · VIP Protection |
| **NOTIFICATIONS** | Twitch · YouTube · Kick · Reddit *(live feed pollers, ~90s interval)* |
| **OTHERS** | Control Panel Logs · Mod Actions |

⭐ = priority core features with full functionality.

- **Language toggle**: bottom of the sidebar (and top of the landing page). Arabic flips the whole UI to **RTL**.
- **Guild picker**: only servers where you have *Manage Server* **and** the bot is present.
- Every change is written to **Control Panel Logs** automatically.

### Branding

Brobot uses a **clean white** canvas with **modern violet** (`#5865f2` → `#eb459e`) accents. The palette lives in a single `:root` block in `dashboard/public/css/style.css`, and the logo is an inline SVG mark (`dashboard/public/favicon.svg`) used across the landing page and sidebar.

---

## 🛡️ Core Features (fully implemented)

### 1. Moderation Engine
| Command | Description |
|---|---|
| `/kick user reason` | Kick with hierarchy checks, DM notice, case log |
| `/ban user reason duration delete_messages` | Ban (optional temporary with auto-unban), message cleanup |
| `/unban user_id` | Unban by ID |
| `/mute user duration reason` | **Discord Timeout API** (max 28d, clamped) |
| `/unmute user` | Remove timeout |
| `/clear amount [user]` | Bulk delete (14-day rule respected) |
| `/warn`, `/warnings`, `/clearwarns` | Full warning system with active tracking |

Every action is recorded as a **case** (`ModAction`) and shown under *Mod Actions*. Temporary bans are persisted (`expiresAt`) and swept on restart.

### 2. Welcome & Goodbye Engine
- Triggers on `guildMemberAdd` / `guildMemberRemove`
- Welcome **channel selection**, custom greeting with placeholders:
  `{user}` `{user.mention}` `{user.tag}` `{server}` `{memberCount}` `{createdAt}` `{boostCount}` …
- Embed or plain text, custom color, banner image, avatar thumbnail, optional DM
- Goodbye toggle + full customization
- Live preview in the dashboard + `/welcome preview` in Discord

### 3. Auto Role Engine
- Instantly assigns preset roles **the moment a member joins**
- Dashboard role picker or `/autorole add|remove|list`
- Role-hierarchy safety checks, optional bot-account handling

### 4. Bilingual Web UI
- English / العربية switch with automatic **LTR ↔ RTL** flipping
- Full Arabic dictionary for every dashboard section and the landing page
- Per-server bot language (`locale` in Server Settings) for server-facing text
  > ℹ️ Note: Discord's application-command localization API does not support Arabic yet (not in the official Locale list), so slash command *names/descriptions* stay English — the dashboard and bot messages are fully Arabic-capable.
- Discord OAuth2 login + session persistence (MongoDB-backed sessions)

### 5. Dynamic Prefix & Legacy Text Commands
- Change the prefix from the dashboard (**Server Settings → Prefix**) or in chat with `!prefix <new>`
- **Zero-restart live sync**: the bot keeps an in-memory cache (`client.prefixes`) — dashboard saves push the new prefix to the bot instantly via a loopback endpoint, with a 5s MongoDB poll as fallback and a 60s read-through TTL as a safety net
- Legacy commands follow the custom prefix: `$ping`, `$avatar`, `$help`, `$prefix` (aliases included)

### 6. Server Builder & Layout Cloner
- Dashboard tab **Server Builder** (منشئ السيرفرات) under Module Settings
- 4 ready-made bilingual templates: 🎮 Gaming & Community, 🛒 Store & Digital Shop, 🎥 Content Creator & Live Streamer, 🕊️ Minimalist & Modern
- **Preview** any template (roles + full channel tree) before applying
- **Safety modes**:
  - *Append Build* (default, safe) — adds roles/categories/channels without touching existing ones
  - *Clean Build* (danger) — deletes ALL existing channels first; requires typing the exact server name + a confirmation checkbox
- Live **progress bar + log** streamed while the bot builds (per-action throttling via `BUILDER_DELAY_MS`)
- On finish, created channels are **auto-linked to dashboard systems**: welcome messages, logs (`logging.channelId` + `modLogChannelId`), auto-role, ticket category/panel, self-roles channel
- Permissions required by the bot: **Administrator**, or **Manage Channels + Manage Roles**

### Bonus engines (also functional)
- **Automod**: spam, links, Discord invites, bad words, mass mentions → delete + timeout + log
- **Anti-Raid**: join-burst detection, minimum account age, optional auto-kick lockdown
- **Logging**: deleted/edited messages, joins/leaves, role changes, voice, bans
- **Leveling**: XP per message with cooldown, level-up announcements, role rewards, `/rank`, and a live dashboard leaderboard
- **Tickets**: button panel, private channels, claim/close, ticket records
- **Starboard**: threshold-based reposts kept in sync
- **Temporary Channels**: join-to-create + auto-delete when empty
- **Statistics**: live voice-channel counters (members/online/bots/roles/channels)
- **Temp Link**: timed, limited-use invites generated from the dashboard
- **Self-Assignable Roles & Colors**: button/select-menu panels sent from the dashboard
- **VIP Protection (Anti-Nuke)**: audit-log watcher — blocks Administrator grants, reverts role deletions/updates, deletes backdoor admin roles, strips admin from offenders and alerts the log channel
- **Notifications Feeds**: Twitch (Helix, needs `TWITCH_CLIENT_ID`/`SECRET`), YouTube (RSS), Kick and Reddit (public JSON) — polled every ~90s, templated messages, no ping spam

---

## 🔌 REST API (used by the dashboard)

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/stats` | Public bot status (heartbeat) |
| GET | `/api/me` · `/api/guilds` | Session user + manageable guilds |
| POST | `/api/user/guilds/refresh` | Re-fetch guilds from Discord OAuth2 (auto-rotates access token) |
| GET/PATCH | `/api/guild/:id/settings` | Read / partial-update settings (section-merged, logged) |
| GET | `/api/guild/:id/meta` | Channels, categories, roles (via bot) |
| GET | `/api/guild/:id/overview` | Stats for the Overview page |
| GET | `/api/guild/:id/logs?type=dashboard\|mods` | Control Panel / Mod Actions logs |
| GET | `/api/guild/:id/leaderboard` | Top XP members |
| POST | `/api/guild/:id/tickets/panel` | Send/refresh ticket panel |
| POST | `/api/guild/:id/selfroles/panel` | Send self-roles button panel |
| POST | `/api/guild/:id/colorroles/panel` | Send color picker panel |
| POST | `/api/guild/:id/templink` | Create timed invite |
| POST/DELETE | `/api/guild/:id/stats/counters` | Create/remove counter channels |
| POST | `/api/guild/:id/premium` | Toggle premium (demo placeholder) |
| GET | `/api/guild/:id/builder/templates` | Server Builder template list |
| POST | `/api/guild/:id/builder/apply` | Start a build job (proxied to the bot) |
| GET | `/api/guild/:id/builder/status/:jobId` | Live build job status/progress/log |

---

## ⚙️ Environment Variables

| Variable | Description |
|---|---|
| `DISCORD_TOKEN` | Bot token |
| `CLIENT_ID` / `CLIENT_SECRET` | OAuth2 application credentials |
| `DASHBOARD_URL` | Public URL, e.g. `http://localhost:3000` (must match the OAuth redirect) |
| `PORT` | Dashboard port (default `3000`) |
| `INTERNAL_PORT` | Loopback port for instant prefix-sync pushes (default `3001`) |
| `BUILDER_DELAY_MS` | Delay between Server Builder actions in ms (default `700`) |
| `NOTIFICATIONS_INTERVAL_MS` | Notifications feeds poll interval (default `90000`) |
| `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` | Optional: enable Twitch live alerts |
| `SESSION_SECRET` | Long random string for session signing |
| `MONGODB_URI` | Mongo connection string |
| `DEV_GUILD_ID` | Optional: deploy commands to one guild instantly |
| `OWNER_IDS` | Optional: comma-separated bot owner IDs |

---

## 🧭 How it fits together

```
Discord ─► bot/index.js ─► events/ ─► systems/ ─► models/
                                   │
        slash commands ────────────┘

Browser ─► dashboard/server.js ─► routes/api.js ─► models/
                │                        │
                │  auth.js               └─► Discord REST (channels, roles,
                │  (OAuth2 session)           panels, invites, counters)
                └─► views + public/js (bilingual SPA-style sections)
```

The bot writes a **heartbeat** (`BotStatus`) every 30s so the dashboard can show live status without sharing a process.

**Guild sync:** the bot records every server it joins (`guildCreate`) in the `Guild` collection (`inGuild: true`), marks servers it leaves (`guildDelete`) as `inGuild: false` (settings are preserved), and reconciles stale entries on startup. The dashboard shows “bot present” per server from this collection, and the server-picker’s **🔄 Refresh servers** button re-fetches the user’s guild list straight from Discord (with automatic OAuth token rotation).

---

## 🧪 Notes & Troubleshooting

- **Commands not appearing?** Run `npm run deploy` again; with `DEV_GUILD_ID` set they appear instantly.
- **“bot missing” next to a server?** The bot hasn't been invited there (or hasn't saved settings yet — invite it once).
- **Welcome messages not sending?** Check the channel ID + that the bot has *Send Messages* + *Embed Links* in that channel.
- **Dashboard 401 on login?** Verify the OAuth2 redirect URI matches `<DASHBOARD_URL>/auth/callback` exactly.
- **Arabic not showing?** The toggle is in the sidebar footer (dashboard) and top-right (landing) — the preference is remembered in `localStorage`.
- Frontend is dependency-free (no build step, no CDN required) so it also works fully offline.

---

## 🎉 Giveaways (`/giveaway`)

Persistent giveaways with button entries, role/level requirements, rerolls and restart recovery.

| Command | Description |
|---|---|
| `/giveaway start prize duration [winners] [channel] [required_role] [required_level]` | Post a giveaway; duration like `30m`, `2h`, `3d`, `1w` (10s–60d) |
| `/giveaway end id` | End immediately and draw winners (message ID or giveaway ID) |
| `/giveaway reroll id [winners]` | Draw new winners for an ended giveaway |
| `/giveaway list` | Active + recent giveaways in the server |

- Entries are stored atomically (`$addToSet`), one per member.
- Role and level requirements are re-checked when winners are drawn, so stale entries never win.
- Active timers are restored on startup (`systems/giveaways.js`); overdue giveaways end immediately.
- Winners are announced in the channel and the message embed is updated in place.
- Requires the bot to have **Send Messages** + **Embed Links** in the target channel.
## 💰 Economy & Voice Leveling (v1.1)

Added after a feature-level gap analysis against ProBot-style bots
(see [GAP_ANALYSIS.md](GAP_ANALYSIS.md)) — all original Brobot code and design.

| Command | Description |
|---|---|
| `/daily` | Claim daily credits — one claim per UTC day; consecutive-day streaks add a growing bonus (base 500 + up to 250 random + streak bonus) |
| `/pay user amount` | Transfer your credits to another member — atomic and balance-checked, balances can never go negative |
| `/title set\|show\|clear` | Set a personal title (max 80 chars, links/pings stripped) shown on your `/profile` card |
| `/roll [sides] [count]` | Roll dice (default 1 × d6, up to 25 × d1000) |

- **Voice XP**: time in voice channels now earns XP too — `voiceXp` and
  `totalVoiceMinutes` on the Level record, awarded when a member leaves or
  switches channels at the guild's `leveling.voiceXpPerMinute` rate
  (default 10 XP/min). Bots, the AFK channel and sessions under a minute
  earn nothing.
- **`/top` leaderboards**: new `type` option — `text` (default), `voice`,
  `credits` or `reps`.
- `/rank` and `/profile` now show voice level/time and the daily streak;
  `/credits` shows your streak and points you at `/daily`.
- Economy and levels stay **per-server** (Brobot's design), and `/daily`'s
  streak bonus rewards regulars with no paid tiers.

## 👤 Personal Dashboard & Credits Store (v1.2)

- **`/my` — a dashboard for members, not just admins.** After logging in
  with Discord, every member gets their own page: cards for credits,
  level, server rank, reputation and voice level, a server picker,
  Top 100 leaderboards (XP / richest / reputation) and a web
  **daily-claim button** that shares one implementation with `/daily`
  (`bot/systems/economyService.js`), so streaks can never drift.
- **Credits Store** (on `/my`): 8 original gradient profile backgrounds
  and 6 badges (`models/storeCatalog.js`), bought per-server with the
  credits earned from `/daily`. The equipped background and owned
  badges appear on the member's `/profile` card in Discord.
- **Landing v2**: a centered hero — pill, large gradient headline, dual
  CTAs, the product mock below and live stats — with Brobot's own
  bilingual (EN/AR) copy throughout.

## 🏆 Leveling Plus (v1.3)

From the REA feature-level study (see `GAP_ANALYSIS.md`) — again, all
original Brobot code and design. 46 slash commands in total.

- **NO-XP channels & roles**: pick channels and roles that earn no XP
  (text or voice) on the dashboard leveling page.
- **Custom level-up message**: your own announcement template with
  placeholders (`{user.mention}`, `{level}`, `{server}`…); empty keeps
  the built-in default.
- **Voice role rewards**: roles granted when a member reaches a voice
  level, honouring the same stacking setting as text rewards.
- **`/reset`**: admins reset one member's text / voice / all XP, or the
  whole server's — server-wide resets require `confirm: true`.

## 📜 License

MIT — have fun, and make your server awesome. ✨
