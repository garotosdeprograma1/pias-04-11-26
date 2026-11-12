/* Entrada da administração: a sessão é criada e validada pelo servidor. */
(() => {
  'use strict';
  const form = document.getElementById('admin-login-form'), message = document.getElementById('login-message');
  const button = form.querySelector('[type="submit"]'), password = form.elements.senha, toggle = document.getElementById('toggle-password');
  const say = (text, tone = 'error') => { message.dataset.tone = tone; message.textContent = text; };

  // Quem já tem sessão administrativa válida segue direto para o painel.
  if (window.DafixAccount.readSession()?.perfil === 'admin') {
    fetch('/api/session', {cache: 'no-store'}).then(response => response.ok ? response.json() : null)
      .then(data => { if (data?.perfil === 'admin') location.replace('/admin/dashboard.html'); }).catch(() => {});
  }

  toggle.addEventListener('click', () => {
    const show = password.type === 'password';
    password.type = show ? 'text' : 'password';
    toggle.textContent = show ? 'Ocultar' : 'Mostrar';
    toggle.setAttribute('aria-pressed', String(show));
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (button.disabled) return;
    const email = form.elements.email.value.trim();
    if (!email || !password.value) return say('Informe e-mail e senha.');
    button.disabled = true; say('Verificando acesso…', 'info');
    try {
      let response;
      try { response = await fetch('/api/login', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({perfil: 'admin', email, senha: password.value})}); }
      catch { throw new Error('Não foi possível conectar ao servidor. Tente novamente.'); }
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(response.status === 401 ? 'E-mail ou senha inválidos para a administração.' : data.erro || 'Não foi possível entrar.');
      window.DafixAccount.startSession(data.usuario, 'admin');
      location.replace('/admin/dashboard.html');
    } catch (error) { say(error.message); button.disabled = false; password.select(); }
  });
})();
