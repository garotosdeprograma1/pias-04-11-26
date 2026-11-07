/* Administração: dados cadastrados, sem simulações de atividade ou faturamento. */
(() => {
  'use strict';
  const D = window.DafixData;
  const mode = document.querySelector('[data-record-page]').dataset.recordPage;
  const target = document.getElementById('records');
  let users = [], orders = [], services = [], headers = [], rows = [];
  function render() {
    const query = (document.getElementById('record-search').value || '').toLocaleLowerCase('pt-BR');
    const role = document.getElementById('record-role').value;
    if (mode === 'usuarios') {
      headers = ['Nome', 'E-mail', 'Telefone', 'Perfil', 'Especialidade'];
      rows = users.filter(u => !role || u.perfil === role).map(u => [u.nome,u.email,u.telefone,u.perfil === 'cliente' ? 'Cliente' : 'Funcionário',u.especialidade || 'Não informado']);
    } else {
      headers = ['Pedido', 'Cliente', 'Funcionário', 'Serviço', 'Valor registrado', 'Data', 'Local'];
      rows = orders.map(o => ['#'+o.id,o.cliente,o.funcionario,o.servico,D.money(o.preco_unitario),D.date(o.data),o.local]);
    }
    rows = rows.filter(row => row.some(value => String(value).toLocaleLowerCase('pt-BR').includes(query)));
    target.innerHTML = D.table(headers,rows,mode === 'usuarios' ? 'Nenhum usuário encontrado.' : 'Nenhum pedido encontrado.');
    document.getElementById('record-count').textContent = rows.length + ' registro(s)';
    document.getElementById('record-export').disabled = !rows.length;
  }
  async function load() {
    target.innerHTML = D.empty('Carregando registros…');
    try {
      const [clients,staff,catalog,registered] = await Promise.all([
        D.list('/api/clientes'),D.list('/api/funcionarios'),D.list('/api/servicos'),D.orders()
      ]);
      users = clients.map(u=>({...u,perfil:'cliente'})).concat(staff.map(u=>({...u,perfil:'funcionario'})));
      services = catalog; orders = registered;
      document.getElementById('record-summary').innerHTML = [
        ['Clientes cadastrados',clients.length],['Funcionários cadastrados',staff.length],
        ['Serviços no catálogo',services.length],['Pedidos registrados',orders.length]
      ].map(([label,value])=>'<article><span>'+label+'</span><strong>'+value+'</strong></article>').join('');
      if (mode === 'servicos') document.getElementById('record-catalog').innerHTML = D.table(['Serviço','Descrição','Preço base'],services.map(s=>[s.nome_servico,s.descricao || 'Não informado',D.money(s.preco_base)]),'Nenhum serviço cadastrado.');
      if (mode === 'relatorios') document.getElementById('report-total').textContent = D.money(orders.reduce((sum,o)=>sum+Number(o.preco_unitario || 0),0));
      render();
    } catch(error) {
      target.innerHTML = D.empty(error.message);
      document.getElementById('record-count').textContent = 'Dados indisponíveis';
      document.getElementById('record-export').disabled = true;
    }
  }
  document.getElementById('record-search').addEventListener('input',render);
  document.getElementById('record-role').addEventListener('change',render);
  document.getElementById('record-reload').addEventListener('click',load);
  document.getElementById('record-export').addEventListener('click',()=>D.csv('dafix-'+mode+'.csv',headers,rows));
  const session = window.DafixAccount.readSession();
  document.querySelectorAll('.sidebar__profile-name').forEach(el=>el.textContent=session?.nome || 'Gestão Dafix');
  document.querySelectorAll('.sidebar__avatar,.user-avatar').forEach(el=>el.textContent=session?.nome?.trim().split(/\s+/).map(p=>p[0]).slice(0,2).join('') || 'DF');
  document.getElementById('searchInput')?.addEventListener('input',event=>{document.getElementById('record-search').value=event.target.value;render()});
  load();
})();
