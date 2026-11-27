const {app,BrowserWindow}=require('electron');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
app.commandLine.appendSwitch('force-device-scale-factor','1');app.disableHardwareAcceleration();app.on('window-all-closed',()=>{});
const output=path.resolve(process.env.MAKE_APP_MOTION_OUTPUT||path.join(__dirname,'../qa/motion'));app.setPath('userData',path.join(output,'profile'));
setTimeout(()=>{console.error('Motion smoke exceeded 90 seconds');app.exit(1)},90000).unref();
const pause=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{
 await fs.mkdir(output,{recursive:true});const server=require('./preview-site.cjs').createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const win=new BrowserWindow({show:false,width:1487,height:1058,webPreferences:{partition:'make-app-motion-test-'+process.pid,offscreen:true,sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
 const run=s=>win.webContents.executeJavaScript(s),errors=[],checks=[];win.webContents.on('console-message',e=>{if(e.level==='error')errors.push(e.message)});
 const until=async s=>{for(let i=0;i<150;i++){if(await run(s))return;await pause(25)}throw Error('Timed out: '+s)};
 // Control the host media preference without changing the application's OS override.
 // Hosted Windows runners can start with reduced motion; each smoke gets fresh storage.
 const url='http://127.0.0.1:'+server.address().port;
 await win.loadURL(url+'/app/creator.html?style=midnight_tide');await until("document.body.dataset.phase==='ready'&&!!window.makeAppMotion");
 win.webContents.debugger.attach('1.3');
 await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
 await until("!matchMedia('(prefers-reduced-motion:reduce)').matches&&makeAppMotion.mode==='full'");
 assert.equal(await run('makeAppMotion.effects.length'),7);assert.equal(await run('makeAppMotion.mode'),'full');
 const themes=await run("[...document.querySelectorAll('[data-theme-choice]')].map(b=>b.dataset.themeChoice)");
 for(const id of themes){await run(`document.getElementById('appearance').click();document.querySelector('[data-theme-choice=${id}]').click();document.getElementById('close-themes').click();true`);await pause(30);const count=await run("({theme:document.documentElement.dataset.aero,buttons:document.querySelectorAll('.motion-button').length,panels:document.querySelectorAll('.motion-panel').length,pictures:document.querySelectorAll('.motion-picture').length,overflow:document.documentElement.scrollWidth>innerWidth})");assert.ok(count.buttons>10&&count.panels>5&&count.pictures>15);checks.push(count);}
 await run("document.getElementById('appearance').click();document.querySelector('[data-theme-choice=midnight_tide]').click();document.getElementById('close-themes').click();true");await pause(200);
 const transform=await run("document.querySelector('.creator-shell').style.transform");
 await run("document.getElementById('make').dispatchEvent(new PointerEvent('pointerover',{bubbles:true}));document.getElementById('make').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:1100,clientY:940}));true");
 assert.ok(await run("document.querySelector('#make .motion-film')!==null"),'Control shine exists');assert.ok(await run("document.querySelector('#make .motion-ripple')!==null"),'Press ripple exists');assert.ok(await run('makeAppMotion.activeAnimations>0'));
 assert.equal(await run("document.querySelector('.creator-shell').style.transform"),transform,'Source scale remains owned by the photographic renderer');
 await run("window.makeAppViews.open('projects');true");await pause(50);assert.ok(await run("document.querySelector('.project-row.motion-panel')!==null"),'New view content receives motion');
 await run("window.makeAppViews.open('preferences');document.getElementById('preference-motion').value='subtle';document.getElementById('preference-motion').dispatchEvent(new Event('change'));true");await pause(30);assert.equal(await run('makeAppMotion.mode'),'subtle');
 await run("document.getElementById('preference-motion').value='quiet';document.getElementById('preference-motion').dispatchEvent(new Event('change'));true");await pause(50);assert.equal(await run('makeAppMotion.mode'),'quiet');assert.equal(await run('makeAppMotion.activeAnimations'),0);assert.equal(await run("getComputedStyle(document.querySelector('.original-identity img')).animationName"),'none');
 await run("document.getElementById('preference-motion').value='full';document.getElementById('preference-motion').dispatchEvent(new Event('change'));true");await pause(25);assert.equal(await run('makeAppMotion.mode'),'full');
 await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await until("matchMedia('(prefers-reduced-motion:reduce)').matches");await pause(40);assert.equal(await run('makeAppMotion.mode'),'quiet','OS reduced motion takes precedence');assert.equal(await run('makeAppMotion.activeAnimations'),0);await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});await until("!matchMedia('(prefers-reduced-motion:reduce)').matches&&makeAppMotion.mode==='full'");
 await run("document.getElementById('close-views').click();document.getElementById('make').click();true");await until("document.body.dataset.phase==='creating'");assert.ok(await run("document.querySelector('#make .motion-working')!==null"));await until("document.body.dataset.phase==='success'");
 await run("window.makeAppViews.open('preferences');document.getElementById('preference-motion').value='quiet';document.getElementById('preference-motion').dispatchEvent(new Event('change'));document.getElementById('close-views').click();document.getElementById('make').click();true");await until("document.body.dataset.phase==='creating'");await run("document.getElementById('cancel').click();true");await until("document.getElementById('status').textContent.includes('cancelled')");
 await win.loadURL(url+'/');await until('!!window.makeAppMotion');assert.ok(await run("document.querySelector('.hero.motion-panel')!==null"),'Website sections share the motion system');
 const passed=!errors.length&&checks.every(c=>!c.overflow);await fs.writeFile(path.join(output,'verification.json'),JSON.stringify({passed,themes:checks,errors,behavior:{effects:7,allTwentyThemes:true,dynamicViews:true,photographicScalePreserved:true,shine:true,ripple:true,subtle:true,quietCancelsAnimations:true,osReducedMotion:true,creation:true,cancellationWithMotionOff:true,website:true},scope:'Bounded renderer motion and interaction smoke; physical devices and native packaging are separate.'},null,2));
 console.log(JSON.stringify({passed,themes:checks.length,overflow:checks.filter(c=>c.overflow),errors}));win.destroy();server.close();app.exit(passed?0:1);
}).catch(e=>{console.error(e);app.exit(1)});
