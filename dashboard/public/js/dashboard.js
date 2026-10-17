/* ============================================================
   ✨ Brobot — Dashboard bootstrap, sidebar, routing
   ============================================================ */

(function () {
  const t = window.t;
  const UI = window.UI;

  const App = {
    user: window.__USER__ || null,
    guilds: [],
    guildId: null,
    meta: null,
    settings: null,
    page: 'overview',
    statusTimer: null
  };
  window.App = App;

  /* ---------- topbar user ---------- */
  function fillUser() {
    if (!App.user) return;
    const avatar = document.getElementById('userAvatar');
    const name = document.getElementById('userName');
    avatar.src = App.user.avatar;
    name.textContent = App.user.globalName || App.user.username;
  }

  /* ---------- guild picker ---------- */
  function renderGuildPicker() {
    const picker = document.getElementById('guildPicker');
    const menu = document.getElementById('guildMenu');
    const icon = document.getElementById('guildIcon');
    const badge = document.getElementById('guildBadge');
    const name = document.getElementById('guildName');

    const current = App.guilds.find((g) => g.id === App.guildId);
    if (current) {
      name.textContent = current.name;
      if (current.icon) {
        icon.src = current.icon;
        icon.style.display = '';
        badge.style.display = 'none';
      } else {
        badge.textContent = current.name.slice(0, 1).toUpperCase();
        badge.style.display = '';
        icon.style.display = 'none';
      }
    } else {
      name.textContent = t('select_server');
      badge.textContent = '?';
    }

    menu.innerHTML = App.guilds
      .map((g) => `
        <button class="guild-menu-item ${g.id === App.guildId ? 'active' : ''}" data-guild="${g.id}">
          ${g.icon
            ? `<img src="${g.icon}" alt="">`
            : `<span class="guild-badge">${UI.esc(g.name.slice(0, 1).toUpperCase())}</span>`}
          <span>${UI.esc(g.name)}</span>
          ${g.botPresent ? '' : `<span class="no-bot">🤖 ${UI.esc(t('bot_missing'))}</span>`}
        </button>`)
      .join('')
      + `
        <button class="guild-menu-refresh" data-refresh type="button">
          <span class="refresh-icon">🔄</span>
          <span data-refresh-label>${UI.esc(t('refresh_servers'))}</span>
        </button>`;

    picker.onclick = () => { menu.hidden = !menu.hidden; };

    menu.querySelectorAll('[data-guild]').forEach((btn) => {
      btn.addEventListener('click', () => {
        menu.hidden = true;
        selectGuild(btn.dataset.guild);
      });
    });

    menu.querySelector('[data-refresh]').addEventListener('click', async (e) => {
      e.stopPropagation();
      const btn = e.currentTarget;
      if (btn.classList.contains('loading')) return;
      btn.classList.add('loading');
      btn.querySelector('[data-refresh-label]').textContent = t('refreshing');

      const before = App.guildId;
      try {
        const guilds = await UI.api('/user/guilds/refresh', { method: 'POST' });
        App.guilds = guilds;
        applyGuilds(guilds);
        renderGuildPicker();
        menu.hidden = false;
        UI.toast(t('servers_refreshed'));
        if (App.guildId !== before) {
          await loadGuildData();
          render(App.page);
        }
      } catch (err) {
        if (err.message !== 'unauthorized') UI.toast(t('refresh_failed'), 'err');
        btn.classList.remove('loading');
        btn.querySelector('[data-refresh-label]').textContent = t('refresh_servers');
      }
    });
  }

  function applyGuilds(guilds) {
    const stored = localStorage.getItem('brobot.guild');
    const usable = guilds.filter((g) => g.botPresent);

    if (App.guildId && guilds.some((g) => g.id === App.guildId)) return;
    if (stored && usable.some((g) => g.id === stored)) App.guildId = stored;
    else if (usable.length) App.guildId = usable[0].id;
    else App.guildId = null;
  }

  async function loadGuilds() {
    App.guilds = await UI.api('/guilds');
    applyGuilds(App.guilds);
    renderGuildPicker();
  }

  async function selectGuild(guildId) {
    const guild = App.guilds.find((g) => g.id === guildId);
    if (!guild) return;
    if (!guild.botPresent) {
      UI.toast(t('bot_missing'), 'err');
      return;
    }
    App.guildId = guildId;
    localStorage.setItem('brobot.guild', guildId);
    renderGuildPicker();
    await loadGuildData();
    render(App.page);
  }

  async function loadGuildData() {
    if (!App.guildId) return;
    const [meta, settings] = await Promise.all([
      UI.api(`/guild/${App.guildId}/meta`),
      UI.api(`/guild/${App.guildId}/settings`)
    ]);
    App.meta = meta;
    App.settings = settings;
  }

  /* ---------- sidebar ---------- */
  function renderSidebar() {
    const nav = document.getElementById('sidebarNav');
    nav.innerHTML = window.PAGES.sections
      .map((section) => `
        <div class="sidebar-group-label">${UI.esc(t(section.group))}</div>
        ${section.items.map((item) => `
          <button class="sidebar-link ${item.id === App.page ? 'active' : ''}" data-section="${item.id}">
            <span class="nav-emoji">${item.emoji}</span>
            <span>${UI.esc(t(item.key))}</span>
            ${item.priority ? `<span class="priority-dot" title="Core feature"></span>` : ''}
          </button>`).join('')}`)
      .join('');

    nav.querySelectorAll('[data-section]').forEach((btn) => {
      btn.addEventListener('click', () => {
        window.location.hash = btn.dataset.section;
        closeSidebar();
      });
    });
  }

  function findSection(id) {
    for (const section of window.PAGES.sections) {
      const item = section.items.find((i) => i.id === id);
      if (item) return { item, group: section.group };
    }
    return null;
  }

  /* ---------- router / render ---------- */
  async function render(sectionId) {
    const found = findSection(sectionId) || findSection('overview');
    App.page = found.item.id;
    location.hash = App.page;

    renderSidebar();
    document.getElementById('crumbGroup').textContent = t(found.group);
    document.getElementById('crumbPage').textContent = t(found.item.key);
    document.title = `${t(found.item.key)} • Brobot`;

    const content = document.getElementById('content');
    content.innerHTML = `<div class="loading-block"><div class="spinner"></div><p>${UI.esc(t('loading'))}</p></div>`;

    if (!App.guildId) {
      content.innerHTML = `
        <div class="empty-state">
          <span class="big">🛰️</span>
          <p>${UI.esc(t('no_servers'))}</p>
        </div>`;
      return;
    }

    const ctx = {
      guildId: App.guildId,
      meta: App.meta,
      settings: App.settings,
      page: App.page,
      refresh: () => render(App.page)
    };

    try {
      const node = await found.item.render(ctx);
      content.innerHTML = '';
      content.appendChild(node);
    } catch (err) {
      if (err.status === 404) {
        content.innerHTML = `<div class="empty-state"><span class="big">🤖</span><p>${UI.esc(t('bot_missing'))}</p></div>`;
        return;
      }
      content.innerHTML = `<div class="empty-state"><span class="big">⚠️</span><p>${UI.esc(t('msg_error'))}</p></div>`;
    }
  }

  /* ---------- bot status ---------- */
  async function refreshStatus() {
    const pill = document.getElementById('botStatus');
    try {
      const stats = await UI.api('/stats');
      pill.classList.toggle('online', stats.online);
      pill.classList.toggle('offline', !stats.online);
      pill.querySelector('span:last-child').textContent = stats.online
        ? `${t('live')} • ${stats.guilds} 🏠 • ${stats.wsPing}ms`
        : t('down');
    } catch {
      pill.classList.remove('online');
    }
  }

  /* ---------- mobile sidebar ---------- */
  function openSidebar() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('overlay').hidden = false;
  }
  function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay').hidden = true;
  }

  /* ---------- boot ---------- */
  async function boot() {
    fillUser();
    document.getElementById('logoutBtn').addEventListener('click', async () => {
      await fetch('/auth/logout', { method: 'POST' });
      window.location.href = '/';
    });

    document.getElementById('menuBtn').addEventListener('click', openSidebar);
    document.getElementById('overlay').addEventListener('click', closeSidebar);

    window.addEventListener('hashchange', () => {
      const id = location.hash.replace('#', '');
      if (id && id !== App.page) render(id);
    });

    document.addEventListener('brobot:lang', async () => {
      renderSidebar();
      await render(App.page);
    });

    try {
      await loadGuilds();
      if (App.guildId) await loadGuildData();
    } catch (err) {
      UI.toast(t('msg_network'), 'err');
    }

    const initial = location.hash.replace('#', '') || 'overview';
    await render(initial);

    refreshStatus();
    App.statusTimer = setInterval(refreshStatus, 30000);
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
