/* =====================================================
   DAFIX ADMIN — USUÁRIOS v2
   ===================================================== */
'use strict';

const AV_COLORS = ['#2563EB','#10B981','#F59E0B','#EF4444','#8B5CF6','#06B6D4','#EC4899','#F97316'];
const initials = n => n.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
const avColor  = n => AV_COLORS[n.charCodeAt(0) % AV_COLORS.length];

const SMAP = { ativo:['bg-success','Ativo'], inativo:['bg-neutral','Inativo'], bloqueado:['bg-danger','Bloqueado'] };
const TMAP = { cliente:['bg-info','Cliente'], funcionario:['bg-purple','Funcionário'], admin:['bg-warning','Admin'] };

let DB = [
  {id:1,  name:'Ana Oliveira',    email:'ana@dafix.com',       phone:'(11) 98765-4321', cpf:'123.456.789-00', type:'cliente',     status:'ativo',     cadastro:'2025-01-15', acesso:'2026-06-18', servicos:14, rating:4.9, obs:''},
  {id:2,  name:'Carlos Mendes',   email:'carlos@dafix.com',    phone:'(11) 97654-3210', cpf:'234.567.890-11', type:'funcionario', status:'ativo',     cadastro:'2024-11-20', acesso:'2026-06-18', servicos:87, rating:4.8, obs:'Especialista elétrica'},
  {id:3,  name:'Maria Santos',    email:'maria.s@gmail.com',   phone:'(21) 91234-5678', cpf:'345.678.901-22', type:'cliente',     status:'ativo',     cadastro:'2025-03-10', acesso:'2026-06-17', servicos:6,  rating:4.7, obs:''},
  {id:4,  name:'Lucas Teixeira',  email:'lucas.t@dafix.com',   phone:'(11) 96543-2109', cpf:'456.789.012-33', type:'funcionario', status:'ativo',     cadastro:'2024-08-05', acesso:'2026-06-18', servicos:124,rating:4.9, obs:'Especialista hidráulica'},
  {id:5,  name:'João Costa',      email:'joao.c@gmail.com',    phone:'(31) 99876-5432', cpf:'567.890.123-44', type:'cliente',     status:'inativo',   cadastro:'2025-07-22', acesso:'2026-05-30', servicos:2,  rating:4.5, obs:''},
  {id:6,  name:'Felipe Rodrigues',email:'felipe.r@dafix.com',  phone:'(11) 95432-1098', cpf:'678.901.234-55', type:'funcionario', status:'ativo',     cadastro:'2025-02-14', acesso:'2026-06-17', servicos:56, rating:4.6, obs:'Pintura e montagem'},
  {id:7,  name:'Lucia Ferreira',  email:'lucia.f@gmail.com',   phone:'(41) 98765-4321', cpf:'789.012.345-66', type:'cliente',     status:'ativo',     cadastro:'2025-09-08', acesso:'2026-06-16', servicos:9,  rating:4.8, obs:''},
  {id:8,  name:'Ricardo Alves',   email:'ric.alves@gmail.com', phone:'(11) 94321-0987', cpf:'890.123.456-77', type:'cliente',     status:'bloqueado', cadastro:'2024-12-01', acesso:'2026-04-10', servicos:0,  rating:0,   obs:'Conta suspensa — fraude'},
  {id:9,  name:'Fabiana Lima',    email:'fabi.lima@gmail.com', phone:'(21) 93210-9876', cpf:'901.234.567-88', type:'cliente',     status:'ativo',     cadastro:'2026-01-30', acesso:'2026-06-15', servicos:4,  rating:5.0, obs:''},
  {id:10, name:'Pedro Carvalho',  email:'pedro.c@dafix.com',   phone:'(11) 92109-8765', cpf:'012.345.678-99', type:'funcionario', status:'ativo',     cadastro:'2023-06-15', acesso:'2026-06-18', servicos:203,rating:4.7, obs:'Elétrica industrial'},
  {id:11, name:'Fernanda Gomes',  email:'fer.gomes@gmail.com', phone:'(51) 91098-7654', cpf:'111.222.333-44', type:'cliente',     status:'ativo',     cadastro:'2026-04-12', acesso:'2026-06-14', servicos:1,  rating:5.0, obs:''},
  {id:12, name:'Bruno Martins',   email:'bruno.m@gmail.com',   phone:'(11) 90987-6543', cpf:'222.333.444-55', type:'cliente',     status:'inativo',   cadastro:'2025-05-18', acesso:'2026-03-22', servicos:3,  rating:4.3, obs:''},
];

