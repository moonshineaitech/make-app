const dialog = document.getElementById('download-dialog');
const iframe = document.getElementById('app-demo');
const announcement = document.getElementById('announcement');
const siteDesigns=[...Object.entries(window.makeAppScenes||{}).map(([id,scene])=>({id,name:scene.name,collection:'original'})),...(window.makeAppStudioThemes||[]).map(scene=>({id:scene.id,name:scene.name,collection:'studio'}))];
const designGrid=document.getElementById('site-design-options'),designSearch=document.getElementById('site-design-search'),designStatus=document.getElementById('site-design-status');
let designCollection='all',previewDesign='midnight_tide';
function showDesigns(){let count=0;for(const button of designGrid.children){button.hidden=(designCollection!=='all'&&button.dataset.collection!==designCollection)||!button.dataset.name.includes(designSearch.value.toLocaleLowerCase());if(!button.hidden)count++;button.setAttribute('aria-pressed',String(button.dataset.design===previewDesign));}designStatus.textContent=count+' '+(count===1?'design':'designs')+' · Choose one to preview it above.';}
for(const design of siteDesigns){const button=document.createElement('button');button.type='button';button.className='site-design-card';button.dataset.design=design.id;button.dataset.collection=design.collection;button.dataset.name=design.name.toLocaleLowerCase();const image=document.createElement('img');image.src='app/assets/'+(design.collection==='original'?'aero/':'studio/')+design.id+'.jpg';image.alt='';image.loading='lazy';const caption=document.createElement('span'),title=document.createElement('strong'),collection=document.createElement('small');title.textContent=design.name;collection.textContent=design.collection==='original'?'Original collection':'Studio collection';caption.append(title,collection);button.append(image,caption);button.addEventListener('click',()=>{previewDesign=design.id;showDesigns();iframe.contentWindow.postMessage({type:'make-app:theme',theme:design.id},location.origin);document.getElementById('live-preview').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});announcement.textContent='Previewing '+design.name+'.';});designGrid.append(button);}
for(const button of document.querySelectorAll('[data-design-collection]'))button.addEventListener('click',()=>{designCollection=button.dataset.designCollection;for(const other of document.querySelectorAll('[data-design-collection]'))other.setAttribute('aria-pressed',String(other===button));showDesigns();});
designSearch.addEventListener('input',showDesigns);showDesigns();
const builds = {
 'mac-arm64': {app:'Make-App-macOS-arm64.zip',plugin:'Make-App-Codex-Plugin-macOS-arm64.tar.gz'},
 'mac-x64': {app:'Make-App-macOS-x64.zip',plugin:'Make-App-Codex-Plugin-macOS-x64.tar.gz'},
 'windows-x64': {app:'Make-App-Windows-x64.exe',plugin:'Make-App-Codex-Plugin-Windows-x64.zip'},
 'linux-x64': {app:'Make-App-Linux-x64.AppImage',plugin:'Make-App-Codex-Plugin-Linux-x64.tar.gz'},
 'linux-arm64': {app:'Make-App-Linux-arm64.AppImage',plugin:'Make-App-Codex-Plugin-Linux-arm64.tar.gz'}
};
let releases, releaseRequest, releaseError = false;
function selectedBuild() { return document.querySelector('input[name="platform"]:checked').value; }
function trustedDownload(asset) {
 try { const url = new URL(asset?.browser_download_url); return url.protocol === 'https:' && url.hostname === 'github.com' && url.pathname.startsWith('/moonshineaitech/make-app/releases/download/') ? url.href : null; } catch { return null; }
}
function renderDownloads(error = releaseError) {
 const native = document.getElementById('download-native'), plugin = document.getElementById('download-plugin'), status = document.getElementById('release-status');
 native.hidden = true; plugin.hidden = true;
 if (!releases) { status.textContent = error ? 'Public downloads could not be checked. Open GitHub releases for the latest available builds.' : 'Checking public releases…'; return; }
 const release = releases.find(item => !item.draft && !item.prerelease && item.assets?.some(asset => asset.name === builds[selectedBuild()].app)) || releases.find(item => !item.draft && item.assets?.some(asset => asset.name === builds[selectedBuild()].app));
 const appAsset = release?.assets.find(asset => asset.name === builds[selectedBuild()].app), pluginAsset = release?.assets.find(asset => asset.name === builds[selectedBuild()].plugin);
 const appUrl = trustedDownload(appAsset), pluginUrl = trustedDownload(pluginAsset);
 if (!appUrl) { status.textContent = 'The current preview is in maintainer review. Downloads will appear here when a build is published. You can explore the source now.'; return; }
 status.textContent = `${release.tag_name} · unsigned preview. Choose the converter, or the complete bundle for your coding tool.`;
 native.href = appUrl; native.hidden = false;
 if (pluginUrl) { plugin.href = pluginUrl; plugin.hidden = false; }
}
async function loadReleases() {
 if (!releaseRequest) {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 12000);
  releaseRequest = fetch('https://api.github.com/repos/moonshineaitech/make-app/releases?per_page=20', { headers:{Accept:'application/vnd.github+json'}, credentials:'omit', referrerPolicy:'no-referrer', signal:controller.signal }).then(async response => { if (!response.ok) throw new Error('Release check unavailable'); const value = await response.json(); if (!Array.isArray(value)) throw new Error('Invalid release response'); releases = value; }).catch(() => { releaseError = true; renderDownloads(true); return false; }).finally(() => clearTimeout(timer));
 }
 const success = await releaseRequest;
 if (success !== false) renderDownloads();
}
function openDownloads(platform) {
 if (platform && builds[platform]) document.querySelector(`input[name="platform"][value="${platform}"]`).checked = true;
 if (!dialog.open) dialog.showModal();
 renderDownloads(); loadReleases();
}
const platformDefault = /Win/.test(navigator.platform) ? 'windows-x64' : /Linux/.test(navigator.platform) ? 'linux-x64' : 'mac-arm64';
for (const button of document.querySelectorAll('[data-download]')) button.addEventListener('click', () => openDownloads(button.dataset.platform || platformDefault));
document.getElementById('close-download').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
for (const input of document.querySelectorAll('input[name="platform"]')) input.addEventListener('change', () => renderDownloads());
for (const button of document.querySelectorAll('[data-mode]')) button.addEventListener('click', () => {
 for (const item of document.querySelectorAll('[data-mode]')) item.setAttribute('aria-pressed', String(item === button));
 iframe.contentWindow.postMessage({ type:'make-app:format',format:button.dataset.mode }, location.origin);
});
window.addEventListener('message', event => {
 if(event.origin!==location.origin||event.source!==iframe.contentWindow)return;
 if(event.data?.type==='make-app:download')openDownloads(platformDefault);
 if(event.data?.type==='make-app:theme'&&(event.data.theme===null||siteDesigns.some(design=>design.id===event.data.theme))){previewDesign=event.data.theme;showDesigns();}
 if(event.data?.type==='make-app:format'&&['desktop','web'].includes(event.data.format))for(const button of document.querySelectorAll('[data-mode]'))button.setAttribute('aria-pressed',String(button.dataset.mode===event.data.format));
 if(event.data?.type==='make-app:size'&&Number.isFinite(event.data.height)&&event.data.height>=300&&event.data.height<=2400){
  const height=Math.ceil(event.data.height)+'px';if(iframe.style.height!==height)iframe.style.height=height;
 }
});
const agents = {
 codex:{context:'In your Codex chat',detail:'Plugin + run-project skill',note:'Install the Codex plugin, then open a new chat. Make App uses the current project.'},
 claude:{context:'In your Claude Code chat',detail:'Project-scoped MCP connection',note:'Open Connect Coding Tool, choose Claude Code and select your project folder. No config to write.'},
 cursor:{context:'In your Cursor chat',detail:'Project-scoped MCP connection',note:'Open Connect Coding Tool, choose Cursor and select your project folder. Your existing settings stay in place.'},
 others:{context:'In your coding tool',detail:'Copilot · Gemini CLI · OpenCode',note:'Use the setup wizard for supported tools. Other local harnesses can use the generic MCP configuration or JSON CLI.'}
};
for (const button of document.querySelectorAll('[data-agent]')) button.addEventListener('click', () => {
 const agent = agents[button.dataset.agent];
 for (const item of document.querySelectorAll('[data-agent]')) item.setAttribute('aria-pressed', String(item === button));
 document.getElementById('agent-context').textContent = agent.context;
 document.getElementById('agent-detail').textContent = agent.detail;
 document.getElementById('agent-note').textContent = agent.note;
});
let copyTimer;
document.getElementById('copy-prompt').addEventListener('click', async () => {
 try { await navigator.clipboard.writeText(document.getElementById('agent-prompt').textContent); document.getElementById('copy-label').textContent = 'Copied'; announcement.textContent = 'Prompt copied.'; clearTimeout(copyTimer); copyTimer = setTimeout(() => { document.getElementById('copy-label').textContent = 'Copy prompt'; }, 2200); }
 catch { announcement.textContent = 'Copy is unavailable in this browser. Select the prompt text to copy it.'; }
});
if (location.hash === '#download') openDownloads(platformDefault);
