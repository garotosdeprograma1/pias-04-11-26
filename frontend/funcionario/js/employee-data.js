/* Catálogo, pedidos e agenda integrados à conta profissional. */
(() => {
  'use strict';
  const D = window.DafixData, E = D.escape;
  const session = window.DafixAccount.requireProfile('funcionario');
  if (!session) return;
  let available = [], orders = [], permissions = [], loading = false, mutating = false;
  let month = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const can = permission => permissions.includes(permission);
  const status = order => order.confirmado_cliente_em ? 'Concluído e avaliado' : order.concluido_funcionario_em ? 'Aguardando avaliação do cliente' : order.id_funcionario ? 'Em atendimento' : 'Aguardando aceite';
  const payment = order => order.pagamento_simulado_em ? 'Simulado — sem cobrança (' + ({credito:'Crédito',debito:'Débito',pix:'Pix',dinheiro:'Dinheiro'}[order.pagamento_tipo] || 'método registrado') + ')' : 'Não simulado';
  const rating = order => order.avaliacao_nota ? order.avaliacao_nota + '/5' + (order.avaliacao_comentario ? ' · ' + order.avaliacao_comentario : '') : 'Ainda não avaliado';
  function table(list) {
    if (!list.length) return D.empty('Nenhum pedido cadastrado para esta conta.');
    const headers = ['Pedido','Cliente','Serviço','Data','Local','Valor registrado','Status','Pagamento','Avaliação','Ação'];
    return '<div class="data-table-wrap"><table class="data-table"><thead><tr>' + headers.map(h => '<th>' + h + '</th>').join('') + '</tr></thead><tbody>' + list.map(o => '<tr>' + ['#' + o.id,o.cliente,o.servico,D.date(o.data),o.local,D.money(o.preco_unitario),status(o),payment(o),rating(o)].map(value => '<td>' + E(value) + '</td>').join('') + '<td>' + (!o.concluido_funcionario_em && o.id_funcionario === session.id && can('pedidos.concluir') ? '<button type="button" class="btn btn--primary" data-complete-order="' + o.id + '"' + (mutating ? ' disabled' : '') + '>Concluir serviço</button>' : '—') + '</td></tr>').join('') + '</tbody></table></div>';
  }
  function renderOrders() {
    const target = document.getElementById('registeredOrders');
    if (!target) return;
    renderAvailable();
    const query = (document.getElementById('registeredSearch')?.value || '').toLocaleLowerCase('pt-BR');
    target.innerHTML = can('pedidos.ler') ? table(orders.filter(o => [o.cliente,o.servico,o.id,status(o)].some(v => String(v).toLocaleLowerCase('pt-BR').includes(query)))) : D.empty('Seu acesso aos pedidos está desativado. Entre em contato com a administração.');
  }
  const target = document.getElementById('registeredOrders');
  if (target) {
    const section = document.createElement('section');
    section.className = 'data-panel';
    section.innerHTML = '<div class="available-heading"><h2>Pedidos disponíveis</h2><button type="button" class="btn btn--ghost" id="orders-refresh">Atualizar pedidos</button></div><p>Escolha um pedido para assumir o atendimento.</p><p id="accept-message" role="status"></p><div id="available-orders"></div>';
    target.before(section);
    document.getElementById('orders-refresh').addEventListener('click', load);
    section.addEventListener('click', async event => {
      const button = event.target.closest('[data-accept-order]');
      if (!button || mutating) return;
      mutating = true; button.disabled = true;
      const message = document.getElementById('accept-message');
      message.textContent = 'Confirmando aceite…';
      try {
        await D.request('/api/os/' + button.dataset.acceptOrder + '/aceitar', {method:'POST'});
        message.textContent = 'Pedido aceito. Ele já aparece nos seus pedidos e na agenda.';
      } catch (error) { message.textContent = error.message; }
      finally { mutating = false; await load(); }
    });
  }
  function renderAvailable() {
    const target = document.getElementById('available-orders');
    if (!target) return;
    if (!can('pedidos.ler')) { target.innerHTML = D.empty('Acesso aos pedidos desativado.'); return; }
    const query = (document.getElementById('registeredSearch')?.value || '').toLocaleLowerCase('pt-BR');
    const matching = available.filter(o => [o.cliente,o.servico,o.id].some(v => String(v).toLocaleLowerCase('pt-BR').includes(query)));
    target.innerHTML = matching.length ? matching.map(o => '<article class="available-order"><div><h3>' + E(o.servico) + '</h3><p>Pedido #' + o.id + ' · ' + E(o.cliente) + '</p><p>' + D.date(o.data) + ' · ' + E(o.local) + '</p><p>' + E(o.descricao) + '</p><strong>' + D.money(o.preco_unitario) + '</strong></div>' + (can('pedidos.aceitar') ? '<button type="button" class="btn btn--primary" data-accept-order="' + o.id + '"' + (mutating ? ' disabled' : '') + '>Aceitar pedido</button>' : '<span>Aceite não autorizado</span>') + '</article>').join('') : D.empty('Nenhum pedido aguardando aceite no momento.');
  }
  const completion = document.createElement('dialog');
  completion.className = 'employee-dialog'; completion.id = 'complete-service-dialog';
  completion.setAttribute('aria-labelledby','complete-service-title');
  completion.innerHTML = '<h2 id="complete-service-title">Concluir serviço?</h2><p id="complete-service-description"></p><p>Confirme apenas depois de realizar o atendimento. O cliente poderá avaliar e confirmar a conclusão.</p><p id="complete-service-message" role="status"></p><div class="employee-dialog__actions"><button type="button" class="btn btn--ghost" id="complete-service-cancel">Cancelar</button><button type="button" class="btn btn--primary" id="complete-service-confirm">Confirmar conclusão</button></div>';
  document.body.append(completion);
  let selectedOrder = null;
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-complete-order]');
    if (!button || mutating) return;
    selectedOrder = orders.find(o => o.id === Number(button.dataset.completeOrder));
    if (!selectedOrder) return;
    document.getElementById('complete-service-description').textContent = 'Pedido #' + selectedOrder.id + ' · ' + selectedOrder.servico + ' · ' + selectedOrder.cliente;
    document.getElementById('complete-service-message').textContent = '';
    completion.showModal();
  });
  document.getElementById('complete-service-cancel').addEventListener('click', () => { if (!mutating) completion.close(); });
  completion.addEventListener('cancel', event => { if (mutating) event.preventDefault(); });
  document.getElementById('complete-service-confirm').addEventListener('click', async event => {
    if (!selectedOrder || mutating) return;
    mutating = true; event.target.disabled = true;
    document.getElementById('complete-service-cancel').disabled = true;
    document.getElementById('complete-service-message').textContent = 'Registrando conclusão…';
    try {
      await D.request('/api/os/' + selectedOrder.id + '/concluir', {method:'POST'});
      completion.close();
      const message = document.getElementById('accept-message');
      if (message) message.textContent = 'Serviço marcado como feito. Aguardando a avaliação do cliente.';
    } catch (error) { document.getElementById('complete-service-message').textContent = error.message; }
    finally {
      mutating = false; event.target.disabled = false;
      document.getElementById('complete-service-cancel').disabled = false;
      await load();
    }
  });
  const catalog = document.getElementById('registeredCatalog');
  if (catalog) {
    const heading = document.createElement('div'); heading.className = 'available-heading employee-catalog-actions';
    heading.innerHTML = '<p>Os serviços cadastrados ficam disponíveis no catálogo da plataforma.</p><button type="button" class="btn btn--primary" id="employee-service-create" hidden>Cadastrar serviço</button><p id="employee-service-feedback" role="status"></p>';
    catalog.before(heading);
    const dialog = document.createElement('dialog'); dialog.id = 'employee-service-dialog'; dialog.className = 'employee-dialog'; dialog.setAttribute('aria-labelledby','employee-service-title');
    dialog.innerHTML = '<h2 id="employee-service-title">Cadastrar serviço</h2><form id="employee-service-form" class="employee-service-form"><label>Nome do serviço<input name="nome_servico" required maxlength="150" autocomplete="off"></label><label>Descrição<textarea name="descricao" maxlength="1000" rows="4"></textarea></label><label>Preço base (R$)<input name="preco_base" type="number" min="0" step="0.01" required inputmode="decimal"></label><p id="employee-service-message" role="status"></p><div class="employee-dialog__actions"><button type="button" id="employee-service-cancel" class="btn btn--ghost">Cancelar</button><button type="submit" class="btn btn--primary">Cadastrar serviço</button></div></form>';
    document.body.append(dialog);
    const form = document.getElementById('employee-service-form');
    document.getElementById('employee-service-create').addEventListener('click', () => { form.reset(); document.getElementById('employee-service-message').textContent = ''; dialog.showModal(); });
    document.getElementById('employee-service-cancel').addEventListener('click', () => { if (!mutating) dialog.close(); });
    dialog.addEventListener('cancel', event => { if (mutating) event.preventDefault(); });
    form.addEventListener('submit', async event => {
      event.preventDefault(); if (mutating || !form.reportValidity()) return;
      const data = {nome_servico:form.elements.nome_servico.value.trim(),descricao:form.elements.descricao.value.trim(),preco_base:Number(form.elements.preco_base.value)};
      const message = document.getElementById('employee-service-message');
      if (!data.nome_servico || !Number.isFinite(data.preco_base) || data.preco_base < 0) { message.textContent = 'Informe um nome e um preço válidos.'; return; }
      mutating = true; form.querySelectorAll('button').forEach(button => { button.disabled = true; }); message.textContent = 'Cadastrando serviço…';
      try {
        await D.request('/api/servicos', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
        dialog.close(); document.getElementById('employee-service-feedback').textContent = 'Serviço cadastrado no catálogo.';
      } catch (error) { message.textContent = error.message; }
      finally { mutating = false; form.querySelectorAll('button').forEach(button => { button.disabled = false; }); await load(); }
    });
  }
  function calendar() {
    const grid = document.getElementById('calGrid'); if (!grid) return;
    document.getElementById('calTitle').textContent = month.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
    grid.replaceChildren();
    ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].forEach(day => { const el = document.createElement('div'); el.className = 'calendar__weekday'; el.textContent = day; grid.append(el); });
    for (let i = 0; i < month.getDay(); i++) grid.append(document.createElement('span'));
    const today = new Date();
    for (let day = 1; day <= new Date(month.getFullYear(),month.getMonth()+1,0).getDate(); day++) {
      const key = [month.getFullYear(),String(month.getMonth()+1).padStart(2,'0'),String(day).padStart(2,'0')].join('-');
      const list = orders.filter(o => String(o.data).slice(0,10) === key);
      const button = document.createElement('button'); button.type = 'button'; button.className = 'calendar__day';
      if (month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth() && day === today.getDate()) button.classList.add('calendar__day--today');
      button.innerHTML = '<span class="calendar__day-num">' + day + '</span>' + (list.length ? '<span>' + list.length + ' pedido(s)</span>' : '');
      button.setAttribute('aria-label', D.date(key) + ': ' + list.length + ' pedido(s)');
      button.addEventListener('click', () => { document.getElementById('registeredOrders').innerHTML = can('pedidos.ler') ? table(list) : D.empty('Acesso aos pedidos desativado.'); });
      grid.append(button);
    }
  }
  async function load() {
    if (loading) return;
    loading = true;
    const refresh = document.getElementById('orders-refresh'); if (refresh) refresh.disabled = true;
    try {
      const current = await D.request('/api/session');
      if (current.perfil !== 'funcionario' || current.usuario.id !== session.id) { location.replace('/index.html'); return; }
      try { permissions = JSON.parse(current.usuario.permissoes || '[]'); } catch { permissions = []; }
      if (!Array.isArray(permissions)) permissions = [];
      const create = document.getElementById('employee-service-create'); if (create) create.hidden = !can('servicos.cadastrar');
      if (catalog) {
        const items = await D.list('/api/servicos');
        catalog.innerHTML = D.table(['Serviço','Descrição','Preço base'],items.map(s => [s.nome_servico,s.descricao || 'Não informado',D.money(s.preco_base)]),'Nenhum serviço cadastrado.');
      }
      const all = can('pedidos.ler') ? await D.orders(session) : [];
      available = all.filter(o => o.id_funcionario === null);
      orders = all.filter(o => o.id_funcionario === session.id);
      const summary = document.getElementById('employeeSummary');
      if (summary) summary.innerHTML = can('pedidos.ler') ? [['Meus pedidos',orders.length],['Disponíveis para aceite',available.length],['Aguardando avaliação',orders.filter(o => o.concluido_funcionario_em && !o.confirmado_cliente_em).length],['Concluídos e avaliados',orders.filter(o => o.confirmado_cliente_em).length]].map(([label,value]) => '<article><span>' + label + '</span><strong>' + value + '</strong></article>').join('') : D.empty('Resumo de pedidos indisponível para suas permissões.');
      const reviews = document.getElementById('employeeReviews');
      if (reviews) reviews.innerHTML = D.table(['Pedido','Serviço','Cliente','Avaliação'],orders.filter(o => o.avaliacao_nota).map(o => ['#' + o.id,o.servico,o.cliente,rating(o)]),'Nenhuma avaliação registrada.');
      renderOrders(); calendar();
    } catch (error) {
      if (target) target.innerHTML = D.empty(error.message);
      const availableTarget = document.getElementById('available-orders'); if (availableTarget) availableTarget.innerHTML = D.empty(error.message);
      if (catalog) catalog.innerHTML = D.empty(error.message);
    } finally { loading = false; if (refresh) refresh.disabled = false; }
  }
  document.getElementById('registeredSearch')?.addEventListener('input',renderOrders);
  document.querySelectorAll('[data-calendar-step]').forEach(button => button.addEventListener('click', () => { month.setMonth(month.getMonth()+Number(button.dataset.calendarStep)); calendar(); }));
  document.getElementById('registeredExport')?.addEventListener('click', () => D.csv('pedidos.csv',['Pedido','Cliente','Serviço','Data','Local','Valor','Status','Pagamento','Avaliação'],orders.map(o => [o.id,o.cliente,o.servico,o.data,o.local,o.preco_unitario,status(o),payment(o),rating(o)])));
  document.getElementById('globalSearch')?.addEventListener('input', event => {
    const input = document.getElementById('registeredSearch'); if (input) { input.value = event.target.value; renderOrders(); }
    document.querySelectorAll('#registeredCatalog tbody tr').forEach(row => { row.hidden = !row.textContent.toLocaleLowerCase('pt-BR').includes(event.target.value.toLocaleLowerCase('pt-BR')); });
  });
  window.addEventListener('focus', () => { if (!mutating) load(); });
  load();
})();