let filtered = [...DB], page = 1, PER = 8, editId = null;

// KPIs summary
function renderKpis() {
  const tots = DB.length, clients = DB.filter(u=>u.type==='cliente').length;
  const pros  = DB.filter(u=>u.type==='funcionario').length, active = DB.filter(u=>u.status==='ativo').length;
  const defs = [
    {label:'Total',         val:tots,   color:'#2563EB', bg:'rgba(37,99,235,.1)',  emoji:'👥'},
    {label:'Clientes',      val:clients,color:'#06B6D4', bg:'rgba(6,182,212,.1)',  emoji:'🧑'},
    {label:'Profissionais', val:pros,   color:'#8B5CF6', bg:'rgba(139,92,246,.1)', emoji:'🔧'},
    {label:'Ativos',        val:active, color:'#10B981', bg:'rgba(16,185,129,.1)', emoji:'✅'},
  ];
  document.getElementById('userKpis').innerHTML = defs.map(d=>`
    <div class="kpi" style="--kpi-accent:${d.color};--kpi-bg:${d.bg};padding:16px">
      <div class="kpi__top"><div class="kpi__icon" style="font-size:18px">${d.emoji}</div></div>
      <div class="kpi__value" style="font-size:22px">${d.val}</div>
      <div class="kpi__label">${d.label}</div>
    </div>`).join('');
}

// Table
function renderTable() {
  const tbody = document.getElementById('userBody');
  const s = (page - 1) * PER;
  const rows = filtered.slice(s, s + PER);

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="9"><div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>Nenhum usuário encontrado</div></td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(u => {
    const [sc,sl] = SMAP[u.status] || [];
    const [tc,tl] = TMAP[u.type]   || [];
    const c = avColor(u.name);
    return `<tr>
      <td><input type="checkbox" class="row-cb" data-id="${u.id}" style="cursor:pointer"/></td>
      <td>
        <div class="user-cell">
          <div class="user-av" style="background:${c}">${initials(u.name)}</div>
          <div><div class="user-name">${u.name}</div><div class="user-email">${u.email}</div></div>
        </div>
      </td>
      <td style="color:var(--text-2)">${u.phone}</td>
      <td style="font-family:var(--mono);font-size:12px">${u.cpf}</td>
      <td><span class="badge ${tc}">${tl}</span></td>
      <td><span class="badge ${sc} badge--dot">${sl}</span></td>
      <td style="color:var(--text-2)">${new Date(u.cadastro).toLocaleDateString('pt-BR')}</td>
      <td style="color:var(--text-2)">${new Date(u.acesso).toLocaleDateString('pt-BR')}</td>
      <td>
        <div class="act-row">
          <button class="act-btn act-btn--view" onclick="viewUser(${u.id})" title="Ver perfil"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
          <button class="act-btn act-btn--edit" onclick="editUser(${u.id})" title="Editar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="act-btn act-btn--block" onclick="toggleBlock(${u.id})" title="${u.status==='bloqueado'?'Desbloquear':'Bloquear'}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg></button>
          <button class="act-btn act-btn--del" onclick="deleteUser(${u.id})" title="Excluir"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6m4-6v6"/></svg></button>
        </div>
      </td>
    </tr>`;
  }).join('');

  document.getElementById('userCount').textContent =
    `${s+1}–${Math.min(s+PER, filtered.length)} de ${filtered.length} usuários`;
  renderPag();
}

