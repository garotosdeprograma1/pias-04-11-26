/* ============================================================
   DaFix · Área Pública — script.js
   Shared across home / servicos / institucional
   ============================================================ */

'use strict';

/* ── GLOBALS ── */
let DATA = null;
const PAGE = document.body.dataset.page;
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/* ============================================================
   THEME
   ============================================================ */
const Theme = (() => {
  const key = 'dafix-theme';
  const html = document.documentElement;
  let current = localStorage.getItem(key) || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

  function apply(t) {
    current = t;
    html.setAttribute('data-theme', t);
    localStorage.setItem(key, t);
  }

  function toggle() {
    apply(current === 'light' ? 'dark' : 'light');
  }

  apply(current);

  document.addEventListener('DOMContentLoaded', () => {
    const btn = $('#themeToggle');
    if (btn) btn.addEventListener('click', toggle);
  });

  return { apply, toggle, get: () => current };
})();

/* ============================================================
   HEADER — sticky + scroll
   ============================================================ */
function initHeader() {
  const header = $('#header');
  const progress = $('#scrollProgress');
  if (!header) return;

  const update = () => {
    const scrolled = window.scrollY > 12;
    header.classList.toggle('scrolled', scrolled);

    if (progress) {
      const scrollTop = window.scrollY;
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = docH > 0 ? `${(scrollTop / docH) * 100}%` : '0%';
    }
  };

  window.addEventListener('scroll', update, { passive: true });
  update();
}

/* ============================================================
   MOBILE MENU
   ============================================================ */
function initMobileMenu() {
  const btn = $('#hamburger');
  const menu = $('#mobileMenu');
  if (!btn || !menu) return;

  let open = false;

  function setOpen(val) {
    open = val;
    btn.classList.toggle('is-open', open);
    menu.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', open);
    document.body.style.overflow = open ? 'hidden' : '';
  }

  btn.addEventListener('click', () => setOpen(!open));

  document.addEventListener('click', e => {
    if (open && !menu.contains(e.target) && !btn.contains(e.target)) setOpen(false);
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && open) setOpen(false);
  });

  $$('.nav-link', menu).forEach(a => a.addEventListener('click', () => setOpen(false)));
}

/* ============================================================
   SCROLL REVEAL
   ============================================================ */
