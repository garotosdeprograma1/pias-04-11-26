/* =====================================================
   DAFIX ADMIN — DASHBOARD v2
   ===================================================== */
'use strict';

// ── Data ──────────────────────────────────────────
const KPIS = [
  { label:'Total Usuários',   val:2480,   prefix:'',     suffix:'',   delta:+12.4, color:'#2563EB', bg:'rgba(37,99,235,.1)',  emoji:'👥', tip:'Usuários cadastrados na plataforma' },
  { label:'Clientes Ativos',  val:1940,   prefix:'',     suffix:'',   delta:+8.2,  color:'#06B6D4', bg:'rgba(6,182,212,.1)',  emoji:'🧑', tip:'Clientes com atividade nos últimos 90 dias' },
  { label:'Funcionários',     val:312,    prefix:'',     suffix:'',   delta:+4.1,  color:'#8B5CF6', bg:'rgba(139,92,246,.1)', emoji:'🔧', tip:'Profissionais ativos na plataforma' },
  { label:'Agendados',        val:184,    prefix:'',     suffix:'',   delta:+21.3, color:'#F59E0B', bg:'rgba(245,158,11,.1)', emoji:'📅', tip:'Serviços aguardando execução' },
  { label:'Concluídos',       val:1273,   prefix:'',     suffix:'',   delta:+15.7, color:'#10B981', bg:'rgba(16,185,129,.1)', emoji:'✅', tip:'Serviços finalizados com sucesso' },
  { label:'Cancelamentos',    val:87,     prefix:'',     suffix:'',   delta:-6.3,  color:'#EF4444', bg:'rgba(239,68,68,.1)',  emoji:'❌', tip:'Serviços cancelados no período' },
  { label:'Receita Mensal',   val:128450, prefix:'R$\u00a0', suffix:'', delta:+18.9, color:'#2563EB', bg:'rgba(37,99,235,.1)',  emoji:'💰', tip:'Receita total do mês atual' },
  { label:'Lucro Mensal',     val:54180,  prefix:'R$\u00a0', suffix:'', delta:+22.1, color:'#10B981', bg:'rgba(16,185,129,.1)', emoji:'📈', tip:'Lucro líquido do mês atual' },
  { label:'Avaliação Média',  val:4.87,   prefix:'',     suffix:' ★', delta:+0.2,  color:'#F59E0B', bg:'rgba(245,158,11,.1)', emoji:'⭐', tip:'Média geral de avaliações dos clientes' },
];

const LINE_DATA = {
  2026: {
    receita:[64000,72000,85000,91000,108000,128450],
    gastos: [38000,41000,46000,50000,60000, 74270],
    lucro:  [26000,31000,39000,41000,48000, 54180],
  },
  2025: {
    receita:[44000,49000,58000,63000,74000,88000,95000,102000,99000,110000,118000,123000],
    gastos: [28000,31000,36000,38000,44000,52000,55000,60000, 57000,63000, 68000, 71000],
    lucro:  [16000,18000,22000,25000,30000,36000,40000,42000, 42000,47000, 50000, 52000],
  },
};

const DONUT_DATA = [
  { label:'Elétrica',    val:32, color:'#2563EB' },
  { label:'Hidráulica',  val:21, color:'#06B6D4' },
  { label:'Pintura',     val:18, color:'#10B981' },
  { label:'Montagem',    val:14, color:'#F59E0B' },
  { label:'Instalações', val:10, color:'#8B5CF6' },
  { label:'Outros',      val:5,  color:'#94A3B8' },
];

const BAR_DATA = {
  clientes:     [42,58,71,83,90,110,128,104,132,118,145,156],
  funcionarios: [8, 12,15,10,18,22, 20, 14, 19, 25, 28, 30 ],
};

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

const SERVICES = [
  { id:'#892', client:'Ana Oliveira',    pro:'Carlos M.', cat:'Elétrica',    val:350, date:'18/06', status:'concluido' },
  { id:'#891', client:'Pedro Costa',     pro:'Lucas T.',  cat:'Hidráulica',  val:280, date:'18/06', status:'andamento' },
  { id:'#890', client:'Maria Santos',    pro:'Felipe R.', cat:'Pintura',     val:620, date:'17/06', status:'agendado'  },
  { id:'#889', client:'João Costa',      pro:'Carlos M.', cat:'Montagem',    val:190, date:'17/06', status:'concluido' },
  { id:'#888', client:'Lucia Ferreira',  pro:'Lucas T.',  cat:'Instalações', val:450, date:'16/06', status:'cancelado' },
  { id:'#887', client:'Ricardo Alves',   pro:'Felipe R.', cat:'Elétrica',    val:310, date:'16/06', status:'concluido' },
  { id:'#886', client:'Fabiana Lima',    pro:'Carlos M.', cat:'Hidráulica',  val:520, date:'15/06', status:'pendente'  },
];

