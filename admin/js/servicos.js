/* =====================================================
   DAFIX ADMIN — SERVIÇOS v2
   ===================================================== */
'use strict';

const SMAP = {
  agendado:  ['bg-warning', 'Agendado'],
  andamento: ['bg-info',    'Em Andamento'],
  concluido: ['bg-success', 'Concluído'],
  cancelado: ['bg-danger',  'Cancelado'],
  pendente:  ['bg-neutral', 'Pendente'],
};

const CAT_COLOR = {
  'Elétrica':'#2563EB','Hidráulica':'#06B6D4','Pintura':'#10B981',
  'Montagem':'#F59E0B','Instalações':'#8B5CF6','Outros':'#94A3B8',
};

let DB = [
  {id:'#001',client:'Ana Oliveira',    pro:'Carlos Mendes',   cat:'Elétrica',    val:350, date:'2026-06-18',time:'09:00',status:'concluido',addr:'Rua das Flores, 123 — SP',    desc:'Troca de tomadas e instalação de disjuntores',obs:''},
  {id:'#002',client:'Pedro Costa',     pro:'Lucas Teixeira',  cat:'Hidráulica',  val:280, date:'2026-06-18',time:'10:30',status:'andamento',addr:'Av. Brasil, 456 — RJ',        desc:'Reparo em encanamento com vazamento',          obs:'Trazer bomba auxiliar'},
  {id:'#003',client:'Maria Santos',    pro:'Felipe Rodrigues',cat:'Pintura',     val:620, date:'2026-06-19',time:'08:00',status:'agendado', addr:'Rua Central, 789 — BH',       desc:'Pintura completa de 2 quartos e sala',         obs:''},
  {id:'#004',client:'João Costa',      pro:'Carlos Mendes',   cat:'Montagem',    val:190, date:'2026-06-17',time:'14:00',status:'concluido',addr:'Rua das Acácias, 321 — SP',   desc:'Montagem de guarda-roupa de 6 portas',         obs:''},
  {id:'#005',client:'Lucia Ferreira',  pro:'Lucas Teixeira',  cat:'Instalações', val:450, date:'2026-06-16',time:'11:00',status:'cancelado',addr:'Av. Atlântica, 654 — Curitiba',desc:'Instalação de ar-condicionado split',          obs:'Cancelado pela cliente'},
  {id:'#006',client:'Ricardo Alves',   pro:'Felipe Rodrigues',cat:'Elétrica',    val:310, date:'2026-06-16',time:'15:30',status:'concluido',addr:'Rua da Paz, 987 — SP',        desc:'Instalação de chuveiro elétrico de alta pressão',obs:''},
  {id:'#007',client:'Fabiana Lima',    pro:'Carlos Mendes',   cat:'Hidráulica',  val:520, date:'2026-06-20',time:'09:30',status:'pendente', addr:'Rua Nova, 147 — SP',           desc:'Desentupimento e limpeza de esgoto',           obs:'Aguardando aprovação de orçamento'},
  {id:'#008',client:'Fernanda Gomes',  pro:'Pedro Carvalho',  cat:'Elétrica',    val:420, date:'2026-06-15',time:'10:00',status:'concluido',addr:'Av. Paulista, 258 — SP',       desc:'Circuito dedicado para escritório',            obs:''},
  {id:'#009',client:'Bruno Martins',   pro:'Felipe Rodrigues',cat:'Pintura',     val:380, date:'2026-06-14',time:'08:00',status:'concluido',addr:'Rua das Rosas, 369 — SP',      desc:'Pintura da fachada com tinta acrílica',        obs:''},
  {id:'#010',client:'Ana Oliveira',    pro:'Lucas Teixeira',  cat:'Montagem',    val:240, date:'2026-06-21',time:'13:00',status:'agendado', addr:'Rua das Flores, 123 — SP',    desc:'Montagem de cozinha planejada completa',       obs:'Trazer parafusadeira e nível'},
  {id:'#011',client:'Maria Santos',    pro:'Carlos Mendes',   cat:'Instalações', val:680, date:'2026-06-13',time:'09:00',status:'concluido',addr:'Rua Central, 789 — BH',       desc:'Instalação de sistema de câmeras CFTV',       obs:''},
  {id:'#012',client:'João Costa',      pro:'Pedro Carvalho',  cat:'Elétrica',    val:290, date:'2026-06-22',time:'14:00',status:'agendado', addr:'Rua das Acácias, 321 — SP',   desc:'Revisão e troca de fiação antiga',             obs:''},
];