function initReveal() {
  const classes = ['reveal', 'reveal-left', 'reveal-right', 'reveal-scale'];
  const targets = $$(classes.map(c => '.' + c).join(','));
  if (!targets.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  targets.forEach(el => observer.observe(el));
}

/* ============================================================
   COUNTER ANIMATION
   ============================================================ */
function animateCounter(el, target, suffix = '', duration = 1800) {
  const isFloat = !Number.isInteger(target);
  const decimals = isFloat ? 1 : 0;
  let start = null;
  const step = ts => {
    if (!start) start = ts;
    const progress = Math.min((ts - start) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 4);
    const val = target * ease;
    el.textContent = (isFloat ? val.toFixed(decimals) : Math.floor(val).toLocaleString('pt-BR')) + suffix;
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = (isFloat ? target.toFixed(decimals) : target.toLocaleString('pt-BR')) + suffix;
  };
  requestAnimationFrame(step);
}

function initCounters() {
  const counters = $$('[data-counter]');
  if (!counters.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const target = parseFloat(e.target.dataset.counter);
        const suffix = e.target.dataset.suffix || '';
        animateCounter(e.target, target, suffix);
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(el => observer.observe(el));
}

/* ============================================================
   RIPPLE EFFECT
   ============================================================ */
function initRipple() {
  document.addEventListener('click', e => {
    const btn = e.target.closest('.ripple');
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    const wave = document.createElement('span');
    wave.className = 'ripple-wave';
    wave.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px`;
    btn.appendChild(wave);
    wave.addEventListener('animationend', () => wave.remove());
  });
}

/* ============================================================
   TOAST NOTIFICATION
   ============================================================ */
function showToast(icon, title, sub = '', dur = 3800) {
  const container = $('#toasts');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <div class="toast-ic">${icon}</div>
    <div class="toast-body"><p>${title}</p>${sub ? `<small>${sub}</small>` : ''}</div>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('out');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, dur);
}

/* ============================================================
   STARS RENDERER
   ============================================================ */
function renderStars(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  let html = '';
  for (let i = 0; i < 5; i++) {
    if (i < full) html += '★';
    else if (i === full && half) html += '½';
    else html += '☆';
  }
  return `<span class="stars" aria-label="${rating} estrelas"><span>${html}</span></span>`;
}

/* ============================================================
   AVATAR HTML
   ============================================================ */
function avatarHTML(initials, color, size = 'md', withDot = false, available = false) {
  const dot = withDot ? `<span class="status-dot status-dot--${available ? 'on' : 'off'}"></span>` : '';
  return `<div class="avatar avatar--${size}" style="background:${color}">${initials}${dot}</div>`;
}

/* ============================================================
   FOOTER RENDERER
   ============================================================ */
function renderFooter(config) {
  const el = $('#footerContent');
  if (!el || !config) return;

  el.innerHTML = `
    <div class="footer-brand">
      <a href="/" class="header-brand" style="margin-bottom:4px">
        <img src="/assets/logo.png" alt="" class="brand-icon" width="38" height="38" aria-hidden="true">
        <span class="brand-name">Da<span>Fix</span></span>
      </a>
      <p class="footer-desc">${config.slogan}. Conectando pessoas a profissionais de excelência.</p>
      <div class="footer-social">
        <a href="${config.instagram}" class="social-btn" aria-label="Instagram" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
        </a>
        <a href="${config.twitter}" class="social-btn" aria-label="Twitter/X" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/></svg>
        </a>
        <a href="${config.linkedin}" class="social-btn" aria-label="LinkedIn" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
        </a>
        <a href="${config.facebook}" class="social-btn" aria-label="Facebook" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>
        </a>
      </div>
    </div>
    <div class="footer-col">
      <h4>Plataforma</h4>
      <nav class="footer-links">
        <a href="/">Início</a>
        <a href="/servicos">Buscar Serviços</a>
        <a href="institucional.html">Sobre Nós</a>
        <a href="institucional.html#contato">Contato</a>
        <a href="/login">Entrar</a>
      </nav>
    </div>
    <div class="footer-col">
      <h4>Categorias</h4>
      <nav class="footer-links">
        <a href="/servicos">⚡ Eletricistas</a>
        <a href="/servicos">🔧 Encanadores</a>
        <a href="/servicos">💻 Programadores</a>
        <a href="/servicos">🎨 Pintores</a>
        <a href="/servicos">📚 Professores</a>
      </nav>
    </div>
    <div class="footer-col">
      <h4>Contato</h4>
      <div style="display:flex;flex-direction:column;gap:10px">
        <div class="footer-contact-row">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.81 19.79 19.79 0 010 2.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
          ${config.telefone}
        </div>
        <div class="footer-contact-row">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          ${config.email}
        </div>
        <div class="footer-contact-row">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          ${config.horario}
        </div>
        <div class="footer-contact-row">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
          ${config.endereco}
        </div>
      </div>
    </div>`;

  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

/* ============================================================
   PROFESSIONAL CARD
   ============================================================ */
function proCardHTML(p, forSearch = false) {
  const avail = p.disponivel
    ? `<span class="avail avail--on"><span class="avail-dot"></span>Disponível</span>`
    : `<span class="avail avail--off"><span class="avail-dot"></span>Indisponível</span>`;

  const verified = p.verificado ? `<span class="badge badge--verified">✓ Verificado</span>` : '';
  const pro = p.plano === 'pro' ? `<span class="badge badge--pro">PRO</span>` : '';

  const cats = (p.categorias || []).slice(0, 3).map(c => `<span class="pro-cat">${c}</span>`).join('');

  return `
    <article class="pro-card reveal" data-id="${p.id}" tabindex="0" role="button" aria-label="Ver perfil de ${p.nome}">
      <div class="pro-card-top">
        ${avatarHTML(p.iniciais, p.cor, 'lg', true, p.disponivel)}
        <div class="pro-info">
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:4px">${pro}${verified}</div>
          <p class="pro-name">${p.nome}</p>
          <p class="pro-spec">${p.especialidade}</p>
          <p class="pro-loc">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
            ${p.cidade}
          </p>
        </div>
      </div>
      <div class="pro-stats">
        <div class="pro-stat">
          <span class="pro-stat-val">${p.avaliacao.toFixed(1)}</span>
          <span class="pro-stat-label">Avaliação</span>
        </div>
        <div class="pro-stat">
          <span class="pro-stat-val">${p.servicos}</span>
          <span class="pro-stat-label">Serviços</span>
        </div>
        <div class="pro-stat">
          <span class="pro-stat-val">${p.totalAvaliacoes}</span>
          <span class="pro-stat-label">Avaliações</span>
        </div>
      </div>
      <div class="pro-cats">${cats}</div>
      <div class="pro-foot">
        <div>
          ${avail}
          <p class="pro-price" style="margin-top:6px">R$ ${p.valorMedio} <small>/hora</small></p>
        </div>
        <button class="btn btn--primary btn--sm ripple open-modal" data-id="${p.id}">
          Ver Perfil
        </button>
      </div>
    </article>`;
}

/* ============================================================
   TESTIMONIAL CARD
   ============================================================ */
function testimonialHTML(t) {
  return `
    <article class="t-card reveal">
      <div class="t-quote" aria-hidden="true">"</div>
      <div class="rating-row" style="margin-bottom:6px">${renderStars(t.nota)}</div>
      <p class="t-text">${t.comentario}</p>
      <div class="t-author">
        ${avatarHTML(t.iniciais, t.cor, 'sm')}
        <div class="t-author-info">
          <p>${t.nome}</p>
          <small>${t.cargo} · ${t.cidade}</small>
        </div>
      </div>
    </article>`;
}

/* ============================================================
   FETCH DATA
   ============================================================ */
async function loadData() {
  if (DATA) return DATA;
  try {
    const res = await fetch('/publico/data.json');
    if (!res.ok) throw new Error('fetch failed');
    DATA = await res.json();
    return DATA;
  } catch (err) {
    console.error('DaFix: failed to load data.json', err);
    return null;
  }
}

/* ============================================================
   MODAL
   ============================================================ */
const Modal = (() => {
  let currentPro = null;

  function open(pro) {
    currentPro = pro;
    const modal = $('#profileModal');
    if (!modal || !pro) return;

    /* fill cover */
    const av = $('#modalAvatar');
    av.textContent = pro.iniciais;
    av.style.background = pro.cor;
    const dot = $('#modalStatusDot');
    dot.className = 'status-dot status-dot--' + (pro.disponivel ? 'on' : 'off');

    $('#modalName').textContent = pro.nome;
    $('#modalSpec').textContent = pro.especialidade;

    const badges = $('#modalBadges');
    let badgesHTML = '';
    if (pro.verificado) badgesHTML += `<span class="chip chip--primary">✓ Verificado</span>`;
    if (pro.plano === 'pro') badgesHTML += `<span class="chip chip--accent">⭐ Pro</span>`;
    badgesHTML += `<span class="chip chip--${pro.disponivel ? 'success' : 'gray'}">${pro.disponivel ? 'Disponível' : 'Indisponível'}</span>`;
    badgesHTML += `<span class="chip chip--warning">📍 ${pro.cidade}</span>`;
    badges.innerHTML = badgesHTML;

    /* desc */
    $('#modalDesc').textContent = pro.descricao;

    /* stats */
    $('#modalStats').innerHTML = `
      <div class="modal-stat">
        <p class="modal-stat-val">${pro.avaliacao.toFixed(1)} ⭐</p>
        <p class="modal-stat-label">Avaliação</p>
      </div>
      <div class="modal-stat">
        <p class="modal-stat-val">${pro.servicos}</p>
        <p class="modal-stat-label">Serviços</p>
      </div>
      <div class="modal-stat">
        <p class="modal-stat-val">${pro.experiencia}</p>
        <p class="modal-stat-label">Experiência</p>
      </div>`;

    /* cats */
    $('#modalCats').innerHTML = pro.categorias.map(c => `<span class="modal-cat">${c}</span>`).join('');

    /* hours */
    $('#modalHours').innerHTML = pro.horarios.map(h => `
      <div class="modal-hour-row">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        ${h}
      </div>`).join('');

    /* portfolio */
    $('#modalPortfolio').innerHTML = pro.portfolio.map(p => `<div class="portfolio-thumb">${p}</div>`).join('');

    /* open */
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    /* focus trap */
    setTimeout(() => {
      const firstFocus = modal.querySelector('button:not([hidden])');
      if (firstFocus) firstFocus.focus();
    }, 100);
  }

  function close() {
    const modal = $('#profileModal');
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    currentPro = null;
  }

  function init() {
    const modal = $('#profileModal');
    if (!modal) return;

    $('#modalClose')?.addEventListener('click', close);
    $('#modalBackdrop')?.addEventListener('click', close);

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) close();
    });

    $('#hireBtn')?.addEventListener('click', () => {
      close();
      showToast('✅', 'Solicitação enviada!', `Entraremos em contato com ${currentPro?.nome || 'o profissional'}.`);
    });

    $('#favBtn')?.addEventListener('click', () => {
      showToast('❤️', 'Adicionado aos favoritos!', currentPro?.nome || '');
    });
  }

  return { open, close, init };
})();

/* ============================================================
   HOME PAGE
   ============================================================ */
async function initHome() {
  const data = await loadData();
  if (!data) return;

  renderFooter(data.config);

  /* Hero stats */
  const heroStats = $('#heroStats');
  if (heroStats && data.estatisticas) {
    heroStats.innerHTML = data.estatisticas.map(s => `
      <div class="hero-stat">
        <p class="hero-stat-val" data-counter="${s.valor}" data-suffix="${s.sufixo}">${s.valor.toLocaleString('pt-BR')}${s.sufixo}</p>
        <p class="hero-stat-label">${s.label}</p>
      </div>`).join('');
  }

  /* Hero search tag click */
  $$('.hero-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      const cat = tag.dataset.cat;
      const input = $('#heroSearch');
      if (input) {
        input.value = cat;
        input.focus();
      }
      window.location.href = `/servicos??cat=${encodeURIComponent(cat)}`;
    });
  });

  /* Hero search btn */
  $('#heroSearchBtn')?.addEventListener('click', () => {
    const q = $('#heroSearch')?.value?.trim();
    window.location.href = q ? `servicos.html?q=${encodeURIComponent(q)}` : '/servicos';
  });
  $('#heroSearch')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const q = e.target.value.trim();
      window.location.href = q ? `servicos.html?q=${encodeURIComponent(q)}` : '/servicos';
    }
  });

  /* Categories */
  const catGrid = $('#categoriesGrid');
  if (catGrid && data.categorias) {
    catGrid.innerHTML = data.categorias.map((c, i) => `
      <a href="servicos.html?cat=${encodeURIComponent(c.id)}" class="cat-card reveal reveal-d${Math.min(i + 1, 6)}" aria-label="${c.nome} — ${c.profissionais} profissionais">
        <div class="cat-icon-wrap" style="background:${c.bg}">${c.icone}</div>
        <p class="cat-name">${c.nome}</p>
        <p class="cat-count"><strong>${c.profissionais}</strong> profissionais</p>
      </a>`).join('');
  }

  /* Featured professionals */
  const featuredPros = $('#featuredPros');
  if (featuredPros && data.profissionais) {
    const featured = data.profissionais.filter(p => p.destaque);
    featuredPros.innerHTML = featured.map(p => proCardHTML(p)).join('');
  }

  /* Testimonials */
  const tGrid = $('#testimonialsGrid');
  if (tGrid && data.depoimentos) {
    tGrid.innerHTML = data.depoimentos.map(t => testimonialHTML(t)).join('');
  }

  /* Stats */
  const sGrid = $('#statsGrid');
  if (sGrid && data.estatisticas) {
    sGrid.innerHTML = data.estatisticas.map((s, i) => `
      <div class="stat-card reveal reveal-d${i + 1}">
        <div class="stat-icon">${s.icone}</div>
        <p class="stat-val" data-counter="${s.valor}" data-suffix="${s.sufixo}">0${s.sufixo}</p>
        <p class="stat-label">${s.label}</p>
      </div>`).join('');
  }

  /* Pro card modal triggers */
  document.addEventListener('click', e => {
    const btn = e.target.closest('.open-modal');
    if (!btn) return;
    const id = btn.dataset.id;
    const pro = data.profissionais.find(p => p.id === id);
    if (pro) Modal.open(pro);
  });

  /* Also open on card click/enter */
  document.addEventListener('click', e => {
    const card = e.target.closest('.pro-card:not([data-id=""])');
    if (!card || e.target.closest('.btn')) return;
    const id = card.dataset.id;
    const pro = data.profissionais.find(p => p.id === id);
    if (pro) Modal.open(pro);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      const card = e.target.closest('.pro-card');
      if (card) {
        e.preventDefault();
        const id = card.dataset.id;
        const pro = data.profissionais.find(p => p.id === id);
        if (pro) Modal.open(pro);
      }
    }
  });

  initReveal();
  initCounters();
  Modal.init();
}

/* ============================================================
   SERVICES PAGE
   ============================================================ */
async function initServicos() {
  const data = await loadData();
  if (!data) return;

  renderFooter(data.config);

  /* Populate category filter */
  const filterCat = $('#filterCat');
  if (filterCat && data.categorias) {
    data.categorias.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.icone} ${c.nome}`;
      filterCat.appendChild(opt);
    });
  }

  /* Parse URL params */
  const params = new URLSearchParams(window.location.search);
  const qParam = params.get('q') || '';
  const catParam = params.get('cat') || '';

  const searchInput = $('#searchInput');
  if (searchInput) searchInput.value = qParam;
  if (filterCat && catParam) filterCat.value = catParam;

  /* State */
  let state = {
    q: qParam,
    cat: catParam,
    city: '',
    rating: '',
    avail: 'all',
    sort: 'destaque'
  };

  function filterAndRender() {
    let pros = [...data.profissionais];

    /* Text search */
    if (state.q) {
      const q = state.q.toLowerCase();
      pros = pros.filter(p =>
        p.nome.toLowerCase().includes(q) ||
        p.especialidade.toLowerCase().includes(q) ||
        p.categoria.toLowerCase().includes(q) ||
        p.categorias.some(c => c.toLowerCase().includes(q))
      );
    }

    /* Category */
    if (state.cat) pros = pros.filter(p => p.categoria === state.cat);

    /* City */
    if (state.city) pros = pros.filter(p => p.cidade === state.city);

    /* Rating */
    if (state.rating) pros = pros.filter(p => p.avaliacao >= parseFloat(state.rating));

    /* Availability */
    if (state.avail === 'true') pros = pros.filter(p => p.disponivel);
    if (state.avail === 'pro') pros = pros.filter(p => p.plano === 'pro');

    /* Sort */
    switch (state.sort) {
      case 'rating': pros.sort((a, b) => b.avaliacao - a.avaliacao); break;
      case 'preco-asc': pros.sort((a, b) => a.valorMedio - b.valorMedio); break;
      case 'preco-desc': pros.sort((a, b) => b.valorMedio - a.valorMedio); break;
      case 'servicos': pros.sort((a, b) => b.servicos - a.servicos); break;
      case 'destaque':
      default:
        pros.sort((a, b) => (b.destaque ? 1 : 0) - (a.destaque ? 1 : 0) || b.avaliacao - a.avaliacao);
        break;
    }

    /* Render */
    const grid = $('#prosGrid');
    const noRes = $('#noResults');
    const count = $('#resultsCount');

    if (count) count.innerHTML = `<strong>${pros.length}</strong> profissiona${pros.length === 1 ? 'l' : 'is'} encontrado${pros.length !== 1 ? 's' : ''}`;

    if (pros.length === 0) {
      if (grid) grid.innerHTML = '';
      if (noRes) noRes.hidden = false;
    } else {
      if (noRes) noRes.hidden = true;
      if (grid) {
        grid.innerHTML = pros.map(p => proCardHTML(p, true)).join('');
        initReveal();
      }
    }
  }

  /* Events */
  $('#searchBtn')?.addEventListener('click', () => {
    state.q = searchInput?.value.trim() || '';
    filterAndRender();
  });

  searchInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      state.q = e.target.value.trim();
      filterAndRender();
    }
  });

  filterCat?.addEventListener('change', e => { state.cat = e.target.value; filterAndRender(); });
  $('#filterCity')?.addEventListener('change', e => { state.city = e.target.value; filterAndRender(); });
  $('#filterRating')?.addEventListener('change', e => { state.rating = e.target.value; filterAndRender(); });
  $('#sortSelect')?.addEventListener('change', e => { state.sort = e.target.value; filterAndRender(); });

  $$('[data-avail]').forEach(chip => {
    chip.addEventListener('click', () => {
      $$('[data-avail]').forEach(c => c.classList.remove('is-active'));
      chip.classList.add('is-active');
      state.avail = chip.dataset.avail;
      filterAndRender();
    });
  });

  $('#clearFilters')?.addEventListener('click', () => {
    state = { q: '', cat: '', city: '', rating: '', avail: 'all', sort: 'destaque' };
    if (searchInput) searchInput.value = '';
    if (filterCat) filterCat.value = '';
    $('#filterCity').value = '';
    $('#filterRating').value = '';
    $('#sortSelect').value = 'destaque';
    $$('[data-avail]').forEach(c => c.classList.toggle('is-active', c.dataset.avail === 'all'));
    filterAndRender();
  });

  $('#resetSearch')?.addEventListener('click', () => {
    state.q = '';
    if (searchInput) searchInput.value = '';
    filterAndRender();
  });

  /* Modal triggers */
  document.addEventListener('click', e => {
    const btn = e.target.closest('.open-modal');
    if (btn) {
      const id = btn.dataset.id;
      const pro = data.profissionais.find(p => p.id === id);
      if (pro) Modal.open(pro);
      return;
    }
    const card = e.target.closest('.pro-card');
    if (card && !e.target.closest('.btn')) {
      const id = card.dataset.id;
      const pro = data.profissionais.find(p => p.id === id);
      if (pro) Modal.open(pro);
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      const card = e.target.closest('.pro-card');
      if (card) {
        e.preventDefault();
        const id = card.dataset.id;
        const pro = data.profissionais.find(p => p.id === id);
        if (pro) Modal.open(pro);
      }
    }
  });

  Modal.init();
  filterAndRender();
}