const FEED = [
  { ico:'👤', bg:'rgba(37,99,235,.12)',  color:'#2563EB', title:'Novo usuário cadastrado',  desc:'João Paulo Santos criou conta',   time:'há 2 min'  },
  { ico:'✅', bg:'rgba(16,185,129,.12)', color:'#10B981', title:'Serviço #892 concluído',   desc:'Elétrica finalizada por Carlos M.',time:'há 15 min' },
  { ico:'⭐', bg:'rgba(245,158,11,.12)', color:'#F59E0B', title:'Avaliação 5★ recebida',    desc:'Ana Oliveira avaliou Carlos M.',  time:'há 28 min' },
  { ico:'💰', bg:'rgba(16,185,129,.12)', color:'#10B981', title:'Pagamento aprovado',       desc:'R$ 350,00 confirmado via PIX',    time:'há 45 min' },
  { ico:'🛠', bg:'rgba(139,92,246,.12)', color:'#8B5CF6', title:'Novo serviço agendado',    desc:'Pintura marcada para 19/06',      time:'há 1h'     },
  { ico:'👤', bg:'rgba(6,182,212,.12)',  color:'#06B6D4', title:'Funcionário cadastrado',   desc:'Felipe Rodrigues entrou na plataforma', time:'há 2h' },
];

const STATUS = {
  concluido: ['bg-success', 'Concluído'],
  andamento: ['bg-info',    'Em Andamento'],
  agendado:  ['bg-warning', 'Agendado'],
  cancelado: ['bg-danger',  'Cancelado'],
  pendente:  ['bg-neutral', 'Pendente'],
};

// ── Chart helpers ──────────────────────────────────
function setupCanvas(id, h = 260) {
  const el = document.getElementById(id);
  if (!el) return null;
  const ctx = el.getContext('2d');
  const W = el.parentElement.offsetWidth;
  el.width  = W * devicePixelRatio;
  el.height = h * devicePixelRatio;
  el.style.width  = W + 'px';
  el.style.height = h + 'px';
  ctx.scale(devicePixelRatio, devicePixelRatio);
  ctx.clearRect(0, 0, W, h);
  return { ctx, W, H: h };
}

function drawGrid(ctx, pad, cW, cH, total, max, months, tc, gc) {
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + (cH / 4) * i;
    ctx.beginPath(); ctx.strokeStyle = gc; ctx.lineWidth = 1; ctx.setLineDash([4, 5]);
    ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + cW, y); ctx.stroke();
    ctx.setLineDash([]);
    const v = max * (1 - i / 4);
    ctx.fillStyle = tc; ctx.font = '10.5px Inter,sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(v >= 1000 ? 'R$' + (v / 1000).toFixed(0) + 'k' : v, pad.l - 8, y + 4);
  }
  for (let i = 0; i < total; i++) {
    const x = pad.l + (cW / (total - 1)) * i;
    ctx.fillStyle = tc; ctx.font = '10.5px Inter,sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(months[i], x, pad.t + cH + 20);
  }
}

