/* =====================================================
   DAFIX ADMIN — RELATÓRIOS v2
   ===================================================== */
'use strict';

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

const KPIS = [
  {label:'Receita Total',        val:548900,  prefix:'R$\u00a0',suffix:'',   delta:'+22%',up:true, color:'#2563EB',bg:'rgba(37,99,235,.1)', emoji:'💰'},
  {label:'Lucro Total',          val:229180,  prefix:'R$\u00a0',suffix:'',   delta:'+18%',up:true, color:'#10B981',bg:'rgba(16,185,129,.1)',emoji:'📈'},
  {label:'Clientes Ativos',      val:1940,    prefix:'',        suffix:'',   delta:'+8%', up:true, color:'#06B6D4',bg:'rgba(6,182,212,.1)', emoji:'👥'},
  {label:'Ticket Médio',         val:384.5,   prefix:'R$\u00a0',suffix:'',   delta:'+5%', up:true, color:'#8B5CF6',bg:'rgba(139,92,246,.1)',emoji:'🎫'},
  {label:'Taxa de Conversão',    val:74.3,    prefix:'',        suffix:'%',  delta:'+3%', up:true, color:'#F59E0B',bg:'rgba(245,158,11,.1)',emoji:'🎯'},
  {label:'Avaliação Média',      val:4.87,    prefix:'',        suffix:' ★', delta:'+0.2',up:true, color:'#F59E0B',bg:'rgba(245,158,11,.1)',emoji:'⭐'},
  {label:'Profissionais Ativos', val:312,     prefix:'',        suffix:'',   delta:'+4%', up:true, color:'#8B5CF6',bg:'rgba(139,92,246,.1)',emoji:'🔧'},
  {label:'Serviços Concluídos',  val:1273,    prefix:'',        suffix:'',   delta:'+16%',up:true, color:'#10B981',bg:'rgba(16,185,129,.1)',emoji:'✅'},
];

const REV_2026  = [64000,72000,85000,91000,108000,128450];
const ANNUAL    = {2024:890000, 2025:1120000, 2026:548900};
const CATS = [
  {label:'Elétrica',    val:387,color:'#2563EB'},{label:'Hidráulica',  val:251,color:'#06B6D4'},
  {label:'Pintura',     val:218,color:'#10B981'},{label:'Montagem',    val:176,color:'#F59E0B'},
  {label:'Instalações', val:132,color:'#8B5CF6'},{label:'Outros',      val:109,color:'#94A3B8'},
];
const HOURS = [
  {label:'06–09h',val: 84,color:'#94A3B8'},{label:'09–12h',val:312,color:'#2563EB'},
  {label:'12–15h',val:198,color:'#06B6D4'},{label:'15–18h',val:276,color:'#10B981'},
  {label:'18–21h',val:143,color:'#F59E0B'},{label:'21–24h',val: 52,color:'#94A3B8'},
];
const RANKING = [
  {name:'Pedro Carvalho',   srv:203,rev:78240,rating:4.7,sat:96},
  {name:'Lucas Teixeira',   srv:124,rev:53180,rating:4.9,sat:98},
  {name:'Carlos Mendes',    srv: 87,rev:37630,rating:4.8,sat:97},
  {name:'Felipe Rodrigues', srv: 56,rev:22480,rating:4.6,sat:93},
  {name:'Marcos Souza',     srv: 44,rev:18960,rating:4.5,sat:91},
];
const RATINGS = [
  {s:5,n:724,p:57},{s:4,n:356,p:28},{s:3,n:115,p:9},{s:2,n:51,p:4},{s:1,n:27,p:2}
];

// ── Canvas helper ──────────────────────────────────
function canvas(id, H=240) {
  const el = document.getElementById(id); if (!el) return null;
  const ctx = el.getContext('2d');
  const W = el.parentElement.offsetWidth;
  el.width=W*devicePixelRatio; el.height=H*devicePixelRatio;
  el.style.width=W+'px'; el.style.height=H+'px';
  ctx.scale(devicePixelRatio,devicePixelRatio);
  ctx.clearRect(0,0,W,H);
  return {ctx,W,H};
}

