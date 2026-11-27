// Bounded smoke for the complete theme collection and utility screens.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
app.commandLine.appendSwitch('force-device-scale-factor','1');app.disableHardwareAcceleration();app.on('window-all-closed',()=>{});
const output=path.resolve(process.env.MAKE_APP_VIEWS_OUTPUT||path.join(__dirname,'../qa/views'));
app.setPath('userData',path.join(output,'profile'));
setTimeout(()=>{console.error('View smoke exceeded 90 seconds');app.exit(1)},90000).unref();
const pause=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{
 await fs.mkdir(output,{recursive:true});const server=require('./preview-site.cjs').createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const win=new BrowserWindow({show:false,width:1487,height:1300,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
 const axe=await fs.readFile(path.join(__dirname,'../node_modules/axe-core/axe.min.js'),'utf8'),accessibility=[];
 const run=code=>win.webContents.executeJavaScript(code),errors=[],checks=[];
 win.webContents.on('console-message',e=>{if(e.level==='error')errors.push(e.message)});
 const until=async(code)=>{for(let i=0;i<100;i++){if(await run(code))return;await pause(30)}throw Error('Not ready: '+code)};
 const scan=async(label)=>{await run("document.getAnimations().filter(a=>Number.isFinite(a.effect.getComputedTiming().endTime)).forEach(a=>a.finish());true");await pause(35);const result=await run(`({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,heading:document.querySelector('#app-views[open] #views-title')?.textContent||document.querySelector('h1')?.textContent})`);checks.push({label,...result});};
 await win.loadURL('http://127.0.0.1:'+server.address().port+'/app/creator.html?style=sakura_glass');await until("document.body.dataset.phase==='ready'");await run('document.fonts.ready');
 await run(axe);
 const audit=async label=>{const violations=await run("axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then(r=>r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})))");accessibility.push({label,violations});};
 const themes=await run("[...document.querySelectorAll('[data-theme-choice]')].map(e=>e.dataset.themeChoice)");assert.equal(themes.length,20);
 for(const theme of themes){
  await run(`document.getElementById('appearance').click();document.querySelector('[data-theme-choice=${theme}]').click();document.getElementById('close-themes').click();true`);
  await until("[...document.images].filter(i=>i.getClientRects().length).every(i=>i.complete&&i.naturalWidth>0)");await scan(theme);
  if(await run('!!document.documentElement.dataset.studio')){await audit(theme);await pause(200);await fs.writeFile(path.join(output,theme+'.jpg'),(await win.webContents.capturePage()).toJPEG(87));win.setContentSize(390,1000);await scan(theme+'-mobile');win.setContentSize(1487,1300);}
 }
 const views=['overview','projects','details','outputs','setup','activity','results','connections','designs','preferences','help','about'];
 for(const view of views){await run(`window.makeAppViews.open('${view}');true`);await scan(view);assert.ok(checks.at(-1).heading);await audit(view);if(['overview','projects','connections'].includes(view))await fs.writeFile(path.join(output,'view-'+view+'.jpg'),(await win.webContents.capturePage()).toJPEG(87));win.setContentSize(390,1000);await scan(view+'-mobile');win.setContentSize(1487,1300);}
 await run("document.getElementById('close-views').click();document.getElementById('make').click();true");await until("document.body.dataset.phase==='creating'");
 await run("window.makeAppViews.open('activity');true");assert.ok(await run("document.querySelector('#view-content progress')!==null"));
 await run("[...document.querySelectorAll('#view-content button')].find(b=>b.textContent.includes('Cancel creation')).click();true");await until("document.getElementById('status').textContent.includes('cancelled')");
 await run("document.getElementById('close-views').click();document.getElementById('make').click();true");await until("document.body.dataset.phase==='success'");
 await run("window.makeAppViews.open('results');true");assert.ok(await run("document.getElementById('view-content').textContent.includes('Browser demonstration')"));
 await run("window.makeAppViews.open('projects');document.querySelector('[aria-label=\"Search projects\"]').value='Orbit';document.querySelector('[aria-label=\"Search projects\"]').dispatchEvent(new Event('input'));true");assert.equal(await run("document.querySelectorAll('.project-row').length"),1);
 const passed=!errors.length&&checks.every(c=>!c.overflow)&&accessibility.every(c=>!c.violations.length);await fs.writeFile(path.join(output,'verification.json'),JSON.stringify({passed,checks,errors,accessibility,behavior:{themes:20,views:12,creation:true,cancellation:true,projectSearch:true},scope:'Bounded browser-fixture UI smoke; native launcher and device acceptance are separate.'},null,2));
 console.log(JSON.stringify({passed,checks:checks.length,accessibility:accessibility.filter(c=>c.violations.length),overflow:checks.filter(c=>c.overflow),errors,output}));win.destroy();server.close();app.exit(passed?0:1);
}).catch(e=>{console.error(e);app.exit(1)});
