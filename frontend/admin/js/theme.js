/* Aplica o tema salvo antes da primeira pintura, sem piscar o tema claro. */
(() => {
  let saved = 'light';
  try { saved = localStorage.getItem('dafix_theme') || 'light'; } catch { /* Preferência indisponível: tema claro. */ }
  document.documentElement.dataset.theme = saved === 'dark' ? 'dark' : 'light';
})();