// ── Revenue line ───────────────────────────────────
function renderRev() {
  const r=canvas('revChart'); if(!r) return;
  const {ctx,W,H}=r;
  const tc=textColor(),gc=gridColor();
  const pad={t:20,r:20,b:36,l:68};
  const cW=W-pad.l-pad.r, cH=H-pad.t-pad.b;
  const n=REV_2026.length, max=Math.max(...REV_2026);
  const sx=cW/(n-1);

  for (let i=0;i<=4;i++) {
    const y=pad.t+(cH/4)*i;
    ctx.beginPath();ctx.strokeStyle=gc;ctx.lineWidth=1;ctx.setLineDash([4,5]);
    ctx.moveTo(pad.l,y);ctx.lineTo(pad.l+cW,y);ctx.stroke();ctx.setLineDash([]);
    const v=max*(1-i/4);
    ctx.fillStyle=tc;ctx.font='10.5px Inter,sans-serif';ctx.textAlign='right';
    ctx.fillText('R$'+(v/1000).toFixed(0)+'k',pad.l-8,y+4);
  }
  MONTHS.slice(0,n).forEach((m,i)=>{
    ctx.fillStyle=tc;ctx.font='10.5px Inter,sans-serif';ctx.textAlign='center';
    ctx.fillText(m,pad.l+i*sx,H-8);
  });

  // area
  ctx.beginPath();
  REV_2026.forEach((v,i)=>{ const x=pad.l+i*sx,y=pad.t+cH-(v/max)*cH; i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); });
  ctx.lineTo(pad.l+(n-1)*sx,pad.t+cH);ctx.lineTo(pad.l,pad.t+cH);ctx.closePath();
  const g=ctx.createLinearGradient(0,pad.t,0,pad.t+cH);
  g.addColorStop(0,'rgba(37,99,235,.2)');g.addColorStop(1,'rgba(37,99,235,.0)');
  ctx.fillStyle=g;ctx.fill();

  // line
  ctx.beginPath();ctx.strokeStyle='#2563EB';ctx.lineWidth=2.5;ctx.lineJoin='round';
  REV_2026.forEach((v,i)=>{ const x=pad.l+i*sx,y=pad.t+cH-(v/max)*cH; i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); });
  ctx.stroke();

  // dots + labels
  REV_2026.forEach((v,i)=>{
    const x=pad.l+i*sx,y=pad.t+cH-(v/max)*cH;
    ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);
    ctx.fillStyle='#2563EB';ctx.fill();
    ctx.strokeStyle=surfaceColor();ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle=tc;ctx.font='bold 10px Inter,sans-serif';ctx.textAlign='center';
    ctx.fillText('R$'+(v/1000).toFixed(0)+'k',x,y-12);
  });
}

// ── Annual bars ────────────────────────────────────
function renderAnn() {
  const r=canvas('annChart'); if(!r) return;
  const {ctx,W,H}=r;
  const tc=textColor(),gc=gridColor();
  const pad={t:20,r:20,b:36,l:72};
  const cW=W-pad.l-pad.r,cH=H-pad.t-pad.b;
  const years=['2024','2025','2026'];
  const max=1250000;
  const colors=['#CBD5E1','#60A5FA','#2563EB'];
  const bW=cW/years.length*0.55;

  for(let i=0;i<=4;i++){
    const y=pad.t+(cH/4)*i;
    ctx.beginPath();ctx.strokeStyle=gc;ctx.lineWidth=1;ctx.setLineDash([4,5]);
    ctx.moveTo(pad.l,y);ctx.lineTo(pad.l+cW,y);ctx.stroke();ctx.setLineDash([]);
    const v=max*(1-i/4);
    ctx.fillStyle=tc;ctx.font='10px Inter,sans-serif';ctx.textAlign='right';
    ctx.fillText('R$'+(v/1000).toFixed(0)+'k',pad.l-6,y+4);
  }

  years.forEach((yr,i)=>{
    const v=ANNUAL[yr];const bH=(v/max)*cH;
    const x=pad.l+(cW/years.length)*i+(cW/years.length-bW)/2;
    const g=ctx.createLinearGradient(0,pad.t+cH-bH,0,pad.t+cH);
    g.addColorStop(0,colors[i]);g.addColorStop(1,colors[i]+'60');
    ctx.fillStyle=g;
    ctx.beginPath();
    if(ctx.roundRect) ctx.roundRect(x,pad.t+cH-bH,bW,bH,[4,4,0,0]);
    else ctx.rect(x,pad.t+cH-bH,bW,bH);
    ctx.fill();
    ctx.fillStyle=tc;ctx.font='11px Inter,sans-serif';ctx.textAlign='center';
    ctx.fillText(yr,x+bW/2,H-8);
    if(bH>24){ctx.fillStyle='#fff';ctx.font='bold 10px Inter,sans-serif';ctx.fillText('R$'+(v/1000).toFixed(0)+'k',x+bW/2,pad.t+cH-bH+16);}
  });
}

