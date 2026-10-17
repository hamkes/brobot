const { PermissionFlagsBits, ChannelType } = require('discord.js');
const config = require('../config');
const logger = require('../utils/logger');
const { Guild } = require('../db');
const { getTemplate } = require('./templates');

const jobs = new Map();
const JOB_TTL = 30 * 60 * 1000;
const MAX_JOBS = 30;
const MAX_LOG_ENTRIES = 200;

let jobCounter = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

function permBits(names) {
  let bits = 0n;
  for (const name of names || []) {
    bits |= PermissionFlagsBits[name] ?? 0n;
  }
  return bits;
}

function channelOverwrites(guild, access, staffRoleIds, botId) {
  if (!access || access === 'public') return [];

  const everyoneId = guild.roles.everyone.id;
  const list = [];

  if (access === 'readonly') {
    list.push({
      id: everyoneId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
      deny: [PermissionFlagsBits.SendMessages]
    });
    for (const roleId of staffRoleIds) {
      list.push({ id: roleId, allow: [PermissionFlagsBits.SendMessages] });
    }
    list.push({
      id: botId,
      allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ManageChannels]
    });
  } else if (access === 'staff') {
    list.push({ id: everyoneId, deny: [PermissionFlagsBits.ViewChannel] });
    for (const roleId of staffRoleIds) {
      list.push({
        id: roleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory
        ]
      });
    }
    list.push({
      id: botId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageChannels
      ]
    });
  } else if (access === 'locked') {
    list.push({ id: everyoneId, deny: [PermissionFlagsBits.Connect] });
    for (const roleId of staffRoleIds) {
      list.push({ id: roleId, allow: [PermissionFlagsBits.Connect] });
    }
    list.push({ id: botId, allow: [PermissionFlagsBits.Connect] });
  }

  return list;
}

function pushLog(job, key, data, level = 'info') {
  job.log.push({ time: Date.now(), key, data: data || null, level });
  if (job.log.length > MAX_LOG_ENTRIES) job.log.shift();
}

function scheduleJobCleanup(jobId) {
  const timer = setTimeout(() => jobs.delete(jobId), JOB_TTL);
  if (timer.unref) timer.unref();
}

function pruneJobs() {
  if (jobs.size <= MAX_JOBS) return;
  for (const [id, job] of jobs) {
    if (jobs.size <= 20) break;
    if (job.status !== 'running') jobs.delete(id);
  }
}

function getJob(jobId) {
  return jobs.get(jobId) || null;
}

async function startBuild(client, { guildId, templateId, mode = 'append', confirmName, delayMs }) {
  const template = getTemplate(templateId);
  if (!template) throw Object.assign(new Error('Unknown template'), { code: 'invalid_template' });

  if (!['clean', 'append'].includes(mode)) {
    throw Object.assign(new Error('Invalid mode'), { code: 'invalid_mode' });
  }

  const guild = client.guilds.cache.get(guildId) || (await client.guilds.fetch(guildId).catch(() => null));
  if (!guild) throw Object.assign(new Error('Bot is not in that guild'), { code: 'guild_not_found' });

  const me = guild.members.me;
  if (!me) throw Object.assign(new Error('Bot member unavailable'), { code: 'bot_not_member' });

  const canBuild =
    me.permissions.has(PermissionFlagsBits.Administrator) ||
    (me.permissions.has(PermissionFlagsBits.ManageChannels) && me.permissions.has(PermissionFlagsBits.ManageRoles));
  if (!canBuild) throw Object.assign(new Error('Missing permissions'), { code: 'missing_permissions' });

  if (mode === 'clean' && String(confirmName || '').trim() !== guild.name) {
    throw Object.assign(new Error('Confirmation name does not match'), { code: 'confirm_name_mismatch' });
  }

  for (const job of jobs.values()) {
    if (job.guildId === guildId && job.status === 'running') {
      throw Object.assign(new Error('A build is already running'), { code: 'build_in_progress' });
    }
  }

  jobCounter += 1;
  const jobId = `b${Date.now().toString(36)}${jobCounter}`;

  const job = {
    id: jobId,
    guildId,
    guildName: guild.name,
    templateId: template.id,
    mode,
    status: 'running',
    phase: 'starting',
    progress: { done: 0, total: 1 },
    log: [],
    result: null,
    error: null,
    startedAt: Date.now(),
    finishedAt: null
  };

  jobs.set(jobId, job);
  pruneJobs();
  logger.info(`Server Builder: job ${jobId} started (guild ${guildId}, template ${template.id}, mode ${mode})`);

  runBuild(job, guild, template, mode, delayMs ?? config.builderDelayMs).catch((err) => {
    job.status = 'error';
    job.phase = 'error';
    job.error = err.message;
    pushLog(job, 'bld_log_error', { error: err.message }, 'error');
    job.finishedAt = Date.now();
    scheduleJobCleanup(jobId);
  });

  return { jobId };
}

