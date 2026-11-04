/* Página: Gestão de Pedidos */
(function () {
    const STORAGE_KEY = "mda.pro.orders";
    const STATUS_LABELS = {
      pending: "Aguardando aceite",
      progress: "Em andamento",
      scheduled: "Agendado",
      completed: "Concluído",
      rejected: "Recusado"
    };

    const COLUMNS = [
      { key: "pending", label: "Aguardando", color: "#9b7635" },
      { key: "progress", label: "Em andamento", color: "#203b30" },
      { key: "scheduled", label: "Agendado", color: "#b95d43" },
      { key: "completed", label: "Concluído", color: "#2f704b" }
    ];

    const DEFAULT_ORDERS = [
      { id: "#2398", title: "Instalação de chuveiro", client: "Mariana Costa", initials: "MC", color: "#203b30", price: 480, status: "progress", date: "Hoje, 14:00", address: "Rua das Flores, 128 · Vila Mariana", phone: "(11) 98765-4321", desc: "Cliente precisa instalar chuveiro elétrico 220V no banheiro social." },
      { id: "#2399", title: "Conserto de tomada", client: "Pedro Henrique", initials: "PH", color: "#b95d43", price: 180, status: "pending", date: "Aguardando aceite", address: "Av. Paulista, 900 · Bela Vista", phone: "(11) 97654-3210", desc: "Tomada da sala apresenta faíscas ao conectar aparelhos." },
      { id: "#2400", title: "Pintura de quarto", client: "Beatriz Alves", initials: "BA", color: "#a06658", price: 620, status: "pending", date: "Aguardando aceite", address: "Rua Harmonia, 45 · Pinheiros", phone: "(11) 96543-2109", desc: "Quarto de 12m², tinta acrílica branca já comprada pela cliente." },
      { id: "#2401", title: "Vazamento na pia", client: "Roberto Dias", initials: "RD", color: "#607866", price: 220, status: "pending", date: "Aguardando aceite", address: "Rua dos Pinheiros, 310 · Pinheiros", phone: "(11) 95432-1098", desc: "Vazamento embaixo da pia da cozinha, possível troca de vedante." },
      { id: "#2402", title: "Manutenção elétrica", client: "Cond. Verde Vida", initials: "VV", color: "#2f704b", price: 720, status: "scheduled", date: "15/Mar, 08:30", address: "Condomínio Verde Vida · Bloco B", phone: "(11) 94321-0987", desc: "Manutenção preventiva no quadro elétrico do condomínio." },
      { id: "#2403", title: "Montagem de móveis", client: "Tatiana Borges", initials: "TB", color: "#9b7635", price: 320, status: "scheduled", date: "13/Mar, 09:00", address: "Rua Augusta, 512 · Consolação", phone: "(11) 93210-9876", desc: "Montagem de guarda-roupa e estante de escritório." },
      { id: "#2404", title: "Troca de chuveiro", client: "Lucas Martins", initials: "LM", color: "#203b30", price: 280, status: "scheduled", date: "16/Mar, 11:00", address: "Rua Vergueiro, 2100 · Vila Mariana", phone: "(11) 92109-8765", desc: "Substituição de chuveiro antigo por modelo Lorenzetti." },
      { id: "#2396", title: "Reparo hidráulico", client: "João Pereira", initials: "JP", color: "#2f704b", price: 540, status: "progress", date: "Hoje, 10:30", address: "Rua Domingos de Morais, 88 · Vila Mariana", phone: "(11) 91098-7654", desc: "Reparo de vazamento no registro do banheiro." },
      { id: "#2397", title: "Conserto elétrico", client: "Rafael Lima", initials: "RL", color: "#b95d43", price: 260, status: "completed", date: "Ontem, 16:20", rating: 5, ratingNote: "Ótimo profissional, rápido e organizado!", address: "Rua da Consolação, 1500 · Consolação", phone: "(11) 90987-6543", desc: "Troca de disjuntor e revisão de fiação." },
      { id: "#2395", title: "Reparo de torneira", client: "Sofía Mendes", initials: "SM", color: "#a06658", price: 140, status: "completed", date: "Ontem, 14:00", rating: 4, ratingNote: "Muito bom, resolveu o problema rapidinho.", address: "Rua Haddock Lobo, 72 · Cerqueira César", phone: "(11) 89876-5432", desc: "Torneira da cozinha com gotejamento constante." },
      { id: "#2394", title: "Instalação de lustres", client: "André Souza", initials: "AS", color: "#607866", price: 380, status: "completed", date: "Há 2 dias", rating: 5, ratingNote: "Perfeito! Muito cuidadoso com os acabamentos.", address: "Rua Bela Cintra, 400 · Jardins", phone: "(11) 88765-4321", desc: "Instalação de 3 lustres na sala e corredor." },
      { id: "#2393", title: "Pintura de fachada", client: "Helena Castro", initials: "HC", color: "#9b7635", price: 1240, status: "completed", date: "Há 3 dias", rating: 4, ratingNote: "Excelente trabalho, recomendo muito.", address: "Rua Estados Unidos, 1200 · Jardins", phone: "(11) 87654-3210", desc: "Pintura externa de fachada residencial, 2 andares." }
    ];

    let ORDERS = [];

    function loadOrders() {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
        if (Array.isArray(saved) && saved.length) {
          const legacyColors = { "#3B82F6": "#203b30", "#8B5CF6": "#b95d43", "#F43F5E": "#a06658", "#14B8A6": "#607866", "#10B981": "#2f704b", "#F59E0B": "#9b7635" };
          return saved.map(order => ({ ...order, color: legacyColors[String(order.color).toUpperCase()] || order.color }));
        }
      } catch { /* ignore */ }
      return DEFAULT_ORDERS.map(o => ({ ...o }));
    }

    function saveOrders() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ORDERS));
    }

    function orderHTML(o) {
      return `
        <article class="order-card" data-order-id="${o.id}" data-status="${o.status}" data-name="${(o.title + ' ' + o.client).toLowerCase()}">
          <div class="order-card__head">
            <span class="order-card__id">${o.id}</span>
            <button class="icon-btn icon-btn--sm" data-action="open-order" data-order-id="${o.id}" aria-label="Opções do pedido"><svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg></button>
          </div>
          <p class="order-card__title">${o.title}</p>
          <div class="order-card__client"><span class="avatar avatar--sm" style="--bg:${o.color};--size:28px;font-size:11px"><span class="avatar__initials">${o.initials}</span></span>${o.client}</div>
          <div class="order-card__foot">
            <span class="order-card__date"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/><path d="M12 7v5l3 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>${o.date}</span>
            <span class="order-card__price">R$ ${o.price.toLocaleString("pt-BR")}</span>
          </div>
        </article>`;
    }

    function render(filter = "all", search = "") {
      const kanban = document.getElementById("kanban");
      if (!kanban) return;
      kanban.innerHTML = COLUMNS.map((col) => {
        let list = ORDERS.filter(o => o.status === col.key);
        if (filter !== "all" && filter !== col.key) list = [];
        if (search) list = list.filter(o => o.title.toLowerCase().includes(search) || o.client.toLowerCase().includes(search) || o.id.includes(search));
        return `
          <div class="kanban__col" data-col="${col.key}">
            <header class="kanban__head">
              <div class="kanban__title"><span class="kanban__dot" style="background:${col.color}"></span>${col.label}</div>
              <span class="kanban__count">${list.length}</span>
            </header>
            ${list.length ? list.map(orderHTML).join("") : `<div class="empty-state" style="padding:24px 12px"><p style="font-size:12px;color:var(--text-soft)">Nenhum pedido</p></div>`}
          </div>`;
      }).join("");
    }

    function fillOrderModal(order) {
      const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      set("orderDetailId", order.id);
      set("orderDetailTitle", order.title);
      set("orderDetailClient", order.client);
      set("orderDetailPrice", `R$ ${order.price.toLocaleString("pt-BR")}`);
      set("orderDetailDate", order.date);
      set("orderDetailAddress", order.address || "—");
      set("orderDetailPhone", order.phone || "—");
      set("orderDetailDesc", order.desc || "—");
      set("orderDetailStatus", STATUS_LABELS[order.status] || order.status);

      const avatar = document.getElementById("orderDetailAvatar");
      if (avatar) {
        avatar.style.setProperty("--bg", order.color);
        const initials = avatar.querySelector(".avatar__initials");
        if (initials) initials.textContent = order.initials;
      }

      const modal = document.getElementById("orderDetailModal");
      if (modal) modal.dataset.orderId = order.id;

      const acceptBtn = document.getElementById("orderAccept");
      const rejectBtn = document.getElementById("orderReject");
      const startBtn = document.getElementById("orderStart");
      const completeBtn = document.getElementById("orderComplete");
      const cancelBtn = document.getElementById("orderCancel");

      const show = (el, visible) => { if (el) el.style.display = visible ? "" : "none"; };
      show(acceptBtn,  order.status === "pending");
      show(rejectBtn,  order.status === "pending");
      show(startBtn,   order.status === "scheduled");
      show(completeBtn, order.status === "progress");
      show(cancelBtn,  order.status === "progress" || order.status === "scheduled");

      const ratingWrap = document.getElementById("orderDetailRating");
      const starsEl = document.getElementById("orderDetailStars");
      const ratingNote = document.getElementById("orderDetailRatingNote");
      if (ratingWrap) {
        if (order.status === "completed" && order.rating) {
          ratingWrap.hidden = false;
          if (starsEl) {
            starsEl.innerHTML = [1,2,3,4,5].map(n =>
              `<svg class="star-icon${n <= order.rating ? " star-icon--filled" : ""}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2l2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1L3.2 9.4l6.1-.9L12 2Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`
            ).join("");
          }
          if (ratingNote) ratingNote.textContent = order.ratingNote || "";
        } else {
          ratingWrap.hidden = true;
        }
      }
    }

    window._getOrderById = (id) => ORDERS.find(o => o.id === id) || null;

    window._updateOrderStatus = (id, status, extra = {}) => {
      const idx = ORDERS.findIndex(o => o.id === id);
      if (idx === -1) return false;
      ORDERS[idx] = { ...ORDERS[idx], status, ...extra };
      saveOrders();
      render(currentFilter, currentSearch);
      return true;
    };

    window._exportOrders = (filter) => {
      const STATUS_MAP = {
        pending: "Aguardando aceite",
        progress: "Em andamento",
        scheduled: "Agendado",
        completed: "Concluído",
        rejected: "Recusado"
      };
      let rows = filter && filter !== "all" ? ORDERS.filter(o => o.status === filter) : ORDERS;
      const BOM = "\uFEFF";
      const headers = ["ID", "Serviço", "Cliente", "Valor (R$)", "Status", "Data", "Endereço", "Telefone", "Avaliação", "Comentário"];
      const esc = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const lines = [
        headers.join(";"),
        ...rows.map(o => [
          esc(o.id),
          esc(o.title),
          esc(o.client),
          esc(o.price),
          esc(STATUS_MAP[o.status] || o.status),
          esc(o.date),
          esc(o.address || ""),
          esc(o.phone || ""),
          esc(o.rating ? `${o.rating}/5` : ""),
          esc(o.ratingNote || "")
        ].join(";"))
      ];
      const csv = BOM + lines.join("\r\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const today = new Date();
      const date = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
      a.href = url;
      a.download = `pedidos-${date}.csv`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
      return rows.length;
    };

    window._openOrderDetail = (id) => {
      const order = window._getOrderById(id);
      if (!order) return;
      fillOrderModal(order);
      if (typeof window._openModal === "function") window._openModal("orderDetailModal");
    };

    let currentFilter = "all", currentSearch = "";
    window._applyFilter = (f) => { currentFilter = f; render(currentFilter, currentSearch); };
    window._applySearch = (s) => { currentSearch = s; render(currentFilter, currentSearch); };
    window._initPedidosPage = () => {
      ORDERS = loadOrders();
      render();
      initOrderClicks();
    };

    function initOrderClicks() {
      const kanban = document.getElementById("kanban");
      if (!kanban || kanban.dataset.clicksBound) return;
      kanban.dataset.clicksBound = "1";
      kanban.addEventListener("click", (e) => {
        if (e.target.closest("[data-action]")) return;
        const card = e.target.closest(".order-card");
        if (!card) return;
        const id = card.dataset.orderId;
        if (id) window._openOrderDetail(id);
      });
    }

    function autoInit() {
      ORDERS = loadOrders();
      render();
      initOrderClicks();
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", autoInit);
    } else {
      setTimeout(autoInit, 0);
    }
  })();