let filtered = [...DB], page = 1, PER = 8, editId = null;

// ── KPIs ───────────────────────────────────────────
function renderKpis() {
  const c = {agendado:0,andamento:0,concluido:0,cancelado:0};
  DB.forEach(s => { if(c[s.status]!==undefined) c[s.status]++; });
  const receita = DB.filter(s=>s.status==='concluido').reduce((t,s)=>t+s.val,0);
  const defs = [
    {label:'Agendados',    val:c.agendado,  color:'#F59E0B',bg:'rgba(245,158,11,.1)', emoji:'📅'},
    {label:'Em Andamento', val:c.andamento, color:'#06B6D4',bg:'rgba(6,182,212,.1)',  emoji:'⚙️'},
    {label:'Concluídos',   val:c.concluido, color:'#10B981',bg:'rgba(16,185,129,.1)', emoji:'✅'},
    {label:'Cancelados',   val:c.cancelado, color:'#EF4444',bg:'rgba(239,68,68,.1)',  emoji:'❌'},
  ];
  document.getElementById('srvKpis').innerHTML = defs.map(d=>`
    <div class="kpi" style="--kpi-accent:${d.color};--kpi-bg:${d.bg};padding:18px">
      <div class="kpi__top"><div class="kpi__icon" style="font-size:18px">${d.emoji}</div></div>
      <div class="kpi__value" style="font-size:24px;color:${d.color}">${d.val}</div>
      <div class="kpi__label">${d.label}</div>
    </div>`).join('');
}

// ── Table ──────────────────────────────────────────
function renderTable() {
  const tbody = document.getElementById('srvBody');
  const s = (page-1)*PER;
  const rows = filtered.slice(s, s+PER);

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="9"><div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>Nenhum serviço encontrado</div></td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(sv=>{
    const [cls,lbl] = SMAP[sv.status]||['bg-neutral',sv.status];
    const cc = CAT_COLOR[sv.cat]||'#94A3B8';
    return `<tr>
      <td><span style="font-family:var(--mono);font-size:12px;font-weight:700;color:var(--primary)">${sv.id}</span></td>
      <td style="font-weight:600">${sv.client}</td>
      <td style="color:var(--text-2)">${sv.pro}</td>
      <td><span class="badge" style="background:${cc}18;color:${cc}">${sv.cat}</span></td>
      <td style="font-weight:700;font-family:var(--mono)">R$&nbsp;${sv.val.toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
      <td style="color:var(--text-2)">${new Date(sv.date+'T12:00').toLocaleDateString('pt-BR')}</td>
      <td style="color:var(--text-2)">${sv.time}</td>
      <td><span class="badge ${cls} badge--dot">${lbl}</span></td>
      <td>
        <div class="act-row">
          <button class="act-btn act-btn--view" onclick="viewSrv('${sv.id}')" title="Ver detalhes"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
          <button class="act-btn act-btn--edit" onclick="editSrv('${sv.id}')" title="Editar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="act-btn act-btn--del" onclick="deleteSrv('${sv.id}')" title="Excluir"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6m4-6v6"/></svg></button>
        </div>
      </td>
    </tr>`;
  }).join('');

  document.getElementById('srvCount').textContent = `${s+1}–${Math.min(s+PER,filtered.length)} de ${filtered.length} serviços`;
  renderPag();
}

