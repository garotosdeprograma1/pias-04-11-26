(() => {
  const root=document.documentElement,themeButton=document.querySelector('.theme-btn');
  function applyTheme(theme){root.dataset.theme=theme;themeButton.textContent=theme==='dark'?'Tema claro':'Tema escuro';themeButton.setAttribute('aria-label','Ativar '+themeButton.textContent.toLowerCase());}
  let saved='light';try{saved=localStorage.getItem('dafix_theme')||'light';}catch{}
  applyTheme(saved==='dark'?'dark':'light');
  themeButton.addEventListener('click',()=>{const next=root.dataset.theme==='dark'?'light':'dark';applyTheme(next);try{localStorage.setItem('dafix_theme',next);}catch{}});
  const menu=document.getElementById('sidebar'),button=document.getElementById('menuBtn'),overlay=document.getElementById('mobOverlay');
  function close(){menu.classList.remove('open');overlay.hidden=true;button.setAttribute('aria-expanded','false');document.body.style.overflow='';}
  button.addEventListener('click',()=>{if(menu.classList.contains('open')){close();return;}menu.classList.add('open');overlay.hidden=false;button.setAttribute('aria-expanded','true');document.body.style.overflow='hidden';});
  document.getElementById('closeMenu').addEventListener('click',()=>{close();button.focus()});overlay.addEventListener('click',close);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu.classList.contains('open')){close();button.focus()}});
  window.addEventListener('resize',()=>{if(innerWidth>900)close()});
  const session=window.DafixAccount.readSession(),link=document.getElementById('account-link');if(session){link.href=session.perfil==='funcionario'?'/funcionario/funcionario-dashboard.html':'/cliente/index.html';link.hidden=false;}
})();
