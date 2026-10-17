/* ============================================================
   ✨ Brobot — Landing page logic
   ============================================================ */

(function () {
  const t = window.t;
  const UI = window.UI;

  const MODULES = [
    ['overview', '📊'],
    ['server_settings', '⚙️'],
    ['embeds', '🎨'],
    ['premium', '💎'],
    ['utility', '🧰'],
    ['welcome', '👋'],
    ['autoresponder', '💬'],
    ['leveling', '🏆'],
    ['autoroles', '🤖'],
    ['colors', '🎨'],
    ['selfroles', '🎭'],
    ['starboard', '⭐'],
    ['tempchannels', '🔊'],
    ['templink', '🔗'],
    ['stats', '📈'],
    ['tickets', '🎫'],
    ['moderation', '🛡️'],
    ['logs', '📜'],
    ['automod', '🚫'],
    ['antiraid', '🚨'],
    ['vippro', '💠'],
    ['twitch', '🟣'],
    ['youtube', '🔴'],
    ['kick', '🟢'],
    ['reddit', '📮'],
    ['dashlogs', '🗒️'],
    ['modactions', '📋']
  ];

  function renderModules() {
    const grid = document.getElementById('moduleGrid');
    if (!grid) return;
    grid.innerHTML = MODULES
      .map(([key, emoji]) => `
        <div class="module-chip">
          <span class="module-emoji">${emoji}</span>
          <span>${UI.esc(t(`sec_${key}`))}</span>
        </div>`)
      .join('');
  }

  async function loadStats() {
    try {
      const res = await fetch('/api/stats');
      const stats = await res.json();
      const map = {
        guilds: stats.guilds,
        users: stats.users,
        commands: stats.commands,
        online: stats.online ? `🟢 ${t('live')}` : `🔴 ${t('down')}`
      };
      document.querySelectorAll('[data-stat]').forEach((el) => {
        const value = map[el.dataset.stat];
        el.textContent = typeof value === 'number' ? value.toLocaleString('en-US') : value;
      });
    } catch {
      /* stats are non-critical on the landing page */
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderModules();
    loadStats();
    document.addEventListener('brobot:lang', renderModules);
  });
})();
