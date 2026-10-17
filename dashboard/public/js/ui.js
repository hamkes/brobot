/* ============================================================
   ✨ Brobot — UI helpers (used by pages.js / dashboard.js)
   ============================================================ */

(function () {
  const t = window.t;

  /* ---------- API ---------- */
  async function api(path, options = {}) {
    const res = await fetch(`/api${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (res.status === 401) {
      window.location.href = '/';
      throw new Error('unauthorized');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || `HTTP ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  /* ---------- DOM ---------- */
  function el(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstElementChild;
  }

  function esc(text) {
    return String(text ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function toast(message, type = 'ok') {
    const container = document.getElementById('toasts');
    const node = el(`<div class="toast ${type === 'err' ? 'err' : 'ok'}">${esc(message)}</div>`);
    container.appendChild(node);
    setTimeout(() => {
      node.style.opacity = '0';
      setTimeout(() => node.remove(), 250);
    }, 3200);
  }

  /* ---------- Field builders ---------- */
  function get(obj, path, fallback) {
    return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj) ?? fallback;
  }

  function set(obj, path, value) {
    const keys = path.split('.');
    let target = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (typeof target[keys[i]] !== 'object' || target[keys[i]] === null) target[keys[i]] = {};
      target = target[keys[i]];
    }
    target[keys[keys.length - 1]] = value;
  }

  function toggleField(path, label, hint, checked) {
    return `
      <label class="switch">
        <input type="checkbox" data-path="${path}" ${checked ? 'checked' : ''}>
        <span class="track"></span>
        <span class="switch-label">${esc(label)}${hint ? `<span class="switch-hint">${esc(hint)}</span>` : ''}</span>
      </label>`;
  }

  function textField(path, label, hint, value, placeholder = '') {
    return `
      <div class="field">
        <label>${esc(label)}</label>
        <input type="text" data-path="${path}" value="${esc(value ?? '')}" placeholder="${esc(placeholder)}">
        ${hint ? `<span class="hint">${esc(hint)}</span>` : ''}
      </div>`;
  }

  function textareaField(path, label, hint, value) {
    return `
      <div class="field">
        <label>${esc(label)}</label>
        <textarea data-path="${path}">${esc(value ?? '')}</textarea>
        ${hint ? `<span class="hint">${esc(hint)}</span>` : ''}
      </div>`;
  }

  function numberField(path, label, hint, value, min, max, step = 1) {
    return `
      <div class="field">
        <label>${esc(label)}</label>
        <input type="number" data-path="${path}" value="${esc(value ?? 0)}" min="${min ?? 0}" max="${max ?? 1000000}" step="${step}">
        ${hint ? `<span class="hint">${esc(hint)}</span>` : ''}
      </div>`;
  }

  function colorField(path, label, value) {
    return `
      <div class="field">
        <label>${esc(label)}</label>
        <input type="color" data-path="${path}" value="${esc(value || '#5865F2')}">
      </div>`;
  }

  function channelSelect(path, label, channels, value, hint, filter) {
    const options = (channels || [])
      .filter((c) => !filter || filter(c))
      .map((c) => `<option value="${c.id}" ${c.id === value ? 'selected' : ''}>#${esc(c.name)}</option>`)
      .join('');
    return `
      <div class="field">
        <label>${esc(label)}</label>
        <select data-path="${path}">
          <option value="">— ${esc(t('none'))} —</option>
          ${options}
        </select>
        ${hint ? `<span class="hint">${esc(hint)}</span>` : ''}
      </div>`;
  }

  function roleSelect(path, label, roles, value, hint) {
    const options = (roles || [])
      .map((r) => `<option value="${r.id}" ${r.id === value ? 'selected' : ''}>@${esc(r.name)}</option>`)
      .join('');
    return `
      <div class="field">
        <label>${esc(label)}</label>
        <select data-path="${path}">
          <option value="">— ${esc(t('none'))} —</option>
          ${options}
        </select>
        ${hint ? `<span class="hint">${esc(hint)}</span>` : ''}
      </div>`;
  }

  function rolePicker(path, roles, selectedIds) {
    const selected = new Set(selectedIds || []);
    return `
      <div class="role-picker" data-picker="${path}">
        ${(roles || []).map((r) => `
          <label class="role-option">
            <input type="checkbox" value="${r.id}" ${selected.has(r.id) ? 'checked' : ''}>
            <span class="role-dot" style="background:${r.color ? `#${r.color.toString(16).padStart(6, '0')}` : '#5865F2'}"></span>
            ${esc(r.name)}
          </label>`).join('')}
      </div>`;
  }

  /* ---------- Form gather/apply ---------- */
  function gather(container) {
    const out = {};
    container.querySelectorAll('[data-path]').forEach((input) => {
      const path = input.dataset.path;
      let value;
      if (input.type === 'checkbox') value = input.checked;
      else if (input.type === 'number') {
        value = input.value === '' ? 0 : Number(input.value);
      } else value = input.value;

      if (input.tagName === 'SELECT' && value === '') value = null;
      set(out, path, value);
    });

    container.querySelectorAll('[data-picker]').forEach((picker) => {
      const values = [...picker.querySelectorAll('input:checked')].map((i) => i.value);
      set(out, picker.dataset.picker, values);
    });

    return out;
  }

  /* ---------- Components ---------- */
  function statCard(emoji, label, value) {
    return `
      <div class="stat-card">
        <div class="stat-label"><span class="stat-emoji">${emoji}</span> ${esc(label)}</div>
        <div class="stat-value">${esc(value)}</div>
      </div>`;
  }

  function card(title, subtitle, bodyHtml, actionsHtml = '') {
    return `
      <section class="card">
        <h3 class="card-title">${esc(title)}</h3>
        ${subtitle ? `<p class="card-subtitle">${esc(subtitle)}</p>` : ''}
        ${bodyHtml}
        ${actionsHtml ? `<div class="card-actions">${actionsHtml}</div>` : ''}
      </section>`;
  }

  function saveButton(id) {
    return `
      <button class="btn btn-primary" data-save="${id}">💾 ${esc(t('save'))}</button>
      <span class="save-state" data-save-state="${id}">✓ ${esc(t('saved'))}</span>`;
  }

  function pageHead(titleKey, descKey) {
    return `
      <div class="page-head">
        <h2 class="page-title" data-page-title>${esc(t(titleKey))}</h2>
        <p class="page-desc" data-page-desc>${esc(t(descKey))}</p>
      </div>`;
  }

  function timeAgo(dateLike) {
    const date = new Date(dateLike);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  }

  window.UI = {
    api, el, esc, toast, get, set,
    toggleField, textField, textareaField, numberField, colorField,
    channelSelect, roleSelect, rolePicker,
    gather, statCard, card, saveButton, pageHead, timeAgo
  };
})();