/* ============================================================
   INSTITUCIONAL PAGE
   ============================================================ */
async function initInstitucional() {
  const data = await loadData();
  if (!data) return;

  renderFooter(data.config);

  /* Hero stats */
  const instStats = $('#instHeroStats');
  if (instStats && data.estatisticas) {
    instStats.innerHTML = data.estatisticas.slice(0, 3).map(s => `
      <div>
        <p class="inst-hero-stat-val" data-counter="${s.valor}" data-suffix="${s.sufixo}">${s.valor.toLocaleString('pt-BR')}${s.sufixo}</p>
        <p class="inst-hero-stat-label">${s.label}</p>
      </div>`).join('');
  }

  /* Differentials */
  const diffs = [
    { icon: '🔒', title: 'Segurança garantida', desc: 'Todos os profissionais passam por verificação de identidade, antecedentes e certificações antes de aparecer na plataforma.' },
    { icon: '✅', title: 'Profissionais verificados', desc: 'Avaliamos portfólio, certificações e histórico. Só os melhores têm o selo de verificação DaFix.' },
    { icon: '⚡', title: 'Atendimento rápido', desc: 'Encontre e entre em contato com profissionais disponíveis em menos de 5 minutos, 24 horas por dia.' },
    { icon: '📱', title: 'Plataforma intuitiva', desc: 'Interface moderna e fácil de usar, disponível em qualquer dispositivo. Experiência premium sem complicação.' },
    { icon: '🤝', title: 'Suporte dedicado', desc: 'Equipe de suporte pronta para ajudar em qualquer etapa do processo, do primeiro contato à conclusão do serviço.' },
  ];

  $('#diffsList').innerHTML = diffs.map((d, i) => `
    <div class="diff-item reveal reveal-d${i + 1}">
      <div class="diff-item-icon">${d.icon}</div>
      <div>
        <p class="diff-item-title">${d.title}</p>
        <p class="diff-item-desc">${d.desc}</p>
      </div>
    </div>`).join('');

  /* Differentials visual */
  const metrics = [
    { icon: '🛡️', bg: 'var(--primary-soft)', val: '100%', label: 'Profissionais verificados' },
    { icon: '⭐', bg: 'var(--warning-soft)', val: '4.9/5', label: 'Satisfação média dos clientes' },
    { icon: '⚡', bg: 'var(--success-soft)', val: '<5min', label: 'Tempo médio de resposta' },
  ];
  $('#diffsVisual').innerHTML = metrics.map(m => `
    <div class="diffs-metric reveal-scale">
      <div class="diffs-metric-icon" style="background:${m.bg}">${m.icon}</div>
      <div>
        <p class="diffs-metric-val">${m.val}</p>
        <p class="diffs-metric-label">${m.label}</p>
      </div>
    </div>`).join('');

  /* Team */
  const teamGrid = $('#teamGrid');
  if (teamGrid && data.equipe) {
    teamGrid.innerHTML = data.equipe.map((m, i) => `
      <div class="team-card reveal reveal-d${i + 1}">
        ${avatarHTML(m.iniciais, m.cor, 'xl')}
        <div>
          <p class="team-name">${m.nome}</p>
          <p class="team-cargo">${m.cargo}</p>
        </div>
        <a href="${m.linkedin}" class="team-linkedin" aria-label="LinkedIn de ${m.nome}" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
        </a>
      </div>`).join('');
  }

  /* Contact info cards */
  const contactInfo = [
    { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.81 19.79 19.79 0 010 2.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>`, label: 'Telefone', value: data.config.telefone, meta: 'Seg–Sex: 9h–18h' },
    { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`, label: 'E-mail', value: data.config.email, meta: 'Respondemos em até 24h' },
    { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`, label: 'Horário', value: data.config.horario, meta: 'Sáb: 9h–13h' },
    { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>`, label: 'Endereço', value: 'Av. Paulista, 1000', meta: 'São Paulo, SP · 01311-000' },
  ];

  $('#contactInfoCards').innerHTML = contactInfo.map((c, i) => `
    <div class="contact-info-card reveal reveal-d${i + 1}">
      <div class="contact-info-icon">${c.icon}</div>
      <div>
        <p class="contact-info-label">${c.label}</p>
        <p class="contact-info-value">${c.value}</p>
        <p class="contact-info-meta">${c.meta}</p>
      </div>
    </div>`).join('');

  /* Contact form */
  initContactForm();

  /* Smooth scroll to #contato if in URL */
  if (window.location.hash === '#contato') {
    setTimeout(() => {
      const el = document.getElementById('contato');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 400);
  }

  initReveal();
  initCounters();
}

/* ============================================================
   CONTACT FORM
   ============================================================ */
function initContactForm() {
  const form = $('#contactForm');
  const success = $('#formSuccess');
  const newMsg = $('#newMessageBtn');
  if (!form) return;

  function showError(fieldId, msg) {
    const field = $(`#field-${fieldId}`);
    const errEl = $(`#err-${fieldId}`);
    if (field) field.classList.add('has-error');
    if (errEl) errEl.textContent = msg;
  }

  function clearError(fieldId) {
    const field = $(`#field-${fieldId}`);
    const errEl = $(`#err-${fieldId}`);
    if (field) field.classList.remove('has-error');
    if (errEl) errEl.textContent = '';
  }

  /* Live validation */
  ['nome', 'email', 'assunto', 'mensagem'].forEach(id => {
    const el = document.getElementById(`c${id.charAt(0).toUpperCase() + id.slice(1)}`);
    el?.addEventListener('input', () => clearError(id));
    el?.addEventListener('blur', () => validate(id));
  });

  function validate(field) {
    const val = document.getElementById(`c${field.charAt(0).toUpperCase() + field.slice(1)}`)?.value.trim();
    if (!val) { showError(field, 'Campo obrigatório.'); return false; }
    if (field === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      showError(field, 'E-mail inválido.'); return false;
    }
    if (field === 'mensagem' && val.length < 20) {
      showError(field, 'Mensagem muito curta (mínimo 20 caracteres).'); return false;
    }
    clearError(field);
    return true;
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const fields = ['nome', 'email', 'assunto', 'mensagem'];
    const valid = fields.map(f => validate(f)).every(Boolean);
    if (!valid) return;

    const btn = $('#submitBtn');
    btn.disabled = true;
    btn.innerHTML = `<span style="opacity:.7">Enviando...</span>`;

    /* Simulate async send */
    await new Promise(r => setTimeout(r, 1200));

    form.hidden = true;
    success.hidden = false;
    showToast('✅', 'Mensagem enviada com sucesso!', 'Retornaremos em breve.');
    btn.disabled = false;
  });

  newMsg?.addEventListener('click', () => {
    form.hidden = false;
    success.hidden = true;
    form.reset();
    ['nome', 'email', 'assunto', 'mensagem'].forEach(id => clearError(id));
    const btn = $('#submitBtn');
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" width="18" height="18"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Enviar mensagem`;
  });
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initMobileMenu();
  initRipple();

  switch (PAGE) {
    case 'home':         initHome(); break;
    case 'servicos':     initServicos(); break;
    case 'institucional': initInstitucional(); break;
    default:             initReveal(); initCounters(); break;
  }
});
