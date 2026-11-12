/* Catálogo de serviços: cadastro, edição e exclusão pela administração. */
(() => {
  'use strict';
  const D = window.DafixData, U = window.DafixAdmin, E = D.escape;
  const root = document.getElementById('view'), $ = selector => document.querySelector(selector);
  const send = (method, body) => ({method, headers: {'Content-Type': 'application/json'}, ...(body === undefined ? {} : {body: JSON.stringify(body)})});
  const state = {services: [], usage: new Map(), rows: [], query: '', editing: null, saving: false};

  function renderSummary() {
    const prices = state.services.map(s => Number(s.preco_base) || 0), linked = [...state.usage.values()].reduce((a, b) => a + b, 0);
    const top = state.services.filter(s => state.usage.get(s.id)).sort((a, b) => state.usage.get(b.id) - state.usage.get(a.id))[0];
    $('#catalog-summary').innerHTML =
      U.kpi('Serviços no catálogo', state.services.length, 'disponíveis para solicitação', 'clipboard') +
      U.kpi('Preço base médio', prices.length ? D.money(prices.reduce((a, b) => a + b, 0) / prices.length) : '—', prices.length ? 'de ' + D.money(Math.min(...prices)) + ' a ' + D.money(Math.max(...prices)) : 'cadastre o primeiro serviço', 'wallet', 'warning', true) +
      U.kpi('Pedidos registrados', linked, 'somando todos os serviços', 'list', 'info') +
      U.kpi('Mais solicitado', top ? top.nome_servico : '—', top ? U.plural(state.usage.get(top.id), 'pedido', 'pedidos') : 'ainda sem pedidos', 'tool', 'accent', true);
  }
  function renderList() {
    const q = state.query.trim().toLocaleLowerCase('pt-BR');
    state.rows = state.services.filter(s => [s.nome_servico, s.descricao].some(v => String(v || '').toLocaleLowerCase('pt-BR').includes(q)));
    $('#catalog-list').innerHTML = U.table(
      [{label: 'Serviço', main: true}, {label: 'Preço base', cls: 'col-num'}, {label: 'Pedidos', cls: 'col-num'}, {label: 'Ações', cls: 'col-actions'}],
      state.rows.map(s => ['<div class="identity__text cell-clip"><strong>' + E(s.nome_servico) + '</strong><span>' + E(s.descricao || 'Sem descrição') + '</span></div>', E(D.money(s.preco_base)), String(state.usage.get(s.id) || 0),
        '<span class="row-actions"><button type="button" class="btn btn--sm" data-edit="' + s.id + '">' + U.icon('edit') + 'Editar</button><button type="button" class="btn btn--sm btn--danger-ghost" data-remove="' + s.id + '" aria-label="Excluir ' + E(s.nome_servico) + '">' + U.icon('trash') + '</button></span>']),
      {empty: U.empty(state.services.length ? 'Nenhum serviço corresponde à busca' : 'Nenhum serviço cadastrado', state.services.length ? '' : 'Use o formulário para publicar o primeiro serviço.', 'clipboard')});
    $('#catalog-count').textContent = U.plural(state.rows.length, 'serviço', 'serviços');
    $('#catalog-export').disabled = !state.rows.length;
  }
  function setEditing(service) {
    const form = $('#catalog-form');
    state.editing = service; form.reset(); $('#catalog-message').textContent = '';
    $('#editor-title').textContent = service ? 'Editar serviço' : 'Novo serviço';
    $('#editor-hint').textContent = service ? 'Pedidos já registrados mantêm o valor da época da solicitação.' : 'Após salvar, o serviço aparece na área do cliente.';
    $('#catalog-submit').textContent = service ? 'Salvar alterações' : 'Cadastrar serviço';
    $('#catalog-cancel').hidden = !service;
    if (service) { form.elements.nome.value = service.nome_servico; form.elements.descricao.value = service.descricao || ''; form.elements.preco.value = Number(service.preco_base).toFixed(2); form.elements.nome.focus(); }
  }
  async function reload() {
    const [services, orders] = await Promise.all([D.list('/api/servicos'), D.orders()]);
    state.services = services; state.usage = new Map();
    for (const o of orders) state.usage.set(o.id_servico, (state.usage.get(o.id_servico) || 0) + 1);
    renderSummary(); renderList();
  }

  function build() {
    root.innerHTML = '<div class="page-intro"><p>Organize os serviços que os clientes podem solicitar. O preço base é copiado para o pedido no momento da solicitação.</p><div class="page-actions"><button type="button" class="btn" data-refresh>' + U.icon('refresh') + 'Atualizar</button></div></div>' +
      '<div class="kpi-grid" id="catalog-summary"></div>' +
      '<div class="grid-editor"><section class="card"><div class="card__head"><div><h2>Serviços publicados</h2><p id="catalog-count" role="status"></p></div><button type="button" class="btn btn--sm" id="catalog-export">' + U.icon('download') + 'Exportar CSV</button></div>' +
        '<div class="toolbar"><label class="search"><span class="sr-only">Buscar serviços</span>' + U.icon('search') + '<input class="input" id="catalog-query" type="search" placeholder="Buscar pelo nome ou descrição"></label></div><div id="catalog-list"></div></section>' +
      '<aside class="card" aria-labelledby="editor-title"><div class="card__head"><div><h2 id="editor-title">Novo serviço</h2><p id="editor-hint"></p></div></div><div class="card__body"><form id="catalog-form" class="form">' +
        '<label class="field"><span>Nome do serviço</span><input name="nome" maxlength="150" required placeholder="Ex.: Manutenção elétrica"></label>' +
        '<label class="field"><span>Descrição <small>(opcional)</small></span><textarea name="descricao" rows="4" maxlength="1000" placeholder="Descreva o atendimento oferecido"></textarea></label>' +
        '<label class="field"><span>Preço base (R$)</span><input name="preco" type="number" min="0" max="10000000" step="0.01" required placeholder="0,00" inputmode="decimal"></label>' +
        '<p class="form-message" id="catalog-message" role="alert"></p>' +
        '<button class="btn btn--primary btn--block" type="submit" id="catalog-submit">Cadastrar serviço</button><button class="btn btn--block" type="button" id="catalog-cancel" hidden>Cancelar edição</button></form></div></aside></div>' +
      '<footer class="page-footer"><span>DaFix · Administração</span><a href="/suporte/index.html">Central de ajuda</a></footer>';
    setEditing(null);
    const form = $('#catalog-form'), message = $('#catalog-message'), submit = $('#catalog-submit');
    $('#catalog-query').oninput = event => { state.query = event.target.value; renderList(); };
    $('#catalog-cancel').onclick = () => setEditing(null);
    $('#catalog-export').onclick = () => D.csv('dafix-servicos.csv', ['Serviço', 'Descrição', 'Preço base', 'Pedidos'], state.rows.map(s => [s.nome_servico, s.descricao || '', D.money(s.preco_base), state.usage.get(s.id) || 0]));
    form.onsubmit = async event => {
      event.preventDefault(); if (state.saving) return;
      const body = {nome_servico: form.elements.nome.value.trim(), descricao: form.elements.descricao.value.trim(), preco_base: Number(form.elements.preco.value)};
      if (!body.nome_servico) { message.textContent = 'Informe o nome do serviço.'; return; }
      state.saving = true; submit.disabled = true; message.textContent = '';
      const editing = state.editing;
      try {
        await D.request('/api/servicos' + (editing ? '/' + editing.id : ''), send(editing ? 'PATCH' : 'POST', body));
        setEditing(null); U.toast(editing ? 'Serviço atualizado.' : 'Serviço cadastrado. Já está disponível para solicitação.');
        await reload();
      } catch (error) { message.textContent = error.message; }
      finally { state.saving = false; submit.disabled = false; }
    };
    $('#catalog-list').onclick = event => {
      const edit = event.target.closest('[data-edit]'), remove = event.target.closest('[data-remove]');
      if (edit) { setEditing(state.services.find(s => s.id === Number(edit.dataset.edit))); $('#editor-title').scrollIntoView({block: 'nearest', behavior: 'smooth'}); }
      if (remove) confirmRemove(state.services.find(s => s.id === Number(remove.dataset.remove)));
    };
  }
  function confirmRemove(service) {
    const used = state.usage.get(service.id) || 0;
    if (used) {
      return U.openDialog({title: 'Serviço com pedidos', size: 'sm', body: '<p class="muted"><strong>' + E(service.nome_servico) + '</strong> tem ' + U.plural(used, 'pedido vinculado', 'pedidos vinculados') + ' e não pode ser excluído, para preservar o histórico. Você ainda pode editar nome, descrição e preço.</p>', foot: '<button type="button" class="btn" data-dialog-close>Entendi</button>'});
    }
    U.openDialog({title: 'Excluir serviço?', size: 'sm', body: '<p class="muted"><strong>' + E(service.nome_servico) + '</strong> deixará de aparecer no catálogo dos clientes. Esta ação não pode ser desfeita.</p><p class="form-message" id="remove-message" role="alert"></p>', foot: '<button type="button" class="btn" data-dialog-close>Cancelar</button><button type="button" class="btn btn--danger" id="remove-confirm">Excluir serviço</button>'});
    const confirm = $('#remove-confirm');
    confirm.onclick = async () => {
      confirm.disabled = true; U.lockDialog(true);
      try {
        await D.request('/api/servicos/' + service.id, send('DELETE'));
        U.lockDialog(false); U.closeDialog(); if (state.editing?.id === service.id) setEditing(null);
        U.toast('Serviço excluído.'); await reload();
      } catch (error) { U.lockDialog(false); $('#remove-message').textContent = error.message; confirm.disabled = false; }
    };
  }

  let pending = false;
  async function load() {
    if (pending) return; pending = true; root.setAttribute('aria-busy', 'true');
    try { await U.ready; if (!$('#catalog-form')) build(); await reload(); }
    catch (error) {
      if (!$('#catalog-form')) root.innerHTML = '<section class="card">' + U.failure(error) + '<div class="card__foot"><span></span><button type="button" class="btn" data-refresh>' + U.icon('refresh') + 'Tentar novamente</button></div></section>';
      else U.toast(error.message, 'error');
    }
    finally { pending = false; root.setAttribute('aria-busy', 'false'); }
  }
  root.addEventListener('click', event => { if (event.target.closest('[data-refresh]')) load(); });
  load();
})();