function renderPag() {
  const total = Math.ceil(filtered.length/PER);
  const el = document.getElementById('srvPag');
  if (total<=1) { el.innerHTML=''; return; }
  let h = `<button class="pg-btn" onclick="goPage(${page-1})" ${page===1?'disabled':''}>‹</button>`;
  for (let i=1;i<=total;i++)
    h += `<button class="pg-btn ${i===page?'active':''}" onclick="goPage(${i})">${i}</button>`;
  h += `<button class="pg-btn" onclick="goPage(${page+1})" ${page===total?'disabled':''}>›</button>`;
  el.innerHTML = h;
}
window.goPage = p => { const t=Math.ceil(filtered.length/PER); if(p<1||p>t) return; page=p; renderTable(); };

// ── Filters ────────────────────────────────────────
window.filterSrv = () => {
  const q = (document.getElementById('srvFilter')?.value||document.getElementById('srvSearch')?.value||'').toLowerCase();
  const cat = document.getElementById('fCat').value;
  const sts = document.getElementById('fSts').value;
  filtered = DB.filter(s=>
    (!q  || s.client.toLowerCase().includes(q)||s.pro.toLowerCase().includes(q)||s.id.includes(q)||s.cat.toLowerCase().includes(q)) &&
    (!cat|| s.cat===cat) &&
    (!sts|| s.status===sts)
  );
  page=1; renderTable();
};
window.clearSrv = () => {
  ['srvFilter','fCat','fSts','srvSearch'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  filtered=[...DB]; page=1; renderTable();
};

// ── Modals ─────────────────────────────────────────
window.openNewSrv = () => {
  editId=null;
  document.getElementById('srvModalTitle').textContent='Novo Serviço';
  ['sfClient','sfPro','sfVal','sfAddr','sfDesc','sfObs'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('sfCat').value='Elétrica';
  document.getElementById('sfSts').value='agendado';
  document.getElementById('sfDate').value=new Date().toISOString().split('T')[0];
  document.getElementById('sfTime').value='09:00';
  openOverlay('srvModal');
};

window.editSrv = id => {
  const s=DB.find(s=>s.id===id); if(!s) return;
  editId=id;
  document.getElementById('srvModalTitle').textContent='Editar Serviço';
  document.getElementById('sfClient').value=s.client;
  document.getElementById('sfPro').value=s.pro;
  document.getElementById('sfCat').value=s.cat;
  document.getElementById('sfVal').value=s.val;
  document.getElementById('sfDate').value=s.date;
  document.getElementById('sfTime').value=s.time;
  document.getElementById('sfSts').value=s.status;
  document.getElementById('sfAddr').value=s.addr;
  document.getElementById('sfDesc').value=s.desc;
  document.getElementById('sfObs').value=s.obs;
  openOverlay('srvModal');
};

window.saveSrv = () => {
  const client=document.getElementById('sfClient').value.trim();
  const pro=document.getElementById('sfPro').value.trim();
  if (!client||!pro) { toast('Atenção','Cliente e profissional são obrigatórios.','warning'); return; }
  if (editId) {
    const s=DB.find(s=>s.id===editId);
    Object.assign(s,{client,pro,cat:document.getElementById('sfCat').value,val:Number(document.getElementById('sfVal').value)||0,date:document.getElementById('sfDate').value,time:document.getElementById('sfTime').value,status:document.getElementById('sfSts').value,addr:document.getElementById('sfAddr').value,desc:document.getElementById('sfDesc').value,obs:document.getElementById('sfObs').value});
    toast('Atualizado','Serviço salvo com sucesso!','success');
  } else {
    DB.push({id:'#'+String(DB.length+1).padStart(3,'0'),client,pro,cat:document.getElementById('sfCat').value,val:Number(document.getElementById('sfVal').value)||0,date:document.getElementById('sfDate').value,time:document.getElementById('sfTime').value,status:document.getElementById('sfSts').value,addr:document.getElementById('sfAddr').value,desc:document.getElementById('sfDesc').value,obs:document.getElementById('sfObs').value});
    toast('Criado','Serviço criado com sucesso!','success');
  }
  closeOverlay('srvModal'); filtered=[...DB]; renderKpis(); renderTable();
};

window.viewSrv = id => {
  const s=DB.find(s=>s.id===id); if(!s) return;
  const [cls,lbl]=SMAP[s.status]||[]; const cc=CAT_COLOR[s.cat]||'#94A3B8';
  const tl = [
    {text:'Serviço solicitado pelo cliente',time:new Date(s.date+'T07:20').toLocaleString('pt-BR')},
    {text:`Profissional alocado: ${s.pro}`,time:new Date(s.date+'T07:35').toLocaleString('pt-BR')},
    s.status!=='agendado'&&s.status!=='cancelado'?{text:'Profissional chegou ao endereço',time:`${s.date} às ${s.time}`}:null,
    s.status==='concluido'?{text:'Serviço executado e concluído',time:new Date(s.date+'T'+s.time).toLocaleString('pt-BR')}:null,
    s.status==='concluido'?{text:'Pagamento confirmado via PIX',time:new Date(s.date+'T'+s.time).toLocaleString('pt-BR')}:null,
    s.status==='cancelado'?{text:'Serviço cancelado'+(s.obs?': '+s.obs:''),time:'—'}:null,
  ].filter(Boolean);

  document.getElementById('srvViewBody').innerHTML=`
    <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:18px;padding-bottom:16px;border-bottom:1px solid var(--border)">
      <span class="badge" style="background:${cc}18;color:${cc};font-size:13px;padding:5px 12px">${s.cat}</span>
      <span class="badge ${cls} badge--dot">${lbl}</span>
      <span class="badge bg-neutral" style="font-family:var(--mono)">${s.id}</span>
      <span style="margin-left:auto;font-size:22px;font-weight:900;color:var(--success);font-family:var(--mono)">R$&nbsp;${s.val.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
    </div>
    <div class="detail-grid" style="margin-bottom:20px">
      <div class="detail-item"><div class="detail-label">Cliente</div><div class="detail-value">${s.client}</div></div>
      <div class="detail-item"><div class="detail-label">Profissional</div><div class="detail-value">${s.pro}</div></div>
      <div class="detail-item"><div class="detail-label">Data</div><div class="detail-value">${new Date(s.date+'T12:00').toLocaleDateString('pt-BR')}</div></div>
      <div class="detail-item"><div class="detail-label">Horário</div><div class="detail-value">${s.time}</div></div>
      <div class="detail-item" style="grid-column:1/-1"><div class="detail-label">Endereço</div><div class="detail-value">${s.addr}</div></div>
      <div class="detail-item" style="grid-column:1/-1"><div class="detail-label">Descrição</div><div class="detail-value">${s.desc||'—'}</div></div>
      ${s.obs?`<div class="detail-item" style="grid-column:1/-1"><div class="detail-label">Observações</div><div class="detail-value">${s.obs}</div></div>`:''}
    </div>
    <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text-3);margin-bottom:8px">Histórico</div>
    <div class="timeline">${tl.map(t=>`<div class="tl-item"><div><div class="tl-text">${t.text}</div><div class="tl-time">${t.time}</div></div></div>`).join('')}</div>`;
  openOverlay('srvViewModal');
};

window.deleteSrv = id => {
  if (!confirm(`Excluir serviço ${id}?`)) return;
  DB=DB.filter(s=>s.id!==id); filtered=filtered.filter(s=>s.id!==id);
  renderKpis(); renderTable(); toast('Excluído','Serviço removido.','danger');
};

window.exportSrv = () => { toast('Exportando','Gerando arquivo…','info'); setTimeout(()=>toast('Pronto!','Exportação concluída.','success'),1600); };

document.addEventListener('DOMContentLoaded', () => { renderKpis(); renderTable(); });