// ── Line Chart ─────────────────────────────────────
function renderLine(year = '2026') {
  const r = setupCanvas('lineChart', 260);
  if (!r) return;
  const { ctx, W, H } = r;
  const tc = textColor(), gc = gridColor();
  const d = LINE_DATA[year];
  const series = [
    { data: d.receita, color: '#2563EB', label: 'Receita' },
    { data: d.gastos,  color: '#EF4444', label: 'Gastos' },
    { data: d.lucro,   color: '#10B981', label: 'Lucro' },
  ];
  const n   = d.receita.filter(v => v > 0).length;
  const max = Math.max(...d.receita.slice(0, n));
  const pad = { t:20, r:20, b:36, l:66 };
  const cW  = W - pad.l - pad.r;
  const cH  = H - pad.t - pad.b;
  const sx  = cW / (n - 1);
  const months = MONTHS.slice(0, n);

  drawGrid(ctx, pad, cW, cH, n, max, months, tc, gc);

  series.forEach(({ data, color }) => {
    const pts = data.slice(0, n);
    // area
    ctx.beginPath();
    pts.forEach((v, i) => {
      const x = pad.l + i * sx, y = pad.t + cH - (v / max) * cH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo(pad.l + (n - 1) * sx, pad.t + cH);
    ctx.lineTo(pad.l, pad.t + cH);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, pad.t, 0, pad.t + cH);
    g.addColorStop(0, color + '28'); g.addColorStop(1, color + '00');
    ctx.fillStyle = g; ctx.fill();

    // line
    ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2.2;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    pts.forEach((v, i) => {
      const x = pad.l + i * sx, y = pad.t + cH - (v / max) * cH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // dots
    pts.forEach((v, i) => {
      const x = pad.l + i * sx, y = pad.t + cH - (v / max) * cH;
      ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
      ctx.strokeStyle = surfaceColor(); ctx.lineWidth = 2; ctx.stroke();
    });
  });

  // Legend
  document.getElementById('lineLegend').innerHTML = series.map(s =>
    `<div class="legend-item"><div class="legend-dot" style="background:${s.color}"></div>${s.label}</div>`
  ).join('');
}

// ── Donut Chart ────────────────────────────────────
function renderDonut() {
  const el = document.getElementById('donutChart');
  if (!el) return;
  const ctx = el.getContext('2d');
  const S = 148;
  el.width = S * devicePixelRatio; el.height = S * devicePixelRatio;
  el.style.width = S + 'px'; el.style.height = S + 'px';
  ctx.scale(devicePixelRatio, devicePixelRatio);

  const cx = S / 2, cy = S / 2, R = 58, r = 36;
  const total = DONUT_DATA.reduce((s, d) => s + d.val, 0);
  let angle = -Math.PI / 2;
  const gap = 0.04;

  DONUT_DATA.forEach(d => {
    const slice = (d.val / total) * Math.PI * 2 - gap;
    ctx.beginPath();
    ctx.arc(cx, cy, R, angle + gap / 2, angle + slice + gap / 2);
    ctx.arc(cx, cy, r, angle + slice + gap / 2, angle + gap / 2, true);
    ctx.closePath();
    ctx.fillStyle = d.color; ctx.fill();
    angle += (d.val / total) * Math.PI * 2;
  });

  // hole
  ctx.beginPath(); ctx.arc(cx, cy, r - 2, 0, Math.PI * 2);
  ctx.fillStyle = surfaceColor(); ctx.fill();

  // center
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = isDark() ? '#F1F5F9' : '#0F172A';
  ctx.font = 'bold 18px Inter,sans-serif';
  ctx.fillText('1.273', cx, cy - 8);
  ctx.font = '11px Inter,sans-serif'; ctx.fillStyle = textColor();
  ctx.fillText('serviços', cx, cy + 10);

  // Legend
  document.getElementById('donutLegend').innerHTML = DONUT_DATA.map(d =>
    `<div class="dl-item">
      <div class="dl-label"><div class="legend-dot" style="background:${d.color}"></div>${d.label}</div>
      <div class="dl-val" style="color:${d.color}">${d.val}%</div>
    </div>`
  ).join('');
}

// ── Bar Chart ──────────────────────────────────────
function renderBar() {
  const r = setupCanvas('barChart', 240);
  if (!r) return;
  const { ctx, W, H } = r;
  const tc = textColor(), gc = gridColor();
  const n = MONTHS.length;
  const max = Math.max(...BAR_DATA.clientes, ...BAR_DATA.funcionarios);
  const pad = { t:20, r:20, b:36, l:40 };
  const cW = W - pad.l - pad.r, cH = H - pad.t - pad.b;
  const gW = cW / n, bW = gW * 0.3;

  // grid
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + (cH / 4) * i;
    ctx.beginPath(); ctx.strokeStyle = gc; ctx.lineWidth = 1; ctx.setLineDash([4, 5]);
    ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + cW, y); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = tc; ctx.font = '10px Inter,sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(Math.round(max * (1 - i / 4)), pad.l - 5, y + 4);
  }

  MONTHS.forEach((m, i) => {
    const gx = pad.l + i * gW + gW / 2;
    const drawBar = (val, x, color1, color2) => {
      const bH = (val / max) * cH;
      const y  = pad.t + cH - bH;
      const g = ctx.createLinearGradient(0, y, 0, y + bH);
      g.addColorStop(0, color1); g.addColorStop(1, color2);
      ctx.fillStyle = g;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, bW, bH, [3, 3, 0, 0]);
      else { ctx.moveTo(x + 3, y); ctx.lineTo(x + bW - 3, y); ctx.quadraticCurveTo(x + bW, y, x + bW, y + 3); ctx.lineTo(x + bW, y + bH); ctx.lineTo(x, y + bH); ctx.lineTo(x, y + 3); ctx.quadraticCurveTo(x, y, x + 3, y); }
      ctx.fill();
    };
    drawBar(BAR_DATA.clientes[i],     gx - bW - 2, '#2563EB', '#1D4ED880');
    drawBar(BAR_DATA.funcionarios[i], gx + 2,      '#10B981', '#05966980');
    ctx.fillStyle = tc; ctx.font = '10px Inter,sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(m, gx, H - 10);
  });

  document.getElementById('barLegend').innerHTML = `
    <div class="legend-item"><div class="legend-dot" style="background:#2563EB"></div>Novos Clientes</div>
    <div class="legend-item"><div class="legend-dot" style="background:#10B981"></div>Novos Profissionais</div>`;
}

