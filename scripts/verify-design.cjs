const { app, BrowserWindow, ipcMain, nativeTheme } = require('electron');
const fs = require('node:fs/promises'), path = require('node:path'), assert = require('node:assert/strict');
app.commandLine.appendSwitch('force-device-scale-factor', '1');
app.disableHardwareAcceleration(); app.on('window-all-closed', () => {});
const watchdog = setTimeout(() => { console.error('Design verification exceeded 90 seconds.'); app.exit(1); }, 90000); watchdog.unref();
const root = path.resolve(__dirname, '..'), output = path.resolve(process.env.MAKE_APP_DESIGN_OUTPUT || path.join(root, 'qa/design'));
app.setPath('userData', path.join(output, 'profile'));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(fn, label) { const end = Date.now() + 15000; while (Date.now() < end) { if (await fn()) return; await delay(35); } throw new Error('Timed out: ' + label); }
let pendingMake, creationMode = 'success', madePayload, revealCalls = 0;
ipcMain.handle('creator', async (event, method, args) => {
  if (method === 'capabilities') return { ...require('../src/platform.cjs').capabilities() };
  if (method === 'initial') return 'C:/Projects/Focus Notes';
  if (method === 'projects') return [{ name: 'Focus Notes', path: 'C:/Projects/Focus Notes' }];
  if (method === 'inspect') {
    await delay(args.source.includes('slow-a') ? 220 : 25);
    if (args.source.includes('invalid')) throw new Error('Choose an existing project folder.');
    return { name: args.source.includes('fast-b') ? 'Fast B' : 'Focus Notes', label: 'TypeScript web app', configured: true, webAvailable: true, setupTasks: 1, buildTasks: 1, requirements: ['Node.js', 'npm'], requiredEnvironment: [] };
  }
  if (method === 'choose') return 'C:/Projects/Focus Notes';
  if (method === 'make') {
    madePayload = args; event.sender.send('creator-progress', 'Preparing the app launcher…\n');
    if (creationMode === 'wait') return new Promise(resolve => { pendingMake = resolve; });
    const host = require('../src/platform.cjs').host();
    return { executable: 'C:/Apps/Focus Notes' + host.extension, name: 'Focus Notes', format: args.format === 'web' ? 'web' : host.extension.slice(1) };
  }
  if (method === 'cancel') { pendingMake?.({ cancelled: true }); pendingMake = null; return; }
  if (method === 'reveal') { revealCalls++; return; }
});
async function evaluate(win, code) { return win.webContents.executeJavaScript(code); }
async function scan(win, surface, theme, width) {
  const violations = await evaluate(win, `axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then(r=>r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})))`);
  const layout = await evaluate(win, `({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth})`);
  const readability = await evaluate(win, `(()=>{const values=[];function inspect(doc){for(const element of doc.body.querySelectorAll('*')){if(element.closest('.sr-only,[aria-hidden="true"]')||!element.getClientRects().length)continue;const css=doc.defaultView.getComputedStyle(element);if(css.visibility==='hidden'||css.display==='none')continue;if([...element.childNodes].some(node=>node.nodeType===3&&node.textContent.trim())){const size=parseFloat(css.fontSize);values.push({selector:element.id?'#'+element.id:element.tagName.toLowerCase()+'.'+[...element.classList].join('.'),size});}}for(const frame of doc.querySelectorAll('iframe'))if(frame.contentDocument?.body)inspect(frame.contentDocument);}inspect(document);return{minimum:Math.min(...values.map(value=>value.size)),belowMinimum:values.filter(value=>value.size<13)}})()`);
  return { surface, theme, width, actualWidth: layout.width, zoom:win.webContents.getZoomFactor(), horizontalOverflow: layout.overflow, readability, violations };
}
async function stable(win) {
  // Hidden native windows may suspend rAF. Keep the animation settling wait bounded.
  await delay(280);
  await evaluate(win, `document.getAnimations().filter(animation=>Number.isFinite(animation.effect.getComputedTiming().endTime)).forEach(animation=>animation.finish());true`);
}
async function capture(win, name) { await stable(win); await fs.writeFile(path.join(output, name), (await win.webContents.capturePage()).toPNG()); }
app.whenReady().then(async () => {
  await fs.mkdir(output, { recursive: true });
  const server = require('./preview-site.cjs').createServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const axe = await fs.readFile(path.join(root, 'node_modules/axe-core/axe.min.js'), 'utf8'), checks = [];
  for (const theme of ['light', 'dark']) {
    nativeTheme.themeSource = theme;
    const win = new BrowserWindow({ show: false, width: 1000, height: 900, webPreferences: { preload: path.join(root, 'src/creator-preload.cjs'), contextIsolation: true, sandbox: true, nodeIntegration: false, backgroundThrottling: false } });
    await win.loadURL(origin + '/app/creator.html?theme=' + theme); await until(() => evaluate(win, `!document.getElementById('make').disabled`), 'project inspection');
    await evaluate(win, 'document.fonts.ready'); await evaluate(win, axe);
    assert.equal(await evaluate(win, 'window.makeApp.preview'), undefined, 'The browser demo must not replace native IPC');
    for (const width of [1000, 900, 520, 390, 320]) { win.setContentSize(width, 1050); await stable(win); checks.push(await scan(win, 'creator', theme, width)); }
    win.setContentSize(1000, 900); await capture(win, 'app-' + theme + '.png');
    if (theme === 'light') {
      win.webContents.setZoomFactor(2);await stable(win);checks.push(await scan(win,'creator-200-percent','light',1000));win.webContents.setZoomFactor(1);await stable(win);
      await evaluate(win, `document.getElementById('name').value='My App';document.getElementById('name').dispatchEvent(new Event('input'));document.getElementById('make').click();true`);
      await until(() => evaluate(win, `!document.getElementById('reveal').hidden`), 'success state');
      assert.equal(madePayload.name, 'My App'); await evaluate(win, `document.getElementById('reveal').click();true`); assert.equal(revealCalls, 1);
      await capture(win, 'app-success.png');
      await evaluate(win, `document.querySelector('input[value="web"]').click();true`); assert.equal(await evaluate(win, `document.getElementById('make-label').textContent`), 'Export web app');
      creationMode = 'wait'; await evaluate(win, `document.getElementById('make').click();true`); await until(() => Promise.resolve(!!pendingMake), 'pending creation');
      assert.equal(await evaluate(win, `document.getElementById('source').disabled`), true);
      win.setContentSize(320,900);await stable(win);checks.push(await scan(win,'creator-busy','light',320));win.setContentSize(1000,900);
      await evaluate(win, `document.getElementById('cancel').click();true`); await until(() => evaluate(win, `!document.getElementById('source').disabled`), 'cancellation');
      assert.match(await evaluate(win, `document.getElementById('status').textContent`), /cancelled/);
      creationMode = 'success';
      await evaluate(win, `document.getElementById('source').value='C:/Projects/slow-a';document.getElementById('source').dispatchEvent(new Event('change'));true`);
      await delay(35); await evaluate(win, `document.getElementById('source').value='C:/Projects/fast-b';document.getElementById('source').dispatchEvent(new Event('input'));true`);
      await delay(230); assert.equal(await evaluate(win, `document.getElementById('make').disabled`), true, 'A stale inspection must not enable the wrong project');
      await until(() => evaluate(win, `document.getElementById('name').value==='Fast B'&&!document.getElementById('make').disabled`), 'newest inspection');
      await evaluate(win, `document.getElementById('source').value='C:/Projects/invalid';document.getElementById('source').dispatchEvent(new Event('change'));true`);
      await until(() => evaluate(win, `document.getElementById('source').getAttribute('aria-invalid')==='true'`), 'invalid source');
      assert.equal(await evaluate(win, `document.getElementById('make').disabled`), true);
    }
    win.destroy();
  }
  nativeTheme.themeSource = 'light';
  const site = new BrowserWindow({ show: false, width: 1440, height: 1000, webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, backgroundThrottling: false } });
  await site.loadURL(origin + '/'); await evaluate(site, 'document.fonts.ready'); await delay(300); await evaluate(site, axe);
  for (const width of [1440, 1024, 768, 390, 320]) {
    site.setContentSize(width, 1050); await stable(site);
    await until(() => evaluate(site, `(()=>{const frame=document.getElementById('app-demo');const shell=frame.contentDocument?.querySelector('.creator-shell');return shell&&Math.abs(frame.clientHeight-shell.getBoundingClientRect().height-(frame.contentDocument.documentElement.dataset.photo?60:2))<5})()`), 'preview resize');
    checks.push(await scan(site, 'website', 'light', width));
    if (width === 390) await capture(site, 'website-mobile.png');
  }
  site.setContentSize(1440, 1000); await stable(site);
  await until(() => evaluate(site, `(()=>{const frame=document.getElementById('app-demo');return Math.abs(frame.clientHeight-frame.contentDocument.querySelector('.creator-shell').getBoundingClientRect().height-(frame.contentDocument.documentElement.dataset.photo?60:2))<5})()`), 'desktop preview resize');
  await capture(site, 'website-desktop.png');
  await evaluate(site, `(()=>{const d=document.getElementById('app-demo').contentDocument;d.getElementById('appearance').click();d.querySelector('[data-theme-choice=midnight_tide]').click();d.getElementById('close-themes').click()})()`);
  await until(()=>evaluate(site,`(()=>{const f=document.getElementById('app-demo'),d=f.contentDocument;return d.documentElement.dataset.photo==='midnight_tide'&&Math.abs(f.clientHeight-d.getElementById('creator-viewport').getBoundingClientRect().height-60)<5})()`),'photographic embedded preview resize');
  checks.push(await scan(site,'website-photographic-preview','light',1440));
  await capture(site,'website-photographic-preview.png');
  await evaluate(site,`(()=>{const d=document.getElementById('app-demo').contentDocument;d.getElementById('appearance').click();d.getElementById('use-classic').click();d.getElementById('close-themes').click()})()`);
  site.webContents.setZoomFactor(2);await stable(site);
  await until(()=>evaluate(site,`(()=>{const frame=document.getElementById('app-demo');return Math.abs(frame.clientHeight-frame.contentDocument.querySelector('.creator-shell').getBoundingClientRect().height-(frame.contentDocument.documentElement.dataset.photo?60:2))<5})()`),'zoomed preview resize');
  checks.push(await scan(site,'website-200-percent','light',1440));site.webContents.setZoomFactor(1);await stable(site);
  nativeTheme.themeSource='dark';await site.loadURL(origin+'/');await until(()=>evaluate(site,`document.getElementById('app-demo').contentDocument?.body.dataset.phase==='ready'`),'light preview under dark system appearance');await stable(site);await evaluate(site,axe);
  await evaluate(site,`(()=>{const d=document.getElementById('app-demo').contentDocument;d.getElementById('appearance').click();d.getElementById('use-classic').click();d.getElementById('close-themes').click()})()`);
  assert.equal(await evaluate(site,`getComputedStyle(document.getElementById('app-demo').contentDocument.documentElement).colorScheme`),'light','Explicit light appearance must not inherit a dark canvas');
  await until(()=>evaluate(site,`!document.querySelector('.site-design-card[aria-pressed=true]')`),'Classic clears the photographic gallery selection');
  await evaluate(site,`(()=>{const d=document.getElementById('app-demo').contentDocument,i=d.querySelector('input[name=format][value=web]');i.checked=true;i.dispatchEvent(new Event('change'))})()`);
  await until(()=>evaluate(site,`document.querySelector('[data-mode=web]').getAttribute('aria-pressed')==='true'`),'embedded output changes update the website toolbar');
  await evaluate(site,`document.querySelector('[data-mode=desktop]').click();true`);
  await until(()=>evaluate(site,`document.getElementById('app-demo').contentDocument.querySelector('input[name=format][value=desktop]').checked`),'website toolbar changes update the embedded output');
  checks.push(await scan(site,'website-dark-system','light',1440));
  nativeTheme.themeSource='light';
  assert.equal(await evaluate(site,`document.querySelectorAll('.site-design-card').length`),20);
  await evaluate(site,`document.querySelector('[data-design-collection=studio]').click();true`);
  assert.equal(await evaluate(site,`[...document.querySelectorAll('.site-design-card')].filter(b=>!b.hidden).length`),10);
  await evaluate(site,`document.getElementById('site-design-search').value='Sapphire';document.getElementById('site-design-search').dispatchEvent(new Event('input'));document.querySelector('[data-design=sapphire_reef]').click();true`);
  await until(()=>evaluate(site,`document.getElementById('app-demo').contentDocument.documentElement.dataset.aero==='sapphire_reef'`),'website gallery applies the selected design');
  assert.equal(await evaluate(site,`[...document.querySelectorAll('.site-design-card')].filter(b=>!b.hidden).length`),1);
  assert.equal(await evaluate(site,`document.querySelector('.site-atmosphere h3').textContent`),'Sapphire Reef');
  assert.ok(await evaluate(site,`document.querySelector('.site-atmosphere a').getAttribute('href').endsWith('style=sapphire_reef&view=overview')`));
  checks.push(await scan(site,'website-live-design-gallery','light',1440));
  await evaluate(site,`document.getElementById('site-design-search').value='no-such-design';document.getElementById('site-design-search').dispatchEvent(new Event('input'));true`);
  assert.equal(await evaluate(site,`[...document.querySelectorAll('button')].find(b=>b.textContent==='Show all designs').hidden`),false);
  await evaluate(site,`[...document.querySelectorAll('button')].find(b=>b.textContent==='Show all designs').click();true`);
  assert.equal(await evaluate(site,`[...document.querySelectorAll('.site-design-card')].filter(b=>!b.hidden).length`),20);
  await evaluate(site, `window.fetch=async()=>({ok:true,json:async()=>[]});document.querySelector('[data-download]').click();true`);
  await until(() => evaluate(site, `document.getElementById('release-status').textContent.includes('maintainer review')`), 'draft download state');
  assert.equal(await evaluate(site, `document.getElementById('download-native').hidden`), true, 'Drafts must not become broken public download links');
  await evaluate(site,`document.querySelector('[name=platform][value=linux-arm64]').click();true`);assert.ok(await evaluate(site,`document.querySelector('.download-instruction').textContent.includes('AppImage')`));
  await capture(site, 'website-downloads.png');
  checks.push(await scan(site,'website-downloads','light',1440));
  await evaluate(site, `document.getElementById('close-download').click();document.querySelector('[data-agent="cursor"]').click();true`);
  assert.equal(await evaluate(site, `document.getElementById('agent-context').textContent`), 'In your Cursor chat');
  await evaluate(site, `document.querySelector('.faq-list summary').click();true`); assert.equal(await evaluate(site, `document.querySelector('.faq-list details').open`), true);
  const report = { passed: checks.every(check => !check.horizontalOverflow && !check.violations.length && !check.readability.belowMinimum.length), fixture: 'Controlled UI IPC and public release fixtures; native app creation is verified by desktop acceptance separately', checks, behavior: { success: true, reveal: true, webChoice: true, cancellation: true, staleInspectionRejected: true, invalidSource: true, draftDownloadsHonest: true, harnessTabs: true, faq: true, readableAt200Percent:true, lightPreviewOnDarkSystem:true }, physicalMobileTested: false };
  await fs.writeFile(path.join(output, 'verification.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: report.passed, checks: checks.length, violations: checks.reduce((sum, check) => sum + check.violations.length, 0), overflow: checks.filter(check => check.horizontalOverflow).length, undersizedText:checks.reduce((sum,check)=>sum+check.readability.belowMinimum.length,0), output }));
  site.destroy(); server.close(); app.exit(report.passed ? 0 : 1);
}).catch(error => { console.error(error); app.exit(1); });
