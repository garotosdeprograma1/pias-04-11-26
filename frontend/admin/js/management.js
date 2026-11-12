/* Telas de gestão: somente dados reais da API; nenhuma métrica é simulada. */
(() => {
  'use strict';
  const D = window.DafixData, U = window.DafixAdmin, E = D.escape;
  const root = document.getElementById('view'), view = root.dataset.view;
  const send = (method, body) => ({method, headers: {'Content-Type': 'application/json'}, ...(body === undefined ? {} : {body: JSON.stringify(body)})});
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const footer = '<footer class="page-footer"><span>DaFix · Administração</span><a href="/suporte/index.html">Central de ajuda</a></footer>';
  const intro = (text, actions = '') => '<div class="page-intro"><p>' + text + '</p><div class="page-actions">' + actions + '</div></div>';
  const refreshButton = '<button type="button" class="btn" data-refresh>' + U.icon('refresh') + 'Atualizar</button>';
  const field = (name, label, type = 'text', value = '', extra = '', cls = '') => '<label class="field ' + cls + '"><span>' + label + '</span><input name="' + name + '" type="' + type + '" value="' + E(value) + '" ' + extra + '></label>';
  const select = (name, label, entries, value = '', cls = '') => '<label class="field ' + cls + '"><span>' + label + '</span><select name="' + name + '">' + entries.map(([k, v]) => '<option value="' + E(k) + '"' + (String(k) === String(value) ? ' selected' : '') + '>' + E(v) + '</option>').join('') + '</select></label>';
  const setTitle = title => { $('#page-title').textContent = title; $('#crumb-current').textContent = title; document.title = title + ' · Administração DaFix'; };
  const paginate = (id, handler) => { const node = document.getElementById(id); if (node) node.onclick = event => { const button = event.target.closest('[data-page]'); if (button && !button.disabled) handler(Number(button.dataset.page)); }; };

  const PERMISSIONS = [
    ['pedidos.ler', 'Consultar pedidos', 'Ver pedidos e agenda'],
    ['pedidos.aceitar', 'Aceitar pedidos', 'Assumir pedidos disponíveis'],
    ['pedidos.concluir', 'Concluir serviços', 'Marcar atendimento como feito'],
    ['servicos.cadastrar', 'Cadastrar serviços', 'Publicar no catálogo'],
  ];
  const permissionsOf = person => { try { const list = JSON.parse(person.permissoes || '[]'); return Array.isArray(list) ? list : []; } catch { return []; } };

  // Pedidos: mesma tabela no dashboard e nos relatórios.
  const ORDER_COLUMNS = [{label:'Pedido',main:true},{label:'Cliente'},{label:'Serviço'},{label:'Profissional'},{label:'Data',cls:'nowrap'},{label:'Valor',cls:'col-num'},{label:'Situação'}];
  const orderRow = o => ['<strong class="num">#' + o.id + '</strong>', E(o.cliente), E(o.servico), o.funcionario ? E(o.funcionario) : '<span class="muted">—</span>', E(D.date(o.data)), E(D.money(o.preco_unitario)), U.orderBadge(o)];
  const orderTotals = orders => { const counts = {waiting:0,progress:0,review:0,done:0}; for (const o of orders) counts[U.orderState(o)]++; return counts; };
  function orderBreakdown(orders) {
    if (!orders.length) return U.empty('Nenhum pedido registrado', 'Os pedidos aparecem aqui quando os clientes solicitam serviços.', 'clipboard');
    const counts = orderTotals(orders), keys = ['waiting','progress','review','done'];
    return '<div class="stack" role="img" aria-label="Distribuição dos pedidos por situação">' + keys.filter(k => counts[k]).map(k => '<span class="tone-' + k + '" style="flex:' + counts[k] + '"></span>').join('') + '</div>' +
      '<ul class="legend">' + keys.map(k => '<li><i class="tone-' + k + '"></i>' + E(U.ORDER_STATUS[k][0]) + '<strong>' + counts[k] + '</strong></li>').join('') + '</ul>';
  }

  // ---------------------------------------------------------------
  // Dashboard
  // ---------------------------------------------------------------
  async function dashboard(user) {
    const [stats, orders] = await Promise.all([D.request('/api/admin/estatisticas'), D.orders()]);
    const counts = orderTotals(orders), hour = new Date().getHours();
    const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
    const today = new Date().toLocaleDateString('pt-BR', {weekday:'long',day:'numeric',month:'long'});
    const summary = !orders.length ? 'Ainda não há pedidos registrados. Cadastre serviços no catálogo para os clientes solicitarem.'
      : counts.waiting ? '<strong>' + U.plural(counts.waiting, 'pedido aguarda', 'pedidos aguardam') + ' aceite</strong> de um profissional' + (counts.progress ? ' e ' + U.plural(counts.progress, 'está', 'estão') + ' em andamento.' : '.')
      : 'Nenhum pedido aguardando aceite. ' + U.plural(counts.progress, 'atendimento', 'atendimentos') + ' em andamento.';
    const total = orders.reduce((sum, o) => sum + Number(o.preco_unitario || 0), 0);
    root.innerHTML =
      '<section class="hero"><div><span class="hero__date">' + E(today) + '</span><h2>' + greeting + ', ' + E(user.nome.trim().split(/\s+/)[0]) + '.</h2><p>' + summary + '</p></div>' +
      '<div class="hero__actions"><a class="btn btn--primary" href="usuarios.html">' + U.icon('users') + 'Gerenciar pessoas</a><button type="button" class="btn btn--light" data-refresh>' + U.icon('refresh') + 'Atualizar</button></div></section>' +
      '<div class="kpi-grid">' +
        U.kpi('Pessoas cadastradas', stats.total, U.plural(stats.clientes, 'cliente', 'clientes') + ' · ' + U.plural(stats.funcionarios, 'funcionário', 'funcionários') + ' · ' + stats.administradores + ' admin', 'users') +
        U.kpi('Clientes ativos', stats.clientes_ativos, U.plural(stats.clientes - stats.clientes_ativos, 'conta inativa', 'contas inativas'), 'user', 'info') +
        U.kpi('Funcionários ativos', stats.funcionarios_ativos, U.plural(stats.funcionarios - stats.funcionarios_ativos, 'conta inativa', 'contas inativas'), 'tool', 'accent') +
        U.kpi('Pedidos registrados', orders.length, D.money(total) + ' em valores registrados', 'clipboard', 'warning') +
      '</div>' +
      '<div class="grid-main">' +
        '<div class="col-stack">' +
          '<section class="card"><div class="card__head"><div><h2>Pedidos recentes</h2><p>Últimas solicitações feitas pelos clientes.</p></div><a class="link" href="relatorios.html#pedidos">Ver todos</a></div><div class="card__body--flush">' +
            U.table([{label: 'Pedido', main: true}, {label: 'Profissional'}, {label: 'Data', cls: 'nowrap'}, {label: 'Valor', cls: 'col-num'}, {label: 'Situação'}],
              orders.slice(0, 6).map(o => ['<div class="identity__text"><strong>' + E(o.servico) + '</strong><span>#' + o.id + ' · ' + E(o.cliente) + '</span></div>', o.funcionario ? E(o.funcionario) : '<span class="muted">—</span>', E(D.date(o.data)), E(D.money(o.preco_unitario)), U.orderBadge(o)]),
              {empty: U.empty('Nenhum pedido registrado', 'Os pedidos aparecem aqui quando os clientes solicitam serviços.', 'clipboard')}) + '</div></section>' +
          '<section class="card"><div class="card__head"><div><h2>Atividade recente</h2><p>Últimas operações registradas na auditoria.</p></div><a class="link" href="atividades.html">Ver todas</a></div><div class="card__body--flush">' + U.activity(stats.recentes, {compact: true}) + '</div></section>' +
        '</div>' +
        '<div class="col-stack">' +
          '<section class="card"><div class="card__head"><div><h2>Situação dos pedidos</h2><p>Estado atual de todos os pedidos.</p></div></div><div class="card__body">' + orderBreakdown(orders) + '</div></section>' +
          '<section class="card"><div class="card__head"><div><h2>Funcionários por especialidade</h2><p>Equipe cadastrada, ativa ou não.</p></div></div><div class="card__body">' + U.bars(stats.cargos, 'Nenhum funcionário cadastrado.') + '</div></section>' +
        '</div>' +
      '</div>' + footer;
  }

  // ---------------------------------------------------------------
  // Relatórios
  // ---------------------------------------------------------------
  async function reports() {
    const state = {query: '', stats: null, orders: [], selected: [], page: 1, search: '', status: ''};
    root.innerHTML = intro('Indicadores de cadastros e operações. O período filtra novos cadastros e operações; totais e situações mostram o estado atual.', '<button type="button" class="btn" id="export-stats">' + U.icon('download') + 'Exportar indicadores</button>' + refreshButton) +
      '<form class="card toolbar" id="period">' + field('inicio', 'De', 'date') + field('fim', 'Até', 'date') + '<button class="btn btn--primary">Aplicar período</button><button type="button" class="btn btn--ghost" id="period-clear">Limpar</button></form>' +
      '<div id="report-body">' + U.skeleton([120, 280]) + '</div>' +
      '<section class="card" id="pedidos"><div class="card__head"><div><h2>Pedidos registrados</h2><p>Valores registrados na solicitação, sem confirmação de pagamento.</p></div><button type="button" class="btn btn--sm" id="order-export">' + U.icon('download') + 'Exportar CSV</button></div>' +
        '<div class="toolbar"><label class="search"><span class="sr-only">Buscar pedido, cliente, serviço ou profissional</span>' + U.icon('search') + '<input class="input" id="order-query" type="search" placeholder="Buscar pedido, cliente, serviço ou profissional"></label>' +
        select('status', 'Situação', [['', 'Todas'], ...Object.entries(U.ORDER_STATUS).map(([k, v]) => [k, v[0]])]) + '</div>' +
        '<div id="order-list"></div><div class="card__foot"><span id="order-count"></span><div id="order-pager-slot"></div></div></section>' + footer;

    function renderStats() {
      const s = state.stats, operations = s.atividades.reduce((n, a) => n + a.total, 0), failures = s.atividades.filter(a => a.resultado !== 'sucesso').reduce((n, a) => n + a.total, 0);
      const total = state.orders.reduce((n, o) => n + Number(o.preco_unitario || 0), 0);
      const months = Object.entries(s.mensal).sort(([a], [b]) => a.localeCompare(b)), maxMonth = Math.max(1, ...months.map(([, v]) => v));
      const modules = {};
      for (const a of s.atividades) { const m = modules[U.moduleLabel(a.modulo)] ||= {ok: 0, fail: 0}; m[a.resultado === 'sucesso' ? 'ok' : 'fail'] += a.total; }
      const moduleRows = Object.entries(modules).sort(([, a], [, b]) => (b.ok + b.fail) - (a.ok + a.fail)), maxModule = Math.max(1, ...moduleRows.map(([, m]) => m.ok + m.fail));
      const inactive = s.clientes - s.clientes_ativos;
      $('#report-body').innerHTML = '<div class="view">' +
        '<div class="kpi-grid">' +
          U.kpi('Novos cadastros', s.novos, state.query ? 'no período selecionado' : 'com data de cadastro registrada', 'users') +
          U.kpi('Operações registradas', operations, state.query ? 'no período selecionado' : 'desde o início da auditoria', 'list', 'info') +
          U.kpi('Operações com falha', failures, operations ? Math.round(failures / operations * 100) + '% das operações' : 'nenhuma operação', 'alert', 'accent') +
          U.kpi('Valor dos pedidos', D.money(total), U.plural(state.orders.length, 'pedido', 'pedidos') + ' · estado atual', 'wallet', 'warning', true) +
        '</div>' +
        '<div class="grid-2">' +
          '<section class="card"><div class="card__head"><div><h2>Evolução mensal dos cadastros</h2><p>Novas contas por mês de cadastro.</p></div></div><div class="card__body">' +
            (months.length ? '<div class="columns">' + months.map(([m, v]) => '<div class="column" role="img" aria-label="' + E(U.month(m)) + ': ' + v + '"><span class="column__value">' + v + '</span><span class="column__bar" style="height:' + (v / maxMonth * 100) + '%"></span><span class="column__label">' + E(U.month(m)) + '</span></div>').join('') + '</div>' : U.empty('Sem cadastros neste período')) + '</div></section>' +
          '<section class="card"><div class="card__head"><div><h2>Operações por módulo</h2><p>Falhas aparecem em vermelho.</p></div></div><div class="card__body">' +
            (moduleRows.length ? '<div class="bar-list">' + moduleRows.map(([name, m]) => '<div class="bar-row"><span class="bar-row__label">' + E(name) + '</span><span class="bar-row__value">' + (m.ok + m.fail) + (m.fail ? ' <span class="muted">· ' + U.plural(m.fail, 'falha', 'falhas') + '</span>' : '') + '</span><div class="bar-row__track" role="img" aria-label="' + E(name) + ': ' + m.ok + ' com sucesso, ' + m.fail + ' com falha"><span class="bar-row__fill" style="width:' + (m.ok / maxModule * 100) + '%"></span>' + (m.fail ? '<span class="bar-row__fill bar-row__fill--danger" style="width:' + (m.fail / maxModule * 100) + '%"></span>' : '') + '</div></div>').join('') + '</div>' : U.empty('Sem operações neste período')) + '</div></section>' +
          '<section class="card"><div class="card__head"><div><h2>Funcionários por especialidade</h2><p>Estado atual da equipe.</p></div></div><div class="card__body">' + U.bars(s.cargos, 'Nenhum funcionário cadastrado.') + '</div></section>' +
          '<section class="card"><div class="card__head"><div><h2>Clientes por situação</h2><p>Estado atual das contas de clientes.</p></div></div><div class="card__body">' +
            (s.clientes ? '<div class="stack" role="img" aria-label="' + s.clientes_ativos + ' ativos e ' + inactive + ' inativos">' + (s.clientes_ativos ? '<span class="tone-done" style="flex:' + s.clientes_ativos + '"></span>' : '') + (inactive ? '<span class="tone-waiting" style="flex:' + inactive + '"></span>' : '') + '</div><ul class="legend"><li><i class="tone-done"></i>Ativos<strong>' + s.clientes_ativos + '</strong></li><li><i class="tone-waiting"></i>Inativos<strong>' + inactive + '</strong></li></ul>' : U.empty('Nenhum cliente cadastrado')) + '</div></section>' +
        '</div>' +
        (s.sem_data ? '<p class="note">' + U.icon('info') + '<span>' + U.plural(s.sem_data, 'cadastro anterior', 'cadastros anteriores') + ' à auditoria não ' + (s.sem_data === 1 ? 'tem' : 'têm') + ' data conhecida e não ' + (s.sem_data === 1 ? 'entra' : 'entram') + ' na evolução mensal.</span></p>' : '') +
        '</div>';
    }
    const headers = ['Pedido', 'Cliente', 'Serviço', 'Profissional', 'Data', 'Valor', 'Situação'];
    function renderOrders() {
      const q = state.search.toLocaleLowerCase('pt-BR');
      state.selected = state.orders.filter(o => (!state.status || U.orderState(o) === state.status) && ['#' + o.id, o.cliente, o.servico, o.funcionario, o.local].some(v => String(v || '').toLocaleLowerCase('pt-BR').includes(q)));
      const pages = Math.max(1, Math.ceil(state.selected.length / 15)); state.page = Math.min(Math.max(1, state.page), pages);
      $('#order-list').innerHTML = U.table(ORDER_COLUMNS, state.selected.slice((state.page - 1) * 15, state.page * 15).map(orderRow), {empty: U.empty(state.orders.length ? 'Nenhum pedido corresponde aos filtros' : 'Nenhum pedido registrado', '', 'clipboard')});
      $('#order-count').textContent = U.plural(state.selected.length, 'pedido', 'pedidos');
      $('#order-pager-slot').innerHTML = U.pager('order-pager', state.page, pages);
      paginate('order-pager', page => { state.page = page; renderOrders(); });
      $('#order-export').disabled = !state.selected.length;
    }
    async function update() {
      [state.stats, state.orders] = await Promise.all([D.request('/api/admin/estatisticas' + state.query), D.orders()]);
      renderStats(); renderOrders();
    }
    const period = $('#period');
    period.onsubmit = async event => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(period)), params = new URLSearchParams();
      if (data.inicio && data.fim && data.inicio > data.fim) return U.toast('A data inicial deve ser anterior à final.', 'error');
      for (const key of ['inicio', 'fim']) if (data[key]) params.set(key, data[key]);
      state.query = params.size ? '?' + params : '';
      try { await update(); } catch (error) { U.toast(error.message, 'error'); }
    };
    $('#period-clear').onclick = () => { period.reset(); period.requestSubmit(); };
    $('#order-query').oninput = event => { state.search = event.target.value; state.page = 1; renderOrders(); };
    $('#pedidos select').onchange = event => { state.status = event.target.value; state.page = 1; renderOrders(); };
    $('#order-export').onclick = () => D.csv('dafix-pedidos.csv', [...headers, 'Local'], state.selected.map(o => ['#' + o.id, o.cliente, o.servico, o.funcionario || '', D.date(o.data), D.money(o.preco_unitario), U.ORDER_STATUS[U.orderState(o)][0], o.local]));
    $('#export-stats').onclick = () => {
      const s = state.stats; if (!s) return;
      D.csv('dafix-relatorio.csv', ['Indicador', 'Quantidade'], [['Total de pessoas', s.total], ['Clientes', s.clientes], ['Clientes ativos', s.clientes_ativos], ['Funcionários', s.funcionarios], ['Funcionários ativos', s.funcionarios_ativos], ['Administradores', s.administradores], ['Novos cadastros no período', s.novos],
        ...Object.entries(s.mensal).map(([m, v]) => ['Cadastros em ' + m, v]), ...Object.entries(s.cargos).map(([c, v]) => ['Especialidade: ' + c, v]), ...s.atividades.map(a => ['Operações · ' + U.moduleLabel(a.modulo) + ' · ' + a.resultado, a.total])]);
    };
    await update();
    if (location.hash === '#pedidos') $('#pedidos').scrollIntoView();
  }

  // ---------------------------------------------------------------
  // Pessoas
  // ---------------------------------------------------------------
  const TITLES = {'': 'Pessoas', cliente: 'Clientes', funcionario: 'Funcionários', admin: 'Administradores'};
  const endpoint = person => '/api/' + ({cliente: 'clientes', funcionario: 'funcionarios', admin: 'admins'})[person.perfil] + '/' + person.id;
  const digits = value => String(value || '').replace(/\D/g, '');
  const maskCpf = value => { const d = digits(value).slice(0, 11); return d.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1-$2'); };
  const maskPhone = value => { const d = digits(value).slice(0, 11); if (d.length < 3) return d; if (d.length < 7) return '(' + d.slice(0, 2) + ') ' + d.slice(2); return '(' + d.slice(0, 2) + ') ' + d.slice(2, d.length - 4) + '-' + d.slice(-4); };

  async function people(user) {
    const requested = new URLSearchParams(location.search).get('perfil') || '';
    const state = {users: [], filtered: [], page: 1, role: Object.hasOwn(TITLES, requested) ? requested : '', more: false};
    setTitle(TITLES[state.role]);
    root.innerHTML = intro('Cadastre, consulte e atualize as contas da plataforma. Contas com pedidos não são excluídas: desative-as para preservar o histórico.', '<button type="button" class="btn" id="people-export">' + U.icon('download') + 'Exportar CSV</button><button type="button" class="btn btn--primary" id="people-create">' + U.icon('plus') + 'Cadastrar pessoa</button>') +
      '<section class="card"><form id="people-filters">' +
        '<div class="toolbar"><label class="search"><span class="sr-only">Pesquisar por nome, e-mail, telefone ou CPF</span>' + U.icon('search') + '<input class="input" name="busca" type="search" placeholder="Pesquisar por nome, e-mail, telefone ou CPF"></label><div class="segmented" id="people-roles" role="group" aria-label="Filtrar por perfil"></div></div>' +
        '<div class="toolbar" style="padding-top:0">' + select('ativo', 'Situação', [['', 'Todas'], ['1', 'Ativas'], ['0', 'Inativas']]) + select('ordem', 'Ordenar por', [['nome', 'Nome (A–Z)'], ['recente', 'Mais recentes'], ['antigo', 'Mais antigas']]) + '<button type="button" class="btn btn--ghost" id="people-more" aria-expanded="false" aria-controls="people-extra">Mais filtros</button><span class="toolbar__spacer"></span><button type="button" class="btn btn--ghost" id="people-clear">Limpar filtros</button></div>' +
        '<div class="toolbar filters-more" id="people-extra" hidden>' + field('cargo', 'Especialidade', 'search', '', 'placeholder="Ex.: Eletricista"') + field('inicio', 'Cadastro de', 'date') + field('fim', 'Cadastro até', 'date') + '</div>' +
      '</form><div id="people-list">' + U.skeleton([220]) + '</div><div class="card__foot"><span id="people-count" role="status"></span><div id="people-pager-slot"></div></div></section>' + footer;
    const form = $('#people-filters');
    form.onsubmit = event => event.preventDefault();

    function render() {
      const f = Object.fromEntries(new FormData(form)), q = f.busca.trim().toLocaleLowerCase('pt-BR'), qDigits = digits(q);
      const counts = {'': state.users.length, cliente: 0, funcionario: 0, admin: 0};
      for (const u of state.users) counts[u.perfil]++;
      $('#people-roles').innerHTML = Object.entries(TITLES).map(([key, label]) => '<button type="button" data-role="' + key + '" aria-pressed="' + (state.role === key) + '">' + (key ? label : 'Todas') + ' <span class="count">' + counts[key] + '</span></button>').join('');
      state.filtered = state.users.filter(u => (!state.role || u.perfil === state.role) && (!f.ativo || String(u.ativo ?? 1) === f.ativo) &&
        (!f.cargo || (u.especialidade || '').toLocaleLowerCase('pt-BR').includes(f.cargo.trim().toLocaleLowerCase('pt-BR'))) &&
        (!f.inicio || (u.criado_em && u.criado_em.slice(0, 10) >= f.inicio)) && (!f.fim || (u.criado_em && u.criado_em.slice(0, 10) <= f.fim)) &&
        (!q || [u.nome, u.email].some(v => String(v || '').toLocaleLowerCase('pt-BR').includes(q)) || (qDigits && [u.telefone, u.cpf].some(v => digits(v).includes(qDigits)))))
        .sort((a, b) => f.ordem === 'nome' ? a.nome.localeCompare(b.nome, 'pt-BR') : f.ordem === 'antigo' ? String(a.criado_em || '').localeCompare(String(b.criado_em || '')) || a.id - b.id : String(b.criado_em || '').localeCompare(String(a.criado_em || '')) || b.id - a.id);
      const pages = Math.max(1, Math.ceil(state.filtered.length / 15)); state.page = Math.min(Math.max(1, state.page), pages);
      const slice = state.filtered.slice((state.page - 1) * 15, state.page * 15);
      $('#people-list').innerHTML = U.table(
        [{label: 'Pessoa', main: true}, {label: 'Telefone', cls: 'nowrap'}, {label: 'Perfil'}, {label: 'Especialidade'}, {label: 'Situação'}, {label: 'Cadastro', cls: 'nowrap'}, {label: 'Ações', cls: 'col-actions'}],
        slice.map((u, i) => [U.identity(u.nome, u.email, u.perfil === 'admin' && u.id === user.id ? '(você)' : ''), E(U.phone(u.telefone)), U.roleBadge(u.perfil), u.especialidade ? E(u.especialidade) : '<span class="muted">—</span>', U.statusBadge(u.ativo), E(U.day(u.criado_em)), '<button type="button" class="btn btn--sm" data-person="' + i + '">' + U.icon('eye') + 'Abrir</button>']),
        {empty: U.empty(state.users.length ? 'Nenhuma conta corresponde aos filtros' : 'Nenhuma conta cadastrada', state.users.length ? 'Ajuste a pesquisa ou limpe os filtros.' : '', 'users')});
      $('#people-list').querySelectorAll('[data-person]').forEach(button => { button.onclick = () => openProfile(slice[Number(button.dataset.person)], button); });
      $('#people-count').textContent = U.plural(state.filtered.length, 'conta', 'contas');
      $('#people-pager-slot').innerHTML = U.pager('people-pager', state.page, pages);
      paginate('people-pager', page => { state.page = page; render(); });
      $('#people-export').disabled = !state.filtered.length;
    }
    async function reload() {
      const [clients, staff, admins] = await Promise.all([D.list('/api/clientes'), D.list('/api/funcionarios'), D.list('/api/admins')]);
      state.users = [...clients.map(u => ({...u, perfil: 'cliente'})), ...staff.map(u => ({...u, perfil: 'funcionario'})), ...admins.map(u => ({...u, perfil: 'admin'}))];
      render();
    }
    form.oninput = () => { state.page = 1; render(); };
    $('#people-roles').onclick = event => {
      const button = event.target.closest('[data-role]'); if (!button) return;
      state.role = button.dataset.role; state.page = 1; setTitle(TITLES[state.role]);
      history.replaceState(null, '', state.role ? '?perfil=' + state.role : location.pathname);
      document.querySelectorAll('.nav__item[href]').forEach(link => { const url = new URL(link.href), on = url.pathname === location.pathname && url.search === location.search; link.classList.toggle('active', on); if (on) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); });
      render();
    };
    $('#people-more').onclick = event => { state.more = !state.more; $('#people-extra').hidden = !state.more; event.currentTarget.setAttribute('aria-expanded', String(state.more)); event.currentTarget.textContent = state.more ? 'Menos filtros' : 'Mais filtros'; };
    $('#people-clear').onclick = () => { form.reset(); state.page = 1; render(); };
    $('#people-export').onclick = () => D.csv('dafix-pessoas.csv', ['Nome', 'E-mail', 'Telefone', 'Perfil', 'Situação', 'Especialidade', 'Cadastro'], state.filtered.map(u => [u.nome, u.email, U.phone(u.telefone), U.ROLES[u.perfil][0], u.ativo === 0 ? 'Inativo' : 'Ativo', u.especialidade || '', u.criado_em ? U.stamp(u.criado_em) : '']));
    $('#people-create').onclick = () => openCreate();

    async function openProfile(person, trigger) {
      let data;
      trigger.disabled = true;
      try { data = await D.request(endpoint(person)); } catch (error) { return U.toast(error.message, 'error'); } finally { trigger.disabled = false; }
      const u = data.pessoa, staff = person.perfil === 'funcionario', admin = person.perfil === 'admin', self = admin && u.id === user.id, granted = staff ? permissionsOf(u) : [];
      const tabs = [['dados', 'Dados da conta'], ...(admin ? [] : [['pedidos', 'Pedidos (' + data.pedidos.length + ')']]), ['atividades', 'Atividades (' + data.historico.length + ')']];
      const dialog = U.openDialog({
        title: u.nome, size: 'lg',
        tabs: '<div class="tabs" role="tablist">' + tabs.map(([key, label], i) => '<button type="button" role="tab" data-tab="' + key + '" aria-selected="' + (i === 0) + '">' + E(label) + '</button>').join('') + '</div>',
        body:
          '<div data-panel="dados"><form id="person-form" class="form">' +
            '<div class="identity"><span class="avatar avatar--lg" aria-hidden="true">' + E(U.initials(u.nome)) + '</span><div class="identity__text"><div class="badge-row">' + U.roleBadge(person.perfil) + U.statusBadge(u.ativo) + '</div><span>CPF ' + E(U.cpf(u.cpf)) + ' · Cadastro: ' + E(U.stamp(u.criado_em)) + ' · Última alteração: ' + E(U.stamp(u.atualizado_em)) + '</span></div></div>' +
            '<div class="form-grid">' + field('nome', 'Nome completo', 'text', u.nome, 'required minlength="3" maxlength="150"', 'span-2') + field('email', 'E-mail', 'email', u.email, 'required maxlength="254"') + field('telefone', 'Telefone', 'tel', U.phone(u.telefone), 'required maxlength="16" inputmode="tel"') +
            (staff ? field('especialidade', 'Cargo / especialidade', 'text', u.especialidade, 'required minlength="3" maxlength="150"') + field('admissao', 'Admissão <small>(opcional)</small>', 'date', u.admissao || '') : '') +
            '<label class="field' + (staff ? ' span-2' : '') + '"><span>Situação da conta</span><select name="ativo"' + (self ? ' disabled' : '') + '><option value="1"' + (u.ativo ? ' selected' : '') + '>Ativa</option><option value="0"' + (u.ativo ? '' : ' selected') + '>Inativa — bloqueia o acesso</option></select>' + (self ? '<span class="field__hint">Você não pode desativar a própria conta.</span>' : '') + '</label></div>' +
            (staff ? '<fieldset class="perm-options"><legend>Permissões do funcionário</legend>' + PERMISSIONS.map(([key, label, hint]) => '<label class="perm-option"><span>' + label + '<small>' + hint + '</small></span><span class="switch"><input type="checkbox" name="permissoes" value="' + key + '"' + (granted.includes(key) ? ' checked' : '') + '><span class="switch__track"></span></span></label>').join('') + '</fieldset>' : '') +
            '<p class="form-message" id="person-message" role="alert"></p><div id="person-confirm"></div></form></div>' +
          (admin ? '' : '<div data-panel="pedidos" hidden>' + U.table([{label: 'Pedido', main: true}, {label: 'Serviço'}, {label: 'Data', cls: 'nowrap'}, {label: 'Valor', cls: 'col-num'}, {label: 'Situação'}], data.pedidos.map(o => ['<strong class="num">#' + o.id + '</strong>', E(o.nome_servico), E(D.date(o.data)), E(D.money(o.preco_unitario)), U.orderBadge(o)]), {empty: U.empty('Nenhum pedido vinculado', '', 'clipboard')}) + '</div>') +
          '<div data-panel="atividades" hidden>' + U.activity(data.historico, {emptyText: 'As operações desta conta aparecem aqui.'}) + '</div>',
        foot: (self ? '' : '<button type="button" class="btn btn--danger-ghost push-left" id="person-delete">' + U.icon('trash') + 'Excluir conta</button>') + '<button type="button" class="btn" data-dialog-close>Cancelar</button><button type="submit" form="person-form" class="btn btn--primary" id="person-save">Salvar alterações</button>',
      });
      dialog.querySelectorAll('[data-tab]').forEach(tab => { tab.onclick = () => { dialog.querySelectorAll('[data-tab]').forEach(t => t.setAttribute('aria-selected', String(t === tab))); dialog.querySelectorAll('[data-panel]').forEach(p => { p.hidden = p.dataset.panel !== tab.dataset.tab; }); }; });
      const edit = $('#person-form'), message = $('#person-message'), save = $('#person-save');
      edit.elements.telefone.oninput = event => { event.target.value = maskPhone(event.target.value); };
      let busy = false;
      const lock = value => { busy = value; U.lockDialog(value); dialog.querySelectorAll('.dialog__foot button').forEach(b => { b.disabled = value; }); };
      edit.onsubmit = async event => {
        event.preventDefault(); if (busy) return;
        const f = new FormData(edit), changes = {};
        for (const key of ['nome', 'email', ...(staff ? ['especialidade'] : [])]) if (f.get(key).trim() !== u[key]) changes[key] = f.get(key).trim();
        if (digits(f.get('telefone')) !== digits(u.telefone)) changes.telefone = f.get('telefone');
        if (!self && Number(f.get('ativo')) !== u.ativo) changes.ativo = Number(f.get('ativo'));
        if (staff) {
          if ((f.get('admissao') || null) !== (u.admissao || null)) changes.admissao = f.get('admissao') || null;
          const chosen = f.getAll('permissoes');
          if (chosen.length !== granted.length || chosen.some(p => !granted.includes(p))) changes.permissoes = chosen;
        }
        if (!Object.keys(changes).length) { message.textContent = 'Nenhuma alteração para salvar.'; return; }
        lock(true); message.textContent = '';
        try { await D.request(endpoint(person), send('PATCH', changes)); lock(false); U.closeDialog(); U.toast('Alterações salvas.'); await reload(); }
        catch (error) { lock(false); message.textContent = error.message; }
      };
      const remove = $('#person-delete');
      if (remove) remove.onclick = () => {
        const box = $('#person-confirm');
        dialog.querySelector('[data-tab="dados"]').click();
        box.innerHTML = '<div class="confirm-box" role="alertdialog" aria-label="Confirmar exclusão"><span>Excluir definitivamente a conta de <strong>' + E(u.nome) + '</strong>? Esta ação não pode ser desfeita.</span><div><button type="button" class="btn btn--sm btn--danger" id="person-delete-yes">Sim, excluir</button><button type="button" class="btn btn--sm" id="person-delete-no">Manter conta</button></div></div>';
        box.scrollIntoView({block: 'nearest'});
        $('#person-delete-no').onclick = () => { box.innerHTML = ''; };
        $('#person-delete-yes').onclick = async () => {
          if (busy) return; lock(true); $('#person-delete-yes').disabled = true;
          try { await D.request(endpoint(person), send('DELETE')); lock(false); U.closeDialog(); U.toast('Conta excluída.'); await reload(); }
          catch (error) { lock(false); box.innerHTML = ''; message.textContent = error.message; }
        };
      };
    }

    function openCreate() {
      const initial = state.role || 'cliente';
      const dialog = U.openDialog({
        title: 'Cadastrar pessoa',
        body: '<form id="create-form" class="form"><fieldset class="field"><span>Perfil da conta</span><div class="segmented">' + Object.entries(U.ROLES).map(([key, [label]]) => '<label><input class="sr-only" type="radio" name="perfil" value="' + key + '"' + (key === initial ? ' checked' : '') + '>' + label + '</label>').join('') + '</div></fieldset>' +
          '<div class="form-grid">' + field('nome', 'Nome completo', 'text', '', 'required minlength="3" maxlength="150" autocomplete="off"', 'span-2') + field('email', 'E-mail', 'email', '', 'required maxlength="254" autocomplete="off"') + field('cpf', 'CPF', 'text', '', 'required maxlength="14" inputmode="numeric" placeholder="000.000.000-00" autocomplete="off"') +
          field('telefone', 'Telefone', 'tel', '', 'required maxlength="16" inputmode="tel" placeholder="(00) 00000-0000" autocomplete="off"') + '<label class="field" id="create-specialty"><span>Especialidade</span><input name="especialidade" maxlength="150" placeholder="Ex.: Eletricista"></label>' +
          '<label class="field span-2"><span>Senha inicial</span><input name="senha" type="password" required minlength="8" maxlength="128" autocomplete="new-password"><span class="field__hint">De 8 a 128 caracteres. Informe-a à pessoa por um canal seguro.</span></label></div>' +
          '<p class="form-message" id="create-message" role="alert"></p></form>',
        foot: '<button type="button" class="btn" data-dialog-close>Cancelar</button><button type="submit" form="create-form" class="btn btn--primary">Cadastrar</button>',
      });
      const create = $('#create-form'), message = $('#create-message');
      const syncRole = () => { const staff = create.elements.perfil.value === 'funcionario', specialty = $('#create-specialty'); specialty.hidden = !staff; specialty.querySelector('input').disabled = !staff; specialty.querySelector('input').required = staff; };
      create.querySelectorAll('[name="perfil"]').forEach(radio => { radio.onchange = syncRole; }); syncRole();
      create.elements.cpf.oninput = event => { event.target.value = maskCpf(event.target.value); };
      create.elements.telefone.oninput = event => { event.target.value = maskPhone(event.target.value); };
      let busy = false;
      create.onsubmit = async event => {
        event.preventDefault(); if (busy) return;
        const data = Object.fromEntries(new FormData(create)), path = ({cliente: 'clientes', funcionario: 'funcionarios', admin: 'admins'})[data.perfil], label = U.ROLES[data.perfil][0];
        delete data.perfil;
        busy = true; U.lockDialog(true); message.textContent = ''; dialog.querySelectorAll('.dialog__foot button').forEach(b => { b.disabled = true; });
        try { await D.request('/api/' + path, send('POST', data)); U.lockDialog(false); U.closeDialog(); U.toast(label + ' cadastrado: ' + data.nome.trim() + '.'); await reload(); }
        catch (error) { U.lockDialog(false); message.textContent = error.message; dialog.querySelectorAll('.dialog__foot button').forEach(b => { b.disabled = false; }); }
        finally { busy = false; }
      };
      create.elements.nome.focus();
    }
    await reload();
  }

  // ---------------------------------------------------------------
  // Permissões: uma linha por funcionário, alteração imediata
  // ---------------------------------------------------------------
  async function permissions() {
    let staff = [], query = '';
    root.innerHTML = intro('Defina o que cada funcionário pode fazer. As mudanças valem a partir da próxima ação da pessoa e nenhuma permissão dá acesso à administração.', refreshButton) +
      '<section class="card"><div class="toolbar"><label class="search"><span class="sr-only">Pesquisar funcionário</span>' + U.icon('search') + '<input class="input" id="perm-query" type="search" placeholder="Pesquisar por nome, e-mail ou especialidade"></label></div><div id="perm-list"></div><div class="card__foot"><span id="perm-count" role="status"></span><a class="link" href="usuarios.html?perfil=funcionario">Gerenciar funcionários</a></div></section>' + footer;
    function render() {
      const q = query.trim().toLocaleLowerCase('pt-BR'), rows = staff.filter(p => [p.nome, p.email, p.especialidade].some(v => String(v || '').toLocaleLowerCase('pt-BR').includes(q)));
      $('#perm-list').innerHTML = U.table(
        [{label: 'Funcionário', main: true}, ...PERMISSIONS.map(([, label, hint]) => ({label, cls: 'col-center', html: E(label) + '<small>' + E(hint) + '</small>'}))],
        rows.map(p => { const granted = permissionsOf(p); return [U.identity(p.nome, p.especialidade + (p.ativo === 0 ? ' · conta inativa' : '')), ...PERMISSIONS.map(([key, label]) => '<label class="switch"><input type="checkbox" data-staff="' + p.id + '" data-permission="' + key + '"' + (granted.includes(key) ? ' checked' : '') + ' aria-label="' + E(label + ' — ' + p.nome) + '"><span class="switch__track"></span></label>')]; }),
        {cls: 'perm-table', empty: U.empty(staff.length ? 'Nenhum funcionário corresponde à pesquisa' : 'Nenhum funcionário cadastrado', staff.length ? '' : 'Cadastre funcionários em Pessoas para definir permissões.', 'shield')});
      $('#perm-count').textContent = U.plural(rows.length, 'funcionário', 'funcionários');
    }
    $('#perm-query').oninput = event => { query = event.target.value; render(); };
    $('#perm-list').onchange = async event => {
      const input = event.target.closest('[data-permission]'); if (!input) return;
      const person = staff.find(p => p.id === Number(input.dataset.staff)), row = input.closest('tr').querySelectorAll('[data-permission]');
      const next = [...row].filter(i => i.checked).map(i => i.dataset.permission);
      row.forEach(i => { i.disabled = true; });
      try { await D.request('/api/funcionarios/' + person.id, send('PATCH', {permissoes: next})); person.permissoes = JSON.stringify(next); U.toast('Permissões de ' + person.nome + ' atualizadas.'); }
      catch (error) { input.checked = !input.checked; U.toast(error.message, 'error'); }
      finally { row.forEach(i => { i.disabled = false; }); }
    };
    staff = (await D.list('/api/funcionarios')).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    render();
  }

  // ---------------------------------------------------------------
  // Logs do sistema e atividades (mesmos registros, leituras diferentes)
  // ---------------------------------------------------------------
  async function logs() {
    const timeline = view === 'atividades', state = {page: 1, rows: [], total: 0};
    const events = ['login', 'logout', 'acesso', 'cadastro', 'alteracao', 'exclusao', 'permissoes.alteradas', 'pedido.aceito', 'pedido.excluido', 'servico.cadastrado', 'servico.alterado', 'servico.excluido', 'servico.feito_pelo_funcionario', 'servico.avaliado_e_confirmado', 'pagamento.metodo_cadastrado', 'pagamento.metodo_removido', 'pagamento.simulado_sem_cobranca', 'erro_interno'];
    const modules = ['login', 'logout', 'clientes', 'funcionarios', 'admins', 'servicos', 'solicitacoes', 'os', 'pagamentos', 'administracao', 'sistema'];
    root.innerHTML = intro(timeline ? 'Operações recentes agrupadas por dia. As aberturas de páginas do painel ficam em <a class="link" href="logs.html">Logs do sistema</a>.' : 'Registro imutável das operações da API e dos acessos ao painel. Senhas, tokens e corpos de requisição não são gravados.', (timeline ? '' : '<button type="button" class="btn" id="log-export">' + U.icon('download') + 'Exportar página</button>') + refreshButton) +
      '<section class="card"><form class="toolbar toolbar--grid" id="log-filters">' + field('usuario', 'Usuário', 'search', '', 'placeholder="Nome de quem executou" maxlength="150"') +
        select('evento', 'Evento', [['', 'Todos'], ...events.map(e => [e, U.eventLabel(e)])]) + (timeline ? '' : select('modulo', 'Módulo', [['', 'Todos'], ...modules.map(m => [m, U.moduleLabel(m) + (m === 'logout' ? ' (saída)' : '')])])) +
        select('resultado', 'Resultado', [['', 'Todos'], ['sucesso', 'Sucesso'], ['falha', 'Falha']]) + field('inicio', 'De', 'date') + field('fim', 'Até', 'date') +
        '<div class="toolbar__actions"><button class="btn btn--primary">Filtrar</button><button type="button" class="btn btn--ghost" id="log-clear">Limpar filtros</button></div></form>' +
      '<div id="log-list">' + U.skeleton([260]) + '</div><div class="card__foot"><span id="log-count" role="status"></span><div id="log-pager-slot"></div></div></section>' + footer;
    const form = $('#log-filters');
    async function update() {
      const query = new URLSearchParams();
      for (const [key, value] of new FormData(form)) if (value) query.set(key, value);
      if (timeline && !query.get('evento')) query.set('sem_acesso', '1');
      query.set('pagina', state.page);
      const data = await D.request('/api/admin/logs?' + query);
      state.rows = data.registros; state.total = data.total;
      const pages = Math.max(1, Math.ceil(data.total / 25));
      $('#log-list').innerHTML = timeline
        ? (state.rows.length ? '<div class="table-wrap">' + U.activity(state.rows, {grouped: true}) + '</div>' : U.empty('Nenhuma atividade encontrada', 'Ajuste os filtros para ampliar a consulta.', 'list'))
        : U.table([{label: 'Data e hora', cls: 'nowrap'}, {label: 'Usuário', main: true}, {label: 'Evento'}, {label: 'Módulo'}, {label: 'Resultado'}, {label: 'Ações', cls: 'col-actions'}],
          state.rows.map((r, i) => [E(U.stamp(r.criado_em)), '<strong>' + E(r.ator_nome || 'Visitante') + '</strong>' + (r.ator_tipo ? ' <span class="muted">· ' + E((U.ROLES[r.ator_tipo] || [r.ator_tipo])[0]) + '</span>' : ''), E(U.eventLabel(r.acao)), E(U.moduleLabel(r.modulo)), U.resultBadge(r.resultado), '<button type="button" class="btn btn--sm" data-log="' + i + '">Detalhes</button>']),
          {empty: U.empty('Nenhum evento encontrado', 'Ajuste os filtros para ampliar a consulta.', 'list')});
      $('#log-count').textContent = U.plural(data.total, 'evento', 'eventos');
      $('#log-pager-slot').innerHTML = U.pager('log-pager', state.page, pages);
      paginate('log-pager', page => { state.page = page; guarded(); });
      const exportButton = $('#log-export'); if (exportButton) exportButton.disabled = !state.rows.length;
    }
    const guarded = async () => { try { await update(); } catch (error) { U.toast(error.message, 'error'); } };
    form.onsubmit = event => {
      event.preventDefault();
      const f = Object.fromEntries(new FormData(form));
      if (f.inicio && f.fim && f.inicio > f.fim) return U.toast('A data inicial deve ser anterior à final.', 'error');
      state.page = 1; guarded();
    };
    $('#log-clear').onclick = () => { form.reset(); state.page = 1; guarded(); };
    $('#log-list').onclick = event => {
      const button = event.target.closest('[data-log]'); if (!button) return;
      const r = state.rows[Number(button.dataset.log)];
      U.openDialog({title: 'Registro #' + r.id, body: '<dl class="def-list">' + [['Data e hora', E(U.stamp(r.criado_em)) + ' <span class="muted">(horário local)</span>'], ['Usuário', E(r.ator_nome || 'Visitante')], ['Perfil', E(r.ator_tipo ? (U.ROLES[r.ator_tipo] || [r.ator_tipo])[0] : 'Sem sessão')], ['Evento', E(U.eventLabel(r.acao)) + ' <span class="muted">(' + E(r.acao) + ')</span>'], ['Módulo', E(U.moduleLabel(r.modulo))], ['Resultado', U.resultBadge(r.resultado)], ['Requisição', '<code>' + E(r.descricao) + '</code>'], ['IP da conexão', E(r.ip || 'Não registrado')]].map(([k, v]) => '<div><dt>' + k + '</dt><dd>' + v + '</dd></div>').join('') + '</dl>', foot: '<button type="button" class="btn" data-dialog-close>Fechar</button>'});
    };
    const exportButton = $('#log-export');
    if (exportButton) exportButton.onclick = () => D.csv('dafix-logs-pagina-' + state.page + '.csv', ['ID', 'Data (UTC)', 'Usuário', 'Perfil', 'Evento', 'Módulo', 'Resultado', 'Requisição', 'IP'], state.rows.map(r => [r.id, r.criado_em, r.ator_nome, r.ator_tipo, r.acao, r.modulo, r.resultado, r.descricao, r.ip]));
    await update();
  }

  // ---------------------------------------------------------------
  // Configurações
  // ---------------------------------------------------------------
  async function settings(user) {
    const theme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    root.innerHTML = intro('Dados da sua conta e preferências deste navegador.') + '<div class="settings-grid">' +
      '<section class="card"><div class="card__head"><div><h2>Conta administrativa</h2><p>Sessão validada pelo servidor.</p></div><a class="btn btn--sm" href="usuarios.html?perfil=admin">' + U.icon('edit') + 'Editar em Pessoas</a></div><div class="card__body"><div class="identity" style="margin-bottom:18px"><span class="avatar avatar--lg avatar--brand" aria-hidden="true">' + E(U.initials(user.nome)) + '</span><div class="identity__text"><strong>' + E(user.nome) + '</strong><span>Administrador</span></div></div>' +
        '<dl class="def-list"><div><dt>E-mail</dt><dd>' + E(user.email) + '</dd></div><div><dt>Telefone</dt><dd>' + E(U.phone(user.telefone)) + '</dd></div><div><dt>Perfil</dt><dd>Administrador · acesso integral</dd></div></dl></div></section>' +
      '<section class="card"><div class="card__head"><div><h2>Aparência</h2><p>A preferência fica salva neste navegador.</p></div></div><div class="card__body"><fieldset><legend class="sr-only">Tema</legend><div class="segmented" id="theme-choice">' + [['light', 'Claro'], ['dark', 'Escuro']].map(([key, label]) => '<label><input class="sr-only" type="radio" name="tema" value="' + key + '"' + (key === theme ? ' checked' : '') + '>' + label + '</label>').join('') + '</div></fieldset></div></section>' +
      '<section class="card"><div class="card__head"><div><h2>Sessão e segurança</h2><p>Como o acesso administrativo é protegido.</p></div></div><div class="card__body"><ul class="check-list">' + ['As sessões expiram em 12 horas e são encerradas ao sair.', 'Desativar uma conta bloqueia imediatamente as sessões dela.', 'Clientes e funcionários não acessam o painel nem as APIs administrativas.', 'As operações ficam registradas na auditoria, sem senhas ou tokens.'].map(text => '<li>' + U.icon('check') + '<span>' + text + '</span></li>').join('') + '</ul></div></section>' +
      '<section class="card"><div class="card__head"><div><h2>Atalhos</h2><p>Áreas relacionadas à gestão de acesso.</p></div></div><div class="card__body"><div class="page-actions"><a class="btn" href="permissoes.html">' + U.icon('shield') + 'Permissões</a><a class="btn" href="logs.html">' + U.icon('list') + 'Logs do sistema</a><a class="btn" href="/suporte/index.html">' + U.icon('info') + 'Central de ajuda</a></div></div></section>' +
      '</div>' + footer;
    $('#theme-choice').onchange = event => U.applyTheme(event.target.value, true);
    document.addEventListener('dafix:theme', event => { const radio = $('#theme-choice input[value="' + event.detail + '"]'); if (radio) radio.checked = true; });
  }

  // ---------------------------------------------------------------
  // Carregamento com estado de erro e nova tentativa
  // ---------------------------------------------------------------
  const views = {dashboard, relatorios: reports, usuarios: people, permissoes: permissions, logs, atividades: logs, configuracoes: settings};
  let pending = false;
  async function load() {
    if (pending) return; pending = true; root.setAttribute('aria-busy', 'true');
    try { await views[view](await U.ready); }
    catch (error) {
      if (!root.querySelector('.card, .hero')) { root.innerHTML = '<section class="card">' + U.failure(error) + '<div class="card__foot"><span></span><button type="button" class="btn" data-refresh>' + U.icon('refresh') + 'Tentar novamente</button></div></section>'; }
      else U.toast(error.message, 'error');
    }
    finally { pending = false; root.setAttribute('aria-busy', 'false'); }
  }
  root.addEventListener('click', event => { if (event.target.closest('[data-refresh]')) load(); });
  load();
})();
