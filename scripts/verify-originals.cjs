// Focused acceptance for the ten original, complete app interfaces.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
app.disableHardwareAcceleration();app.commandLine.appendSwitch('force-device-scale-factor','1');app.on('window-all-closed',()=>{});
const output=path.resolve(process.env.MAKE_APP_ORIGINALS_OUTPUT||path.join(__dirname,'../qa/originals'));app.setPath('userData',path.join(output,'profile'));
setTimeout(()=>{console.error('Original interface smoke exceeded 90 seconds');app.exit(1)},90000).unref();
const pause=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{
 await fs.mkdir(output,{recursive:true});const server=require('./preview-site.cjs').createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const win=new BrowserWindow({show:false,width:1487,height:1058,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
 const run=s=>win.webContents.executeJavaScript(s),checks=[],accessibility=[],errors=[];win.webContents.on('console-message',e=>{if(e.level==='error')errors.push(e.message)});
 const until=async s=>{for(let i=0;i<100;i++){if(await run(s))return;await pause(30)}throw Error('Timed out: '+s)};
 const stable=()=>run("document.getAnimations().filter(a=>Number.isFinite(a.effect.getComputedTiming().endTime)).forEach(a=>a.finish());true");
 const capture=async name=>{await stable();await pause(90);await fs.writeFile(path.join(output,name+'.jpg'),(await win.webContents.capturePage()).toJPEG(88))};
 const axe=await fs.readFile(path.join(__dirname,'../node_modules/axe-core/axe.min.js'),'utf8');
 const ids=['midnight_tide','botanical_canopy','stratosphere','pearl_current','citrus_circuit','cobalt_hydro','aurora_lake','sunset_estuary','glacial_quartz','meadow_os'];
 const views=['overview','projects','details','outputs','setup','activity','results','connections','designs','preferences','help','about'];
 for(const id of ids){
  win.setContentSize(1487,1058);await win.loadURL('http://127.0.0.1:'+server.address().port+'/app/creator.html?style='+id);await until("document.body.dataset.phase==='ready'");await run('document.fonts.ready');await stable();assert.equal(await run('document.documentElement.dataset.photo'),id);await capture(id+'-creator');
  await run(axe);await run("document.getElementById('open-views').click();true");
  for(const width of [1487,390]){win.setContentSize(width,1058);await until('innerWidth==='+width);await pause(70);for(const view of views){await run(`document.querySelector('#views-nav [data-view=${view}]').click();true`);await stable();const layout=await run("(()=>{const d=document.getElementById('app-views'),s=document.querySelector('.views-stage');return{original:d.dataset.original,view:d.dataset.view,heading:document.getElementById('views-title').textContent,documentWidth:document.documentElement.scrollWidth,stageWidth:s.clientWidth,stageScroll:s.scrollWidth,overflow:document.documentElement.scrollWidth>innerWidth||s.scrollWidth>s.clientWidth+1}})()");checks.push({theme:id,width,...layout});assert.equal(layout.original,id);assert.equal(layout.view,view);assert.ok(layout.heading);if(width===1487&&view==='overview'){await until("[...document.images].filter(i=>i.getClientRects().length).every(i=>i.complete&&i.naturalWidth>0)");await capture(id+'-overview');const violations=await run("axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then(r=>r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})))");accessibility.push({theme:id,violations});}if(width===1487&&view==='projects'&&['botanical_canopy','pearl_current'].includes(id))await capture(id+'-projects');}}
  console.log('Checked complete '+id);
 }
 win.setContentSize(1487,1058);await run("document.getElementById('close-views').click();document.getElementById('open-originals').click();true");assert.equal(await run("[...document.querySelectorAll('[data-theme-choice]')].filter(b=>!b.hidden).length"),10);await run("document.getElementById('collection-studio').click();true");assert.equal(await run("[...document.querySelectorAll('[data-theme-choice]')].filter(b=>!b.hidden).length"),10);await run("document.getElementById('collection-all').click();true");assert.equal(await run("[...document.querySelectorAll('[data-theme-choice]')].filter(b=>!b.hidden).length"),20);
 await run("document.getElementById('close-themes').click();document.getElementById('make').click();true");await until("document.body.dataset.phase==='success'");await run("window.makeAppViews.open('results');true");assert.ok(await run("document.getElementById('view-content').textContent.includes('Browser demonstration')"));
 await win.loadURL('http://127.0.0.1:'+server.address().port+'/app/creator.html?style=botanical_canopy&view=projects');await until("document.querySelectorAll('.project-row').length===3");
 const passed=!errors.length&&checks.every(c=>!c.overflow)&&accessibility.every(c=>!c.violations.length);await fs.writeFile(path.join(output,'verification.json'),JSON.stringify({passed,checks,accessibility,errors,behavior:{originalCreators:10,originalCompleteInterfaces:10,screensPerOriginal:13,originalViewStates:240,bothCollectionsSelectable:true,creation:true},scope:'Bounded renderer checks. Original creator references retained; native packaging is checked separately.'},null,2));
 console.log(JSON.stringify({passed,checks:checks.length,overflow:checks.filter(c=>c.overflow).slice(0,6),accessibility:accessibility.filter(c=>c.violations.length),errors}));win.destroy();server.close();app.exit(passed?0:1);
}).catch(e=>{console.error(e);app.exit(1)});
