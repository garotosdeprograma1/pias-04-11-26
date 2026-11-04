/* ============================================================
   Dafix — Central de Suporte
   suporte.js — interatividade compartilhada
   ============================================================ */

(function () {
  "use strict";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const ready = (fn) => document.readyState !== "loading" ? fn() : document.addEventListener("DOMContentLoaded", fn);

  const STORAGE_THEME = "dafix_theme";

  /* ====== TEMA ====== */
  function initTheme() {
    const root = document.documentElement;
    const btn = $("#themeToggle");
    const saved = localStorage.getItem(STORAGE_THEME) || localStorage.getItem("dafix.theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = saved || (prefersDark ? "dark" : "light");
    btn && btn.addEventListener("click", () => {
      root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
      localStorage.setItem(STORAGE_THEME, root.dataset.theme);
    });
  }

  /* ====== TOAST ====== */
  function showToast({ title, message, type = "info", duration = 4000 }) {
    const wrap = $("#toasts");
    if (!wrap) return;
    const icons = {
      success: '<svg viewBox="0 0 24 24" fill="none"><path d="M5 12l4 4 10-10" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      error:   '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
      info:    '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M12 8h.01M11 12h1v5h1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
    };
    const t = document.createElement("div");
    t.className = "toast toast--" + type;
    t.innerHTML = '<span class="toast__icon">' + (icons[type] || icons.info) + '</span><div class="toast__body"><p>' + title + '</p>' + (message ? '<small>' + message + '</small>' : '') + '</div>';
    wrap.appendChild(t);
    setTimeout(() => {
      t.classList.add("is-leaving");
      t.addEventListener("animationend", () => t.remove(), { once: true });
    }, duration);
  }
  window._showToast = showToast;

  /* ====== FAQ ACCORDION ====== */
  function initFaq() {
    $$(".faq-item__trigger").forEach((btn) => {
      const item = btn.closest(".faq-item");
      const body = item.querySelector(".faq-item__body");
      const inner = item.querySelector(".faq-item__inner");

      btn.addEventListener("click", () => {
        const isOpen = item.classList.contains("is-open");

        // fechar todos os outros
        $$(".faq-item.is-open").forEach((other) => {
          if (other === item) return;
          other.classList.remove("is-open");
          const ob = other.querySelector(".faq-item__body");
          if (ob) ob.style.maxHeight = null;
        });

        if (isOpen) {
          item.classList.remove("is-open");
          body.style.maxHeight = null;
        } else {
          item.classList.add("is-open");
          body.style.maxHeight = (inner ? inner.scrollHeight + 40 : body.scrollHeight) + "px";
        }
      });
    });
  }

  /* ====== BUSCA NO FAQ ====== */
  function initSearch() {
    const searchInput = $("#faqSearch");
    const faqEmpty   = $(".faq-empty");
    if (!searchInput) return;

    function doSearch(term) {
      const q = term.trim().toLowerCase();
      const items = $$(".faq-item");
      let visible = 0;

      items.forEach((item) => {
        const text = item.textContent.toLowerCase();
        const match = !q || text.includes(q);
        item.style.display = match ? "" : "none";
        if (match) visible++;
      });

      if (faqEmpty) faqEmpty.classList.toggle("is-visible", visible === 0);
    }

    searchInput.addEventListener("input", (e) => doSearch(e.target.value));

    // busca pela barra do hero (index)
    const heroForm = $("#heroSearchForm");
    heroForm && heroForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const heroInput = heroForm.querySelector("input");
      if (!heroInput) return;
      const q = heroInput.value.trim();
      if (!q) return;
      // scroll para a seção de FAQ e filtra
      const faqSection = $(".faq-section");
      if (faqSection) {
        faqSection.scrollIntoView({ behavior: "smooth" });
        setTimeout(() => {
          if (searchInput) {
            searchInput.value = q;
            searchInput.dispatchEvent(new Event("input"));
          }
          doSearch(q);
        }, 500);
      }
    });
  }

  /* ====== FILTRO DE CATEGORIA (CHIPS) ====== */
  function initChips() {
    $$(".filter-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        $$(".filter-chip").forEach((c) => c.classList.remove("is-active"));
        chip.classList.add("is-active");

        const cat = chip.dataset.cat;
        const items = $$(".faq-item");
        const empty = $(".faq-empty");
        let visible = 0;

        // também limpar busca
        const searchInput = $("#faqSearch");
        if (searchInput) searchInput.value = "";

        items.forEach((item) => {
          const match = cat === "all" || item.dataset.cat === cat;
          item.style.display = match ? "" : "none";
          if (match) visible++;
        });

        if (empty) empty.classList.toggle("is-visible", visible === 0);

        // fechar accordions abertos de outros grupos
        $$(".faq-item.is-open").forEach((it) => {
          if (!it.dataset.cat || (cat !== "all" && it.dataset.cat !== cat)) {
            it.classList.remove("is-open");
            const b = it.querySelector(".faq-item__body");
            if (b) b.style.maxHeight = null;
          }
        });
      });
    });
  }

  /* ====== FORMULÁRIO DE CONTATO ====== */
  function initContactForm() {
    const form = $("#contactForm");
    if (!form) return;

    const submitBtn = form.querySelector(".form-submit");
    const formWrap  = $(".form-card");
    const success   = $(".success-state");

    function validateField(field) {
      const wrap = field.closest(".field");
      if (!wrap) return true;
      const err = wrap.querySelector(".field__error");
      let msg = "";

      if (field.required && !field.value.trim()) {
        msg = "Este campo é obrigatório.";
      } else if (field.type === "email" && field.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value)) {
        msg = "Informe um e-mail válido.";
      } else if (field.minLength > 0 && field.value.length < field.minLength) {
        msg = "Mínimo de " + field.minLength + " caracteres.";
      }

      if (msg) {
        wrap.classList.add("has-error");
        if (err) err.textContent = msg;
        return false;
      } else {
        wrap.classList.remove("has-error");
        if (err) err.textContent = "";
        return true;
      }
    }

    // live validation on blur
    $$("input,select,textarea", form).forEach((field) => {
      field.addEventListener("blur", () => validateField(field));
      field.addEventListener("input", () => {
        if (field.closest(".field.has-error")) validateField(field);
      });
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const fields = $$("[required]", form);
      let ok = true;
      fields.forEach((f) => { if (!validateField(f)) ok = false; });
      if (!ok) {
        showToast({ title: "Campos inválidos", message: "Corrija os erros antes de enviar.", type: "error" });
        return;
      }

      // simular envio
      submitBtn.classList.add("is-loading");
      submitBtn.disabled = true;

      setTimeout(() => {
        submitBtn.classList.remove("is-loading");
        submitBtn.disabled = false;

        // gerar ticket ID
        const ticketId = "DAF-" + Math.floor(10000 + Math.random() * 90000);
        const ticketEl = $(".ticket-id");
        if (ticketEl) ticketEl.textContent = ticketId;

        // mostrar estado de sucesso
        if (formWrap) formWrap.style.display = "none";
        if (success) success.classList.add("is-visible");

        showToast({ title: "Ticket aberto com sucesso!", message: "ID: " + ticketId + " · Resposta em até 4h.", type: "success", duration: 6000 });
      }, 1800);
    });

    // botão "abrir novo ticket"
    const newTicket = $("#newTicketBtn");
    newTicket && newTicket.addEventListener("click", () => {
      if (formWrap) formWrap.style.display = "";
      if (success) success.classList.remove("is-visible");
      form.reset();
      $$(".has-error", form).forEach((f) => f.classList.remove("has-error"));
    });
  }

  /* ====== CHAT (simulado) ====== */
  function initChat() {
    const chatBtn = $("#openChat");
    chatBtn && chatBtn.addEventListener("click", () => {
      showToast({
        title: "Chat indisponível agora",
        message: "Atendimento via chat: seg–sex 8h–22h, sáb 9h–18h.",
        type: "info",
        duration: 5000
      });
    });
  }

  /* ====== COPIAR E-MAIL ====== */
  function initCopyEmail() {
    $$("[data-copy]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const text = btn.dataset.copy;
        navigator.clipboard
          ? navigator.clipboard.writeText(text).then(() => showToast({ title: "Copiado!", message: text, type: "success" }))
          : (() => { showToast({ title: "Copiado!", message: text, type: "success" }); })();
      });
    });
  }

  /* ====== CONTADOR TEXTAREA ====== */
  function initCharCount() {
    $$("textarea[maxlength]").forEach((ta) => {
      const max = ta.maxLength;
      const wrap = ta.closest(".field");
      if (!wrap) return;
      const counter = document.createElement("span");
      counter.className = "field__counter";
      counter.style.cssText = "font-size:11.5px;color:var(--text-3);text-align:right;display:block;margin-top:4px;";
      counter.textContent = "0 / " + max;
      wrap.appendChild(counter);
      ta.addEventListener("input", () => {
        counter.textContent = ta.value.length + " / " + max;
        counter.style.color = ta.value.length > max * .9 ? "var(--orange-500)" : "var(--text-3)";
      });
    });
  }

  /* ====== INIT ====== */
  ready(() => {
    initTheme();
    initFaq();
    initSearch();
    initChips();
    initContactForm();
    initChat();
    initCopyEmail();
    initCharCount();
  });
})();