function renderPag() {
  const total = Math.ceil(filtered.length / PER);
  const el = document.getElementById('userPag');
  if (total <= 1) { el.innerHTML=''; return; }
  let h = `<button class="pg-btn" onclick="goPage(${page-1})" ${page===1?'disabled':''}>‹</button>`;
  for (let i=1;i<=total;i++) {
    if (i===1||i===total||Math.abs(i-page)<=1)
      h += `<button class="pg-btn ${i===page?'active':''}" onclick="goPage(${i})">${i}</button>`;
    else if (Math.abs(i-page)===2)
      h += `<span class="pg-btn" style="pointer-events:none;border:0">…</span>`;
  }
  h += `<button class="pg-btn" onclick="goPage(${page+1})" ${page===total?'disabled':''}>›</button>`;
  el.innerHTML = h;
}

window.goPage = p => {
  const t = Math.ceil(filtered.length / PER);
  if (p<1||p>t) return;
  page = p; renderTable();
};

// Filters
window.filterUsers = () => {
  const q  = (document.getElementById('searchUser')?.value||document.getElementById('searchInput')?.value||'').toLowerCase();
  const tp = document.getElementById('fType')?.value||'';
  const st = document.getElementById('fStatus')?.value||'';
  filtered = DB.filter(u =>
    (!q  || u.name.toLowerCase().includes(q)||u.email.toLowerCase().includes(q)||u.cpf.includes(q)) &&
    (!tp || u.type===tp) &&
    (!st || u.status===st)
  );
  page = 1; renderTable();
};

