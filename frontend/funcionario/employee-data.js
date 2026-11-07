/* Pedidos e agenda da conta conectada. Nenhum estado ou avaliação é presumido. */
(() => {
  'use strict';
  const D=window.DafixData;
  const session=window.DafixAccount.requireProfile('funcionario');
  if(!session) return;
  let orders=[],month=new Date(new Date().getFullYear(),new Date().getMonth(),1);
  const table = list => D.table(['Pedido','Cliente','Serviço','Data','Local','Valor registrado'],list.map(o=>['#'+o.id,o.cliente,o.servico,D.date(o.data),o.local,D.money(o.preco_unitario)]),'Nenhum pedido cadastrado para esta conta.');
  function renderOrders() {
    const target=document.getElementById('registeredOrders');if(!target)return;
    const query=(document.getElementById('registeredSearch')?.value || '').toLocaleLowerCase('pt-BR');
    target.innerHTML=table(orders.filter(o=>[o.cliente,o.servico,o.id].some(v=>String(v).toLocaleLowerCase('pt-BR').includes(query))));
  }
  function calendar() {
    const grid=document.getElementById('calGrid');if(!grid)return;
    document.getElementById('calTitle').textContent=month.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
    grid.replaceChildren();
    ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].forEach(day=>{const el=document.createElement('div');el.className='calendar__weekday';el.textContent=day;grid.append(el)});
    for(let i=0;i<month.getDay();i++)grid.append(document.createElement('span'));
    const today=new Date();
    for(let day=1;day<=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();day++){
      const key=[month.getFullYear(),String(month.getMonth()+1).padStart(2,'0'),String(day).padStart(2,'0')].join('-');
      const list=orders.filter(o=>String(o.data).slice(0,10)===key);
      const button=document.createElement('button');button.type='button';button.className='calendar__day';
      if(month.getFullYear()===today.getFullYear()&&month.getMonth()===today.getMonth()&&day===today.getDate())button.classList.add('calendar__day--today');
      button.innerHTML='<span class="calendar__day-num">'+day+'</span>'+(list.length?'<span>'+list.length+' pedido(s)</span>':'');
      button.setAttribute('aria-label',D.date(key)+': '+list.length+' pedido(s)');
      button.addEventListener('click',()=>document.getElementById('registeredOrders').innerHTML=table(list));
      grid.append(button);
    }
  }
  async function load() {
    const target=document.getElementById('registeredOrders');
    try {
      orders=await D.orders(session);
      const summary=document.getElementById('employeeSummary');
      if(summary) summary.innerHTML=[['Pedidos registrados',orders.length],['Clientes vinculados',new Set(orders.map(o=>o.id_cliente)).size]].map(([label,value])=>'<article><span>'+label+'</span><strong>'+value+'</strong></article>').join('');
      renderOrders();calendar();
      const catalog=document.getElementById('registeredCatalog');
      if(catalog){const items=await D.list('/api/servicos');catalog.innerHTML=D.table(['Serviço','Descrição','Preço base'],items.map(s=>[s.nome_servico,s.descricao || 'Não informado',D.money(s.preco_base)]),'Nenhum serviço cadastrado.');}
    } catch(error) {
      if(target) target.innerHTML=D.empty(error.message);
      const catalog=document.getElementById('registeredCatalog');if(catalog)catalog.innerHTML=D.empty(error.message);
    }
  }
  document.getElementById('registeredSearch')?.addEventListener('input',renderOrders);
  document.querySelectorAll('[data-calendar-step]').forEach(button=>button.addEventListener('click',()=>{
    month.setMonth(month.getMonth()+Number(button.dataset.calendarStep));calendar();
  }));
  document.getElementById('registeredExport')?.addEventListener('click',()=>D.csv('pedidos.csv',['Pedido','Cliente','Serviço','Data','Local','Valor'],orders.map(o=>[o.id,o.cliente,o.servico,o.data,o.local,o.preco_unitario])));
  document.getElementById('globalSearch')?.addEventListener('input',event=>{
    const input=document.getElementById('registeredSearch');
    if(input){input.value=event.target.value;renderOrders();}
    document.querySelectorAll('#registeredCatalog tbody tr').forEach(row=>row.hidden=!row.textContent.toLocaleLowerCase('pt-BR').includes(event.target.value.toLocaleLowerCase('pt-BR')));
  });
  load();
})();
