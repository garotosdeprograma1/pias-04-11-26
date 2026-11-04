/* =====================================================
   DAFIX ADMIN — SHARED JS v2
   ===================================================== */
(function () {
  'use strict';

  // ── Theme ──────────────────────────────────────────
  const html = document.documentElement;
  const THEME_KEY = 'dafix-theme';
  html.setAttribute('data-theme', localStorage.getItem(THEME_KEY) || 'light');

  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      localStorage.setItem(THEME_KEY, next);
    });
  });

  // ── Sidebar collapse ───────────────────────────────
  const shell     = document.getElementById('shell');
  const toggler   = document.getElementById('sidebarToggle');
  const menuBtn   = document.getElementById('menuBtn');
  const sidebar   = document.querySelector('.sidebar');
  const mobOv     = document.getElementById('mobOverlay');

  if (localStorage.getItem('dafix-sidebar') === '1' && shell) shell.classList.add('collapsed');

  if (toggler && shell) {
    toggler.addEventListener('click', () => {
      shell.classList.toggle('collapsed');
      localStorage.setItem('dafix-sidebar', shell.classList.contains('collapsed') ? '1' : '0');
    });
  }
  const openMob = () => { sidebar?.classList.add('open'); mobOv?.classList.add('open'); };
  const closeMob = () => { sidebar?.classList.remove('open'); mobOv?.classList.remove('open'); };
  menuBtn?.addEventListener('click', openMob);
  mobOv?.addEventListener('click', closeMob);

  // ── Dropdown ───────────────────────────────────────
  document.querySelectorAll('[data-dd]').forEach(btn => {
    const menu = document.querySelector(btn.dataset.dd);
    if (!menu) return;
    btn.addEventListener('click', e => { e.stopPropagation(); menu.classList.toggle('open'); });
  });
  document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown__menu.open').forEach(m => m.classList.remove('open'));
  });

  // ── Toast ──────────────────────────────────────────
  const ICONS = {
    success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
    warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    danger:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    info:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  };

  window.toast = function (title, msg, type = 'success') {
    let box = document.querySelector('.toasts');
    if (!box) { box = Object.assign(document.createElement('div'), { className: 'toasts' }); document.body.appendChild(box); }
    const t = document.createElement('div');
    t.className = `toast toast--${type}`;
    t.innerHTML = `
      <div class="toast__ico">${ICONS[type] || ICONS.info}</div>
      <div class="toast__body"><div class="toast__title">${title}</div><div class="toast__msg">${msg}</div></div>
      <button class="toast__x" onclick="this.closest('.toast').remove()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>`;
    box.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 350); }, 3800);
  };

  // ── Counter animation ──────────────────────────────
  window.animateCounters = function () {
    document.querySelectorAll('[data-count]').forEach(el => {
      const end = parseFloat(el.dataset.count);
      const prefix = el.dataset.prefix || '';
      const suffix = el.dataset.suffix || '';
      const dec = (end % 1 !== 0) ? 2 : 0;
      const duration = 900;
      const start = performance.now();
      const raf = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        const current = end * ease;
        el.textContent = prefix + current.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suffix;
        if (progress < 1) requestAnimationFrame(raf);
      };
      requestAnimationFrame(raf);
    });
  };

  // ── Helpers ────────────────────────────────────────
  window.closeOverlay = id => document.getElementById(id)?.classList.remove('open');
  window.openOverlay  = id => document.getElementById(id)?.classList.add('open');
  window.isDark = () => document.documentElement.getAttribute('data-theme') === 'dark';
  window.textColor = () => isDark() ? '#94A3B8' : '#64748B';
  window.gridColor = () => isDark() ? '#1E293B' : '#E2E8F0';
  window.surfaceColor = () => isDark() ? '#0F172A' : '#ffffff';
})();