async function runBuild(job, guild, template, mode, delay) {
  const staffRoleIds = [];
  const createdRoles = {};
  const createdCategories = {};
  const createdChannels = {};
  const botId = guild.members.me.id;

  const roleCount = template.roles.length;
  const catCount = template.categories.length;
  const chCount = template.categories.reduce((acc, cat) => acc + cat.channels.length, 0);

  job.progress.total = roleCount + catCount + chCount;

  try {
    if (mode === 'clean') {
      job.phase = 'cleanup';
      pushLog(job, 'bld_log_phase_cleanup');
      job.progress.total += guild.channels.cache.size;

      const ordered = [...guild.channels.cache.values()].sort(
        (a, b) => (a.type === ChannelType.GuildCategory ? 1 : 0) - (b.type === ChannelType.GuildCategory ? 1 : 0)
      );
      for (const channel of ordered) {
        try {
          await channel.delete(`Server Builder (${template.id})`);
          pushLog(job, 'bld_log_channel_deleted', { name: channel.name });
        } catch (err) {
          pushLog(job, 'bld_log_channel_delete_failed', { name: channel.name }, 'warn');
        }
        job.progress.done += 1;
        await sleep(delay);
      }
    }

    job.phase = 'roles';
    const orderedRoles = [...template.roles].reverse();
    for (let i = 0; i < orderedRoles.length; i++) {
      const def = orderedRoles[i];
      pushLog(job, 'bld_log_phase_roles', { current: i + 1, total: roleCount });
      const role = await guild.roles.create({
        name: def.name,
        color: def.color,
        hoist: Boolean(def.hoist),
        mentionable: Boolean(def.mentionable),
        permissions: permBits(def.permissions),
        reason: `Server Builder (${template.id})`
      });
      createdRoles[def.key] = role;
      pushLog(job, 'bld_log_role_created', { name: def.name });
      job.progress.done += 1;
      await sleep(delay);
    }

    for (const key of template.staffRoleKeys || []) {
      if (createdRoles[key]) staffRoleIds.push(createdRoles[key].id);
    }

    job.phase = 'channels';
    let channelIndex = 0;
    for (const cat of template.categories) {
      const category = await guild.channels.create({
        name: cat.name,
        type: ChannelType.GuildCategory,
        permissionOverwrites: channelOverwrites(guild, cat.access, staffRoleIds, botId),
        reason: `Server Builder (${template.id})`
      });
      createdCategories[cat.name] = category;
      job.progress.done += 1;
      await sleep(delay);

      for (const def of cat.channels) {
        channelIndex += 1;
        pushLog(job, 'bld_log_phase_channels', { current: channelIndex, total: chCount });

        const isVoice = def.type === 'voice';
        const options = {
          name: def.name,
          type: isVoice ? ChannelType.GuildVoice : ChannelType.GuildText,
          parent: category.id,
          permissionOverwrites: def.access ? channelOverwrites(guild, def.access, staffRoleIds, botId) : [],
          reason: `Server Builder (${template.id})`
        };
        if (!isVoice && def.topic) options.topic = def.topic;

        const channel = await guild.channels.create(options);
        createdChannels[def.name] = channel;
        pushLog(job, 'bld_log_channel_created', { name: def.name });
        job.progress.done += 1;
        await sleep(delay);
      }
    }

    job.phase = 'database';
    pushLog(job, 'bld_log_phase_db');

    const links = template.links || {};
    const settings = await Guild.findOneAndUpdate(
      { guildId: guild.id },
      { $setOnInsert: { guildId: guild.id } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const linked = [];

    const welcomeChannel = links.welcome && createdChannels[links.welcome];
    if (welcomeChannel) {
      settings.welcome.channelId = welcomeChannel.id;
      settings.welcome.enabled = true;
      linked.push('welcome');
    }

    const logChannel = links.logs && createdChannels[links.logs];
    if (logChannel) {
      settings.logging.channelId = logChannel.id;
      settings.logging.enabled = true;
      settings.modLogChannelId = logChannel.id;
      linked.push('logging');
    }

    const memberRole = links.autorole && createdRoles[links.autorole];
    if (memberRole) {
      if (!settings.autoroles.includes(memberRole.id)) settings.autoroles.push(memberRole.id);
      linked.push('autoroles');
    }

    const ticketCategory = links.ticketsCategory && createdCategories[links.ticketsCategory];
    const ticketPanel = links.ticketPanel && createdChannels[links.ticketPanel];
    if (ticketCategory || ticketPanel) {
      if (ticketCategory) settings.tickets.categoryId = ticketCategory.id;
      if (ticketPanel) settings.tickets.panelChannelId = ticketPanel.id;
      settings.tickets.enabled = true;
      if (staffRoleIds.length) settings.tickets.supportRoleId = staffRoleIds[staffRoleIds.length - 1];
      linked.push('tickets');
    }

    const selfRolesChannel = links.selfRolesChannel && createdChannels[links.selfRolesChannel];
    if (selfRolesChannel && links.selfRoleKeys?.length) {
      settings.selfRoles.channelId = selfRolesChannel.id;
      settings.selfRoles.roles = links.selfRoleKeys.map((key) => createdRoles[key]?.id).filter(Boolean);
      linked.push('selfRoles');
    }

    await settings.save();
    pushLog(job, 'bld_log_db_linked', { count: linked.length });

    job.progress.done = job.progress.total;
    job.result = { roles: roleCount, categories: catCount, channels: chCount, linked };
    job.status = 'done';
    job.phase = 'done';
    pushLog(job, 'bld_log_done');
    logger.success(`Server Builder: job ${job.id} finished for guild ${guild.id}`);
  } catch (err) {
    job.status = 'error';
    job.phase = 'error';
    job.error = err.message;
    pushLog(job, 'bld_log_error', { error: err.message }, 'error');
    logger.error(`Server Builder: job ${job.id} failed — ${err.message}`);
  } finally {
    job.finishedAt = Date.now();
    scheduleJobCleanup(job.id);
  }
}

module.exports = { startBuild, getJob };