window.clearFilters = () => {
  ['searchUser','fType','fStatus'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  const si = document.getElementById('searchInput'); if(si) si.value='';
  filtered = [...DB]; page=1; renderTable();
};

// Modals
window.openAdd = () => {
  editId = null;
  document.getElementById('addTitle').textContent = 'Novo Usuário';
  ['fName','fEmail','fPhone','fCpf','fPass','fPass2','fObs'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('fType2').value='cliente';
  document.getElementById('fStatus2').value='ativo';
  openOverlay('addModal');
};

window.editUser = id => {
  const u = DB.find(u=>u.id===id); if(!u) return;
  editId = id;
  document.getElementById('addTitle').textContent = 'Editar Usuário';
  document.getElementById('fName').value  = u.name;
  document.getElementById('fEmail').value = u.email;
  document.getElementById('fPhone').value = u.phone;
  document.getElementById('fCpf').value   = u.cpf;
  document.getElementById('fType2').value = u.type;
  document.getElementById('fStatus2').value = u.status;
  document.getElementById('fObs').value   = u.obs;
  document.getElementById('fPass').value = document.getElementById('fPass2').value = '';
  openOverlay('addModal');
};

window.saveUser = () => {
  const name = document.getElementById('fName').value.trim();
  const email = document.getElementById('fEmail').value.trim();
  if (!name||!email) { toast('Atenção','Nome e e-mail são obrigatórios.','warning'); return; }
  if (editId) {
    const u = DB.find(u=>u.id===editId);
    Object.assign(u, {name, email, phone:document.getElementById('fPhone').value, type:document.getElementById('fType2').value, status:document.getElementById('fStatus2').value, obs:document.getElementById('fObs').value});
    toast('Atualizado','Usuário salvo com sucesso!','success');
  } else {
    DB.push({id:Date.now(),name,email,phone:document.getElementById('fPhone').value,cpf:document.getElementById('fCpf').value,type:document.getElementById('fType2').value,status:document.getElementById('fStatus2').value,cadastro:new Date().toISOString().split('T')[0],acesso:new Date().toISOString().split('T')[0],servicos:0,rating:0,obs:document.getElementById('fObs').value});
    toast('Criado','Usuário cadastrado com sucesso!','success');
  }
  closeOverlay('addModal'); filtered=[...DB]; renderTable(); renderKpis();
};

window.viewUser = id => {
  const u = DB.find(u=>u.id===id); if(!u) return;
  const [sc,sl]=SMAP[u.status]||[]; const [tc,tl]=TMAP[u.type]||[];
  const c = avColor(u.name);
  document.getElementById('viewBody').innerHTML = `
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:22px;padding-bottom:18px;border-bottom:1px solid var(--border)">
      <div class="user-av" style="width:56px;height:56px;font-size:20px;font-weight:800;border-radius:50%;display:flex;align-items:center;justify-content:center;background:${c};color:#fff;flex-shrink:0">${initials(u.name)}</div>
      <div>
        <div style="font-size:18px;font-weight:800;letter-spacing:-.3px">${u.name}</div>
        <div style="font-size:13px;color:var(--text-2);margin-top:2px">${u.email}</div>
        <div style="display:flex;gap:6px;margin-top:8px"><span class="badge ${tc}">${tl}</span><span class="badge ${sc} badge--dot">${sl}</span></div>
      </div>
    </div>
    <div class="stat-row">
      <div class="stat-box"><div class="stat-box__val">${u.servicos}</div><div class="stat-box__lbl">Serviços</div></div>
      <div class="stat-box"><div class="stat-box__val" style="color:var(--warning)">${u.rating>0?u.rating.toFixed(1)+' ★':'—'}</div><div class="stat-box__lbl">Avaliação</div></div>
      <div class="stat-box"><div class="stat-box__val" style="font-size:14px;font-weight:700">${new Date(u.acesso).toLocaleDateString('pt-BR')}</div><div class="stat-box__lbl">Último Acesso</div></div>
    </div>
    <div class="detail-grid">
      <div class="detail-item"><div class="detail-label">Telefone</div><div class="detail-value">${u.phone}</div></div>
      <div class="detail-item"><div class="detail-label">CPF</div><div class="detail-value" style="font-family:var(--mono)">${u.cpf}</div></div>
      <div class="detail-item"><div class="detail-label">Cadastro</div><div class="detail-value">${new Date(u.cadastro).toLocaleDateString('pt-BR')}</div></div>
      <div class="detail-item"><div class="detail-label">ID</div><div class="detail-value" style="font-family:var(--mono);color:var(--primary)">#${u.id}</div></div>
      ${u.obs?`<div class="detail-item" style="grid-column:1/-1"><div class="detail-label">Observações</div><div class="detail-value">${u.obs}</div></div>`:''}
    </div>`;
  openOverlay('viewModal');
};

window.deleteUser = id => {
  const u = DB.find(u=>u.id===id); if(!u) return;
  document.getElementById('delName').textContent = u.name;
  document.getElementById('delConfirm').onclick = () => {
    DB = DB.filter(u=>u.id!==id); filtered=filtered.filter(u=>u.id!==id);
    closeOverlay('delModal'); renderTable(); renderKpis();
    toast('Excluído','Usuário removido com sucesso.','danger');
  };
  openOverlay('delModal');
};

window.toggleBlock = id => {
  const u = DB.find(u=>u.id===id); if(!u) return;
  u.status = u.status==='bloqueado'?'ativo':'bloqueado';
  filtered=[...DB]; renderTable();
  toast('Status', `Usuário ${u.status==='bloqueado'?'bloqueado':'desbloqueado'}.`, u.status==='bloqueado'?'warning':'success');
};

window.toggleAll = cb => document.querySelectorAll('.row-cb').forEach(c=>c.checked=cb.checked);
window.exportUsers = () => { toast('Exportando','Arquivo CSV sendo gerado…','info'); setTimeout(()=>toast('Pronto!','Exportação concluída.','success'),1600); };

document.addEventListener('DOMContentLoaded', () => { renderKpis(); renderTable(); });
