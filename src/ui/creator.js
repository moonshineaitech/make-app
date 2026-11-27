const $ = id => document.getElementById(id);
const api = window.makeApp;
let selected, busy = false, sequence = 0, timer, nameEdited = false, platform;
const format = () => document.querySelector('input[name="format"]:checked').value;
const phase = value => { document.body.dataset.phase = value; };
function eligible() {
  return !!selected && !selected.selection && (format() === 'web' ? selected.webAvailable : selected.configured !== false && platform?.supported);
}
function render() {
  const web = format() === 'web';
  $('make').disabled = busy || !eligible();
  $('make-label').textContent = busy ? (web ? 'Exporting…' : 'Creating…') : (web ? 'Export web app' : 'Create app');
  $('make').querySelector('.icon').className = 'icon ' + (busy ? 'i-loader' : 'i-arrow');
  $('web-hint').hidden = !web;
  $('web-hint').textContent = web && selected && !selected.webAvailable
    ? 'No static build found. Build the frontend first, then choose its folder. Backend services need their own host.'
    : 'Uses an existing static web build. Backend services need their own host.';
  $('scope').textContent = web
    ? 'Exports public static assets to a new folder. Host it over HTTPS to open or install it on your devices.'
    : 'The app opens your existing project folder. Setup is handled on first launch. Keep that folder in place.';
  $('review-heading').textContent = web ? 'Ready for a smaller screen.' : 'Your project stays yours.';
  $('fact-copy').textContent = web ? 'Static assets only' : 'None';
  $('fact-setup').textContent = web ? 'HTTPS hosting' : selected?.setupTasks || selected?.buildTasks ? 'Automatic setup' : 'Open directly';
  const name = $('name').value.trim();
  $('output-name').textContent = name ? name + (web ? ' · web export' : platform?.extension || '') : 'Your next app';
  $('output-caption').textContent = web ? 'Export to a folder of your choice' : 'Choose where to save it next';
  window.dispatchEvent(new Event('make-app:render'));
  window.dispatchEvent(new CustomEvent('make-app:state',{detail:{selected,busy,platform,format:format(),source:$('source').value,name:$('name').value,phase:document.body.dataset.phase}}));
}
function setBusy(value) {
  busy = value;
  document.querySelectorAll('#creator-form input,#creator-form select,#browse,#entry').forEach(input => { input.disabled = value; });
  $('cancel').hidden = !value; $('cancel').disabled = false;
  $('busy-progress').hidden = !value;
  document.querySelector('main').setAttribute('aria-busy', String(value));
  render();
}
function status(text, error = false) {
  $('status').textContent = text;
  $('status').setAttribute('role', error ? 'alert' : 'status');
  if (error) { phase('error'); $('status').focus(); }
}
function clearResult() {
  status(''); $('reveal').hidden = true; $('progress').hidden = true;
  $('progress').open = false; $('log').textContent = '';
}
async function inspect() {
  const request = ++sequence;
  selected = null; clearResult(); render();
  $('facts').hidden = true; $('requirements').textContent = ''; $('credentials').textContent = '';
  $('source').removeAttribute('aria-invalid');
  if (!$('source').value.trim()) {
    phase('idle'); $('entry-area').hidden = true; $('detected').textContent = 'Setup is detected automatically.'; return;
  }
  phase('checking'); $('detection-icon').className = 'icon i-loader'; $('detected').textContent = 'Reading your project…';
  try {
    const result = await api.inspect({ source: $('source').value, target: $('entry').value || undefined });
    if (request !== sequence) return;
    selected = result;
    $('detection-icon').className = 'icon ' + (result.selection || result.configured === false ? 'i-help' : 'i-circle-check');
    $('detected').textContent = result.message || result.label || 'Project detected';
    $('entry-area').hidden = !result.targets?.length || result.targets.length === 1;
    const previous = $('entry').value;
    $('entry').replaceChildren(new Option('Choose an entry point', ''));
    for (const target of result.targets || []) $('entry').append(new Option(target.label, target.id));
    $('entry').value = result.selectedTarget || previous;
    if (!nameEdited) $('name').value = result.name || '';
    $('facts').hidden = false; $('fact-kind').textContent = result.label || result.mode;
    $('requirements').textContent = result.requirements?.length ? 'Uses ' + result.requirements.join(' and ') + '. Downloads may be needed on first launch.' : '';
    $('credentials').textContent = result.requiredEnvironment?.length ? 'Required project settings: ' + result.requiredEnvironment.join(', ') : '';
    phase('ready'); render();
  } catch (error) {
    if (request !== sequence) return;
    selected = null; phase('error'); $('source').setAttribute('aria-invalid', 'true');
    $('detection-icon').className = 'icon i-help'; $('detected').textContent = error.message;
    $('facts').hidden = true; $('entry-area').hidden = true; render();
  }
}
async function openSource(source) {
  if (!source || busy) return;
  clearTimeout(timer); sequence++; $('source').value = source; $('entry').value = ''; nameEdited = false;
  $('saved').value = [...$('saved').options].some(option => option.value === source) ? source : '';
  await inspect();
}
api.capabilities().then(value => {
  platform = value; $('platform').textContent = value.name + (api.preview ? ' · preview' : ' · ' + value.arch);
  $('desktop-label').textContent = value.name + ' app';
  $('desktop-description').textContent = value.extension + ' · opens on this computer'; render();
}).catch(error => status(error.message, true));
api.projects().then(projects => {
  for (const project of projects) $('saved').append(new Option(project.name, project.path));
  if (!projects.length) $('saved').firstElementChild.textContent = 'No saved projects yet — browse a folder';
  render();
}).catch(() => { $('saved').replaceChildren(new Option('Browse a folder to get started', '')); });
$('browse').onclick = async () => { try { await openSource(await api.choose()); } catch (error) { status(error.message, true); } };
$('saved').onchange = () => openSource($('saved').value);
$('source').onchange = () => { clearTimeout(timer); $('entry').value = ''; nameEdited = false; inspect(); };
$('source').oninput = () => {
  clearTimeout(timer); ++sequence; selected = null; clearResult(); phase('idle'); render();
  $('saved').value = ''; $('facts').hidden = true; $('source').removeAttribute('aria-invalid');
  $('detection-icon').className = 'icon i-code'; $('detected').textContent = 'Setup is detected automatically.';
  timer = setTimeout(() => { $('entry').value = ''; nameEdited = false; inspect(); }, 300);
};
$('entry').onchange = inspect;
$('name').oninput = () => { nameEdited = true; render(); };
for (const input of document.querySelectorAll('input[name="format"]')) input.onchange = () => { clearResult(); phase(selected ? 'ready' : 'idle'); render(); };
$('creator-form').onsubmit = async event => {
  event.preventDefault(); if (busy || !eligible()) return;
  clearResult(); setBusy(true); phase('creating'); status(format() === 'web' ? 'Exporting your web app…' : 'Making room for your next app…');
  try {
    const result = await api.make({ source: $('source').value, name: $('name').value, target: $('entry').value || undefined, format: format() });
    if (result.cancelled) { phase('ready'); status('Creation cancelled. Your existing files are unchanged.'); return; }
    phase('success');
    window.dispatchEvent(new CustomEvent('make-app:created',{detail:{...result,source:$('source').value,createdAt:Date.now()}}));
    const filename = result.executable?.split(/[\\/]/).at(-1) || result.name + '.' + result.format;
    status(result.preview ? 'Preview complete. Download Make App to create this file on your computer.'
      : result.format === 'web' ? 'Web app exported. Host the folder over HTTPS to use it on your devices.' : filename + ' is ready. Open it whenever you like.');
    $('reveal-label').textContent = result.preview ? 'Get Make App' : 'Show saved app'; $('reveal').hidden = false;
  } catch (error) { status(error.message, true); }
  finally { setBusy(false); }
};
$('cancel').onclick = async () => {
  $('cancel').disabled = true; status('Cancelling creation…');
  try { await api.cancel(); } catch (error) { $('cancel').disabled = false; status(error.message, true); }
};
api.onProgress(text => { $('progress').hidden = false; $('log').textContent = ($('log').textContent + text).slice(-12000);window.dispatchEvent(new Event('make-app:progress')); });
$('reveal').onclick = () => api.reveal().catch(error => status(error.message, true));
api.initial().then(openSource).catch(error => status(error.message, true)); api.onSource(openSource);
phase('idle'); render();
window.addEventListener('make-app:open-project',event=>openSource(event.detail?.path));
