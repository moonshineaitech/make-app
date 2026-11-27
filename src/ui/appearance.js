// Validated local preferences. URL previews never overwrite the saved choice.
(() => {
  const themes = [
    ['midnight_tide', 'Midnight Tide', 'dark'], ['botanical_canopy', 'Botanical Canopy', 'light'],
    ['stratosphere', 'Stratosphere', 'light'], ['pearl_current', 'Pearl Current', 'light'],
    ['citrus_circuit', 'Citrus Circuit', 'light'], ['cobalt_hydro', 'Cobalt Hydro', 'light'],
    ['aurora_lake', 'Aurora Lake', 'dark'], ['sunset_estuary', 'Sunset Estuary', 'light'],
    ['glacial_quartz', 'Glacial Quartz', 'light'], ['meadow_os', 'Meadow OS', 'light']
  ];
  const modes = ['system', 'light', 'dark'];
  const validStyle = value => value === 'classic' || themes.some(theme => theme[0] === value);
  const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const write = (key, value) => { try { localStorage.setItem(key, value); return true; } catch { return false; } };
  const query = new URLSearchParams(location.search);
  let preference = read('make-app-appearance');
  if (!modes.includes(preference)) preference = 'system';
  const savedStyle = read('make-app-style');
  let style = validStyle(savedStyle) ? savedStyle : read('make-app-appearance') ? 'classic' : 'midnight_tide';
  if (modes.includes(query.get('theme'))) { preference = query.get('theme'); style = 'classic'; }
  if (validStyle(query.get('style'))) style = query.get('style');
  const root = document.documentElement;
  function apply() {
    const selected = themes.find(theme => theme[0] === style);
    if (selected) { root.dataset.aero = style; root.dataset.theme = selected[2]; }
    else {
      delete root.dataset.aero;
      if (preference === 'system') delete root.dataset.theme;
      else root.dataset.theme = preference;
    }
    for (const button of document.querySelectorAll('[data-theme-choice]')) button.setAttribute('aria-pressed', String(button.dataset.themeChoice === style));
    const trigger = document.getElementById('appearance');
    if (trigger) trigger.title = 'Theme: ' + (selected?.[1] || 'Classic');
    const classic = document.getElementById('use-classic');
    if (classic) classic.setAttribute('aria-pressed', String(style === 'classic'));
    const select = document.getElementById('classic-appearance');
    if (select) select.value = preference;
    window.dispatchEvent(new Event('make-app:appearance'));
  }
  function choose(value) {
    if (!validStyle(value)) return;
    style = value; const saved = write('make-app-style', style); apply();
    const status = document.getElementById('theme-status');
    if (status) status.textContent = (themes.find(theme => theme[0] === style)?.[1] || 'Classic') + (saved ? ' selected. Saved on this device.' : ' selected for this session.');
  }
  // Apply before stylesheets paint, avoiding a flash of the previous palette.
  apply();
  function setup() {
    const dialog = document.getElementById('theme-picker');
    const trigger = document.getElementById('appearance');
    if (!dialog || !trigger) return;
    const choices = document.getElementById('theme-options');
    for (const [id, name] of themes) {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'theme-choice';
      button.dataset.themeChoice = id; button.setAttribute('aria-pressed', 'false');
      const image = document.createElement('img');
      image.src = 'assets/aero/' + id + '-thumb.jpg'; image.alt = ''; image.width = 320; image.height = 200; image.loading = 'lazy';
      const caption = document.createElement('span'); caption.className = 'theme-choice-caption';
      const title = document.createElement('strong'); title.textContent = name;
      const check = document.createElement('span'); check.className = 'icon i-circle-check'; check.setAttribute('aria-hidden', 'true');
      caption.append(title, check); button.append(image, caption);
      button.addEventListener('click', () => choose(id)); choices.append(button);
    }
    trigger.addEventListener('click', () => {
      dialog.showModal();
      const selected = dialog.querySelector('[aria-pressed="true"]');
      selected?.focus({ preventScroll: true }); selected?.scrollIntoView({ block: 'nearest' });
    });
    document.getElementById('close-themes').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      const rect = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
    });
    document.getElementById('classic-appearance').addEventListener('change', event => {
      if (!modes.includes(event.target.value)) return;
      preference = event.target.value; write('make-app-appearance', preference); choose('classic');
    });
    document.getElementById('use-classic').addEventListener('click', () => choose('classic'));
    apply();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup, { once: true });
  else setup();
  window.addEventListener('storage', event => {
    if (event.key === 'make-app-style' && validStyle(event.newValue)) { style = event.newValue; apply(); }
    if (event.key === 'make-app-appearance' && modes.includes(event.newValue)) { preference = event.newValue; apply(); }
  });
})();
