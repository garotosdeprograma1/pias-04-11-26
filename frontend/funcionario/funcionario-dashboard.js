/* =====================================================
   MARIDO DE ALUGUEL · ÁREA DO PROFISSIONAL
   funcionario-dashboard.js — todas as ações funcionais
   ===================================================== */

   (function () {
    "use strict";
  
    const $  = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
    const onReady = (fn) => document.readyState !== "loading" ? fn() : document.addEventListener("DOMContentLoaded", fn);
    const PAGE = document.body.dataset.page || "dashboard";
    const account = window.DafixAccount;
    if (!account) return;
  
    const STORAGE = {
      THEME: "dafix_theme",
      SIDEBAR: account.key("sidebar"),
      SETTINGS: account.key("settings")
    };
  
    /* ====== TOASTS ====== */
    function showToast({ title, message, type = "success", duration = 3800 }) {
      const wrap = $("#toasts");
      if (!wrap) return;
      const icons = {
        success: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 12l4 4 10-10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        info:    '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M12 8h.01M11 12h1v5h1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
        warning: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3l10 18H2L12 3Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 10v5M12 18h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
        error:   '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
      };
      const toast = document.createElement("div");
      toast.className = `toast toast--${type}`;
      toast.setAttribute("role", "status");
      toast.innerHTML = `<span class="toast__icon">${icons[type] || icons.success}</span><div class="toast__body"><p></p><small></small></div>`;
      toast.querySelector("p").textContent = title || "";
      toast.querySelector("small").textContent = message || "";
      toast.querySelector("small").hidden = !message;
      wrap.appendChild(toast);
      setTimeout(() => { toast.classList.add("is-leaving"); toast.addEventListener("animationend", () => toast.remove(), { once: true }); }, duration);
    }
    window._showToast = showToast;
  
    /* ====== THEME ====== */
    function initTheme() {
      const root = document.body;
      const toggle = $("#themeToggle");
      const saved = localStorage.getItem(STORAGE.THEME) || localStorage.getItem("mda.pro.theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.setAttribute("data-theme", saved || (prefersDark ? "dark" : "light"));
      if (!toggle) return;
      toggle.addEventListener("click", () => {
        const current = root.getAttribute("data-theme");
        const next = current === "dark" ? "light" : "dark";
        root.setAttribute("data-theme", next);
        localStorage.setItem(STORAGE.THEME, next);
        showToast({ title: next === "dark" ? "Modo escuro ativado" : "Modo claro ativado", message: "Preferência salva automaticamente.", type: "info" });
        const setDark = $("#setDark"); if (setDark) setDark.checked = (next === "dark");
      });
    }
  
    /* ====== SIDEBAR ====== */
    function initSidebar() {
      const shell = $("#appShell");
      const menuBtn = $("#menuToggle");
      const overlay = $("#sidebarOverlay");
      const collapseBtn = $("#sidebarCollapse");
      if (!shell) return;
      if (localStorage.getItem(STORAGE.SIDEBAR) === "collapsed" && window.innerWidth > 1024) shell.classList.add("is-collapsed");
      const openMobile = () => { shell.classList.add("is-mobile-open"); overlay && overlay.setAttribute("aria-hidden","false"); };
      const closeMobile = () => { shell.classList.remove("is-mobile-open"); overlay && overlay.setAttribute("aria-hidden","true"); };
      menuBtn && menuBtn.addEventListener("click", () => { shell.classList.contains("is-mobile-open") ? closeMobile() : openMobile(); });
      overlay && overlay.addEventListener("click", closeMobile);
      collapseBtn && collapseBtn.addEventListener("click", () => {
        if (window.innerWidth <= 1024) { closeMobile(); return; }
        shell.classList.toggle("is-collapsed");
        localStorage.setItem(STORAGE.SIDEBAR, shell.classList.contains("is-collapsed") ? "collapsed" : "expanded");
      });
      window.addEventListener("resize", () => { if (window.innerWidth > 1024) closeMobile(); });
    }
  
    /* ====== DROPDOWNS ====== */
    function initDropdowns() {
      const items = [{ btn: "#notifToggle", panel: "#notifPanel" }, { btn: "#userToggle", panel: "#userPanel" }];
      const closeAll = (except) => {
        items.forEach(({ btn, panel }) => {
          const b = $(btn), p = $(panel); if (!b || !p) return;
          if (panel === except) return;
          b.setAttribute("aria-expanded", "false"); p.classList.remove("is-open");
        });
      };
      items.forEach(({ btn, panel }) => {
        const b = $(btn), p = $(panel); if (!b || !p) return;
        b.addEventListener("click", (e) => {
          e.stopPropagation();
          const isOpen = p.classList.contains("is-open");
          closeAll(panel);
          if (!isOpen) { p.classList.add("is-open"); b.setAttribute("aria-expanded", "true"); }
          else { p.classList.remove("is-open"); b.setAttribute("aria-expanded", "false"); }
        });
      });
      document.addEventListener("click", (e) => { if (!e.target.closest(".notifications, .user-menu")) closeAll(null); });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeAll(null); });
  
      // Click em itens de notificação
      $$(".notif-item").forEach((item) => {
        item.addEventListener("click", () => {
          item.classList.remove("notif-item--new");
          const remaining = $$(".notif-item--new").length;
          const badge = $(".notif-badge");
          if (badge) { if (remaining > 0) badge.textContent = remaining; else badge.remove(); }

          // Fechar dropdown
          const panel = $("#notifPanel"), notifBtn = $("#notifToggle");
          if (panel) panel.classList.remove("is-open");
          if (notifBtn) notifBtn.setAttribute("aria-expanded", "false");

          // Navegar para a página relacionada
          const target = item.dataset.notifTarget;
          if (!target) return;

          if (target === "funcionario-dashboard.html#reviews" && PAGE === "dashboard") {
            // Já está no dashboard: mudar para aba visão geral e rolar até avaliações
            if (typeof switchTab === "function") switchTab("overview");
            setTimeout(() => {
              const reviewsEl = document.querySelector(".reviews");
              if (reviewsEl) reviewsEl.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 350);
          } else {
            window.location.href = target;
          }
        });
      });
    }
  
    /* ====== TABS ====== */
    function moveTabsIndicator(activeBtn) {
      const indicator = $("#tabsIndicator");
      if (!indicator || !activeBtn) return;
      indicator.style.transform = `translateX(${activeBtn.offsetLeft - 6}px)`;
      indicator.style.width = `${activeBtn.offsetWidth}px`;
    }
    function switchTab(tabKey) {
      const btn = $(`#tabBtn-${tabKey}`); const panel = $(`#tab-${tabKey}`);
      if (!btn || !panel) return;
      $$(".tab").forEach((b) => { b.classList.remove("is-active"); b.setAttribute("aria-selected", "false"); });
      $$(".tab-panel").forEach((p) => { p.classList.remove("is-active"); p.setAttribute("hidden", ""); });
      btn.classList.add("is-active"); btn.setAttribute("aria-selected", "true");
      panel.classList.add("is-active"); panel.removeAttribute("hidden");
      moveTabsIndicator(btn);
    }
    window._switchTab = switchTab;
    function initTabs() {
      const buttons = $$(".tab");
      if (!buttons.length) return;
      buttons.forEach((b) => {
        b.addEventListener("click", () => switchTab(b.dataset.tab));
        b.addEventListener("keydown", (e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault();
            const idx = buttons.indexOf(b);
            const next = e.key === "ArrowRight" ? buttons[(idx+1)%buttons.length] : buttons[(idx-1+buttons.length)%buttons.length];
            next.focus(); switchTab(next.dataset.tab);
          }
        });
      });
      requestAnimationFrame(() => moveTabsIndicator($(".tab.is-active")));
      window.addEventListener("resize", () => moveTabsIndicator($(".tab.is-active")));
    }
  
    /* ====== CHART ====== */
    const CHART_DATA = {
      "7d":  { labels: ["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"], primary: [320,280,420,360,520,460,380], accent: [40,30,60,50,80,60,40], max: 700 },
      "30d": { labels: ["S1","S2","S3","S4","S5","S6","S7"], primary: [1200,1450,1380,1600,1820,1520,1900], accent: [180,200,220,240,260,200,280], max: 2400 },
      "90d": { labels: ["M1","M2","M3","M4","M5","M6","M7"], primary: [4200,4800,5100,5400,5800,6200,6800], accent: [600,700,720,800,880,900,1020], max: 8200 }
    };
    function renderChart(range = "7d") {
      const bars = $("#chartBars"); const axis = $("#chartAxis");
      if (!bars || !axis) return;
      const data = CHART_DATA[range];
      bars.innerHTML = ""; axis.innerHTML = "";
      data.labels.forEach((label, i) => {
        const total = data.primary[i] + data.accent[i];
        const pPct = (data.primary[i] / data.max) * 100;
        const aPct = (data.accent[i] / data.max) * 100;
        const wrap = document.createElement("div");
        wrap.className = "chart__bar";
        wrap.innerHTML = `<span class="chart__tooltip">${label} · R$ ${total.toLocaleString("pt-BR")}</span><div class="chart__bar-accent" style="height:${aPct}%; animation-delay:${i*50+100}ms"></div><div class="chart__bar-primary" style="height:${pPct}%; animation-delay:${i*50}ms"></div>`;
        bars.appendChild(wrap);
        const lab = document.createElement("span"); lab.textContent = label; axis.appendChild(lab);
      });
    }
    function initChart() {
      if (!$("#chartBars")) return;
      renderChart("7d");
      $$(".segmented__btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          $$(".segmented__btn").forEach((b) => b.classList.remove("is-active"));
          btn.classList.add("is-active");
          renderChart(btn.dataset.range);
          showToast({ title: "Período atualizado", message: `Exibindo dados de ${btn.dataset.range === "7d" ? "7 dias" : btn.dataset.range === "30d" ? "30 dias" : "90 dias"}.`, type: "info", duration: 2200 });
        });
      });
    }
  
    /* ====== MODALS GENÉRICOS ====== */
    function openModal(id) {
      const modal = $("#" + id); if (!modal) return;
      modal.classList.add("is-open"); modal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      const firstInput = modal.querySelector("input, select, textarea, button:not([data-close-modal])");
      setTimeout(() => firstInput && firstInput.focus(), 200);
    }
    function closeModal(modal) {
      if (typeof modal === "string") modal = $("#" + modal);
      if (!modal) return;
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      if (!$(".modal.is-open")) document.body.style.overflow = "";
    }
    window._openModal = openModal;
    window._closeModal = closeModal;
    function initModalsBase() {
      document.addEventListener("click", (e) => {
        const close = e.target.closest("[data-close-modal]");
        if (close) { const modal = close.closest(".modal"); if (modal) closeModal(modal); }
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") { const open = $(".modal.is-open"); if (open) closeModal(open); }
      });
    }
  
    /* ====== PROFILE / EDIT MODAL ====== */
    function loadProfile() { return account.loadProfile(); }
    function saveProfile(p) { return account.saveProfile(p); }
    function initialsFromName(name) {
      const parts = (name || "").trim().split(/\s+/).filter(Boolean);
      return parts.length ? (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() : "—";
    }
    function applyProfileToUI(p) {
      const initials = initialsFromName(p.name);
      const fields = {
        "#profileName, .user-menu__name, .user-card__name": p.name,
        "#profileRole, .user-menu__role": p.specialty,
        "#profilePhone": p.phone,
        "#profileCity": p.city,
        "#profileEmail, .user-card__meta": p.email,
        "#profileBio": p.bio,
        "#profileSpecialty": p.specialty
      };
      Object.entries(fields).forEach(([selector, value]) => {
        $$(selector).forEach(element => { element.textContent = value || "Não informado"; });
      });
      const greeting = $("#accountGreeting");
      if (greeting) {
        const hour = new Date().getHours();
        const welcome = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
        const firstName = (p.name || "").trim().split(/\s+/)[0];
        greeting.textContent = firstName ? `${welcome}, ${firstName}` : welcome;
      }
      $$(".avatar__initials").forEach(element => { element.textContent = initials; });
      const photo = typeof p.photo === "string" && /^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(p.photo) ? p.photo : "";
      $$(".user-menu .avatar, .profile__id .avatar, #uploadPreview").forEach(avatar => {
        avatar.style.backgroundImage = photo ? `url("${photo}")` : "";
        avatar.style.backgroundSize = "cover";
        avatar.style.backgroundPosition = "center";
        const label = avatar.querySelector(".avatar__initials");
        if (label) label.style.display = photo ? "none" : "";
      });
      const preview = $("#uploadPreview");
      if (preview) {
        if (photo) preview.dataset.photo = photo;
        else delete preview.dataset.photo;
      }
    }
    function fillForm(p) {
      $("#fName") && ($("#fName").value = p.name || "");
      const specialty = $("#fSpec");
      if (specialty) {
        const oldCustom = specialty.querySelector("[data-account-specialty]");
        if (oldCustom) oldCustom.remove();
        if (p.specialty && !Array.from(specialty.options).some(option => option.value === p.specialty)) {
          const option = new Option(p.specialty, p.specialty);
          option.dataset.accountSpecialty = "";
          specialty.add(option);
        }
        specialty.value = p.specialty || "";
      }
      $("#fPhone") && ($("#fPhone").value = p.phone || "");
      $("#fCity") && ($("#fCity").value = p.city || "");
      $("#fBio") && ($("#fBio").value = p.bio || "");
      $("#bioCount") && ($("#bioCount").textContent = (p.bio || "").length);
      $("#uploadInitials") && ($("#uploadInitials").textContent = initialsFromName(p.name));
    }
    function validatePhone(value) { const d = (value||"").replace(/\D/g,""); return d.length === 10 || d.length === 11; }
    function setError(fieldId, message) {
      const fld = $(`#${fieldId}`); if (!fld) return;
      const wrap = fld.closest(".field"); const err = $(`[data-error-for="${fieldId}"]`);
      if (message) { wrap.classList.add("is-invalid"); if (err) err.textContent = message; }
      else { wrap.classList.remove("is-invalid"); if (err) err.textContent = ""; }
    }
    function validateProfileForm() {
      let ok = true;
      if ($("#fName").value.trim().length < 3) { setError("fName", "Informe seu nome completo (mín. 3 letras)."); ok=false; } else setError("fName", "");
      if (!$("#fSpec").value) { setError("fSpec", "Selecione uma especialidade."); ok=false; } else setError("fSpec", "");
      if (!validatePhone($("#fPhone").value)) { setError("fPhone", "Telefone inválido."); ok=false; } else setError("fPhone", "");
      const city = $("#fCity").value.trim();
      const bio = $("#fBio").value.trim();
      if (city && city.length < 2) { setError("fCity", "Informe o nome da cidade ou deixe em branco."); ok=false; } else setError("fCity", "");
      if (bio && bio.length < 20) { setError("fBio", "Escreva pelo menos 20 caracteres ou deixe em branco."); ok=false; } else setError("fBio", "");
      return ok;
    }
    function initEditModal() {
      if (!$("#editModal")) return;
      $("#openEditModal") && $("#openEditModal").addEventListener("click", () => { const profile = loadProfile(); applyProfileToUI(profile); fillForm(profile); openModal("editModal"); });
      const phoneInput = $("#fPhone");
      phoneInput && phoneInput.addEventListener("input", (e) => {
        let v = e.target.value.replace(/\D/g,"").slice(0,11);
        if (v.length > 10) v = v.replace(/^(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
        else if (v.length > 6) v = v.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
        else if (v.length > 2) v = v.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
        else if (v.length > 0) v = v.replace(/^(\d{0,2})/, "($1");
        e.target.value = v;
      });
      const bio = $("#fBio");
      bio && bio.addEventListener("input", () => $("#bioCount").textContent = bio.value.length);
      const upload = $("#uploadInput");
      upload && upload.addEventListener("change", (e) => {
        const file = e.target.files && e.target.files[0]; if (!file) return;
        if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) { showToast({ title: "Arquivo inválido", message: "Selecione uma imagem JPG, PNG ou WebP.", type: "error" }); return; }
        if (file.size > 4*1024*1024) { showToast({ title: "Arquivo muito grande", message: "Tamanho máximo: 4MB.", type: "error" }); return; }
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataURL = ev.target.result;
          const preview = $("#uploadPreview");
          preview.style.backgroundImage = `url(${dataURL})`;
          const s = preview.querySelector("span"); if (s) s.style.display = "none";
          preview.dataset.photo = dataURL;
        };
        reader.readAsDataURL(file);
      });
      $("#removePhoto") && $("#removePhoto").addEventListener("click", () => {
        const preview = $("#uploadPreview");
        preview.style.backgroundImage = ""; const s = preview.querySelector("span"); if (s) s.style.display = "";
        delete preview.dataset.photo;
      });
      const form = $("#editForm");
      form && form.addEventListener("submit", (e) => {
        e.preventDefault();
        if (!validateProfileForm()) { showToast({ title: "Verifique os campos", message: "Há informações inválidas no formulário.", type: "warning" }); return; }
        const current = loadProfile();
        const updated = { ...current, name: $("#fName").value.trim(), specialty: $("#fSpec").value, phone: $("#fPhone").value.trim(), city: $("#fCity").value.trim(), bio: $("#fBio").value.trim(), photo: $("#uploadPreview").dataset.photo || null };
        try {
          saveProfile(updated); applyProfileToUI(updated); closeModal("editModal");
          showToast({ title: "Perfil atualizado", message: "Suas informações foram salvas para esta conta neste navegador.", type: "success" });
        } catch {
          showToast({ title: "Não foi possível salvar", message: "Verifique o espaço disponível no navegador ou tente uma foto menor.", type: "error" });
        }
      });
    }
  
    /* ====== ADD / EDIT SERVICE MODAL ====== */
    const CAT_LABELS = {
      eletrica: "Elétrica", hidraulica: "Hidráulica", montagem: "Montagem",
      pintura: "Pintura", marcenaria: "Marcenaria", geral: "Geral"
    };

    function fillEditServiceForm(s) {
      $("#eServiceId") && ($("#eServiceId").value = s.id);
      $("#eName") && ($("#eName").value = s.name || "");
      $("#eCat") && ($("#eCat").value = s.category || "");
      $("#ePrice") && ($("#ePrice").value = s.price || "");
      $("#eTime") && ($("#eTime").value = s.time || "");
      $("#eWarranty") && ($("#eWarranty").value = s.warranty || "90 dias");
      $("#eDesc") && ($("#eDesc").value = s.desc || "");
      $("#eActive") && ($("#eActive").checked = s.active !== false);
    }

    function initAddServiceModal() {
      const form = $("#addServiceForm");
      if (!form) return;
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        let ok = true;
        if ($("#sName").value.trim().length < 3) { setError("sName", "Informe o nome do serviço."); ok=false; } else setError("sName","");
        if (!$("#sCat").value) { setError("sCat", "Selecione uma categoria."); ok=false; } else setError("sCat","");
        if (!$("#sPrice").value || +$("#sPrice").value < 1) { setError("sPrice", "Informe um valor válido."); ok=false; } else setError("sPrice","");
        if (!ok) return;
        const category = $("#sCat").value;
        const service = {
          name: $("#sName").value.trim(),
          category,
          catLabel: CAT_LABELS[category] || category,
          price: +$("#sPrice").value,
          time: $("#sTime").value || "1h",
          warranty: $("#sWarranty").value,
          desc: $("#sDesc").value.trim(),
          active: true
        };
        if (typeof window._addService === "function") {
          window._addService(service);
        } else {
          const list = JSON.parse(localStorage.getItem("mda.pro.services") || "[]");
          list.push({ id: Date.now(), ...service });
          localStorage.setItem("mda.pro.services", JSON.stringify(list));
        }
        closeModal("addServiceModal"); form.reset();
        showToast({ title: "Serviço adicionado", message: `${service.name} foi cadastrado com sucesso.`, type: "success" });
        if (PAGE === "servicos" && typeof window._renderServices === "function") window._renderServices();
      });
    }

    function initEditServiceModal() {
      const form = $("#editServiceForm");
      if (!form) return;
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        let ok = true;
        if ($("#eName").value.trim().length < 3) { setError("eName", "Informe o nome do serviço."); ok=false; } else setError("eName","");
        if (!$("#eCat").value) { setError("eCat", "Selecione uma categoria."); ok=false; } else setError("eCat","");
        if (!$("#ePrice").value || +$("#ePrice").value < 1) { setError("ePrice", "Informe um valor válido."); ok=false; } else setError("ePrice","");
        if (!ok) return;
        const id = +$("#eServiceId").value;
        const category = $("#eCat").value;
        const updated = {
          name: $("#eName").value.trim(),
          category,
          catLabel: CAT_LABELS[category] || category,
          price: +$("#ePrice").value,
          time: $("#eTime").value || "1h",
          warranty: $("#eWarranty").value,
          desc: $("#eDesc").value.trim(),
          active: $("#eActive") ? $("#eActive").checked : true
        };
        if (typeof window._updateService === "function" && window._updateService(id, updated)) {
          closeModal("editServiceModal");
          showToast({ title: "Serviço atualizado", message: `${updated.name} foi salvo com sucesso.`, type: "success" });
        }
      });
    }

    function initOrderDetailModal() {
      if (!$("#orderDetailModal")) return;

      $("#orderAccept") && $("#orderAccept").addEventListener("click", () => {
        const modal = $("#orderDetailModal");
        const id = modal && modal.dataset.orderId;
        if (!id || typeof window._updateOrderStatus !== "function") return;
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = `${tomorrow.getDate()}/${String(tomorrow.getMonth() + 1).padStart(2, "0")}, 10:00`;
        window._updateOrderStatus(id, "scheduled", { date: dateStr });
        closeModal("orderDetailModal");
        showToast({ title: "Pedido aceito!", message: "O cliente foi notificado e o serviço foi agendado.", type: "success" });
      });

      $("#orderReject") && $("#orderReject").addEventListener("click", () => {
        const modal = $("#orderDetailModal");
        const id = modal && modal.dataset.orderId;
        if (!id || typeof window._updateOrderStatus !== "function") return;
        window._updateOrderStatus(id, "rejected", { date: "Recusado" });
        closeModal("orderDetailModal");
        showToast({ title: "Pedido recusado", message: "O cliente foi informado sobre a recusa.", type: "warning" });
      });

      $("#orderStart") && $("#orderStart").addEventListener("click", () => {
        const modal = $("#orderDetailModal");
        const id = modal && modal.dataset.orderId;
        if (!id || typeof window._updateOrderStatus !== "function") return;
        const now = new Date();
        const dateStr = `Hoje, ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        window._updateOrderStatus(id, "progress", { date: dateStr });
        closeModal("orderDetailModal");
        showToast({ title: "Serviço iniciado", message: "O pedido está em andamento.", type: "success" });
      });

      $("#orderComplete") && $("#orderComplete").addEventListener("click", () => {
        const modal = $("#orderDetailModal");
        const id = modal && modal.dataset.orderId;
        if (!id || typeof window._updateOrderStatus !== "function") return;
        window._updateOrderStatus(id, "completed", { date: "Concluído agora" });
        closeModal("orderDetailModal");
        showToast({ title: "Pedido concluído!", message: "Parabéns! O serviço foi finalizado com sucesso.", type: "success" });
      });

      $("#orderCancel") && $("#orderCancel").addEventListener("click", () => {
        const modal = $("#orderDetailModal");
        const id = modal && modal.dataset.orderId;
        if (!id || typeof window._updateOrderStatus !== "function") return;
        window._updateOrderStatus(id, "rejected", { date: "Cancelado" });
        closeModal("orderDetailModal");
        showToast({ title: "Serviço cancelado", message: "O pedido foi cancelado e o cliente foi notificado.", type: "warning" });
      });
    }
  
    /* ====== SETTINGS ====== */
    function loadSettings() { try { return Object.assign({ notifOrders: true, notifReviews: true, notifPromo: false, available: true }, JSON.parse(localStorage.getItem(STORAGE.SETTINGS) || "{}")); } catch { return { notifOrders: true, notifReviews: true, notifPromo: false, available: true }; } }
    function initSettings() {
      if (!$("#settingsModal")) return;
      const settings = loadSettings();
      const setDark = $("#setDark"); if (setDark) setDark.checked = document.body.getAttribute("data-theme") === "dark";
      $("#setNotifOrders") && ($("#setNotifOrders").checked = settings.notifOrders);
      $("#setNotifReviews") && ($("#setNotifReviews").checked = settings.notifReviews);
      $("#setNotifPromo") && ($("#setNotifPromo").checked = settings.notifPromo);
      $("#setAvailable") && ($("#setAvailable").checked = settings.available);
      setDark && setDark.addEventListener("change", () => { $("#themeToggle").click(); });
      $("#saveSettings") && $("#saveSettings").addEventListener("click", () => {
        const s = { notifOrders: $("#setNotifOrders").checked, notifReviews: $("#setNotifReviews").checked, notifPromo: $("#setNotifPromo").checked, available: $("#setAvailable").checked };
        localStorage.setItem(STORAGE.SETTINGS, JSON.stringify(s));
        closeModal("settingsModal");
        showToast({ title: "Preferências salvas", message: "Suas configurações foram atualizadas.", type: "success" });
      });
    }
  
    /* ====== LOGOUT ====== */
    function initLogout() {
      const btn = $("#confirmLogout"); if (!btn) return;
      btn.addEventListener("click", () => {
        btn.disabled = true;
        try { localStorage.removeItem("dafix_session"); } catch { /* armazenamento indisponível */ }
        try { sessionStorage.removeItem("dafix_session"); } catch { /* armazenamento indisponível */ }
        window.location.replace("../index.html");
      });
    }
  
    /* ====== SHARE ====== */
    function initShare() {
      const copyBtn = $("#copyLink");
      copyBtn && copyBtn.addEventListener("click", async () => {
        const link = $("#shareLink");
        try { await navigator.clipboard.writeText(link.value); }
        catch { link.select(); document.execCommand("copy"); }
        showToast({ title: "Link copiado!", message: "Compartilhe com seus clientes.", type: "success" });
      });
      $$("[data-share]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const platform = btn.dataset.share;
          const url = encodeURIComponent($("#shareLink").value);
          const text = encodeURIComponent("Confira meu perfil profissional na Marido de Aluguel!");
          const links = {
            whatsapp: `https://wa.me/?text=${text}%20${url}`,
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
            instagram: null,
            email: `mailto:?subject=${text}&body=${url}`
          };
          if (platform === "instagram") {
            showToast({ title: "Instagram", message: "Copie o link e cole na sua bio do Instagram.", type: "info" });
            navigator.clipboard && navigator.clipboard.writeText($("#shareLink").value);
            return;
          }
          window.open(links[platform], "_blank", "noopener,width=600,height=600");
        });
      });
    }
  
    /* ====== GLOBAL ACTION HANDLER ====== */
    function initActionHandler() {
      document.addEventListener("click", (e) => {
        const trigger = e.target.closest("[data-action]");
        if (!trigger) return;
        const action = trigger.dataset.action;
        // Não bloquear o link, apenas se for âncora vazia
        const isAnchor = trigger.tagName === "A";
        if (isAnchor && trigger.getAttribute("href") === "#") e.preventDefault();
  
        switch (action) {
          case "open-profile-tab":
            if (PAGE === "dashboard") switchTab("profile");
            else window.location.href = "funcionario-dashboard.html#profile";
            break;
          case "open-settings": openModal("settingsModal"); break;
          case "open-logout": openModal("logoutModal"); break;
          case "open-add-service": openModal("addServiceModal"); break;
          case "open-benefits": openModal("benefitsModal"); break;
          case "share-profile":
            showToast({ title: "Compartilhamento de perfil", message: "O perfil público ainda não está disponível.", type: "info" });
            break;
          case "open-payments":
            showToast({ title: "Pagamentos", message: "Saldo: R$ 1.240,00 · Próximo recebimento: 18/Mar.", type: "info", duration: 5000 });
            break;
          case "open-support":
            window.location.href = "../suporte/index.html";
            break;
          case "open-terms":
            showToast({ title: "Termos de uso", message: "Abra em uma nova janela para ler na íntegra.", type: "info" });
            break;
          case "open-privacy":
            showToast({ title: "Política de privacidade", message: "Sua privacidade é nossa prioridade.", type: "info" });
            break;
          case "mark-all-read":
            $$(".notif-item--new").forEach((it) => it.classList.remove("notif-item--new"));
            const badge = $(".notif-badge"); if (badge) badge.remove();
            showToast({ title: "Notificações marcadas", message: "Todas foram marcadas como lidas.", type: "success" });
            break;
          case "see-all-notifs":
            showToast({ title: "Central de notificações", message: "Em breve uma página dedicada com histórico completo.", type: "info" });
            break;
          case "see-all-reviews":
            showToast({ title: "Todas as avaliações", message: "Visualize seu histórico completo em breve.", type: "info" });
            break;
          case "agenda-options":
            e.stopPropagation();
            showToast({ title: "Opções do agendamento", message: "Reagendar · Confirmar · Cancelar", type: "info" });
            break;
          case "edit-service":
            e.stopPropagation();
            const serviceCard = trigger.closest(".service-card");
            if (!serviceCard) break;
            const serviceId = +serviceCard.dataset.serviceId;
            if (typeof window._getServiceById === "function") {
              const service = window._getServiceById(serviceId);
              if (service) {
                fillEditServiceForm(service);
                openModal("editServiceModal");
              }
            }
            break;
          case "delete-service":
            e.stopPropagation();
            const card = trigger.closest(".service-card");
            if (!card) break;
            const delId = +card.dataset.serviceId;
            if (typeof window._deleteService === "function") {
              window._deleteService(delId);
            } else if (card) {
              card.style.transition = "opacity .25s, transform .25s";
              card.style.opacity = "0";
              card.style.transform = "scale(.95)";
              setTimeout(() => card.remove(), 250);
            }
            showToast({ title: "Serviço removido", message: "O serviço foi excluído do seu catálogo.", type: "warning" });
            break;
          case "open-order":
          case "order-action":
            e.stopPropagation();
            const orderCard = trigger.closest(".order-card");
            const orderId = trigger.dataset.orderId || (orderCard && orderCard.dataset.orderId);
            if (orderId && typeof window._openOrderDetail === "function") {
              window._openOrderDetail(orderId);
            }
            break;
          case "calendar-prev":
          case "calendar-next":
            showToast({ title: "Calendário", message: action === "calendar-prev" ? "Mês anterior" : "Próximo mês", type: "info", duration: 1800 });
            break;
          case "calendar-today":
            showToast({ title: "Hoje", message: "Voltou para a data atual.", type: "info", duration: 1800 });
            break;
          case "new-appointment":
            showToast({ title: "Novo agendamento", message: "Selecione data e horário no calendário.", type: "info" });
            break;
          case "export-data": {
            if (typeof window._exportOrders === "function") {
              const activeFilter = (() => { const fc = document.querySelector(".filter-chip.is-active"); return fc ? fc.dataset.filter : "all"; })();
              const count = window._exportOrders(activeFilter);
              const label = activeFilter && activeFilter !== "all" ? ` (${activeFilter === "completed" ? "concluídos" : activeFilter === "pending" ? "aguardando" : activeFilter === "progress" ? "em andamento" : "agendados"})` : "";
              showToast({ title: "Exportado!", message: `${count} pedido${count !== 1 ? "s" : ""}${label} baixados em CSV.`, type: "success" });
            } else {
              showToast({ title: "Exportação", message: "Nenhum dado disponível para exportar.", type: "warning" });
            }
            break;
          }
          case "filter-clear":
            $$(".filter-chip.is-active").forEach((c) => c.classList.remove("is-active"));
            const allChip = $(".filter-chip[data-filter='all']"); if (allChip) allChip.classList.add("is-active");
            const searchInput = $("#globalSearch") || $("#serviceSearch");
            if (searchInput) searchInput.value = "";
            if (typeof window._applyFilter === "function") window._applyFilter("all");
            if (typeof window._applySearch === "function") window._applySearch("");
            showToast({ title: "Filtros limpos", message: "Exibindo todos os itens.", type: "info", duration: 1800 });
            break;
        }
      });
  
      // Filtros (chips)
      $$(".filter-chip").forEach((chip) => {
        chip.addEventListener("click", () => {
          const group = chip.closest(".filter-bar");
          if (!group) return;
          $$(".filter-chip", group).forEach((c) => c.classList.remove("is-active"));
          chip.classList.add("is-active");
          const filter = chip.dataset.filter;
          if (typeof window._applyFilter === "function") window._applyFilter(filter);
        });
      });
  
      // Search field handler
      const search = $("#globalSearch");
      search && search.addEventListener("input", (e) => {
        const term = e.target.value.toLowerCase();
        if (typeof window._applySearch === "function") window._applySearch(term);
      });
  
      // Trata abertura via hash #profile
      if (window.location.hash === "#profile" && PAGE === "dashboard") {
        setTimeout(() => switchTab("profile"), 300);
      }
    }
  
    /* ====== ATALHOS DE TECLADO ====== */
    function initShortcuts() {
      document.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
          e.preventDefault(); const input = $(".search input"); input && input.focus();
        }
        if (e.altKey && e.key.toLowerCase() === "t") { e.preventDefault(); $("#themeToggle") && $("#themeToggle").click(); }
      });
    }
  
    /* ====== YEAR ====== */
    function initYear() { const el = $("#year"); if (el) el.textContent = new Date().getFullYear(); }
  
    /* ====== INIT ====== */
    onReady(() => {
      if (!account.requireProfile("funcionario")) return;
      applyProfileToUI(loadProfile());
      initTheme();
      initSidebar();
      initDropdowns();
      initTabs();
      initChart();
      initModalsBase();
      initEditModal();
      initAddServiceModal();
      initEditServiceModal();
      initOrderDetailModal();
      initSettings();
      initLogout();
      initShare();
      initActionHandler();
      initShortcuts();
      initYear();
  
      // Page-specific renderers
      if (PAGE === "servicos" && typeof window._initServicesPage === "function") window._initServicesPage();
      if (PAGE === "pedidos"  && typeof window._initPedidosPage === "function") window._initPedidosPage();
      if (PAGE === "agenda"   && typeof window._initAgendaPage === "function") window._initAgendaPage();
    });
  
  })();
  