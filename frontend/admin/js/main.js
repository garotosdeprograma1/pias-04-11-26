/* Estrutura comum da administração: sessão, navegação, tema e componentes das telas. */
(() => {
  'use strict';
  const D = window.DafixData, A = window.DafixAccount, E = D.escape;

  // ---------------------------------------------------------------
  // Ícones (traço único, mesma espessura em todo o painel)
  // ---------------------------------------------------------------
  const ICONS = {
    check: '<path d="M20 6 9 17l-5-5"/>',
    alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.3-4.3L4 8.5M4 4v4.5h4.5M4 13a8 8 0 0 0 14.3 4.3l1.7-1.8M20 20v-4.5h-4.5"/>',
    download: '<path d="M12 4v11m0 0-4-4m4 4 4-4M5 19h14"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0 1 16 0"/>',
    tool: '<path d="M14.7 6.3a4 4 0 0 0 5 5L11 20a2.1 2.1 0 0 1-3-3l8.7-8.7a4 4 0 0 0-5-5l2.6 2.6-1.6 1.6z"/>',
    clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6"/>',
    wallet: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 14.5h1.5"/>',
    list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
    edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
    shield: '<path d="M12 3 5 6v5c0 4.5 2.9 8.3 7 10 4.1-1.7 7-5.5 7-10V6z"/>',
    chevronLeft: '<path d="m15 6-6 6 6 6"/>',
    chevronRight: '<path d="m9 6 6 6-6 6"/>',
    arrowRight: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
    login: '<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 8l4 4-4 4M4 12h10"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  };
  const icon = (name, extra = '') => '<svg class="icon ' + extra + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[name] || ICONS.info) + '</svg>';

  // ---------------------------------------------------------------
  // Formatação e rótulos legíveis
  // ---------------------------------------------------------------
  const initials = name => String(name || '?').trim().split(/\s+/).filter(Boolean).map(part => part[0]).filter((_, i, all) => i === 0 || i === all.length - 1).join('').toUpperCase() || '?';
  const phone = value => {
    const d = String(value || '').replace(/\D/g, '');
    if (d.length === 11) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
    if (d.length === 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
    return value || 'Não informado';
  };
  const cpf = value => {
    const d = String(value || '').replace(/\D/g, '');
    return d.length === 11 ? d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6, 9) + '-' + d.slice(9) : (value || 'Não informado');
  };
  const validDate = value => { const date = new Date(value); return value && !Number.isNaN(date.getTime()) ? date : null; };
  const stamp = value => { const d = validDate(value); return d ? d.toLocaleString('pt-BR', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : 'Não registrado'; };
  const day = value => { const d = validDate(value); return d ? d.toLocaleDateString('pt-BR') : 'Não registrado'; };
  const time = value => { const d = validDate(value); return d ? d.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'}) : ''; };
  const dayHeading = value => {
    const d = validDate(value); if (!d) return 'Sem data';
    const key = date => date.toLocaleDateString('en-CA'), today = new Date(), yesterday = new Date(Date.now() - 864e5);
    if (key(d) === key(today)) return 'Hoje';
    if (key(d) === key(yesterday)) return 'Ontem';
    return d.toLocaleDateString('pt-BR', {weekday:'long',day:'numeric',month:'long'});
  };
  const month = value => {
    const [year, m] = String(value).split('-').map(Number);
    const d = new Date(year, m - 1, 1);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('pt-BR', {month:'short'}).replace('.', '') + '/' + String(year).slice(2);
  };
  const plural = (count, one, many) => count + ' ' + (count === 1 ? one : many);

  const ROLES = {cliente:['Cliente','info'],funcionario:['Funcionário','accent'],admin:['Administrador','primary']};
  const EVENTS = {
    login:'Entrada na conta', logout:'Saída da conta', acesso:'Página administrativa aberta',
    cadastro:'Cadastro realizado', alteracao:'Cadastro alterado', exclusao:'Registro excluído',
    'permissoes.alteradas':'Permissões alteradas', 'pedido.aceito':'Pedido aceito', 'pedido.excluido':'Pedido excluído',
    'servico.cadastrado':'Serviço cadastrado', 'servico.alterado':'Serviço alterado', 'servico.excluido':'Serviço excluído',
    'servico.feito_pelo_funcionario':'Serviço concluído pelo profissional', 'servico.avaliado_e_confirmado':'Serviço avaliado pelo cliente',
    'pagamento.metodo_cadastrado':'Forma de pagamento cadastrada', 'pagamento.metodo_removido':'Forma de pagamento removida',
    'pagamento.simulado_sem_cobranca':'Pagamento simulado (sem cobrança)', erro_interno:'Erro interno',
  };
  const MODULES = {
    login:'Acesso', logout:'Acesso', session:'Acesso', administracao:'Painel administrativo', admin:'Administração',
    clientes:'Clientes', funcionarios:'Funcionários', admins:'Administradores', servicos:'Catálogo',
    os:'Pedidos', solicitacoes:'Solicitações', pagamentos:'Pagamentos', sistema:'Sistema',
  };
  const eventLabel = value => EVENTS[value] || value || 'Evento';
  const moduleLabel = value => MODULES[value] || value || '—';
  const badge = (text, tone = '', plain = false) => '<span class="badge' + (tone ? ' badge--' + tone : '') + (plain ? ' badge--plain' : '') + '">' + E(text) + '</span>';
  const roleBadge = role => badge((ROLES[role] || [role])[0], (ROLES[role] || [])[1], true);
  const statusBadge = active => badge(active === 0 ? 'Inativo' : 'Ativo', active === 0 ? '' : 'success');
  const resultBadge = result => badge(result === 'sucesso' ? 'Sucesso' : 'Falha', result === 'sucesso' ? 'success' : 'danger');
  const ORDER_STATUS = {
    waiting: ['Aguardando aceite', 'warning'], progress: ['Em andamento', 'info'],
    review: ['Aguardando avaliação', 'accent'], done: ['Concluído', 'success'],
  };
  const orderState = order => order.confirmado_cliente_em ? 'done' : order.concluido_funcionario_em ? 'review' : order.id_funcionario ? 'progress' : 'waiting';
  const orderBadge = order => badge(...ORDER_STATUS[orderState(order)]);

  // ---------------------------------------------------------------
  // Componentes
  // ---------------------------------------------------------------
  const identity = (name, detail, note = '') => '<div class="identity"><span class="avatar" aria-hidden="true">' + E(initials(name)) + '</span><div class="identity__text"><strong>' + E(name) + (note ? ' <span class="muted" style="display:inline;font-weight:400">' + E(note) + '</span>' : '') + '</strong>' + (detail ? '<span>' + E(detail) + '</span>' : '') + '</div></div>';
  const empty = (title, text = '', name = 'info', error = false) => '<div class="empty' + (error ? ' empty--error' : '') + '" role="status">' + icon(name) + '<strong>' + E(title) + '</strong>' + (text ? '<span>' + E(text) + '</span>' : '') + '</div>';
  const failure = error => empty('Não foi possível carregar', error.message, 'alert', true);
  const skeleton = (heights = [120, 260]) => '<div class="skeleton-stack" aria-hidden="true">' + heights.map(h => '<div class="skeleton" style="height:' + h + 'px"></div>').join('') + '</div>';

  /* columns: [{label, cls, main}] · rows: células em HTML já escapado. */
  function table(columns, rows, options = {}) {
    if (!rows.length) return options.empty || empty('Nenhum registro encontrado');
    return '<div class="table-wrap"><table class="table' + (options.stack === false ? '' : ' table--stack') + (options.cls ? ' ' + options.cls : '') + '"' + (options.minWidth ? ' style="min-width:' + options.minWidth + 'px"' : '') + '><thead><tr>' +
      columns.map(c => '<th scope="col"' + (c.cls ? ' class="' + c.cls + '"' : '') + '>' + (c.html || E(c.label)) + '</th>').join('') + '</tr></thead><tbody>' +
      rows.map(row => '<tr>' + row.map((cell, i) => '<td data-label="' + E(columns[i].label) + '" class="' + (columns[i].cls || '') + (columns[i].main ? ' cell-main' : '') + '">' + cell + '</td>').join('') + '</tr>').join('') +
      '</tbody></table></div>';
  }
  const pager = (id, page, pages) => '<div class="pagination" id="' + id + '"><button type="button" class="btn btn--sm" data-page="' + (page - 1) + '"' + (page <= 1 ? ' disabled' : '') + '>' + icon('chevronLeft') + 'Anterior</button><span>Página ' + page + ' de ' + pages + '</span><button type="button" class="btn btn--sm" data-page="' + (page + 1) + '"' + (page >= pages ? ' disabled' : '') + '>Próxima' + icon('chevronRight') + '</button></div>';
  const kpi = (label, value, sub, name, tone = '', small = false) => '<article class="card kpi"><div class="kpi__top"><span class="kpi__label">' + E(label) + '</span><span class="kpi__icon' + (tone ? ' kpi__icon--' + tone : '') + '">' + icon(name) + '</span></div><strong class="kpi__value' + (small ? ' kpi__value--sm' : '') + '">' + E(value) + '</strong><span class="kpi__sub">' + E(sub) + '</span></article>';
  function bars(values, emptyText = 'Ainda não há dados para exibir.') {
    const items = Object.entries(values).sort(([, a], [, b]) => b - a), max = Math.max(1, ...items.map(([, v]) => v));
    if (!items.length) return empty(emptyText);
    return '<div class="bar-list">' + items.map(([label, value]) => '<div class="bar-row"><span class="bar-row__label">' + E(label) + '</span><span class="bar-row__value">' + value + '</span><div class="bar-row__track" role="img" aria-label="' + E(label) + ': ' + value + '"><span class="bar-row__fill" style="width:' + (value / max * 100) + '%"></span></div></div>').join('') + '</div>';
  }
  function activity(rows, options = {}) {
    if (!rows.length) return empty('Nenhuma atividade registrada', options.emptyText || '');
    let last = '';
    return '<ol class="timeline' + (options.compact ? ' timeline--compact' : '') + '">' + rows.map(row => {
      const heading = options.grouped ? dayHeading(row.criado_em) : '', ok = row.resultado === 'sucesso';
      const head = heading && heading !== last ? '<li class="timeline__day">' + E(heading) + '</li>' : ''; last = heading || last;
      return head + '<li class="timeline__item"><span class="timeline__icon' + (ok ? '' : ' timeline__icon--fail') + '">' + icon(ok ? 'check' : 'alert') + '</span><div class="timeline__text"><strong>' + E(eventLabel(row.acao)) + (ok ? '' : ' · falhou') + '</strong><p>' + E(row.ator_nome || 'Visitante') + ' · ' + E(moduleLabel(row.modulo)) + '</p></div><time class="timeline__time" datetime="' + E(row.criado_em) + '">' + E(options.grouped ? time(row.criado_em) : stamp(row.criado_em)) + '</time></li>';
    }).join('') + '</ol>';
  }

  // Avisos temporários; erros permanecem um pouco mais.
  const toasts = document.createElement('div'); toasts.className = 'toasts'; toasts.setAttribute('aria-live', 'polite'); document.body.append(toasts);
  function toast(message, type = 'success') {
    const item = document.createElement('div');
    item.className = 'toast' + (type === 'error' ? ' toast--error' : ''); item.setAttribute('role', type === 'error' ? 'alert' : 'status');
    item.innerHTML = icon(type === 'error' ? 'alert' : 'check') + '<span>' + E(message) + '</span>';
    toasts.append(item); setTimeout(() => item.remove(), type === 'error' ? 7000 : 4000);
  }

  // Diálogo compartilhado: cabeçalho fixo, corpo rolável e rodapé de ações.
  const dialog = document.getElementById('dialog');
  let dialogLocked = false;
  function openDialog({title, body = '', foot = '', tabs = '', size = ''}) {
    dialogLocked = false;
    dialog.className = 'dialog' + (size ? ' dialog--' + size : '');
    dialog.innerHTML = '<header class="dialog__head"><h2 id="dialog-title">' + E(title) + '</h2><button type="button" class="icon-btn" data-dialog-close aria-label="Fechar">' + icon('close') + '</button></header>' + tabs + '<div class="dialog__body">' + body + '</div>' + (foot ? '<footer class="dialog__foot">' + foot + '</footer>' : '');
    if (!dialog.open) dialog.showModal();
    return dialog;
  }
  const closeDialog = () => { if (!dialogLocked && dialog.open) dialog.close(); };
  dialog.addEventListener('click', event => {
    if (event.target.closest('[data-dialog-close]')) return closeDialog();
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeDialog();
  });
  dialog.addEventListener('cancel', event => { if (dialogLocked) event.preventDefault(); });

  // ---------------------------------------------------------------
  // Navegação, tema e menu móvel
  // ---------------------------------------------------------------
  document.querySelectorAll('.nav__item[href]').forEach(link => {
    const url = new URL(link.href), selected = url.pathname === location.pathname && url.search === location.search;
    link.classList.toggle('active', selected);
    if (selected) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
  const root = document.documentElement, themeButton = document.querySelector('.theme-btn');
  function applyTheme(theme, save = false) {
    root.dataset.theme = theme;
    themeButton.setAttribute('aria-label', theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro');
    themeButton.title = themeButton.getAttribute('aria-label');
    if (save) { try { localStorage.setItem('dafix_theme', theme); } catch { /* A preferência vale só para esta visita. */ } }
    document.dispatchEvent(new CustomEvent('dafix:theme', {detail: theme}));
  }
  applyTheme(root.dataset.theme === 'dark' ? 'dark' : 'light');
  themeButton.addEventListener('click', () => applyTheme(root.dataset.theme === 'dark' ? 'light' : 'dark', true));
  window.addEventListener('storage', event => { if (event.key === 'dafix_theme') applyTheme(event.newValue === 'dark' ? 'dark' : 'light'); });

  const menu = document.getElementById('sidebar'), menuButton = document.getElementById('menuBtn'), overlay = document.getElementById('mobOverlay');
  function closeMenu() { menu.classList.remove('open'); overlay.hidden = true; menuButton.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; }
  menuButton.addEventListener('click', () => {
    if (menu.classList.contains('open')) return closeMenu();
    menu.classList.add('open'); overlay.hidden = false; menuButton.setAttribute('aria-expanded', 'true'); document.body.style.overflow = 'hidden';
  });
  document.getElementById('closeMenu').addEventListener('click', () => { closeMenu(); menuButton.focus(); });
  overlay.addEventListener('click', closeMenu);
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && menu.classList.contains('open')) { closeMenu(); menuButton.focus(); } });
  window.addEventListener('resize', () => { if (innerWidth > 960) closeMenu(); });

  // ---------------------------------------------------------------
  // Sessão administrativa validada no servidor
  // ---------------------------------------------------------------
  const ready = fetch('/api/session', {cache: 'no-store'}).then(async response => {
    if (!response.ok) throw new Error();
    const data = await response.json();
    if (data.perfil !== 'admin') throw new Error();
    // Regravar a sessão a cada página mudaria loginAt e faria as outras abas recarregarem em sequência.
    const stored = A.readSession(), user = data.usuario;
    if (!stored || stored.perfil !== 'admin' || stored.id !== user.id || stored.nome !== user.nome || stored.email !== user.email || stored.telefone !== (user.telefone || '')) A.startSession(user, 'admin');
    A.requireProfile('admin');
    document.querySelectorAll('[data-admin-name]').forEach(node => { node.textContent = user.nome; });
    document.querySelectorAll('[data-admin-initials]').forEach(node => { node.textContent = initials(user.nome); });
    return user;
  });
  ready.catch(() => location.replace('/admin-login.html'));

  document.querySelectorAll('[data-admin-logout]').forEach(button => button.addEventListener('click', () => {
    closeMenu();
    openDialog({
      title: 'Sair da conta?', size: 'sm',
      body: '<p class="muted">Você precisará entrar novamente para acessar a administração.</p><p class="form-message" id="logout-error" role="alert"></p>',
      foot: '<button type="button" class="btn" data-dialog-close>Cancelar</button><button type="button" class="btn btn--danger" id="logout-confirm">Encerrar sessão</button>',
    });
    const confirm = document.getElementById('logout-confirm');
    confirm.addEventListener('click', async () => {
      confirm.disabled = true;
      try { await A.logout('/admin-login.html'); }
      catch (error) { document.getElementById('logout-error').textContent = error.message; confirm.disabled = false; }
    });
  }));

  window.DafixAdmin = {
    ready, icon, initials, phone, cpf, stamp, day, month, plural, eventLabel, moduleLabel,
    badge, roleBadge, statusBadge, resultBadge, orderState, orderBadge, ORDER_STATUS, ROLES,
    identity, empty, failure, skeleton, table, pager, kpi, bars, activity, toast, applyTheme,
    openDialog, closeDialog, lockDialog: value => { dialogLocked = value; },
  };
})();
