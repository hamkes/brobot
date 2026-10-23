/* ============================================================
   ✨ Brobot — Dashboard pages (all sidebar sections)
   Sections are grouped into a clean, modern structure:
   GENERAL / MODULE SETTINGS / MODERATION / NOTIFICATIONS / OTHERS
   ============================================================ */

(function () {
  const t = window.t;
  const UI = window.UI;

  /* ---------- save helper ---------- */
  async function patchSettings(ctx, payload) {
    const data = await UI.api(`/guild/${ctx.guildId}/settings`, { method: 'PATCH', body: payload });
    if (data.settings) ctx.settings = data.settings;
    return data;
  }

  function bindSave(root, ctx, scopes, extra, buttonId) {
    const selector = buttonId ? `[data-save="${buttonId}"]` : '[data-save]';
    root.querySelectorAll(selector).forEach((btn) => {
      btn.addEventListener('click', async () => {
        const state = root.querySelector(`[data-save-state="${btn.dataset.save}"]`);
        btn.disabled = true;
        try {
          let payload = UI.gather(root);
          if (scopes) {
            const filtered = {};
            for (const key of Object.keys(payload)) {
              if (scopes.includes(key)) filtered[key] = payload[key];
            }
            payload = filtered;
          }
          if (extra) payload = extra(payload, root) || payload;
          await patchSettings(ctx, payload);
          if (state) {
            state.classList.add('show');
            setTimeout(() => state.classList.remove('show'), 1800);
          }
          UI.toast(t('msg_saved'));
        } catch (err) {
          UI.toast(err.message === 'no_valid_sections' ? t('msg_error') : t('msg_error'), 'err');
        } finally {
          btn.disabled = false;
        }
      });
    });
  }

  /* ---------- placeholder chips ---------- */
  function placeholderChips(targets) {
    const list = ['{user}', '{user.mention}', '{user.tag}', '{server}', '{memberCount}', '{createdAt}', '{user.createdAt}', '{boostCount}'];
    return `<div class="placeholder-row">${list
      .map((p) => `<span class="placeholder" data-insert="${p}" data-insert-target="${targets}">${p}</span>`)
      .join('')}</div>`;
  }

  function bindPlaceholderInsert(root) {
    root.querySelectorAll('[data-insert]').forEach((chip) => {
      chip.addEventListener('click', () => {
        const targetPath = chip.dataset.insertTarget;
        const input = root.querySelector(`[data-path="${targetPath}"]`);
        if (!input) return;
        const pos = input.selectionStart ?? input.value.length;
        input.value = input.value.slice(0, pos) + chip.dataset.insert + input.value.slice(pos);
        input.focus();
        input.selectionStart = input.selectionEnd = pos + chip.dataset.insert.length;
        input.dispatchEvent(new Event('input'));
      });
    });
  }

  /* ---------- embed preview ---------- */
  function renderEmbedPreview(previewEl, cfg) {
    const color = cfg.color || '#5865F2';
    previewEl.style.borderInlineStartColor = color;
    previewEl.innerHTML = `
      ${cfg.thumbnail ? '<img class="ep-thumb" src="https://cdn.discordapp.com/embed/avatars/0.png" alt="">' : ''}
      ${cfg.title ? `<div class="ep-title">${UI.esc(cfg.title)}</div>` : ''}
      <div class="ep-desc">${UI.esc(cfg.description).replace(/\n/g, '<br>') || '<em>…</em>'}</div>
      ${cfg.image ? `<img class="ep-image" src="${UI.esc(cfg.image)}" onerror="this.style.display='none'" alt="">` : ''}
      ${cfg.footer ? `<div class="ep-footer">${UI.esc(cfg.footer)}</div>` : ''}`;
  }

  function bindEmbedPreview(root, paths) {
    const previewEl = root.querySelector('[data-embed-preview]');
    const update = () => {
      const cfg = {};
      for (const [key, path] of Object.entries(paths)) {
        const input = root.querySelector(`[data-path="${path}"]`);
        cfg[key] = input ? (input.type === 'checkbox' ? input.checked : input.value) : '';
      }
      renderEmbedPreview(previewEl, cfg);
    };
    root.querySelectorAll('[data-path]').forEach((i) => i.addEventListener('input', update));
    update();
  }

  /* ============================================================
     GENERAL
     ============================================================ */

  async function renderOverview(ctx) {
    const data = await UI.api(`/guild/${ctx.guildId}/overview`);
    const node = UI.el(`<div>${UI.pageHead('sec_overview', 'ov_active_features')}</div>`);
    node.querySelector('[data-page-desc]').textContent = data.guild.name;

    const badge = data.premium
      ? `<span class="chip green">💎 ${UI.esc(t('ov_premium_active'))}</span>`
      : `<span class="chip">${UI.esc(t('ov_premium_free'))}</span>`;

    const stats = UI.el(`<div class="stats-grid">
      ${UI.statCard('👥', t('ov_members'), data.guild.memberCount.toLocaleString('en-US'))}
      ${UI.statCard('🟢', t('ov_online'), data.guild.presenceCount.toLocaleString('en-US'))}
      ${UI.statCard('⚠️', t('ov_active_warns'), data.stats.activeWarns)}
      ${UI.statCard('🛡️', t('ov_mod_24h'), data.stats.modActions24h)}
      ${UI.statCard('🎫', t('ov_tickets'), data.stats.openTickets)}
      ${UI.statCard('🏆', t('ov_tracked'), data.stats.membersTracked)}
    </div>`);
    node.appendChild(stats);

    const features = data.activeFeatures.length
      ? data.activeFeatures.map((f) => `<span class="chip green">✓ ${UI.esc(f)}</span>`).join('')
      : `<span class="chip empty">${UI.esc(t('ov_no_features'))}</span>`;

    node.appendChild(
      UI.el(UI.card(t('ov_active_features'), '', `<div class="chips">${features} ${badge}</div>`))
    );

    const modRows = data.recentModActions.map((a) => `
      <tr>
        <td><span class="badge ${UI.esc(a.action)}">${UI.esc(t(`mod_${a.action}`) === `mod_${a.action}` ? a.action : t(`mod_${a.action}`))}</span></td>
        <td>${UI.esc(a.targetTag || a.targetId || '—')}</td>
        <td>${UI.esc(a.moderatorTag || '—')}</td>
        <td>${UI.esc(a.reason)}</td>
        <td>${UI.timeAgo(a.createdAt)}</td>
      </tr>`).join('');

    node.appendChild(
      UI.el(UI.card(t('ov_recent_mod'), '', modRows
        ? `<div class="table-wrap"><table class="data"><thead><tr><th>${t('ma_action')}</th><th>${t('ma_target')}</th><th>${t('ma_moderator')}</th><th>${t('ma_reason')}</th><th>${t('ma_when')}</th></tr></thead><tbody>${modRows}</tbody></table></div>`
        : `<div class="empty-state"><span class="big">🛡️</span>${UI.esc(t('ma_empty'))}</div>`))
    );

    const dashRows = data.recentDashLogs.map((l) => `
      <tr>
        <td>${UI.esc(l.userTag || l.userId)}</td>
        <td>${UI.esc(l.action)}</td>
        <td>${UI.esc(l.details)}</td>
        <td>${UI.timeAgo(l.createdAt)}</td>
      </tr>`).join('');

    node.appendChild(
      UI.el(UI.card(t('ov_recent_dash'), '', dashRows
        ? `<div class="table-wrap"><table class="data"><thead><tr><th>${t('dl_user')}</th><th>${t('dl_action')}</th><th>${t('dl_details')}</th><th>${t('dl_when')}</th></tr></thead><tbody>${dashRows}</tbody></table></div>`
        : `<div class="empty-state"><span class="big">📝</span>${UI.esc(t('dl_empty'))}</div>`))
    );

    return node;
  }

  function renderServerSettings(ctx) {
    const s = ctx.settings;
    const node = UI.el(`<div>${UI.pageHead('ss_title', 'ss_desc')}</div>`);

    const body = `
      <div class="form-grid">
        ${UI.textField('prefix', t('ss_prefix'), '! , ? , .', s.prefix, '!')}
        ${UI.channelSelect('mainChannelId', t('ss_main_channel'), ctx.meta.channels, s.mainChannelId, '', (c) => c.type !== 2)}
        ${UI.channelSelect('modLogChannelId', t('ss_modlog'), ctx.meta.channels, s.modLogChannelId, '', (c) => c.type !== 2)}
        <div class="field">
          <label>${UI.esc(t('ss_locale'))}</label>
          <select data-path="locale">
            <option value="en" ${s.locale === 'en' ? 'selected' : ''}>English</option>
            <option value="ar" ${s.locale === 'ar' ? 'selected' : ''}>العربية</option>
          </select>
          <span class="hint">${UI.esc(t('ss_locale_hint'))}</span>
        </div>
      </div>`;

    node.appendChild(
      UI.el(UI.card(t('ss_title'), '',
        body,
        UI.saveButton('server-settings')))
    );
    bindSave(node, ctx, ['prefix', 'mainChannelId', 'modLogChannelId', 'locale']);
    return node;
  }

  function renderEmbeds(ctx) {
    const s = ctx.settings;
    const saved = s.embed || {};
    const node = UI.el(`<div>${UI.pageHead('em_title', 'em_desc')}</div>`);

    const body = `
      <div class="form-grid">
        <div class="full">
          ${UI.textField('embed.content', t('em_content'), t('em_placeholder_hint'), saved.content || '', 'Hello {user.mention}!')}
        </div>
        <div class="full">
          ${placeholderChips('embed.content')}
        </div>
        ${UI.textField('embed.title', t('em_embed_title'), t('wc_title_field'), saved.title || '')}
        ${UI.colorField('embed.color', t('em_color'), saved.color || '#5865F2')}
        <div class="full">
          ${UI.textareaField('embed.description', t('em_embed_desc'), t('em_placeholder_hint'), saved.description || '')}
        </div>
        <div class="full">
          ${placeholderChips('embed.description')}
        </div>
        ${UI.textField('embed.image', t('em_image'), 'https://i.imgur.com/...jpg', saved.image || '')}
        ${UI.textField('embed.footer', t('em_footer'), '✨ Brobot', saved.footer || '')}
        <div class="full">
          ${UI.toggleField('embed.thumbnail', t('em_thumbnail'), '', Boolean(saved.thumbnail))}
        </div>
      </div>`;

    node.appendChild(UI.el(UI.card(t('em_title'), '', body, UI.saveButton('embed'))));

    node.appendChild(
      UI.el(UI.card(t('em_preview_title'), '',
        `<div class="embed-preview" data-embed-preview></div>`,
        `<button class="btn btn-ghost btn-sm" data-copy-json>${UI.esc(t('copy'))} JSON</button>`))
    );

    bindPlaceholderInsert(node);
    bindEmbedPreview(node, {
      title: 'embed.title',
      description: 'embed.description',
      color: 'embed.color',
      image: 'embed.image',
      footer: 'embed.footer',
      thumbnail: 'embed.thumbnail'
    });
    bindSave(node, ctx, ['embed'], undefined, 'embed');

    node.querySelector('[data-copy-json]').addEventListener('click', () => {
      const cfg = UI.gather(node).embed || {};
      navigator.clipboard.writeText(JSON.stringify(cfg, null, 2))
        .then(() => UI.toast(t('msg_copied')))
        .catch(() => null);
    });

    return node;
  }

  async function renderPremium(ctx) {
    const node = UI.el(`<div>${UI.pageHead('pr_title', 'pr_desc')}</div>`);
    const current = Boolean(ctx.settings.premium);

    node.appendChild(UI.el(`
      <div class="notice">💡 <span><strong>${UI.esc(t('pr_current'))}:</strong> ${current ? 'Premium 💎' : 'Free'} — ${UI.esc(t('pr_demo_note'))}</span></div>
    `));

    node.appendChild(UI.el(UI.card(t('pr_title'), '',
      `<ul class="chips" style="list-style:none;padding:0;display:grid;gap:10px">
        ${['pr_perk_1', 'pr_perk_2', 'pr_perk_3', 'pr_perk_4'].map((k) => `<li class="chip green">✓ ${UI.esc(t(k))}</li>`).join('')}
      </ul>`,
      `<button class="btn ${current ? 'btn-ghost' : 'btn-primary'}" data-premium="${current ? 'false' : 'true'}">
        ${UI.esc(current ? t('pr_deactivate') : t('pr_activate'))}
      </button>`)));

    node.querySelector('[data-premium]').addEventListener('click', async (e) => {
      const value = e.currentTarget.dataset.premium === 'true';
      e.currentTarget.disabled = true;
      try {
        await UI.api(`/guild/${ctx.guildId}/premium`, { method: 'POST', body: { premium: value } });
        ctx.settings.premium = value;
        UI.toast(t('msg_saved'));
        window.App.render(ctx.page);
      } catch {
        UI.toast(t('msg_error'), 'err');
      }
    });

    return node;
  }

  /* ============================================================
     MODULE SETTINGS
     ============================================================ */

  function renderUtility() {
    const node = UI.el(`<div>${UI.pageHead('ut_title', 'ut_desc')}</div>`);
    const cmds = [
      ['/ping', 'ut_cmd_ping'],
      ['/avatar', 'ut_cmd_avatar'],
      ['/userinfo', 'ut_cmd_userinfo'],
      ['/serverinfo', 'ut_cmd_serverinfo'],
      ['/poll', 'ut_cmd_poll'],
      ['/rank', 'ut_cmd_rank'],
      ['/help', 'ut_cmd_help']
    ];
    node.appendChild(UI.el(UI.card(t('ut_title'), '', `
      <div class="chips">
        ${cmds.map(([cmd, key]) => `<span class="chip"><code>${cmd}</code> — ${UI.esc(t(key))}</span>`).join('')}
      </div>`)));
    return node;
  }

  function renderWelcome(ctx) {
    const s = ctx.settings;
    const node = UI.el(`<div>${UI.pageHead('wc_title', 'wc_desc')}</div>`);

    const welcomeBody = `
      <div class="form-grid">
        <div class="full">${UI.toggleField('welcome.enabled', t('wc_welcome_on'), '', s.welcome.enabled)}</div>
        ${UI.channelSelect('welcome.channelId', t('wc_channel'), ctx.meta.channels, s.welcome.channelId, '', (c) => c.type !== 2)}
        <div class="full">${UI.toggleField('welcome.useEmbed', t('wc_embed'), '', s.welcome.useEmbed)}</div>
        ${UI.textField('welcome.title', t('wc_title_field'), '', s.welcome.title)}
        ${UI.colorField('welcome.color', t('wc_color'), s.welcome.color)}
        <div class="full">${UI.textareaField('welcome.message', t('wc_message'), t('wc_placeholders'), s.welcome.message)}</div>
        <div class="full">${placeholderChips('welcome.message')}</div>
        ${UI.textField('welcome.image', t('wc_image'), '', s.welcome.image || 'https://...')}
        <div class="full">
          ${UI.toggleField('welcome.thumbnail', t('wc_thumbnail'), '', s.welcome.thumbnail)}
          ${UI.toggleField('welcome.dmUser', t('wc_dm'), '', s.welcome.dmUser)}
        </div>
      </div>
      <p class="card-subtitle" style="margin-top:12px">${UI.esc(t('wc_test_note'))}</p>`;

    node.appendChild(UI.el(UI.card(t('wc_title'), '', welcomeBody, UI.saveButton('welcome'))));

    const previewBody = `<div class="embed-preview" data-embed-preview></div>`;
    const previewCard = UI.el(UI.card(t('preview'), '', previewBody));
    node.appendChild(previewCard);

    const goodbyeBody = `
      <div class="form-grid">
        <div class="full">${UI.toggleField('goodbye.enabled', t('wc_goodbye_on'), '', s.goodbye.enabled)}</div>
        ${UI.channelSelect('goodbye.channelId', t('wc_goodbye_channel'), ctx.meta.channels, s.goodbye.channelId, '', (c) => c.type !== 2)}
        ${UI.textField('goodbye.title', t('wc_goodbye_title'), '', s.goodbye.title)}
        <div class="full">${UI.textareaField('goodbye.message', t('wc_goodbye_message'), t('wc_placeholders'), s.goodbye.message)}</div>
        <div class="full">${placeholderChips('goodbye.message')}</div>
        ${UI.colorField('goodbye.color', t('wc_color'), s.goodbye.color)}
        <div class="full">${UI.toggleField('goodbye.thumbnail', t('wc_thumbnail'), '', s.goodbye.thumbnail)}</div>
      </div>`;

    node.appendChild(UI.el(UI.card(t('wc_goodbye_on'), '', goodbyeBody, UI.saveButton('goodbye'))));

    bindSave(node, ctx, ['welcome'], null, 'welcome');
    bindSave(node, ctx, ['goodbye'], null, 'goodbye');
    bindPlaceholderInsert(node);

    const updatePreview = () => {
      const cfg = UI.gather(node).welcome || {};
      const fake = (text) => String(text || '')
        .split('{user}').join('Ahmed')
        .split('{user.mention}').join('@Ahmed')
        .split('{user.tag}').join('ahmed#0001')
        .split('{server}').join(ctx.meta.guild.name)
        .split('{memberCount}').join(String(ctx.meta.guild.memberCount).toLocaleString('en-US'))
        .split('{createdAt}').join('Jan 1, 2020')
        .split('{boostCount}').join('3');
      renderEmbedPreview(previewCard.querySelector('[data-embed-preview]'), {
        title: fake(cfg.title),
        description: fake(cfg.message),
        color: cfg.color,
        image: cfg.image || '',
        footer: `${ctx.meta.guild.name} • Welcome`,
        thumbnail: true
      });
    };
    node.querySelectorAll('[data-path]').forEach((i) => i.addEventListener('input', updatePreview));
    updatePreview();

    return node;
  }

  function renderAutoResponder(ctx) {
    const s = ctx.settings;
    const node = UI.el(`<div>${UI.pageHead('ar_title', 'ar_desc')}</div>`);

    const listEl = UI.el(`<div data-rows></div>`);
    const buildRow = (entry = { trigger: '', response: '', matchMode: 'contains' }) => {
      const row = UI.el(`
        <div class="list-row">
          <input type="text" data-role="trigger" placeholder="${UI.esc(t('ar_trigger'))}" value="${UI.esc(entry.trigger)}">
          <button class="icon-btn" type="button" data-role="arrow" tabindex="-1">➜</button>
          <input type="text" data-role="response" placeholder="${UI.esc(t('ar_response'))}" value="${UI.esc(entry.response)}">
          <select data-role="matchMode">
            <option value="contains" ${entry.matchMode === 'contains' ? 'selected' : ''}>${UI.esc(t('ar_contains'))}</option>
            <option value="exact" ${entry.matchMode === 'exact' ? 'selected' : ''}>${UI.esc(t('ar_exact'))}</option>
            <option value="startsWith" ${entry.matchMode === 'startsWith' ? 'selected' : ''}>${UI.esc(t('ar_starts'))}</option>
          </select>
          <button class="remove-row" type="button" data-role="remove">×</button>
        </div>`);
      row.querySelector('[data-role="remove"]').addEventListener('click', () => row.remove());
      return row;
    };

    (s.autoresponder || []).forEach((entry) => listEl.appendChild(buildRow(entry)));

    node.appendChild(UI.el(UI.card(t('ar_title'), '',
      listEl.outerHTML +
      `<button class="btn btn-ghost btn-sm" data-add-row style="margin-top:12px">＋ ${UI.esc(t('ar_add_row'))}</button>`,
      UI.saveButton('autoresponder'))));

    const container = node.querySelector('[data-rows]');
    node.querySelector('[data-add-row]').addEventListener('click', () => {
      container.appendChild(buildRow());
    });

    bindSave(node, ctx, ['autoresponder'], (payload) => {
      payload.autoresponder = [...container.querySelectorAll('.list-row')]
        .map((row) => ({
          trigger: row.querySelector('[data-role="trigger"]').value.trim(),
          response: row.querySelector('[data-role="response"]').value.trim(),
          matchMode: row.querySelector('[data-role="matchMode"]').value
        }))
        .filter((e) => e.trigger && e.response);
      return payload;
    });

    return node;
  }

  async function renderLeveling(ctx) {
    const s = ctx.settings;
    const node = UI.el(`<div>${UI.pageHead('lv_title', 'lv_desc')}</div>`);

    const rewardsEl = UI.el(`<div data-rewards></div>`);
    const buildReward = (reward = { level: 5, roleId: '' }) => {
      const row = UI.el(`
        <div class="list-row">
          <input type="number" min="0" max="1000" data-role="level" value="${reward.level}">
          <button class="icon-btn" type="button" tabindex="-1">➜</button>
          <select data-role="role">
            <option value="">— ${UI.esc(t('lv_reward_role'))} —</option>
            ${ctx.meta.roles.map((r) => `<option value="${r.id}" ${r.id === reward.roleId ? 'selected' : ''}>@${UI.esc(r.name)}</option>`).join('')}
          </select>
          <span></span>
          <button class="remove-row" type="button" data-role="remove">×</button>
        </div>`);
      row.querySelector('[data-role="remove"]').addEventListener('click', () => row.remove());
      return row;
    };
    (s.leveling.rewards || []).forEach((r) => rewardsEl.appendChild(buildReward(r)));

    const voiceRewardsEl = UI.el(`<div data-voice-rewards></div>`);
    (s.leveling.voiceRewards || []).forEach((r) => voiceRewardsEl.appendChild(buildReward(r)));

    // NO-XP channels: checkbox picker over the non-voice channels,
    // same [data-picker] mechanism as the role pickers (see UI.gather).
    const noXpChannelsPicker = `
      <div class="role-picker" data-picker="leveling.noXpChannelIds">
        ${ctx.meta.channels.filter((c) => c.type !== 2).map((c) => `
          <label class="role-option">
            <input type="checkbox" value="${c.id}" ${(s.leveling.noXpChannelIds || []).includes(c.id) ? 'checked' : ''}>
            #${UI.esc(c.name)}
          </label>`).join('')}
      </div>`;

    const body = `
      <div class="form-grid">
        <div class="full">${UI.toggleField('leveling.enabled', t('lv_enabled'), '', s.leveling.enabled)}</div>
        ${UI.numberField('leveling.xpPerMessage', t('lv_xp'), '5 - 100', s.leveling.xpPerMessage, 1, 200)}
        ${UI.numberField('leveling.cooldown', t('lv_cooldown'), '', s.leveling.cooldown, 0, 3600)}
        ${UI.channelSelect('leveling.announceChannelId', t('lv_announce'), ctx.meta.channels, s.leveling.announceChannelId, '', (c) => c.type !== 2)}
        <div class="full">${UI.textareaField('leveling.announceMessage', t('lv_announce_msg'), t('lv_announce_msg_hint'), s.leveling.announceMessage || '')}</div>
        <div class="full">${UI.toggleField('leveling.stackRewards', t('lv_stack'), '', s.leveling.stackRewards)}</div>
        <div class="full">
          <p class="card-subtitle">${UI.esc(t('lv_noxp_channels'))}</p>
          ${noXpChannelsPicker}
        </div>
        <div class="full">
          <p class="card-subtitle">${UI.esc(t('lv_noxp_roles'))}</p>
          ${UI.rolePicker('leveling.noXpRoleIds', ctx.meta.roles, s.leveling.noXpRoleIds)}
        </div>
      </div>`;

    node.appendChild(UI.el(UI.card(t('lv_title'), '', body, UI.saveButton('leveling'))));

    node.appendChild(UI.el(UI.card(t('lv_rewards'), '',
      rewardsEl.outerHTML +
      `<button class="btn btn-ghost btn-sm" data-add-reward style="margin-top:12px">＋ ${UI.esc(t('lv_add_reward'))}</button>`,
      UI.saveButton('leveling-rewards'))));

    node.appendChild(UI.el(UI.card(t('lv_voice_rewards'), t('lv_voice_rewards_desc'),
      voiceRewardsEl.outerHTML +
      `<button class="btn btn-ghost btn-sm" data-add-voice-reward style="margin-top:12px">＋ ${UI.esc(t('lv_add_reward'))}</button>`,
      UI.saveButton('leveling-voice-rewards'))));

    const rewardsContainer = node.querySelector('[data-rewards]');
    node.querySelector('[data-add-reward]').addEventListener('click', () => rewardsContainer.appendChild(buildReward()));

    const voiceRewardsContainer = node.querySelector('[data-voice-rewards]');
    node.querySelector('[data-add-voice-reward]').addEventListener('click', () => voiceRewardsContainer.appendChild(buildReward()));

    bindSave(node, ctx, ['leveling'], null, 'leveling');
    node.querySelector('[data-save="leveling-rewards"]').addEventListener('click', async () => {
      const rewards = [...rewardsContainer.querySelectorAll('.list-row')]
        .map((row) => ({
          level: Number(row.querySelector('[data-role="level"]').value) || 0,
          roleId: row.querySelector('[data-role="role"]').value
        }))
        .filter((r) => r.roleId);
      try {
        await patchSettings(ctx, { leveling: { rewards } });
        UI.toast(t('msg_saved'));
      } catch {
        UI.toast(t('msg_error'), 'err');
      }
    });
    node.querySelector('[data-save="leveling-voice-rewards"]').addEventListener('click', async () => {
      const voiceRewards = [...voiceRewardsContainer.querySelectorAll('.list-row')]
        .map((row) => ({
          level: Number(row.querySelector('[data-role="level"]').value) || 0,
          roleId: row.querySelector('[data-role="role"]').value
        }))
        .filter((r) => r.roleId);
      try {
        await patchSettings(ctx, { leveling: { voiceRewards } });
        UI.toast(t('msg_saved'));
      } catch {
        UI.toast(t('msg_error'), 'err');
      }
    });

    try {
      const data = await UI.api(`/guild/${ctx.guildId}/leaderboard`);
      const rows = (data.rows || []).map((r, i) => `
        <tr>
          <td><strong>${i + 1}</strong></td>
          <td class="lb-member">
            <img src="https://cdn.discordapp.com/embed/avatars/${Number(BigInt(r.userId) % 5n)}.png" alt="" style="width:26px;height:26px;border-radius:50%">
            <code>${UI.esc(r.userId)}</code>
          </td>
          <td><span class="chip">${UI.esc(String(r.level ?? 0))}</span></td>
          <td>${UI.esc(String(r.xp ?? 0))}</td>
        </tr>`).join('');

      node.appendChild(UI.el(UI.card(t('lv_leaderboard'), '', rows
        ? `<div class="table-wrap"><table class="data"><thead><tr><th>#</th><th>${t('lb_member')}</th><th>${t('lb_level')}</th><th>${t('lb_xp')}</th></tr></thead><tbody>${rows}</tbody></table></div>`
        : `<div class="empty-state"><span class="big">🏆</span>${UI.esc(t('lb_empty'))}</div>`)));
    } catch {
      /* leaderboard is optional — never block the settings page */
    }

    return node;
  }

  async function renderAutoroles(ctx) {
    const s = ctx.settings;
    const node = UI.el(`<div>${UI.pageHead('ro_title', 'ro_desc')}</div>`);

    const body = `
      <p class="card-subtitle">${UI.esc(t('ro_select'))}</p>
      ${UI.rolePicker('autoroles', ctx.meta.roles, s.autoroles)}
      <div style="margin-top:14px">${UI.toggleField('autorolesForBots', t('ro_for_bots'), '', s.autorolesForBots)}</div>
      <p class="card-subtitle" style="margin-top:10px">⚠️ ${UI.esc(t('ro_note'))}</p>`;

    node.appendChild(UI.el(UI.card(t('ro_title'), '', body, UI.saveButton('autoroles'))));
    bindSave(node, ctx, ['autoroles', 'autorolesForBots']);
    return node;
  }

  function renderColors(ctx) {
    const s = ctx.settings;
    const node = UI.el(`<div>${UI.pageHead('cl_title', 'cl_desc')}</div>`);

    const body = `
      <p class="card-subtitle">${UI.esc(t('cl_select'))}</p>
      ${UI.rolePicker('colorRoles', ctx.meta.roles, s.colorRoles)}
      <div class="form-grid" style="margin-top:16px">
        ${UI.channelSelect('panelChannel', t('cl_panel_channel'), ctx.meta.channels, s.selfRoles?.channelId || null, '', (c) => c.type !== 2)}
      </div>
      <p class="card-subtitle" style="margin-top:10px">🎨 ${UI.esc(t('cl_note'))}</p>`;

    node.appendChild(UI.el(UI.card(t('cl_title'), '',
      body,
      `${UI.saveButton('colors')}<button class="btn btn-ghost" data-send-panel>📨 ${UI.esc(t('cl_send'))}</button>`)));

    bindSave(node, ctx, ['colorRoles']);
    node.querySelector('[data-send-panel]').addEventListener('click', async (e) => {
      const channelId = node.querySelector('[data-path="panelChannel"]').value || s.selfRoles?.channelId;
      if (!channelId) return UI.toast(t('msg_no_guild'), 'err');
      e.currentTarget.disabled = true;
      try {
        await patchSettings(ctx, { colorRoles: UI.gather(node).colorRoles });
        await UI.api(`/guild/${ctx.guildId}/colorroles/panel`, { method: 'POST', body: { channelId } });
        UI.toast(t('msg_panel_sent'));
      } catch {
        UI.toast(t('msg_error'), 'err');
      } finally {
        e.currentTarget.disabled = false;
      }
    });

    return node;
  }

  function renderSelfRoles(ctx) {
    const s = ctx.settings;
    const node = UI.el(`<div>${UI.pageHead('sr_title', 'sr_desc')}</div>`);

    const body = `
      <p class="card-subtitle">${UI.esc(t('sr_select'))}</p>
      ${UI.rolePicker('selfRoles.roles', ctx.meta.roles, s.selfRoles.roles)}
      <div class="form-grid" style="margin-top:16px">
        ${UI.channelSelect('selfRoles.channelId', t('sr_channel'), ctx.meta.channels, s.selfRoles.channelId, '', (c) => c.type !== 2)}
      </div>
      <p class="card-subtitle" style="margin-top:10px">ℹ️ ${UI.esc(t('sr_note'))}</p>`;

    node.appendChild(UI.el(UI.card(t('sr_title'), '',
      body,
      `${UI.saveButton('selfroles')}<button class="btn btn-ghost" data-send-panel>📨 ${UI.esc(t('sr_send'))}</button>`)));

    bindSave(node, ctx, ['selfRoles']);
    node.querySelector('[data-send-panel]').addEventListener('click', async (e) => {
      const channelId = node.querySelector('[data-path="selfRoles.channelId"]').value;
      if (!channelId) return UI.toast(t('msg_no_guild'), 'err');
      e.currentTarget.disabled = true;
      try {
        await patchSettings(ctx, { selfRoles: UI.gather(node).selfRoles });
        await UI.api(`/guild/${ctx.guildId}/selfroles/panel`, { method: 'POST', body: { channelId } });
        UI.toast(t('msg_panel_sent'));
      } catch {
        UI.toast(t('msg_error'), 'err');
      } finally {
        e.currentTarget.disabled = false;
      }
    });

    return node;
  }

  function renderStarboard(ctx) {
    const s = ctx.settings;
    const node = UI.el(`<div>${UI.pageHead('sb_title', 'sb_desc')}</div>`);

    const body = `
      <div class="form-grid">
        <div class="full">${UI.toggleField('starboard.enabled', t('sb_enabled'), '', s.starboard.enabled)}</div>
        ${UI.channelSelect('starboard.channelId', t('sb_channel'), ctx.meta.channels, s.starboard.channelId, '', (c) => c.type !== 2)}
        ${UI.textField('starboard.emoji', t('sb_emoji'), '', s.starboard.emoji)}
        ${UI.numberField('starboard.threshold', t('sb_threshold'), '', s.starboard.threshold, 1, 100)}
        <div class="full">${UI.toggleField('starboard.selfStar', t('sb_self'), '', s.starboard.selfStar)}</div>
      </div>`;

    node.appendChild(UI.el(UI.card(t('sb_title'), '', body, UI.saveButton('starboard'))));
    bindSave(node, ctx, ['starboard']);
    return node;
  }

  function renderTempChannels(ctx) {
    const s = ctx.settings;
    const node = UI.el(`<div>${UI.pageHead('tc_title', 'tc_desc')}</div>`);

    const voiceChannels = ctx.meta.channels.filter((c) => c.type === 2);
    const body = `
      <div class="form-grid">
        <div class="full">${UI.toggleField('tempChannels.enabled', t('tc_enabled'), '', s.tempChannels.enabled)}</div>
        ${UI.channelSelect('tempChannels.hubChannelId', t('tc_hub'), ctx.meta.channels, s.tempChannels.hubChannelId, '', (c) => c.type === 2)}
        <div class="field">
          <label>${UI.esc(t('tc_category'))}</label>
          <select data-path="tempChannels.categoryId">
            <option value="">— ${UI.esc(t('none'))} —</option>
            ${ctx.meta.categories.map((c) => `<option value="${c.id}" ${c.id === s.tempChannels.categoryId ? 'selected' : ''}>📁 ${UI.esc(c.name)}</option>`).join('')}
          </select>
        </div>
        ${UI.textField('tempChannels.nameTemplate', t('tc_template'), "{user.name}'s channel", s.tempChannels.nameTemplate)}
        ${UI.numberField('tempChannels.userLimit', t('tc_limit'), '', s.tempChannels.userLimit, 0, 99)}
      </div>
      <p class="card-subtitle" style="margin-top:12px">🔊 ${voiceChannels.length} voice channel(s) available</p>`;

    node.appendChild(UI.el(UI.card(t('tc_title'), '', body, UI.saveButton('tempchannels'))));
    bindSave(node, ctx, ['tempChannels']);
    return node;
  }

  function renderTempLink(ctx) {
    const node = UI.el(`<div>${UI.pageHead('tl_title', 'tl_desc')}</div>`);

    const body = `
      <div class="form-grid">
        ${UI.channelSelect('templink.channelId', t('tl_channel'), ctx.meta.channels, null, '', (c) => c.type !== 2)}
        ${UI.numberField('templink.duration', t('tl_duration'), '1 - 10080', 60, 1, 10080)}
        ${UI.numberField('templink.uses', t('tl_uses'), '1 - 100', 1, 1, 100)}
      </div>
      <div data-result></div>`;

    node.appendChild(UI.el(UI.card(t('tl_title'), '', body,
      `<button class="btn btn-primary" data-generate>🔗 ${UI.esc(t('tl_generate'))}</button>`)));

    node.querySelector('[data-generate]').addEventListener('click', async (e) => {
      const channelId = node.querySelector('[data-path="templink.channelId"]').value;
      if (!channelId) return UI.toast(t('msg_no_guild'), 'err');
      const maxAge = Number(node.querySelector('[data-path="templink.duration"]').value) * 60;
      const maxUses = Number(node.querySelector('[data-path="templink.uses"]').value);
      e.currentTarget.disabled = true;
      try {
        const data = await UI.api(`/guild/${ctx.guildId}/templink`, {
          method: 'POST',
          body: { channelId, maxAge, maxUses }
        });
        node.querySelector('[data-result]').innerHTML =
          `<div class="invite-result">${UI.esc(t('tl_result'))} <strong>${UI.esc(data.url)}</strong></div>`;
      } catch {
        UI.toast(t('msg_error'), 'err');
      } finally {
        e.currentTarget.disabled = false;
      }
    });

    return node;
  }

  function renderStats(ctx) {
    const s = ctx.settings;
    const node = UI.el(`<div>${UI.pageHead('st_title', 'st_desc')}</div>`);

    const counterBody = `
      <div class="form-grid">
        <div class="full">${UI.toggleField('stats.enabled', t('st_title'), '', s.stats.enabled)}</div>
      </div>
      <div class="table-wrap" style="margin-top:16px">
        <table class="data">
          <thead><tr><th>${t('st_existing')}</th><th>${t('st_type')}</th><th></th></tr></thead>
          <tbody data-counters></tbody>
        </table>
      </div>
      <div class="card-actions">
        <select data-new-type style="max-width:220px">
          <option value="members">👥 ${UI.esc(t('st_members'))}</option>
          <option value="online">🟢 ${UI.esc(t('st_online'))}</option>
          <option value="bots">🤖 ${UI.esc(t('st_bots'))}</option>
          <option value="roles">🎭 ${UI.esc(t('st_roles'))}</option>
          <option value="channels">💬 ${UI.esc(t('st_channels'))}</option>
        </select>
        <button class="btn btn-primary" data-add-counter>＋ ${UI.esc(t('st_add'))}</button>
        ${UI.saveButton('stats')}
      </div>`;

    node.appendChild(UI.el(UI.card(t('st_title'), '', counterBody)));

    const tbody = node.querySelector('[data-counters]');
    if (!s.stats.channels?.length) {
      tbody.innerHTML = `<tr><td colspan="3"><div class="empty-state">📊 ${UI.esc(t('ma_empty'))}</div></td></tr>`;
    } else {
      s.stats.channels.forEach((c) => {
        const row = UI.el(`<tr>
          <td># ${UI.esc(c.channelId)}</td>
          <td>${UI.esc(c.type)}</td>
          <td><button class="remove-row" data-del="${c.channelId}">×</button></td>
        </tr>`);
        row.querySelector('[data-del]').addEventListener('click', async (e) => {
          if (!confirm(t('msg_confirm_delete'))) return;
          e.currentTarget.disabled = true;
          try {
            await UI.api(`/guild/${ctx.guildId}/stats/counters/${c.channelId}`, { method: 'DELETE' });
            ctx.settings.stats.channels = ctx.settings.stats.channels.filter((x) => x.channelId !== c.channelId);
            window.App.render(ctx.page);
            UI.toast(t('msg_saved'));
          } catch {
            UI.toast(t('msg_error'), 'err');
          }
        });
        tbody.appendChild(row);
      });
    }

    node.querySelector('[data-add-counter]').addEventListener('click', async (e) => {
      const type = node.querySelector('[data-new-type]').value;
      e.currentTarget.disabled = true;
      try {
        const data = await UI.api(`/guild/${ctx.guildId}/stats/counters`, { method: 'POST', body: { type } });
        ctx.settings.stats.channels.push({ channelId: data.channelId, type: data.type });
        ctx.settings.stats.enabled = true;
        window.App.render(ctx.page);
        UI.toast(t('msg_saved'));
      } catch {
        UI.toast(t('msg_error'), 'err');
      } finally {
        e.currentTarget.disabled = false;
      }
    });

    bindSave(node, ctx, ['stats']);
    return node;
  }

  function renderTickets(ctx) {
    const s = ctx.settings;
    const node = UI.el(`<div>${UI.pageHead('tk_title', 'tk_desc')}</div>`);

    const body = `
      <div class="form-grid">
        <div class="full">${UI.toggleField('tickets.enabled', t('tk_enabled'), '', s.tickets.enabled)}</div>
        ${UI.channelSelect('tickets.panelChannelId', t('tk_panel_channel'), ctx.meta.channels, s.tickets.panelChannelId, '', (c) => c.type !== 2)}
        <div class="field">
          <label>${UI.esc(t('tk_category'))}</label>
          <select data-path="tickets.categoryId">
            <option value="">— ${UI.esc(t('none'))} —</option>
            ${ctx.meta.categories.map((c) => `<option value="${c.id}" ${c.id === s.tickets.categoryId ? 'selected' : ''}>📁 ${UI.esc(c.name)}</option>`).join('')}
          </select>
        </div>
        ${UI.roleSelect('tickets.supportRoleId', t('tk_support'), ctx.meta.roles, s.tickets.supportRoleId)}
        ${UI.textField('tickets.title', t('tk_panel_title'), '', s.tickets.title)}
        <div class="full">${UI.textField('tickets.description', t('tk_panel_desc'), '', s.tickets.description)}</div>
        <div class="full">${UI.textareaField('tickets.openMessage', t('tk_open_msg'), '', s.tickets.openMessage)}</div>
      </div>`;

    node.appendChild(UI.el(UI.card(t('tk_title'), '',
      body,
      `${UI.saveButton('tickets')}<button class="btn btn-ghost" data-send-panel>📨 ${UI.esc(t('tk_send'))}</button>`)));

    bindSave(node, ctx, ['tickets']);
    node.querySelector('[data-send-panel]').addEventListener('click', async (e) => {
      const channelId = node.querySelector('[data-path="tickets.panelChannelId"]').value;
      if (!channelId) return UI.toast(t('msg_no_guild'), 'err');
      e.currentTarget.disabled = true;
      try {
        await patchSettings(ctx, { tickets: UI.gather(node).tickets });
        await UI.api(`/guild/${ctx.guildId}/tickets/panel`, { method: 'POST', body: { channelId } });
        UI.toast(t('msg_panel_sent'));
      } catch {
        UI.toast(t('msg_error'), 'err');
      } finally {
        e.currentTarget.disabled = false;
      }
    });

    return node;
  }

  /* ============================================================
     MODERATION
     ============================================================ */

  function renderModeration(ctx) {
    const s = ctx.settings;
    const node = UI.el(`<div>${UI.pageHead('md_title', 'md_desc')}</div>`);

    node.appendChild(UI.el(UI.card(t('md_cmds'), '', `
      <div class="chips">
        ${['md_cmd_ban', 'md_cmd_kick', 'md_cmd_mute', 'md_cmd_clear', 'md_cmd_warn']
          .map((k) => `<span class="chip">🛡️ ${UI.esc(t(k))}</span>`).join('')}
      </div>
      <p class="card-subtitle" style="margin-top:12px">${UI.esc(t('md_note'))}</p>`)));

    node.appendChild(UI.el(UI.card(t('md_title'), '',
      `<div class="form-grid">
        ${UI.channelSelect('modLogChannelId', t('md_modlog'), ctx.meta.channels, s.modLogChannelId, '', (c) => c.type !== 2)}
      </div>`,
      UI.saveButton('moderation'))));

    bindSave(node, ctx, ['modLogChannelId']);
    return node;
  }

  function renderLogs(ctx) {
    const s = ctx.settings;
    const node = UI.el(`<div>${UI.pageHead('lg_title', 'lg_desc')}</div>`);

    const events = [
      ['messageDelete', 'lg_message_delete'],
      ['messageEdit', 'lg_message_edit'],
      ['memberJoin', 'lg_member_join'],
      ['memberLeave', 'lg_member_leave'],
      ['roleChanges', 'lg_roles'],
      ['voice', 'lg_voice'],
      ['bans', 'lg_bans']
    ];

    const body = `
      <div class="form-grid">
        <div class="full">${UI.toggleField('logging.enabled', t('lg_enabled'), '', s.logging.enabled)}</div>
        ${UI.channelSelect('logging.channelId', t('lg_channel'), ctx.meta.channels, s.logging.channelId, '', (c) => c.type !== 2)}
        <div class="full">
          <p class="card-subtitle">${UI.esc(t('lg_events'))}</p>
          <div style="display:grid;gap:10px">
            ${events.map(([key, label]) => UI.toggleField(`logging.events.${key}`, t(label), '', s.logging.events[key])).join('')}
          </div>
        </div>
      </div>`;

    node.appendChild(UI.el(UI.card(t('lg_title'), '', body, UI.saveButton('logs'))));
    bindSave(node, ctx, ['logging']);
    return node;
  }

  function renderAutomod(ctx) {
    const s = ctx.settings;
    const node = UI.el(`<div>${UI.pageHead('am_title', 'am_desc')}</div>`);

    const body = `
      <div class="form-grid">
        <div class="full">${UI.toggleField('automod.enabled', t('am_enabled'), '', s.automod.enabled)}</div>
        <div class="full">${UI.toggleField('automod.antiSpam', t('am_spam'), '', s.automod.antiSpam)}</div>
        ${UI.numberField('automod.spamThreshold', t('am_spam_threshold'), '', s.automod.spamThreshold, 2, 50)}
        ${UI.numberField('automod.spamInterval', t('am_spam_interval'), '', s.automod.spamInterval, 1, 60)}
        <div class="full">${UI.toggleField('automod.antiLinks', t('am_links'), '', s.automod.antiLinks)}</div>
        <div class="full">${UI.toggleField('automod.antiInvites', t('am_invites'), '', s.automod.antiInvites)}</div>
        <div class="full">${UI.toggleField('automod.antiMassMention', t('am_mentions'), '', s.automod.antiMassMention)}</div>
        ${UI.numberField('automod.mentionLimit', t('am_mention_limit'), '', s.automod.mentionLimit, 2, 50)}
        ${UI.numberField('automod.timeoutMinutes', t('am_timeout'), '', s.automod.timeoutMinutes, 1, 40320)}
        <div class="full">${UI.toggleField('automod.antiBadWords', t('am_words'), '', s.automod.antiBadWords)}</div>
        <div class="full">
          ${UI.textareaField('automod.badWords', t('am_badwords'), '', (s.automod.badWords || []).join('\n'))}
        </div>
        <div class="full">
          <p class="card-subtitle">${UI.esc(t('am_whitelist_channels'))}</p>
          ${UI.rolePicker('automod.whitelistChannelsPicker', [], [])}
        </div>
      </div>`;

    node.appendChild(UI.el(UI.card(t('am_title'), '', body, UI.saveButton('automod'))));

    const pickerHost = node.querySelector('[data-picker="automod.whitelistChannelsPicker"]');
    pickerHost.innerHTML = ctx.meta.channels
      .filter((c) => c.type !== 2)
      .map((c) => `
        <label class="role-option">
          <input type="checkbox" value="${c.id}" ${(s.automod.whitelistChannels || []).includes(c.id) ? 'checked' : ''}>
          #${UI.esc(c.name)}
        </label>`).join('');
    pickerHost.dataset.picker = 'automod.wlChannels';

    const rolePickerHost = UI.el(UI.rolePicker('automod.whitelistRoles', ctx.meta.roles, s.automod.whitelistRoles));
    node.querySelector('.form-grid').appendChild(UI.el(`<div class="full"><p class="card-subtitle">${UI.esc(t('am_whitelist_roles'))}</p></div>`));
    node.querySelector('.form-grid').appendChild(rolePickerHost);

    bindSave(node, ctx, ['automod'], (payload) => {
      const badWordsInput = node.querySelector('[data-path="automod.badWords"]');
      payload.automod.badWords = badWordsInput.value.split('\n').map((w) => w.trim()).filter(Boolean);
      const wl = UI.gather(node).automod?.wlChannels;
      if (wl) payload.automod.whitelistChannels = wl;
      return payload;
    });

    return node;
  }

  function renderAntiRaid(ctx) {
    const s = ctx.settings;
    const node = UI.el(`<div>${UI.pageHead('ra_title', 'ra_desc')}</div>`);

    const body = `
      <div class="form-grid">
        <div class="full">${UI.toggleField('antiraid.enabled', t('ra_enabled'), '', s.antiraid.enabled)}</div>
        ${UI.numberField('antiraid.joinRateLimit', t('ra_rate'), '', s.antiraid.joinRateLimit, 2, 100)}
        ${UI.numberField('antiraid.joinRateInterval', t('ra_interval'), '', s.antiraid.joinRateInterval, 5, 300)}
        ${UI.numberField('antiraid.minAccountAgeDays', t('ra_age'), '', s.antiraid.minAccountAgeDays, 0, 365)}
        ${UI.channelSelect('antiraid.alertChannelId', t('ra_alert'), ctx.meta.channels, s.antiraid.alertChannelId, '', (c) => c.type !== 2)}
        <div class="full">${UI.toggleField('antiraid.lockdown', t('ra_lockdown'), '', s.antiraid.lockdown)}</div>
      </div>`;

    node.appendChild(UI.el(UI.card(t('ra_title'), '', body, UI.saveButton('antiraid'))));
    bindSave(node, ctx, ['antiraid']);
    return node;
  }

  function renderVipPro(ctx) {
    const s = ctx.settings;
    const node = UI.el(`<div>${UI.pageHead('vp_title', 'vp_desc')}</div>`);

    const body = `
      <div class="form-grid">
        <div class="full">${UI.toggleField('vipProtection', t('vp_enabled'), '', s.vipProtection)}</div>
        <div class="full">
          <p class="card-subtitle">${UI.esc(t('vp_roles'))}</p>
          ${UI.rolePicker('vipProtectedRoleIds', ctx.meta.roles, s.vipProtectedRoleIds)}
        </div>
      </div>
      <p class="card-subtitle" style="margin-top:12px">🛡️ ${UI.esc(t('vp_note'))}</p>`;

    node.appendChild(UI.el(UI.card(t('vp_title'), '', body, UI.saveButton('vippro'))));
    bindSave(node, ctx, ['vipProtection', 'vipProtectedRoleIds']);
    return node;
  }

  /* ============================================================
     NOTIFICATIONS
     ============================================================ */

  function notifPage(ctx, type, titleKey, descKey, targetLabel, targetKey) {
    const s = ctx.settings;
    const node = UI.el(`<div>${UI.pageHead(titleKey, descKey)}</div>`);
    const entries = s.notifications[type] || [];

    const listEl = UI.el(`<div data-entries></div>`);
    const buildRow = (entry = {}) => {
      const row = UI.el(`
        <div class="list-row">
          <select data-role="channelId">
            <option value="">— ${UI.esc(t('nt_channel'))} —</option>
            ${ctx.meta.channels.filter((c) => c.type !== 2).map((c) =>
              `<option value="${c.id}" ${c.id === entry.channelId ? 'selected' : ''}>#${UI.esc(c.name)}</option>`).join('')}
          </select>
          <span style="text-align:center">➕</span>
          <input type="text" data-role="${targetKey}" placeholder="${UI.esc(targetLabel)}" value="${UI.esc(entry[targetKey] || '')}">
          <input type="text" data-role="message" placeholder="${UI.esc(t('nt_message'))}" value="${UI.esc(entry.message || '')}">
          <button class="remove-row" type="button" data-role="remove">×</button>
        </div>`);
      row.querySelector('[data-role="remove"]').addEventListener('click', () => row.remove());
      return row;
    };
    entries.forEach((e) => listEl.appendChild(buildRow(e)));

    node.appendChild(UI.el(`
      <div class="notice">📡 <span>${UI.esc(t('nt_poll_note'))}</span></div>`));

    node.appendChild(UI.el(UI.card(t('nt_entries'), '',
      listEl.outerHTML +
      `<button class="btn btn-ghost btn-sm" data-add style="margin-top:12px">＋ ${UI.esc(t('nt_add'))}</button>`,
      UI.saveButton(type))));

    const container = node.querySelector('[data-entries]');
    node.querySelector('[data-add]').addEventListener('click', () => container.appendChild(buildRow()));

    bindSave(node, ctx, ['notifications'], (payload) => {
      payload.notifications = {
        ...UI.gather(node).notifications,
        [type]: [...container.querySelectorAll('.list-row')]
          .map((row) => ({
            channelId: row.querySelector('[data-role="channelId"]').value,
            [targetKey]: row.querySelector(`[data-role="${targetKey}"]`).value.trim(),
            message: row.querySelector('[data-role="message"]').value.trim()
          }))
          .filter((e) => e.channelId && e[targetKey])
      };
      return payload;
    });

    return node;
  }

  /* ============================================================
     OTHERS
     ============================================================ */

  async function renderDashLogs(ctx) {
    const data = await UI.api(`/guild/${ctx.guildId}/logs?type=dashboard`);
    const node = UI.el(`<div>${UI.pageHead('dl_title', 'dl_desc')}</div>`);

    const rows = data.logs.map((l) => `
      <tr>
        <td>${UI.esc(l.userTag || l.userId)}</td>
        <td><span class="chip">${UI.esc(l.section)}</span></td>
        <td>${UI.esc(l.action)}</td>
        <td>${UI.esc(l.details)}</td>
        <td>${UI.timeAgo(l.createdAt)}</td>
      </tr>`).join('');

    node.appendChild(UI.el(UI.card(t('dl_title'), '', rows
      ? `<div class="table-wrap"><table class="data"><thead><tr><th>${t('dl_user')}</th><th>${t('dl_section')}</th><th>${t('dl_action')}</th><th>${t('dl_details')}</th><th>${t('dl_when')}</th></tr></thead><tbody>${rows}</tbody></table></div>`
      : `<div class="empty-state"><span class="big">📝</span>${UI.esc(t('dl_empty'))}</div>`)));

    return node;
  }

  async function renderModActions(ctx) {
    const data = await UI.api(`/guild/${ctx.guildId}/logs?type=mods`);
    const node = UI.el(`<div>${UI.pageHead('ma_title', 'ma_desc')}</div>`);

    const rows = data.logs.map((l) => `
      <tr>
        <td>#${l.caseId}</td>
        <td><span class="badge ${UI.esc(l.action)}">${UI.esc(t(`mod_${l.action}`) === `mod_${l.action}` ? l.action : t(`mod_${l.action}`))}</span></td>
        <td>${UI.esc(l.targetTag || l.targetId || '—')}</td>
        <td>${UI.esc(l.moderatorTag || '—')}</td>
        <td>${UI.esc(l.reason)}</td>
        <td>${UI.timeAgo(l.createdAt)}</td>
      </tr>`).join('');

    node.appendChild(UI.el(UI.card(t('ma_title'), '', rows
      ? `<div class="table-wrap"><table class="data"><thead><tr><th>${t('ma_case')}</th><th>${t('ma_action')}</th><th>${t('ma_target')}</th><th>${t('ma_moderator')}</th><th>${t('ma_reason')}</th><th>${t('ma_when')}</th></tr></thead><tbody>${rows}</tbody></table></div>`
      : `<div class="empty-state"><span class="big">🛡️</span>${UI.esc(t('ma_empty'))}</div>`)));

    return node;
  }

  /* ============================================================
     SERVER BUILDER
     ============================================================ */

  function guildNameOf(ctx) {
    return (window.App?.guilds?.find((g) => g.id === ctx.guildId)?.name) || '';
  }

  async function renderServerBuilder(ctx) {
    const data = await UI.api(`/guild/${ctx.guildId}/builder/templates`);
    const templates = data.templates || [];
    const lang = () => (window.I18N?.lang === 'ar' ? 'ar' : 'en');
    const pick = (obj) => (obj && (obj[lang()] || obj.en)) || '';
    const guildName = guildNameOf(ctx);

    const node = UI.el(`<div>${UI.pageHead('bld_title', 'bld_desc')}</div>`);
    let mode = 'append';
    let pollTimer = null;

    /* ---------- safety mode ---------- */
    const modesCard = UI.el(UI.card(t('bld_safety_mode'), t('bld_safety_hint'), `
      <div class="builder-modes">
        <label class="mode-option">
          <input type="radio" name="bldMode" value="append" checked>
          <span class="mode-body">
            <strong>➕ ${UI.esc(t('bld_mode_append'))}</strong>
            <small>${UI.esc(t('bld_mode_append_hint'))}</small>
          </span>
        </label>
        <label class="mode-option mode-danger">
          <input type="radio" name="bldMode" value="clean">
          <span class="mode-body">
            <strong>🧹 ${UI.esc(t('bld_mode_clean'))}</strong>
            <small>${UI.esc(t('bld_mode_clean_hint'))}</small>
          </span>
        </label>
      </div>`));
    modesCard.querySelectorAll('input[name="bldMode"]').forEach((input) => {
      input.addEventListener('change', () => { mode = input.value; });
    });
    node.appendChild(modesCard);

    /* ---------- modal ---------- */
    const modal = UI.el(`
      <div class="builder-modal" hidden>
        <div class="builder-backdrop" data-close></div>
        <div class="builder-panel">
          <header class="builder-panel-head">
            <h3 data-modal-title></h3>
            <button class="icon-btn" type="button" data-close>✕</button>
          </header>
          <div class="builder-panel-body" data-modal-body></div>
          <footer class="builder-panel-foot" data-modal-foot></footer>
        </div>
      </div>`);
    node.appendChild(modal);

    const titleEl = modal.querySelector('[data-modal-title]');
    const bodyEl = modal.querySelector('[data-modal-body]');
    const footEl = modal.querySelector('[data-modal-foot]');

    function stopPolling() {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    }
    function closeModal() {
      stopPolling();
      modal.hidden = true;
    }
    modal.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', closeModal));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.hidden) closeModal();
    });

    function openModal(titleKey, extra) {
      titleEl.textContent = t(titleKey) + (extra ? ` — ${extra}` : '');
      modal.hidden = false;
    }

    /* ---------- gallery ---------- */
    function templateCard(tpl) {
      const textCh = tpl.categories.reduce((a, c) => a + c.channels.filter((ch) => ch.type === 'text').length, 0);
      const voiceCh = tpl.categories.reduce((a, c) => a + c.channels.filter((ch) => ch.type === 'voice').length, 0);
      const tags = (pick(tpl.tags) || [])
        .map((tag) => `<span class="chip">${UI.esc(tag)}</span>`)
        .join('');
      const rolesHtml = tpl.roles
        .map((r) => `<span class="tpl-role"><i style="background:${r.color}"></i>${UI.esc(r.name)}</span>`)
        .join('');

      const card = UI.el(`
        <article class="template-card">
          <div class="tpl-head">
            <span class="tpl-emoji">${tpl.emoji}</span>
            <div>
              <h4>${UI.esc(pick(tpl.name))}</h4>
              <p>${UI.esc(pick(tpl.description))}</p>
            </div>
          </div>
          <div class="tpl-stats">
            <span>📁 ${tpl.categories.length} ${UI.esc(t('bld_categories'))}</span>
            <span>💬 ${textCh} ${UI.esc(t('bld_text_channels'))}</span>
            <span>🔊 ${voiceCh} ${UI.esc(t('bld_voice_channels'))}</span>
            <span>🎭 ${tpl.roles.length} ${UI.esc(t('bld_roles'))}</span>
          </div>
          <div class="tpl-roles">${rolesHtml}</div>
          <div class="chips tpl-tags">${tags}</div>
          <div class="card-actions">
            <button class="btn btn-ghost" type="button" data-preview>👁️ ${UI.esc(t('bld_preview'))}</button>
            <button class="btn btn-primary" type="button" data-apply>🚀 ${UI.esc(t('bld_apply'))}</button>
          </div>
        </article>`);

      card.querySelector('[data-preview]').addEventListener('click', () => openPreview(tpl));
      card.querySelector('[data-apply]').addEventListener('click', () => openConfirm(tpl));
      return card;
    }

    const grid = UI.el('<div class="template-grid"></div>');
    for (const tpl of templates) grid.appendChild(templateCard(tpl));

    const galleryCard = UI.el(UI.card(t('bld_templates'), t('bld_templates_hint'), '<div data-grid-mount></div>'));
    galleryCard.querySelector('[data-grid-mount]').appendChild(grid);
    node.appendChild(galleryCard);

    /* ---------- preview modal ---------- */
    function openPreview(tpl) {
      const tree = tpl.categories
        .map((cat) => `
          <div class="tree-cat">
            <div class="tree-cat-name">📁 ${UI.esc(cat.name)} ${cat.access === 'staff' ? `<span class="tree-badge staff">🔒 ${UI.esc(t('bld_staff_only'))}</span>` : ''}</div>
            <div class="tree-channels">
              ${cat.channels.map((ch) => `
                <span class="tree-channel ${ch.access === 'staff' ? 'staff' : ''}">
                  ${ch.type === 'voice' ? '🔊' : '📝'} ${UI.esc(ch.name)}
                  ${ch.access === 'readonly' ? '👁️' : ''}${ch.access === 'staff' ? '🔒' : ''}
                </span>`).join('')}
            </div>
          </div>`)
        .join('');

      const rolesHtml = tpl.roles
        .map((r) => `<span class="tpl-role"><i style="background:${r.color}"></i>${UI.esc(r.name)}${r.permissions?.includes('Administrator') ? ' 👑' : ''}</span>`)
        .join('');

      bodyEl.innerHTML = `
        <div class="tree-section">
          <h4>${UI.esc(t('bld_roles_title'))}</h4>
          <div class="tpl-roles">${rolesHtml}</div>
        </div>
        <div class="tree-section">
          <h4>${UI.esc(t('bld_structure_title'))}</h4>
          <div class="builder-tree">${tree}</div>
        </div>`;
      footEl.innerHTML = `<button class="btn btn-primary" type="button" data-go>🚀 ${UI.esc(t('bld_apply'))}</button>`;
      footEl.querySelector('[data-go]').addEventListener('click', () => openConfirm(tpl));
      openModal('bld_preview_title', pick(tpl.name));
    }

    /* ---------- confirm modal ---------- */
    function openConfirm(tpl) {
      const isClean = mode === 'clean';
      bodyEl.innerHTML = `
        <div class="notice ${isClean ? 'notice-danger' : ''}">
          <div>
            ${isClean ? '🧹' : '➕'} <strong>${UI.esc(t(isClean ? 'bld_mode_clean' : 'bld_mode_append'))}</strong><br>
            ${UI.esc(t(isClean ? 'bld_confirm_warn_clean' : 'bld_confirm_warn_append'))}
          </div>
        </div>
        <label class="switch">
          <input type="checkbox" data-confirm-check>
          <span class="track"></span>
          <span class="switch-label">${UI.esc(t('bld_confirm_check'))}</span>
        </label>
        ${isClean ? `
          <div class="field" style="margin-top:12px">
            <label>${UI.esc(t('bld_confirm_type_name', { name: guildName }))}</label>
            <input type="text" data-confirm-name placeholder="${UI.esc(guildName)}" autocomplete="off">
          </div>` : ''}`;

      footEl.innerHTML = `
        <button class="btn btn-ghost" type="button" data-cancel>${UI.esc(t('bld_cancel'))}</button>
        <button class="btn ${isClean ? 'btn-danger' : 'btn-primary'}" type="button" data-start disabled>🚀 ${UI.esc(t('bld_start'))}</button>`;

      const check = bodyEl.querySelector('[data-confirm-check]');
      const nameInput = bodyEl.querySelector('[data-confirm-name]');
      const startBtn = footEl.querySelector('[data-start]');
      const sync = () => {
        const okCheck = check.checked;
        const okName = !isClean || (nameInput && nameInput.value.trim() === guildName);
        startBtn.disabled = !(okCheck && okName);
      };
      check.addEventListener('change', sync);
      if (nameInput) nameInput.addEventListener('input', sync);
      footEl.querySelector('[data-cancel]').addEventListener('click', closeModal);
      startBtn.addEventListener('click', () => startBuildFlow(tpl));
      openModal('bld_confirm_title', pick(tpl.name));
    }

    /* ---------- progress ---------- */
    function renderError(code) {
      const key = `err_${code}`;
      const message = t(key) === key ? String(code) : t(key);
      bodyEl.innerHTML = `
        <div class="builder-done">
          <span class="big">⚠️</span>
          <h4>${UI.esc(t('bld_error'))}</h4>
          <p class="hint">${UI.esc(message)}</p>
        </div>`;
      footEl.innerHTML = `<button class="btn btn-ghost" type="button" data-close-err>${UI.esc(t('bld_close'))}</button>`;
      footEl.querySelector('[data-close-err]').addEventListener('click', closeModal);
      UI.toast(t('bld_error'), 'err');
    }

    function renderDone(job) {
      const r = job.result || {};
      bodyEl.innerHTML = `
        <div class="builder-done">
          <span class="big">🎉</span>
          <h4>${UI.esc(t('bld_done_title'))}</h4>
          <p>${UI.esc(t('bld_done_summary', { roles: r.roles || 0, categories: r.categories || 0, channels: r.channels || 0 }))}</p>
          <div class="chips">
            ${(r.linked || []).map((k) => `<span class="chip green">✓ ${UI.esc(t(`bld_linked_${k}`))}</span>`).join('')}
          </div>
        </div>`;
      footEl.innerHTML = `<button class="btn btn-primary" type="button" data-done>${UI.esc(t('bld_close'))}</button>`;
      footEl.querySelector('[data-done]').addEventListener('click', () => {
        closeModal();
        ctx.refresh();
      });
      UI.toast(t('bld_done_title'));
    }

    async function startBuildFlow(tpl) {
      const startBtn = footEl.querySelector('[data-start]');
      if (startBtn) startBtn.disabled = true;

      bodyEl.innerHTML = `
        <div class="builder-progress">
          <div class="progress-bar"><div class="progress-fill" data-fill></div></div>
          <p class="progress-label" data-phase>${UI.esc(t('bld_progress'))}</p>
          <div class="builder-log" data-log></div>
        </div>`;
      footEl.innerHTML = '';
      openModal('bld_progress_title', pick(tpl.name));

      let jobId;
      try {
        const res = await UI.api(`/guild/${ctx.guildId}/builder/apply`, {
          method: 'POST',
          body: { templateId: tpl.id, mode, confirmName: guildName }
        });
        jobId = res.jobId;
      } catch (err) {
        renderError(err.data?.error || err.message);
        return;
      }

      pollTimer = setInterval(async () => {
        try {
          const res = await UI.api(`/guild/${ctx.guildId}/builder/status/${jobId}`);
          const j = res.job;
          const pct = j.progress?.total ? Math.min(100, Math.round((j.progress.done / j.progress.total) * 100)) : 0;

          const fill = bodyEl.querySelector('[data-fill]');
          if (fill) fill.style.width = `${pct}%`;

          const phaseEl = bodyEl.querySelector('[data-phase]');
          if (phaseEl) phaseEl.textContent = t(`bld_phase_${j.phase}`);

          const logEl = bodyEl.querySelector('[data-log]');
          if (logEl) {
            logEl.innerHTML = j.log.slice(-9)
              .map((entry) => `<div class="log-line ${entry.level}">${UI.esc(t(entry.key, entry.data || {}))}</div>`)
              .join('');
            logEl.scrollTop = logEl.scrollHeight;
          }

          if (j.status === 'done') {
            stopPolling();
            renderDone(j);
          } else if (j.status === 'error') {
            stopPolling();
            renderError(j.error);
          }
        } catch (err) {
          if (err.status === 503) {
            stopPolling();
            renderError('bot_offline');
          }
        }
      }, 900);
    }

    return node;
  }

  /* ============================================================
     SECTION REGISTRY (Brobot sidebar structure)
     ============================================================ */

  window.PAGES = {
    sections: [
      {
        group: 'group_general',
        items: [
          { id: 'overview', emoji: '📊', key: 'sec_overview', render: renderOverview },
          { id: 'server-settings', emoji: '⚙️', key: 'sec_server_settings', render: renderServerSettings },
          { id: 'embeds', emoji: '🎨', key: 'sec_embeds', render: renderEmbeds },
          { id: 'premium', emoji: '💎', key: 'sec_premium', render: renderPremium }
        ]
      },
      {
        group: 'group_modules',
        items: [
          { id: 'server-builder', emoji: '🏗️', key: 'sec_server_builder', render: renderServerBuilder, priority: true },
          { id: 'utility', emoji: '🧰', key: 'sec_utility', render: renderUtility },
          { id: 'welcome', emoji: '👋', key: 'sec_welcome', render: renderWelcome, priority: true },
          { id: 'autoresponder', emoji: '💬', key: 'sec_autoresponder', render: renderAutoResponder },
          { id: 'leveling', emoji: '🏆', key: 'sec_leveling', render: renderLeveling },
          { id: 'autoroles', emoji: '🤖', key: 'sec_autoroles', render: renderAutoroles, priority: true },
          { id: 'colors', emoji: '🎨', key: 'sec_colors', render: renderColors },
          { id: 'selfroles', emoji: '🎭', key: 'sec_selfroles', render: renderSelfRoles },
          { id: 'starboard', emoji: '⭐', key: 'sec_starboard', render: renderStarboard },
          { id: 'tempchannels', emoji: '🔊', key: 'sec_tempchannels', render: renderTempChannels },
          { id: 'templink', emoji: '🔗', key: 'sec_templink', render: renderTempLink },
          { id: 'stats', emoji: '📈', key: 'sec_stats', render: renderStats },
          { id: 'tickets', emoji: '🎫', key: 'sec_tickets', render: renderTickets }
        ]
      },
      {
        group: 'group_moderation',
        items: [
          { id: 'moderation', emoji: '🛡️', key: 'sec_moderation', render: renderModeration, priority: true },
          { id: 'logs', emoji: '📜', key: 'sec_logs', render: renderLogs },
          { id: 'automod', emoji: '🚫', key: 'sec_automod', render: renderAutomod },
          { id: 'antiraid', emoji: '🚨', key: 'sec_antiraid', render: renderAntiRaid },
          { id: 'vippro', emoji: '💠', key: 'sec_vippro', render: renderVipPro }
        ]
      },
      {
        group: 'group_notifications',
        items: [
          { id: 'twitch', emoji: '🟣', key: 'sec_twitch', render: (ctx) => notifPage(ctx, 'twitch', 'tw_title', 'tw_desc', t('nt_target'), 'streamer') },
          { id: 'youtube', emoji: '🔴', key: 'sec_youtube', render: (ctx) => notifPage(ctx, 'youtube', 'yt_title', 'yt_desc', 'YouTube URL', 'youtubeUrl') },
          { id: 'kick', emoji: '🟢', key: 'sec_kick', render: (ctx) => notifPage(ctx, 'kick', 'kk_title', 'kk_desc', t('nt_target'), 'streamer') },
          { id: 'reddit', emoji: '📮', key: 'sec_reddit', render: (ctx) => notifPage(ctx, 'reddit', 'rd_title', 'rd_desc', 'r/subreddit', 'subreddit') }
        ]
      },
      {
        group: 'group_others',
        items: [
          { id: 'dashlogs', emoji: '🗒️', key: 'sec_dashlogs', render: renderDashLogs },
          { id: 'modactions', emoji: '📋', key: 'sec_modactions', render: renderModActions }
        ]
      }
    ]
  };
})();