// ── Category horizontal bars ───────────────────────
function renderCat() {
  const r=canvas('catChart'); if(!r) return;
  const {ctx,W,H}=r;
  const tc=textColor(),gc=gridColor();
  const pad={t:8,r:50,b:8,l:82};
  const cW=W-pad.l-pad.r,cH=H-pad.t-pad.b;
  const n=CATS.length,rowH=cH/n,bH=rowH*0.52;
  const max=Math.max(...CATS.map(c=>c.val));

  CATS.forEach((d,i)=>{
    const y=pad.t+i*rowH+(rowH-bH)/2;
    const w=(d.val/max)*cW;
    ctx.fillStyle=gc;
    if(ctx.roundRect) ctx.beginPath(),ctx.roundRect(pad.l,y,cW,bH,[3]),ctx.fill();
    else {ctx.fillRect(pad.l,y,cW,bH);}
    const g=ctx.createLinearGradient(pad.l,0,pad.l+w,0);
    g.addColorStop(0,d.color);g.addColorStop(1,d.color+'70');
    ctx.fillStyle=g;
    if(ctx.roundRect) ctx.beginPath(),ctx.roundRect(pad.l,y,w,bH,[3]),ctx.fill();
    else ctx.fillRect(pad.l,y,w,bH);
    ctx.fillStyle=tc;ctx.font='11.5px Inter,sans-serif';ctx.textAlign='right';
    ctx.fillText(d.label,pad.l-8,y+bH/2+4);
    ctx.fillStyle=d.color;ctx.font='bold 11px Inter,sans-serif';ctx.textAlign='left';
    ctx.fillText(d.val,pad.l+cW+6,y+bH/2+4);
  });
}

// ── Hours bars ─────────────────────────────────────
function renderHr() {
  const r=canvas('hrChart'); if(!r) return;
  const {ctx,W,H}=r;
  const tc=textColor(),gc=gridColor();
  const pad={t:20,r:20,b:36,l:42};
  const cW=W-pad.l-pad.r,cH=H-pad.t-pad.b;
  const n=HOURS.length,max=Math.max(...HOURS.map(d=>d.val));
  const bW=cW/n*0.62;

  for(let i=0;i<=4;i++){
    const y=pad.t+(cH/4)*i;
    ctx.beginPath();ctx.strokeStyle=gc;ctx.lineWidth=1;ctx.setLineDash([4,5]);
    ctx.moveTo(pad.l,y);ctx.lineTo(pad.l+cW,y);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle=tc;ctx.font='10px Inter,sans-serif';ctx.textAlign='right';
    ctx.fillText(Math.round(max*(1-i/4)),pad.l-5,y+4);
  }

  HOURS.forEach((d,i)=>{
    const bH=(d.val/max)*cH;
    const x=pad.l+(cW/n)*i+(cW/n-bW)/2;
    const isMax=d.val===max;
    const c=isMax?'#2563EB':d.color;
    const g=ctx.createLinearGradient(0,pad.t+cH-bH,0,pad.t+cH);
    g.addColorStop(0,c);g.addColorStop(1,c+'50');
    ctx.fillStyle=g;
    ctx.beginPath();
    if(ctx.roundRect) ctx.roundRect(x,pad.t+cH-bH,bW,bH,[3,3,0,0]);
    else ctx.rect(x,pad.t+cH-bH,bW,bH);
    ctx.fill();
    if(isMax){ctx.fillStyle='rgba(37,99,235,.1)';ctx.fillRect(x-2,pad.t,bW+4,cH);}
    ctx.fillStyle=tc;ctx.font='10px Inter,sans-serif';ctx.textAlign='center';
    ctx.fillText(d.label,x+bW/2,H-8);
    if(bH>18){ctx.fillStyle='#fff';ctx.font='bold 10px Inter,sans-serif';ctx.fillText(d.val,x+bW/2,pad.t+cH-bH+14);}
  });
}

