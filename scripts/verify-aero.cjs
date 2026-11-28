const {app,BrowserWindow,nativeTheme}=require('electron');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
app.commandLine.appendSwitch('force-device-scale-factor','1');app.disableHardwareAcceleration();app.on('window-all-closed',()=>{});
const output=path.resolve(process.env.MAKE_APP_AERO_OUTPUT||path.join(__dirname,'../qa/aero'));
app.setPath('userData',path.join(output,'profile'));
const watchdog=setTimeout(()=>{console.error('Aero verification exceeded four minutes');app.exit(1);},240000);watchdog.unref();
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const evaluate=(win,code)=>win.webContents.executeJavaScript(code);
async function until(fn,label){const deadline=Date.now()+10000;while(Date.now()<deadline){if(await fn())return;await delay(40);}throw Error('Timed out: '+label);}
async function settle(win){await delay(160);await evaluate(win,"document.getAnimations().filter(a=>Number.isFinite(a.effect.getComputedTiming().endTime)).forEach(a=>a.finish());true");}
async function capture(win,name){await settle(win);await fs.writeFile(path.join(output,name),(await win.webContents.capturePage()).toPNG());}
const themes=['midnight_tide','botanical_canopy','stratosphere','pearl_current','citrus_circuit','cobalt_hydro','aurora_lake','sunset_estuary','glacial_quartz','meadow_os'];
app.whenReady().then(async()=>{
 await fs.mkdir(output,{recursive:true});
 const server=require('./preview-site.cjs').createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port+'/app/creator.html';
 const win=new BrowserWindow({show:false,width:1487,height:1058,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
 const axe=await fs.readFile(path.join(__dirname,'../node_modules/axe-core/axe.min.js'),'utf8'),checks=[],errors=[];
 win.webContents.on('console-message',event=>{if(event.level==='error')errors.push(event.message);});
 const scan=async(label,width)=>{
   await settle(win);
   const result=await evaluate(win,`Promise.all([
    axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then(r=>r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))),
    Promise.resolve({overflow:document.documentElement.scrollWidth>innerWidth,theme:document.documentElement.dataset.aero,scheme:getComputedStyle(document.documentElement).colorScheme,small:[...document.querySelectorAll('body *')].filter(e=>!e.closest('.sr-only,[aria-hidden=true]')&&e.getClientRects().length&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&parseFloat(getComputedStyle(e).fontSize)<13).map(e=>e.id||e.className)})
   ]).then(([violations,layout])=>({violations,...layout}))`);
   checks.push({label,width,...result});
 };
 for(const theme of themes){
  // Deliberately oppose OS and theme palettes to catch inherited color-scheme defects.
  nativeTheme.themeSource=['midnight_tide','aurora_lake'].includes(theme)?'light':'dark';
  win.setContentSize(1487,1058);await win.loadURL(url+'?style='+theme);
  await until(()=>evaluate(win,"document.body.dataset.phase==='ready'&&document.getElementById('make').dataset.ready==='true'"),theme+' ready');await evaluate(win,'document.fonts.ready');
  await evaluate(win,axe);await scan(theme,1487);await capture(win,theme+'.png');
  await evaluate(win,"document.getElementById('project-details').click();true");
  assert.equal(await evaluate(win,"document.getElementById('project-information').open"),true,'Project requirements remain available in photographic layouts');
  assert.ok(await evaluate(win,"document.getElementById('project-information-content').innerText.includes('Node.js')"));
  await evaluate(win,"document.getElementById('close-project-information').click();true");
  const source=await evaluate(win,"document.getElementById('source').value");
  for(const width of [1000,390,320]){win.setContentSize(width,1058);await scan(theme,width);}
  if(theme==='midnight_tide'||theme==='meadow_os')await capture(win,theme+'-mobile.png');
  win.setContentSize(1000,1000);await evaluate(win,"document.getElementById('appearance').click();true");
  assert.equal(await evaluate(win,"document.querySelectorAll('[data-theme-choice]').length"),20);
  assert.equal(await evaluate(win,"document.querySelector('[data-theme-choice][aria-pressed=true]').dataset.themeChoice"),theme);
  await until(()=>evaluate(win,"[...document.querySelectorAll('.theme-choice img')].every(i=>i.complete&&i.naturalWidth>0)"),'all thumbnails');
  await scan(theme+'-picker',1000);
  if(theme==='midnight_tide'||theme==='meadow_os'){
   for(const width of [390,320]){win.setContentSize(width,1058);await scan(theme+'-picker-mobile',width);}
   await capture(win,theme+'-picker-mobile.png');win.setContentSize(1000,1000);
  }
  if(theme==='midnight_tide')await capture(win,'theme-picker.png');
  await evaluate(win,"document.getElementById('close-themes').click();true");
  assert.equal(await evaluate(win,"document.getElementById('source').value"),source,'Theme picker must preserve the project');
  // Create with every visual system using the actual renderer's labeled browser fixture.
  await evaluate(win,"document.getElementById('make').click();true");
  await until(()=>evaluate(win,"document.body.dataset.phase==='creating'"),'creating');
  if(theme==='midnight_tide'){
    await evaluate(win,"document.getElementById('appearance').click();document.querySelector('[data-theme-choice=botanical_canopy]').click();document.getElementById('close-themes').click();true");
    assert.equal(await evaluate(win,"document.body.dataset.phase"),'creating','Changing theme must not restart or reset creation');
    assert.equal(await evaluate(win,"document.getElementById('cancel').hidden"),false);
    assert.equal(await evaluate(win,"document.getElementById('scene-sidebar-choice').disabled"),true,'The duplicate saved-project control must also lock during creation');
  }
  await until(()=>evaluate(win,"document.body.dataset.phase==='success'"),'creation complete');
  assert.equal(await evaluate(win,"document.getElementById('source').value"),source);
  console.log('Verified '+theme+' at four widths, theme picker, and creation');
 }
 // Verify saved selection, a fresh page, bad preferences, Classic, zoom, and reduced motion.
 await win.loadURL(url);await until(()=>evaluate(win,"document.body.dataset.phase==='ready'"),'persistence page');
 await evaluate(win,"document.getElementById('appearance').click();document.querySelector('[data-theme-choice=pearl_current]').click();document.getElementById('close-themes').click();true");
 await win.reload();await until(()=>evaluate(win,"document.body.dataset.phase==='ready'"),'reloaded theme');
 assert.equal(await evaluate(win,"document.documentElement.dataset.aero"),'pearl_current');
 await evaluate(win,axe);win.webContents.setZoomFactor(2);await scan('saved-theme-200-percent',1000);win.webContents.setZoomFactor(1);
 await evaluate(win,"document.getElementById('appearance').click();document.getElementById('classic-appearance').value='dark';document.getElementById('classic-appearance').dispatchEvent(new Event('change'));document.getElementById('close-themes').click();true");
 await win.reload();await until(()=>evaluate(win,"document.body.dataset.phase==='ready'"),'Classic reload');
 assert.equal(await evaluate(win,"document.documentElement.dataset.aero"),undefined);
 assert.equal(await evaluate(win,"document.documentElement.dataset.theme"),'dark');
 await evaluate(win,"localStorage.setItem('make-app-style','invalid-url');localStorage.setItem('make-app-appearance','invalid');true");
 await win.reload();await until(()=>evaluate(win,"document.body.dataset.phase==='ready'"),'invalid preferences');
 assert.equal(await evaluate(win,"document.documentElement.dataset.aero"),undefined);
 assert.equal(await evaluate(win,"document.documentElement.dataset.theme"),undefined);
 const passed=checks.every(c=>!c.overflow&&!c.violations.length&&!c.small.length)&&!errors.length;
 await fs.writeFile(path.join(output,'verification.json'),JSON.stringify({passed,checks,errors,behavior:{allTenCreate:true,themeChangeDuringCreation:true,projectPreserved:true,persistence:true,classicPersistence:true,invalidPreferences:true,oppositeSystemPalette:true},fixture:'Actual renderer with explicitly labeled browser samples; native creation is checked separately.'},null,2));
 console.log(JSON.stringify({passed,checks:checks.length,violations:checks.filter(c=>c.violations.length),overflow:checks.filter(c=>c.overflow),small:checks.filter(c=>c.small.length),errors,output}));
 win.destroy();server.close();app.exit(passed?0:1);
}).catch(error=>{console.error(error);app.exit(1);});
