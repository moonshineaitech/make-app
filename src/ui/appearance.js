(() => {
  let preference = 'system';
  const query = new URLSearchParams(location.search).get('theme');
  try { preference = localStorage.getItem('make-app-appearance') || 'system'; } catch {}
  if (['light', 'dark'].includes(query)) preference = query;
  const button = document.getElementById('appearance');
  function apply() {
    if (preference === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.dataset.theme = preference;
    if (!button) return;
    const next = preference === 'system' ? 'light' : preference === 'light' ? 'dark' : 'system';
    button.setAttribute('aria-label', `Appearance: ${preference}. Switch to ${next}.`);
    button.title = `Appearance: ${preference}`;
    button.firstElementChild.className = 'icon ' + (preference === 'dark' ? 'i-moon' : 'i-sun');
  }
  button?.addEventListener('click', () => {
    preference = preference === 'system' ? 'light' : preference === 'light' ? 'dark' : 'system';
    try { localStorage.setItem('make-app-appearance', preference); } catch {}
    apply();
  });
  apply();
})();