// ── KPIs ──────────────────────────────────────────
function renderKPIs() {
  document.getElementById('kpiGrid').innerHTML = KPIS.map(k => `
    <div class="kpi" style="--kpi-accent:${k.color};--kpi-bg:${k.bg}" data-tip="${k.tip}">
      <div class="kpi__top">
        <div class="kpi__icon" style="font-size:18px">${k.emoji}</div>
        <div class="kpi__delta ${k.delta >= 0 ? 'up' : 'down'}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">${k.delta >= 0 ? '<polyline points="18 15 12 9 6 15"/>' : '<polyline points="6 9 12 15 18 9"/>'}</svg>
          ${Math.abs(k.delta)}%
        </div>
      </div>
      <div class="kpi__value">
        <span data-count="${k.val}" data-prefix="${k.prefix}" data-suffix="${k.suffix}">0</span>
      </div>
      <div class="kpi__label">${k.label}</div>
    </div>
  `).join('');
  animateCounters();
}

// ── Table ──────────────────────────────────────────
function renderTable() {
  document.getElementById('srvBody').innerHTML = SERVICES.map(s => {
    const [cls, lbl] = STATUS[s.status] || ['bg-neutral', s.status];
    return `<tr>
      <td><span style="font-family:var(--mono);font-size:12px;font-weight:600;color:var(--primary)">${s.id}</span></td>
      <td style="font-weight:600">${s.client}</td>
      <td style="color:var(--text-2)">${s.pro}</td>
      <td><span class="badge ${cls}">${s.cat}</span></td>
      <td style="font-weight:700;font-family:var(--mono)">R$&nbsp;${s.val.toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
      <td style="color:var(--text-2)">${s.date}/26</td>
      <td><span class="badge ${cls} badge--dot">${lbl}</span></td>
    </tr>`;
  }).join('');
}

// ── Feed ───────────────────────────────────────────
function renderFeed() {
  document.getElementById('feedList').innerHTML = FEED.map(f => `
    <div class="feed-item">
      <div class="feed-ico" style="background:${f.bg};font-size:14px">${f.ico}</div>
      <div class="feed-body">
        <div class="feed-title">${f.title}</div>
        <div class="feed-desc">${f.desc}</div>
        <div class="feed-time">${f.time}</div>
      </div>
    </div>`).join('');
}

// ── Init ───────────────────────────────────────────
function init() {
  renderKPIs();
  renderTable();
  renderFeed();
  setTimeout(() => {
    renderLine('2026');
    renderDonut();
    renderBar();
  }, 60);
}

document.addEventListener('DOMContentLoaded', init);

// Re-render on theme toggle
new MutationObserver(() => { renderLine(document.querySelector('[onchange]')?.value || '2026'); renderDonut(); renderBar(); })
  .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

window.addEventListener('resize', () => { renderLine(); renderBar(); });
window.renderLine = renderLine;
