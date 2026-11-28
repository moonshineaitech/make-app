const $ = id => document.getElementById(id);
const api = window.makeApp;
let selected, busy = false, sequence = 0, timer, nameEdited = false, platform, completed, busyOperation,targetPlatform,targetArch,projectsRevision=0,codexProjects=[];
let remembered=[];try{const rows=JSON.parse(localStorage.getItem('make-app-project-folders')||'[]');if(Array.isArray(rows))remembered=rows.filter(p=>typeof p?.path==='string'&&p.path.length<8192&&typeof p.name==='string').slice(0,12);}catch{}
const format = () => document.querySelector('input[name="format"]:checked').value;
function destination(){if(!platform)return null;const target=platform.targets?.find(t=>t.platform===targetPlatform&&t.arch===targetArch)||platform;return{...target,buildable:target.platform===platform.platform&&target.arch===platform.arch};}
function snapshot(){return{selected,busy,platform,target:destination(),completed,projectsRevision,format:format(),source:$('source').value,name:$('name').value,phase:document.body.dataset.phase};}
const phase = value => { document.body.dataset.phase = value; };
function eligible() {
  return !!selected && !selected.selection && (format() === 'web' ? selected.webAvailable : selected.configured !== false && selected.standalone?.supported!==false && platform?.supported && destination()?.buildable);
}
function render() {
  const web = format() === 'web';
  const target=destination();if(platform){$('desktop-label').textContent=(target?.name||platform.name)+' app';$('desktop-description').textContent=(target?.extension||platform.extension)+' · '+(target?.cpu||platform.arch);}
  $('make').disabled = busy || !eligible();
  $('make-label').textContent = busy ? (busyOperation==='open'?'Opening…':web ? 'Exporting…' : 'Creating…') : completed&&!api.preview&&!web?'Open app':web ? 'Export web app' : 'Create app';
  $('make').querySelector('.icon').className = 'icon ' + (busy ? 'i-loader' : 'i-arrow');
  $('web-hint').hidden = !web;
  $('web-hint').textContent = web && selected && !selected.webAvailable
    ? 'No static build found. Build the frontend first, then choose its folder. Backend services need their own host.'
    : 'Uses an existing static web build. Backend services need their own host.';
  $('scope').textContent = web
    ? 'Exports public static assets to a new folder. Host it over HTTPS to open or install it on your devices.'
    : 'Includes the project, dependencies and runtime. Move or share the finished app. Build steps may run while packaging.';
  $('review-heading').textContent = web ? 'Ready for a smaller screen.' : 'Ready to take with you.';
  $('fact-copy').textContent = web ? 'Static assets only' : 'Bundled snapshot';
  $('fact-setup').textContent = web ? 'HTTPS hosting' : 'Included in the app';
  const name = $('name').value.trim();
  $('output-name').textContent = completed?.executable?.split(/[\\/]/).at(-1) || (name ? name + (web ? ' · web export' : target?.extension || platform?.extension || '') : 'Your next app');
  $('output-caption').textContent = web ? 'Export to a folder of your choice' : api.preview?'Desktop app · browser preview':completed?.savedToDesktop?'Saved on your Desktop':$('ask-save').checked?'Choose a save location':'Saves to Desktop automatically';
  $('ask-save').closest('.save-choice').hidden=web||!!api.preview;
  window.dispatchEvent(new Event('make-app:render'));
  window.dispatchEvent(new CustomEvent('make-app:state',{detail:snapshot()}));
}
function setBusy(value,operation='create') {
  busy = value;busyOperation=operation;
  document.querySelectorAll('#creator-form input,#creator-form select,#browse,#entry,#ask-save').forEach(input => { input.disabled = value; });
  $('cancel').hidden = !value||operation==='open'; $('cancel').disabled = false;
  $('busy-progress').hidden = !value||operation==='open';
  document.querySelector('main').setAttribute('aria-busy', String(value));
  render();
}
function status(text, error = false) {
  $('status').textContent = text;
  $('status').setAttribute('role', error ? 'alert' : 'status');
  if (error) { phase('error'); $('status').focus(); }
}
function clearResult() {
  completed=null;status(''); $('reveal').hidden = true; $('progress').hidden = true;
  $('progress').open = false; $('log').textContent = '';
}
async function inspect() {
  const request = ++sequence;
  selected = null; clearResult(); render();
  $('facts').hidden = true; $('requirements').textContent = ''; $('credentials').textContent = '';$('subproject-area').hidden=true;
  $('source').removeAttribute('aria-invalid');
  if (!$('source').value.trim()) {
    phase('idle'); $('entry-area').hidden = true; $('detected').textContent = 'Setup is detected automatically.'; return;
  }
  phase('checking'); $('detection-icon').className = 'icon i-loader'; $('detected').textContent = 'Reading your project…';
  try {
    const result = await api.inspect({ source: $('source').value, target: $('entry').value || undefined });
    if (request !== sequence) return;
    selected = result;
    $('subproject-area').hidden=!result.selection||!result.candidates?.length;$('subproject').replaceChildren(new Option('Choose a project in this workspace',''));for(const candidate of result.candidates||[])$('subproject').append(new Option(candidate.name||candidate.label,candidate.path));
    $('detection-icon').className = 'icon ' + (result.selection || result.configured === false ? 'i-help' : 'i-circle-check');
    $('detected').textContent = result.message || result.label || 'Project detected';
    $('entry-area').hidden = !result.targets?.length || result.targets.length === 1;
    const previous = $('entry').value;
    $('entry').replaceChildren(new Option('Choose an entry point', ''));
    for (const target of result.targets || []) $('entry').append(new Option(target.label, target.id));
    $('entry').value = result.selectedTarget || previous;
    if (!nameEdited) $('name').value = result.name || '';
    $('facts').hidden = false; $('fact-kind').textContent = result.label || result.mode;
    $('requirements').textContent = result.standalone?.supported===false?result.standalone.reason:result.requirements?.length?'Uses '+result.requirements.join(' and ')+'. Prepared and bundled when you create the app.':'';
    $('credentials').textContent = result.requiredEnvironment?.length ? 'Required project settings: ' + result.requiredEnvironment.join(', ') : '';
    if(!api.preview&&!result.selection&&result.configured!==false)try{localStorage.setItem('make-app-last-project',$('source').value);}catch{}
    if(!api.preview&&!result.selection&&result.configured!==false){remembered=[{path:$('source').value,name:result.name||$('source').value},...remembered.filter(p=>p.path!==$('source').value)].slice(0,12);try{localStorage.setItem('make-app-project-folders',JSON.stringify(remembered));}catch{}drawProjects();}
    phase('ready'); render();
  } catch (error) {
    if (request !== sequence) return;
    selected = null; phase('error'); $('source').setAttribute('aria-invalid', 'true');
    $('detection-icon').className = 'icon i-help'; $('detected').textContent = error.message;
    $('facts').hidden = true; $('entry-area').hidden = true; render();
    if(!api.preview)try{if(localStorage.getItem('make-app-last-project')===$('source').value)localStorage.removeItem('make-app-last-project');}catch{}
  }
}
async function openSource(source) {
  if (!source || busy) return;
  clearTimeout(timer); sequence++; $('source').value = source; $('entry').value = ''; nameEdited = false;
  $('saved').value = [...$('saved').options].some(option => option.value === source) ? source : '';
  await inspect();
}
api.capabilities().then(value => {
  platform = value;targetPlatform=value.platform;targetArch=value.arch; $('platform').textContent = value.name + (api.preview ? ' · preview' : ' · ' + value.arch);
  $('desktop-label').textContent = value.name + ' app';
  $('desktop-description').textContent = value.extension + ' · opens on this computer'; render();
}).catch(error => status(error.message, true));
function drawProjects(){const value=$('saved').value;$('saved').replaceChildren(new Option('Select a project',''));const rows=[...codexProjects,...remembered.filter(p=>!codexProjects.some(c=>c.path===p.path))];for(const p of rows)$('saved').append(new Option(p.name,p.path));if(!rows.length)$('saved').firstElementChild.textContent='No saved projects yet — browse a folder';$('saved').value=rows.some(p=>p.path===value)?value:rows.some(p=>p.path===$('source').value)?$('source').value:'';projectsRevision++;}
async function refreshProjects(){codexProjects=await api.projects();drawProjects();render();return codexProjects.length;}
refreshProjects().catch(()=>{drawProjects();render();});
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
$('subproject').onchange=()=>{const path=$('subproject').value;if(selected?.candidates?.some(c=>c.path===path))openSource(path);};
$('name').oninput = () => { nameEdited = true; clearResult();phase(selected?'ready':'idle');render(); };
$('ask-save').onchange=()=>{clearResult();phase(selected?'ready':'idle');render();};
for (const input of document.querySelectorAll('input[name="format"]')) input.onchange = () => { clearResult(); phase(selected ? 'ready' : 'idle'); render(); };
$('creator-form').onsubmit = async event => {
  event.preventDefault(); if (busy || !eligible()) return;
  if(completed&&!api.preview&&format()!=='web'){
    setBusy(true,'open');status('Opening '+completed.name+'…');
    try{await api.openCreated();status(completed.name+' is opening. You can close Make App.');}
    catch(error){status(error.message,true);}finally{setBusy(false);}return;
  }
  clearResult(); setBusy(true); phase('creating'); status(format() === 'web' ? 'Exporting your web app…' : 'Making room for your next app…');
  try {
    const result = await api.make({ source: $('source').value, name: $('name').value, target: $('entry').value || undefined, format: format(),askSave:$('ask-save').checked,targetPlatform:destination()?.platform,targetArch:destination()?.arch });
    if (result.cancelled) { phase('ready'); status('Creation cancelled. Your existing files are unchanged.'); return; }
    completed=result;phase('success');
    window.dispatchEvent(new CustomEvent('make-app:created',{detail:{...result,source:$('source').value,createdAt:Date.now()}}));
    const filename = result.executable?.split(/[\\/]/).at(-1) || result.name + '.' + result.format;
    status(result.preview ? 'Preview complete. Download Make App to create this file on your computer.'
      : result.format === 'web' ? 'Web app exported. Host the folder over HTTPS to use it on your devices.' : filename + ' is ready'+(result.savedToDesktop?' on your Desktop':'')+'. Click Open app to use it.');
    $('reveal-label').textContent = result.preview ? 'Get Make App' : 'Show saved app'; $('reveal').hidden = false;
    if(result.historyWarning)status($('status').textContent+' '+result.historyWarning);
  } catch (error) { status(error.message, true); }
  finally { setBusy(false); }
};
$('cancel').onclick = async () => {
  $('cancel').disabled = true; status('Cancelling creation…');
  try { await api.cancel(); } catch (error) { $('cancel').disabled = false; status(error.message, true); }
};
api.onProgress(text => { $('progress').hidden = false; $('log').textContent = ($('log').textContent + text).slice(-12000);window.dispatchEvent(new Event('make-app:progress')); });
$('reveal').onclick = () => api.reveal().catch(error => status(error.message, true));
api.initial().then(source=>{if(!source&&!api.preview)try{source=localStorage.getItem('make-app-last-project');}catch{}return openSource(source);}).catch(error => status(error.message, true)); api.onSource(openSource);
phase('idle'); render();
window.addEventListener('make-app:open-project',event=>openSource(event.detail?.path));
window.makeAppCreator=Object.freeze({state:snapshot,refreshProjects,selectTarget(os,arch){if(busy)return;const choice=platform?.targets?.find(t=>t.platform===os&&t.arch===arch);if(!choice)throw Error('Unsupported desktop target.');if(targetPlatform===os&&targetArch===arch)return;targetPlatform=os;targetArch=arch;clearResult();phase(selected?"ready":"idle");render();},useFormat(value){if(busy||!['desktop','web'].includes(value)||format()===value)return;const input=document.querySelector('input[name=format][value='+value+']');input.checked=true;input.dispatchEvent(new Event('change'));},async another(){if(busy)return false;const source=await api.choose();if(!source)return false;await openSource(source);return true;}});
$('copy-output').onclick=async()=>{try{if(api.copyText)await api.copyText(completed.executable);else await navigator.clipboard.writeText(completed.executable);status('Saved app path copied.');}catch{status('Copy the saved path from Recent apps.');}};
$('another-app').onclick=async()=>{try{if(await window.makeAppCreator.another())window.makeAppWorkflow.close();}catch(e){status(e.message,true);}};