// ── KPIs ──────────────────────────────────────────
function renderKpis() {
  document.getElementById('repKpis').innerHTML = KPIS.map(k=>`
    <div class="kpi" style="--kpi-accent:${k.color};--kpi-bg:${k.bg}">
      <div class="kpi__top">
        <div class="kpi__icon" style="font-size:18px">${k.emoji}</div>
        <div class="kpi__delta ${k.up?'up':'down'}">${k.delta}</div>
      </div>
      <div class="kpi__value">
        <span data-count="${k.val}" data-prefix="${k.prefix}" data-suffix="${k.suffix}">0</span>
      </div>
      <div class="kpi__label">${k.label}</div>
    </div>`).join('');
  animateCounters();
}

// ── Ranking ────────────────────────────────────────
function renderRanking() {
  const RANK_STYLE = [
    'background:#FEF3C7;color:#D97706',
    'background:#F1F5F9;color:#475569',
    'background:#FEE2E2;color:#B45309',
    'background:var(--surface-2);color:var(--text-3)',
    'background:var(--surface-2);color:var(--text-3)',
  ];
  document.getElementById('rankTable').innerHTML=`
    <thead><tr>
      <th>Pos.</th><th>Profissional</th><th>Serviços</th><th>Receita</th><th>Avaliação</th><th>Satisfação</th>
    </tr></thead>
    <tbody>${RANKING.map((p,i)=>`<tr>
      <td><div style="width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;${RANK_STYLE[i]}">${i+1}</div></td>
      <td style="font-weight:600">${p.name}</td>
      <td style="font-family:var(--mono);font-weight:600">${p.srv}</td>
      <td style="font-weight:700;color:var(--success);font-family:var(--mono)">R$&nbsp;${p.rev.toLocaleString('pt-BR')}</td>
      <td style="color:var(--warning);font-weight:700">${p.rating}&nbsp;★</td>
      <td style="min-width:130px">
        <div class="sat-wrap">
          <div class="sat-bar"><div class="sat-fill" style="width:${p.sat}%"></div></div>
          <div class="sat-pct">${p.sat}%</div>
        </div>
      </td>
    </tr>`).join('')}</tbody>`;
}

// ── Rating bars ────────────────────────────────────
function renderRatings() {
  document.getElementById('ratingBars').innerHTML = RATINGS.map(r=>`
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:11px">
      <div style="width:20px;text-align:right;font-size:12px;font-weight:700;color:var(--text-2)">${r.s}</div>
      <div style="font-size:14px;color:var(--warning)">★</div>
      <div style="flex:1;height:8px;background:var(--border);border-radius:99px;overflow:hidden">
        <div style="height:100%;width:${r.p}%;background:linear-gradient(90deg,#F59E0B,#FBBF24);border-radius:99px;transition:width .8s cubic-bezier(.4,0,.2,1)"></div>
      </div>
      <div style="width:36px;font-size:11.5px;color:var(--text-3);font-weight:500;text-align:right">${r.n}</div>
    </div>`).join('');
}

window.doExport = type => {
  toast('Exportando', `Gerando arquivo ${type}…`, 'info');
  setTimeout(()=>toast('Pronto!',`${type} exportado com sucesso.`,'success'), 1700);
};

// ── Init ───────────────────────────────────────────
function init() {
  renderKpis(); renderRanking(); renderRatings();
  setTimeout(() => { renderRev(); renderAnn(); renderCat(); renderHr(); }, 80);
}

document.addEventListener('DOMContentLoaded', init);

new MutationObserver(()=>{ renderRev(); renderAnn(); renderCat(); renderHr(); })
  .observe(document.documentElement, {attributes:true, attributeFilter:['data-theme']});

window.addEventListener('resize', ()=>{ renderRev(); renderAnn(); renderCat(); renderHr(); });
