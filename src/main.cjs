const {app,BrowserWindow,ipcMain,dialog,shell,session,protocol,net,Notification,Menu,nativeImage,Tray,safeStorage,nativeTheme,clipboard}=require('electron');
const fs=require('node:fs/promises');
const syncFs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {pathToFileURL}=require('node:url');
const {spawn}=require('node:child_process');
const tcp=require('node:net');
const core=require('./core.cjs');
const {isMainFrame,trustedDocument}=require('./ipc-origin.cjs');
const runtime=require('./runtime.cjs');
const {ProjectSession}=require('./engine.cjs');
const managed=require('./managed.cjs');
const integration=require('./integration.cjs');
let pendingProject=null;
async function requestStop(argv){const raw=argv.find(a=>a.startsWith('--stop-project='))?.slice(15);if(!raw)return false;const source=await integration.projectPath(raw);for(const record of records){if(path.resolve(record.originRoot||record.root).toLowerCase()!==path.resolve(source).toLowerCase())continue;jobs.get(record.id)?.controller?.abort();await jobs.get(record.id)?.engine?.stop();closeApp(record.id);await Promise.allSettled([...closing]);await require('./workspaces.cjs').reject(record,new Error('Operation cancelled.'));}await save();changed();return true;}
async function reviewProject(argv){const raw=argv.find(a=>a.startsWith('--open-project='))?.slice(15);if(!raw)return false;pendingProject=await integration.projectPath(raw);if(!smoke){showCreator();if(!creator.webContents.isLoading())creator.webContents.send('creator-source',pendingProject);return true;}showLibrary();if(!library.webContents.isLoading())library.webContents.send('open-project');return true;}
let standalone=null,standaloneSpec=null,openingProgress,startupProbeContext;
if(process.env.APPDOCK_EMBEDDED_SPEC){const spec=JSON.parse(syncFs.readFileSync(process.env.APPDOCK_EMBEDDED_SPEC,'utf8'));if(![1,2].includes(spec.schemaVersion)||spec.directLaunch!==true||!spec.record?.id||(spec.schemaVersion===1&&(!path.isAbsolute(spec.record.root)||!path.isAbsolute(spec.record.source))))throw new Error('Invalid project executable settings.');standaloneSpec=spec.schemaVersion===2?spec:null;standalone={...spec.record,directLaunch:true,localProject:spec.schemaVersion===1};app.setPath('userData',path.join(app.getPath('appData'),'AppDock Apps',standalone.id));}
try{if(!standalone){standalone=JSON.parse(syncFs.readFileSync(path.join(app.getAppPath(),'standalone.json'),'utf8'));app.setPath('userData',path.join(app.getPath('appData'),'AppDock Apps',standalone.id));}}catch(e){if(e.code!=='ENOENT')throw e;}
if(!standalone&&process.platform==='darwin'){try{const spec=JSON.parse(syncFs.readFileSync(path.join(process.resourcesPath,'make-app-project.json'),'utf8'));if(![1,2].includes(spec.schemaVersion)||spec.directLaunch!==true||!spec.record?.id||(spec.schemaVersion===1&&!path.isAbsolute(spec.record.root)))throw new Error('Invalid project application settings.');standaloneSpec=spec.schemaVersion===2?spec:null;standalone={...spec.record,directLaunch:true};app.setPath('userData',path.join(app.getPath('appData'),'Make App Projects',standalone.id));}catch(error){if(error.code!=='ENOENT')throw error;}}
if(process.env.APPDOCK_TEST_OFFLINE==='1'){const onlineFetch=globalThis.fetch;globalThis.fetch=(url,...args)=>{const host=new URL(typeof url==='string'?url:url.url||String(url)).hostname;if(!['127.0.0.1','localhost','[::1]'].includes(host))return Promise.reject(new Error('Runtime downloads are blocked by standalone acceptance.'));return onlineFetch(url,...args);};}
const smoke=!!process.env.MAKE_APP_CHECK_TOKEN||!!process.env.APPDOCK_DIRECT_TEST||process.argv.includes('--smoke-test')||process.argv.includes('--project-smoke')||process.argv.includes('--real-projects-smoke')||process.argv.includes('--integration-smoke')||process.argv.includes('--language-smoke');
if (process.env.APPDOCK_DATA) app.setPath('userData',process.env.APPDOCK_DATA);
protocol.registerSchemesAsPrivileged([{scheme:'appdock',privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true}}]);
app.setAppUserModelId('ai.goldrock.appdock');
let library,launchProgress,directError,directPreparation,directController,records=[], saving=Promise.resolve();
const running=new Map(), starting=new Set(), registered=new Set(), jobs=new Map(), closing=new Set();
const catalog=()=>path.join(app.getPath('userData'),'library.json');
function save(){const content=JSON.stringify(records,null,2);saving=saving.catch(()=>{}).then(async()=>{await fs.mkdir(path.dirname(catalog()),{recursive:true});await fs.writeFile(catalog()+'.tmp',content);await fs.rename(catalog()+'.tmp',catalog());});return saving;}
function changed(){if(library&&!library.isDestroyed())library.webContents.send('changed');}
function find(id){const r=records.find(x=>x.id===id);if(!r)throw new Error('App no longer exists.');return r;}
const secretFile=()=>path.join(app.getPath('userData'),'environment.json');
async function projectEnv(id){try{const values=JSON.parse(await fs.readFile(secretFile(),'utf8'))[id];if(!values)return{};if(!(await safeStorage.isAsyncEncryptionAvailable()))throw new Error('Windows encryption is unavailable. Set project variables in the launch environment.');const decrypted=await safeStorage.decryptStringAsync(Buffer.from(values,'base64'));return JSON.parse(decrypted.result);}catch(e){if(e.code==='ENOENT')return{};throw e;}}
async function storeEnv(id,values){if(!values||typeof values!=='object'||Array.isArray(values)||Object.entries(values).some(([k,v])=>!/^[_A-Za-z][_A-Za-z0-9]*$/.test(k)||typeof v!=='string'))throw new Error('Environment values must be a JSON object of strings.');if(!(await safeStorage.isAsyncEncryptionAvailable()))throw new Error('Windows encryption is unavailable; environment was not saved.');let all={};try{all=JSON.parse(await fs.readFile(secretFile(),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}all[id]=(await safeStorage.encryptStringAsync(JSON.stringify(values))).toString('base64');await fs.mkdir(app.getPath('userData'),{recursive:true});await fs.writeFile(secretFile(),JSON.stringify(all));}
function requireSupervisor(){if(app.isPackaged&&process.platform==='win32'&&process.arch==='x64'&&!require('./process-broker.cjs').location())throw new Error('AppDock process supervisor is missing. Reinstall the complete application.');}
function toolDataRoot(){return process.env.APPDOCK_TOOLCACHE||(standalone?.directLaunch?path.join(process.env.LOCALAPPDATA||app.getPath('appData'),'GoldRock','Project Apps','Toolchains'):app.getPath('userData'));}
async function engine(record,onLog=()=>{},onState,options={}){requireSupervisor();const env={...await projectEnv(record.id),...(record.portable?record.bundledEnvironment:{})};if(process.env.APPDOCK_TEST_NO_ENV==='1'){for(const key of Object.keys(process.env))if(/API.?KEY|SECRET|TOKEN|DATABASE_URL|CLERK/i.test(key))env[key]='';env.PULSEBOARD_NO_ENGINE='1';for(const task of [record.plan?.run,...(record.plan?.services||[])].filter(Boolean))for(const name of Object.keys(task.env||{}))if(name.endsWith('_DATA_DIR'))env[name]='';if(record.stateRoot){env.DOTENV_CONFIG_PATH=path.join(record.stateRoot,'test-empty.env');env.DOTENV_CONFIG_OVERRIDE='false';await fs.writeFile(env.DOTENV_CONFIG_PATH,'');}}if(!record.portable&&(record.toolchains?.length||record.plan?.requirements?.includes('python'))){const tools=await require('./toolchains.cjs').prepare(record,toolDataRoot(),onLog,{signal:jobs.get(record.id)?.controller?.signal});Object.assign(env,tools.env);record.resolvedToolchains=tools.tools.map(t=>({kind:t.kind,version:t.version||'system'}));}if(!record.portable&&record.automatic&&record.nodeMajor){const tools=await managed.nodeRuntime(toolDataRoot(),record.nodeMajor,onLog,{signal:jobs.get(record.id)?.controller?.signal});record.resolvedToolchains=[...(record.resolvedToolchains||[]).filter(tool=>tool.kind!=='node'),{kind:'node',version:tools.version}];Object.assign(env,{APPDOCK_NODE:tools.node,APPDOCK_NPM:tools.npm,PATH:tools.directory+path.delimiter+(env.PATH||process.env.PATH)});}jobs.get(record.id)?.controller?.signal.throwIfAborted();return new ProjectSession(record,{env,onLog,onState,...options});}
const versionRoot=record=>record.originRoot||record.root;
async function prepareAutomatic(record,onLog=()=>{},options={}){if(!record.automatic)return;if(record.usePreviousEnvironment&&!options.forceFresh){Object.assign(record,await require('./workspaces.cjs').resume(record));return;}delete record.usePreviousEnvironment;const staged=await (record.executionMode==='copy'?managed.stage:managed.existing)(record,app.getPath('userData'),{...options,settingsFingerprint:process.env.APPDOCK_TEST_NO_ENV==='1'?undefined:require('./environment.cjs').fingerprint(record,await projectEnv(record.id)),copyEnvironment:process.env.APPDOCK_TEST_NO_ENV!=='1',reuseDependencies:process.env.APPDOCK_TEST_FRESH_DEPS!=='1',onLog,signal:jobs.get(record.id)?.controller?.signal});Object.assign(record,staged);if(record.portable){record.needsInstall=false;}else if(record.plan?.setup.length){const keys=require('./setup-key.cjs');record.needsInstall=await keys.cachedKey(record)!==await keys.dependencyKey(record);if(record.workspaceMode==='project'&&await require('./installed.cjs').nodeDependencies(record)){record.needsInstall=false;onLog('Using the project’s installed dependencies.\n');}}await save();}
function revokeNative(record){record.grants={};const state=running.get(record.id);if(state){state.tray?.destroy();state.tray=null;if(!state.win.isDestroyed())state.win.setAlwaysOnTop(false);}}
function icon(color='#b8eb65') { return nativeImage.createFromDataURL('data:image/png;base64,'+syncFs.readFileSync(path.join(__dirname,'icon.png')).toString('base64')); }
function lockSession(s){s.setPermissionRequestHandler((_w,_p,cb)=>cb(false));s.setPermissionCheckHandler(()=>false);s.on('will-download',e=>e.preventDefault());}
function guardWindow(win,origin){
  win.webContents.setWindowOpenHandler(({url})=>{if(/^https?:/.test(url))shell.openExternal(url);return{action:'deny'};});
  win.webContents.on('will-navigate',(e,url)=>{try{if(new URL(url).origin!==new URL(origin).origin || (url.startsWith('appdock:') && new URL(url).host!==new URL(origin).host)){e.preventDefault();}}catch{e.preventDefault();}});
  win.webContents.on('will-attach-webview',e=>e.preventDefault());
}
async function inspect(source){let target;if(source&&typeof source==='object'){target=source.target;source=source.source;if(target!==undefined&&typeof target!=='string')throw new Error('Invalid executable target.');}if(typeof source!=='string')throw new Error('Choose a project.');if(/^https?:/i.test(source))return{kind:'url',url:core.safeUrl(source),source:core.safeUrl(source),name:new URL(source).hostname.replace(/^www\./,''),label:'Website'};return core.detect(source,{target,adapterDirectory:path.join(app.getPath('userData'),'adapters')});}
async function add(config){
  const detected=await inspect({source:config.source,target:config.target});
  if(detected.kind==='selection')throw new Error('Choose one of the projects inside this workspace, or save an appdock.json recipe at the workspace root.');
  if(detected.plan?.configured===false)throw new Error('Choose a runnable executable entry point before running this project.');
  const version=detected.kind==='url'?'remote':await core.fingerprint(detected.root);
  if(config.executionMode!==undefined&&!['project','copy'].includes(config.executionMode))throw new Error('Unknown execution mode.');
  const record={...detected,executionMode:config.executionMode||'project',id:crypto.randomUUID(),name:core.safeName(config.name||detected.name),color:['#b8eb65','#bba4ef','#ffb48b','#8bd3e8'].includes(config.color)?config.color:'#b8eb65',version,grants:{},runtimeTrusted:!['static','url'].includes(detected.kind)&&config.trustRuntime===true,createdAt:Date.now()};
  if(!['static','url'].includes(record.kind)&&!record.runtimeTrusted)throw new Error('Approve running the project code before adding a source project.');
  records.push(record);await save();changed();return record;
}
function stopProcess(state){
  if(!state.process?.pid)return;
  if(state.process.appdockSupervised){state.process.kill('SIGKILL');state.process=null;return;}
  if(process.platform==='win32')spawn('taskkill.exe',['/pid',String(state.process.pid),'/t','/f'],{windowsHide:true,stdio:'ignore'}).on('error',()=>{});
  else {try{process.kill(-state.process.pid,'SIGTERM');}catch{state.process.kill();}}
  state.process=null;
}
function closeApp(id){const state=running.get(id);if(!state)return;running.delete(id);state.watcher?.close();state.tray?.destroy();clearTimeout(state.timer);if(state.engine){const pending=state.engine.stop().then(()=>require('./workspaces.cjs').reject(find(id),new Error('Project closed'))).catch(e=>console.error(e.message));closing.add(pending);pending.finally(()=>closing.delete(pending));}stopProcess(state);if(!state.win.isDestroyed())state.win.destroy();changed();}
async function freePort(){return new Promise((resolve,reject)=>{const s=tcp.createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});}
async function startRuntime(record,state){
  if(!record.runtimeTrusted)throw new Error('Project changed. Re-approve its runtime from the app menu.');
  if(await runtime.missing(record))throw new Error('Dependencies are not set up. Use “Set up dependencies” in the app menu.');
  const port=await freePort();
  const spec=runtime.spec(record,port);
  state.process=runtime.spawnCommand(spec.command,spec.args,{cwd:record.root,env:{...process.env,...spec.env},windowsHide:true,detached:process.platform!=='win32',stdio:['ignore','pipe','pipe']});
  state.logs='';state.process.on('error',e=>{state.failure=e.message;});state.process.on('exit',code=>{state.failure=`Runtime exited (${code}).`;});
  for(const stream of [state.process.stdout,state.process.stderr])stream.on('data',d=>{state.logs=(state.logs+d.toString()).slice(-16000);});
  const url=spec.url;
  const deadline=Date.now()+60000;
  while(Date.now()<deadline){if(state.failure)throw new Error(state.failure+'\n'+state.logs);if(state.win.isDestroyed())throw new Error('App closed during startup.');try{const response=await fetch(url,{signal:AbortSignal.timeout(1200)});if(response.status<500)return url;}catch{}await new Promise(r=>setTimeout(r,350));}
  throw new Error('Project did not become ready within 60 seconds.\n'+state.logs);
}
async function syncVersion(record,{strict=true}={}){
  if(record.kind==='url')return false;
  const v=await core.fingerprint(versionRoot(record),{cache:!strict});
  if(v===record.version)return false;
  record.version=v;revokeNative(record);if(!['static','url'].includes(record.kind))record.runtimeTrusted=false;
  await save();return true;
}
async function serve(record,s){
  if(registered.has(record.id))return;
  s.protocol.handle('appdock',async request=>{
    try {const url=new URL(request.url);if(url.host!==record.id)return new Response('Unknown app',{status:403});
      if(request.method!=='GET'&&request.method!=='HEAD')return new Response('Method not allowed',{status:405});
      const pathname=url.pathname==='/'?'/'+encodeURIComponent(record.entry):url.pathname;
      const target=await core.resolveAsset(record.root,pathname,true);
      // Sensitive project metadata is not part of the web app.
      if(path.relative(record.root,target).split(path.sep).some(part=>part.startsWith('.')||part==='node_modules')||/^(package(-lock)?\.json|appdock\.json)$/i.test(path.basename(target)))return new Response('Not available',{status:403});
      return net.fetch(pathToFileURL(target).href);
    }catch{return new Response('File not available',{status:404});}
  });registered.add(record.id);
}
async function launch(id){
  if(starting.has(id))return;
  if(running.has(id)){running.get(id).win.show();running.get(id).win.focus();return;}
  starting.add(id);const record=find(id);let state,launchJob;
  try {
    if(!['static','url'].includes(record.kind))requireSupervisor();
    await syncVersion(record,{strict:!standalone?.directLaunch});
    if(!['static','url'].includes(record.kind)&&!record.runtimeTrusted)throw new Error('This project changed. Use its menu to approve the new runtime version.');
    if(record.automatic){const job={status:'running',type:'setup',controller:new AbortController(),log:'Preparing '+record.name+'…\n'};jobs.set(record.id,job);try{await prepareAutomatic(record,text=>logJob(job,text));job.status='complete';}catch(error){job.status='failed';logJob(job,error.message);throw error;}changed();}
    if(record.kind==='project'&&record.needsInstall){if(process.env.APPDOCK_TEST_NO_SETUP==='1')throw new Error('Installed dependencies are unavailable; this verification run does not install or change project dependencies.');await setup(record,{prepared:true});}
    if(record.automatic){launchJob={status:'running',type:'launch',controller:new AbortController(),log:'Starting '+record.name+'…\n'};jobs.set(id,launchJob);changed();}
    const s=session.fromPartition('persist:app-'+record.id);lockSession(s);
    if(record.kind==='static')await serve(record,s);
    const win=new BrowserWindow({width:1100,height:790,minWidth:440,minHeight:400,title:record.name,icon:icon(),backgroundColor:'#171a20',show:false,autoHideMenuBar:false,webPreferences:{session:s,sandbox:true,nodeIntegration:false,contextIsolation:true,...(record.kind==='static'?{preload:path.join(__dirname,'app-preload.cjs')}:record.kind==='tool'||record.kind==='project'?{preload:path.join(__dirname,'tool-preload.cjs')}:{})}});
    state={win};running.set(id,state);
    win.on('close',e=>{if(state.tray){e.preventDefault();win.hide();}});
    win.setMenu(Menu.buildFromTemplate([{label:record.name,submenu:[{label:'Reload',click:()=>win.reload()},{label:'Revoke native permissions',click:async()=>{revokeNative(record);await save();changed();}},{type:'separator'},{label:'Quit app',click:()=>closeApp(record.id)}]}]));
    win.on('closed',()=>closeApp(id));
    if(record.kind==='tool'||record.kind==='project'&&record.plan.mode!=='web'){
      win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',e=>e.preventDefault());
      await win.loadFile(path.join(__dirname,'ui','tool.html'));win.setTitle(record.name);if(!(standalone?.directLaunch&&record.plan.mode==='native'))win.show();if((record.automatic||standalone?.directLaunch)&&record.plan.mode==='native'){state.logs='';state.engine=await engine(record,text=>{state.logs=(state.logs+text).slice(-70000);if(!win.isDestroyed())win.webContents.send('tool-output',text);});await state.engine.start();}if((record.automatic||standalone?.directLaunch)&&record.plan.mode!=='native')win.webContents.send('tool-autostart');if(launchJob){launchJob.status='complete';logJob(launchJob,'Project controller opened.\n');}record.lastError=null;record.lastFailure=null;record.lastOpened=Date.now();await save();changed();return{id,url:win.webContents.getURL()};
    }
    let url=record.kind==='url'?record.url:`appdock://${record.id}/`;
    if(record.kind==='project'){
      state.logs='';state.engine=await engine(record,text=>{state.logs=(state.logs+text).slice(-70000);if(launchJob)logJob(launchJob,text);else changed();},statuses=>{state.services=statuses;changed();});
      if(launchJob)launchJob.engine=state.engine;const result=await state.engine.start();url=result.url;
    }else if(!['static','url'].includes(record.kind))url=await startRuntime(record,state);
    guardWindow(win,url);
    await win.loadURL(url);win.setTitle(record.name);win.show();
    if(record.kind!=='url'){
      let checking=false;
      state.watcher=syncFs.watch(versionRoot(record),{recursive:true},(_type,file)=>{
        if(file&&file.split(/[\\/]/).some(part=>['node_modules','.git','.next','.venv','venv','__pycache__','.appdock','bin','obj','target','Library','Temp','Logs','.godot'].includes(part)))return;
        clearTimeout(state.timer);state.timer=setTimeout(async()=>{if(checking||win.isDestroyed())return;checking=true;try{
          if(await syncVersion(record)){win.setAlwaysOnTop(false);if(standalone?.directLaunch){record.runtimeTrusted=true;await save();return;}if(record.kind!=='static'){closeApp(id);dialog.showMessageBox({type:'info',title:'Project updated',message:`${record.name} changed. Approve its new runtime version from AppDock before reopening.`});}else win.reload();changed();}
        }catch(e){closeApp(id);dialog.showErrorBox('Project update failed',e.message);}finally{checking=false;}},900);
      });
    }
    if(launchJob){launchJob.status='complete';logJob(launchJob,'Ready: '+url+'\n');}record.lastError=null;record.lastFailure=null;record.lastOpened=Date.now();await save();changed();return{id,url};
  }catch(e){if(launchJob){launchJob.status='failed';logJob(launchJob,e.message+'\n');}await require('./workspaces.cjs').reject(record,e);record.lastError=e.message;record.lastLogs=state?.logs||jobs.get(id)?.log||'';record.lastFailure=e.appdockFailure||require('./failures.cjs').classify(e,{phase:'launch',output:record.lastLogs});await save();if(state)closeApp(id);throw e;}finally{starting.delete(id);}
}
function shortcutTarget(record){
  const target=process.env.PORTABLE_EXECUTABLE_FILE||process.execPath;
  const args=app.isPackaged?`--launch=${record.id}`:`"${app.getAppPath()}" --launch=${record.id}`;
  return {target,args,description:`Open ${record.name} with AppDock`,icon:target,iconIndex:0,appUserModelId:'ai.goldrock.appdock'};
}
async function shortcuts(record){
  if(process.platform!=='win32')throw new Error('Shortcut creation is implemented for Windows in this build.');
  const dir=path.join(app.getPath('appData'),'Microsoft','Windows','Start Menu','Programs','AppDock');
  await fs.mkdir(dir,{recursive:true});
  const name=core.safeName(record.name)+'-'+record.id.slice(0,6)+'.lnk';
  const shortcut=path.join(dir,name);
  if(!shell.writeShortcutLink(shortcut,'create',shortcutTarget(record)))throw new Error('Could not create shortcut.');
  record.shortcut=shortcut;await save();return shortcut;
}
async function openDirect(record){
 directError=null;record.runtimeTrusted=true;
 openingProgress=require('./opening-progress.cjs').create(record.name,state=>{if(launchProgress&&!launchProgress.isDestroyed())launchProgress.webContents.send('direct-state',state);});
 launchProgress=new BrowserWindow({width:650,height:540,title:record.name,show:false,autoHideMenuBar:true,backgroundColor:nativeTheme.shouldUseDarkColors?'#181a1e':'#f4f3f0',webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false,preload:path.join(__dirname,'direct-preload.cjs')}});
 lockSession(launchProgress.webContents.session);launchProgress.webContents.setWindowOpenHandler(()=>({action:'deny'}));launchProgress.webContents.on('will-navigate',event=>event.preventDefault());await launchProgress.loadFile(path.join(__dirname,'ui/direct.html'));launchProgress.show();launchProgress.on('close',()=>app.quit());
 try{startupProbeContext=await require('./startup-probe.cjs').context(standaloneSpec,app.getPath('userData'));if(standaloneSpec){directController=new AbortController();directPreparation=require('./standalone-package.cjs').materialize(standaloneSpec,app.getPath('userData'),{file:process.platform==='darwin'?path.join(process.resourcesPath,'make-app-project.bundle'):process.env.APPDOCK_LAUNCHER_FILE,signal:directController.signal,onLog:log=>openingProgress.update({log}),onProgress:info=>openingProgress.progress(info)});let hydrated;try{hydrated=await directPreparation;}finally{directPreparation=null;}Object.assign(record,hydrated);standalone=hydrated;if(process.env.APPDOCK_DIRECT_TEST)await require("./direct-smoke.cjs").captureOpening({win:launchProgress,summary:openingProgress.summary()});openingProgress.update({status:'Checking the prepared app…',progress:null,detail:''});record.version=await core.fingerprint(record.root,{cache:true});record.runtimeTrusted=true;}if(record.kind!=='url'&&!record.portable){const fresh=await inspect({source:standalone.source,target:standalone.selectedTarget});if(fresh.kind==='selection'||fresh.plan?.configured===false)throw new Error('This project now needs a different entry point. Make its executable again.');Object.assign(record,fresh,{name:standalone.name,runtimeTrusted:true,executionMode:'project'});delete record.originRoot;delete record.originSource;record.version=await core.fingerprint(record.root,{cache:true});}openingProgress.update({status:'Starting your app…',progress:null,detail:''});await save();await launch(record.id);if(record.plan?.mode==='native'&&!process.env.APPDOCK_DIRECT_TEST&&!startupProbeContext){const state=running.get(record.id);const child=state?.engine?.children.get('app');child?.once('exit',()=>{closeApp(record.id);app.quit();});}launchProgress.destroy();launchProgress=null;if(startupProbeContext)await require('./startup-probe.cjs').finish(startupProbeContext,record,running.get(record.id),{app,closeApp});if(process.env.APPDOCK_DIRECT_TEST)await require('./direct-smoke.cjs').run({app,record,state:running.get(record.id),closeApp,opening:openingProgress.summary()});}
 catch(error){directError=error;openingProgress.update({error:error.message,log:jobs.get(record.id)?.log||''});if(startupProbeContext)await require('./startup-probe.cjs').finish(startupProbeContext,record,running.get(record.id),{app,closeApp,error});if(process.env.MAKE_APP_CHECK_TOKEN){console.error(error.message);app.exit(1);return;}if(process.env.APPDOCK_DIRECT_TEST){await fs.writeFile(process.env.APPDOCK_DIRECT_TEST,JSON.stringify({passed:false,error:error.stack,logs:openingProgress.state.log}));app.exit(1);}}
}
ipcMain.handle('direct',async(event,method)=>{if(!await trustedDocument(event,launchProgress?.webContents,path.join(__dirname,'ui/direct.html')))throw new Error('Unauthorized app request');if(method==='info')return openingProgress?.state||{name:standalone.name,error:directError?.message};if(method==='close'){await jobs.get(standalone.id)?.engine?.stop();closeApp(standalone.id);app.quit();return;}if(method==='retry'){if(!directError)throw new Error('Launch is already in progress');launchProgress.destroy();launchProgress=null;await openDirect(find(standalone.id));return;}throw new Error('Unknown app operation');});
let creator,creatorBusy=false,createdExecutable,createdFormat,creatorController,creatorOutputStore,creatorPendingOperation;
function recentOutputs(){return creatorOutputStore ||= require('./creator-outputs.cjs').create(app.getPath('userData'));}
async function openCreatedFile(file){const command=require('./platform.cjs').builderCommand(file);await new Promise((resolve,reject)=>{const child=spawn(command.command,command.args,{detached:true,stdio:'ignore',windowsHide:true});child.once('error',reject);child.once('spawn',()=>{child.unref();resolve();});});return{opened:true};}
function showCreator(){if(creator&&!creator.isDestroyed()){creator.show();creator.focus();return;}const area=require('electron').screen.getPrimaryDisplay().workAreaSize;const scale=Math.min(1,area.width/1487,area.height/1058);creator=new BrowserWindow({frame:false,width:Math.floor(1487*scale),height:Math.floor(1058*scale),minWidth:Math.min(440,area.width),minHeight:Math.min(650,area.height),title:'Make App',backgroundColor:nativeTheme.shouldUseDarkColors?'#181a1e':'#f4f3f0',autoHideMenuBar:true,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false,preload:path.join(__dirname,'creator-preload.cjs')}});lockSession(creator.webContents.session);creator.webContents.setWindowOpenHandler(()=>({action:'deny'}));creator.webContents.on('will-navigate',event=>event.preventDefault());creator.on('close',()=>creatorController?.abort(new Error('Creation cancelled.')));creator.loadFile(path.join(__dirname,'ui/creator.html'));}
ipcMain.handle('creator',async(event,method,payload)=>{
 if(!await trustedDocument(event,creator?.webContents,path.join(__dirname,'ui/creator.html')))throw new Error('Unauthorized executable builder request');
 if(method==='guide'){const routes={source:'',connections:'/blob/main/docs/HARNESSES.md',languages:'/blob/main/README.md#languages-and-setup',downloads:'/releases'};if(!Object.hasOwn(routes,payload?.section))throw new Error('Unknown guide');await shell.openExternal('https://github.com/moonshineaitech/make-app'+routes[payload.section]);return;}
 if(method==='window'){if(payload?.action==='minimize')creator.minimize();else if(payload?.action==='maximize'){if(creator.isMaximized())creator.unmaximize();else creator.maximize();}else if(payload?.action==='close')creator.close();else throw new Error('Unknown window action');return;}
 if(method==='choose'){if(creatorBusy)throw Error('Finish or cancel creation first.');const kind=payload?.kind||'folder';if(!['file','folder'].includes(kind))throw Error('Choose a project folder or entry file.');const result=await dialog.showOpenDialog(creator,{title:kind==='file'?'Choose a game or app file':'Choose a project folder',properties:[kind==='file'?'openFile':'openDirectory'],...(kind==='file'?{filters:[{name:'Game / app entry',extensions:['html','htm','exe','py','js','mjs','cjs','ts','tsx','mts','cts','rs','go','c','cpp','java','jar','ipynb','rb','r','ps1','sh']},{name:'All files',extensions:['*']}]}:{})});return result.canceled?null:result.filePaths[0];}
 if(method==='capabilities')return require('./platform.cjs').capabilities();
 if(method==='cancel'){creatorController?.abort(new Error('Creation cancelled.'));return;}
 if(method==='initial')return pendingProject;
 if(method==='projects')return managed.codexProjects();
 if(method==='outputs')return recentOutputs().list();
 if(method==='check-output'){if(creatorBusy)throw Error('Finish or cancel the current operation first.');let file,row;if(payload?.id!==undefined){if(typeof payload.id!=='string')throw Error('Choose a saved export.');row=await recentOutputs().get(payload.id);if(row.format!=='desktop')throw Error('Only desktop exports support this startup check.');file=row.executable;}else{if(!createdExecutable||createdFormat!=='desktop')throw Error('Create a desktop app first.');file=createdExecutable;row=(await recentOutputs().list().catch(()=>[])).find(r=>r.executable===file);}creatorBusy=true;creatorController=new AbortController();try{const operation=require('./startup-check.cjs').check(file,app.getPath('userData'),{signal:creatorController.signal,onProgress:message=>{if(!creator.isDestroyed())creator.webContents.send('creator-check-progress',message);}});creatorPendingOperation=operation;const result=await operation;if(row)try{creatorPendingOperation=recentOutputs().saveCheck(row.id,result);await creatorPendingOperation;}catch{result.historyWarning='The check finished, but its result could not be saved to Recent apps.';}return result;}finally{creatorPendingOperation=null;creatorBusy=false;creatorController=null;}}
 if(method==='copy-text'){if(typeof payload?.text!=='string'||payload.text.length>32768)throw Error('Clipboard text is missing or too long.');clipboard.writeText(payload.text);return{copied:true};}
 if(method==='clear-outputs')return recentOutputs().clear();
 if(method==='open-output'||method==='reveal-output'){if(creatorBusy)throw Error('Finish or cancel creation first.');const row=await recentOutputs().get(payload?.id);if(method==='reveal-output'){shell.showItemInFolder(row.executable);return;}if(row.format!=='desktop')throw Error('Web exports need an HTTPS host. Use Show folder to find the files.');const target=require('./platform.cjs').target(row.platform,row.arch);if(!target.buildable)throw Error(target.reason);return openCreatedFile(row.executable);}
 if(method==='inspect'){const record=await inspect(payload);return{name:record.name,label:record.label,configured:record.plan?.configured!==false,selection:record.kind==='selection',candidates:record.candidates?.map(({path,name,label})=>({path,name,label})),targets:record.targets,selectedTarget:record.selectedTarget,standalone:require('./standalone-package.cjs').support(record),webAvailable:!!await require('./web-export.cjs').webRoot(payload.source),mode:record.plan?.mode||record.kind,requirements:record.plan?.requirements||[],setupTasks:record.plan?.setup?.length||0,buildTasks:record.plan?.build?.length||0,requiredEnvironment:record.plan?.requiredEnv||[],message:record.kind==='selection'?'Choose a project inside this workspace.':record.plan?.configured===false?'Choose the executable entry point.':record.label};}
 if(method==='reveal'){if(createdExecutable)shell.showItemInFolder(createdExecutable);return;}
 if(method==='open-created'){
  if(creatorBusy)throw new Error('Finish creating the app first.');
  if(!createdExecutable||createdFormat==='web')throw new Error('Create a desktop app first.');
  await fs.access(createdExecutable);
  return openCreatedFile(createdExecutable);
 }
 if(method==='make'){if(creatorBusy)throw new Error('An app is already being created.');const web=payload.format==='web',chosen=web?null:require('./platform.cjs').target(payload.targetPlatform,payload.targetArch);if(chosen&&!chosen.buildable)throw Error(chosen.reason);creatorBusy=true;creatorController=new AbortController();try{const name=core.safeName(payload.name||path.basename(payload.source)),info=require('./platform.cjs').host();let destination;
  if(!web){const record=await core.detect(path.resolve(payload.source),{target:payload.target});if(record.kind==='selection')throw Error('Choose a project inside this workspace.');if(record.plan?.configured===false)throw Error('Choose the executable entry point.');const readiness=require('./standalone-package.cjs').support(record);if(!readiness.supported)throw Error(readiness.reason);}creatorController.signal.throwIfAborted();
  if(web){const choice=await dialog.showOpenDialog(creator,{title:'Choose where to save the web app',properties:['openDirectory','createDirectory']});if(choice.canceled)return{cancelled:true};destination=path.join(choice.filePaths[0],name+'-web');}
  else if(payload.askSave===true){const choice=await dialog.showSaveDialog(creator,{title:'Save app',defaultPath:path.join(app.getPath('desktop'),name+info.extension),filters:[{name:info.name+' app',extensions:[info.extension.slice(1)]}]});if(choice.canceled)return{cancelled:true};destination=choice.filePath;}
  else destination=await require('./output-path.cjs').freshOutput(app.getPath('desktop'),name,info.extension);
  const options={name,target:payload.target,toolCache:toolDataRoot(),overwrite:web||payload.askSave===true,signal:creatorController.signal,onLog:text=>{if(!creator.isDestroyed())creator.webContents.send('creator-progress',text);}};
  creatorPendingOperation=(web?require('./web-export.cjs').exportWeb:require('./executable.cjs').make)(payload.source,destination,options);const built=await creatorPendingOperation;createdExecutable=built.executable;createdFormat=web?'web':'desktop';let exportId,historyWarning;try{exportId=(await(creatorPendingOperation=recentOutputs().add({name:built.name||name,source:path.resolve(payload.source),executable:built.executable,format:createdFormat,platform:info.platform,arch:info.arch,standalone:!!built.standalone,bytes:built.bytes}))).id;}catch(error){historyWarning=error.message;}return{...built,exportId,historyWarning,savedToDesktop:!web&&payload.askSave!==true};
 }finally{creatorPendingOperation=null;creatorBusy=false;creatorController=null;}}
 throw new Error('Unknown executable builder operation');
});
function showLibrary(){if(library&&!library.isDestroyed()){library.show();library.focus();return;}
  library=new BrowserWindow({width:1320,height:880,minWidth:900,minHeight:650,title:'Make App',icon:icon(),backgroundColor:nativeTheme.shouldUseDarkColors?'#181a1e':'#f4f3f0',autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.cjs'),sandbox:true,contextIsolation:true,nodeIntegration:false}});
  lockSession(library.webContents.session);library.webContents.setWindowOpenHandler(()=>({action:'deny'}));library.webContents.on('will-navigate',e=>e.preventDefault());library.loadFile(path.join(__dirname,'ui','index.html'));
}
function logJob(job,text){job.log=(job.log+text).slice(-70000);if(launchProgress&&!launchProgress.isDestroyed())launchProgress.webContents.send('direct-state',{log:job.log});changed();}
async function setup(record,{prepared=false}={}){requireSupervisor();
  if(jobs.get(record.id)?.status==='running')throw new Error('An operation is already running for this app.');
  await syncVersion(record);if(!record.runtimeTrusted)throw new Error('Approve this runtime version before dependency setup.');
  closeApp(record.id);
  const job={status:'running',type:'setup',controller:new AbortController(),log:'Setting up '+record.name+'…\n',process:null};jobs.set(record.id,job);changed();
  try{if(record.automatic&&!prepared)await prepareAutomatic(record,text=>logJob(job,text),{forceFresh:true});await require('./setup-key.cjs').detachDependencies(record);if(record.kind==='project'){job.engine=await engine(record,text=>logJob(job,text));await job.engine.tasks(job.engine.plan.setup,'setup');}else await runtime.setup(record,job,text=>logJob(job,text));record.version=await core.fingerprint(versionRoot(record));record.needsInstall=false;record.setupKey=await require('./setup-key.cjs').remember(record);record.runtimeTrusted=true;record.grants={};await save();job.status='complete';logJob(job,'Dependencies prepared. Build and launch verification are still required.\n');if(!prepared)await require('./workspaces.cjs').release(record);}
  catch(e){await job.engine?.stop();await require('./workspaces.cjs').reject(record,e);stopProcess(job);job.status='failed';job.failure=e.appdockFailure||require('./failures.cjs').classify(e,{phase:'setup',output:job.log});record.lastFailure=job.failure;logJob(job,e.message+'\n');await save();throw e;}finally{changed();}
}
async function buildProject(record){
 await syncVersion(record);if(!record.runtimeTrusted)throw new Error('Approve this version before building.');if(jobs.get(record.id)?.status==='running')throw new Error('An operation is already running.');closeApp(record.id);await Promise.allSettled([...closing]);
 const job={status:'running',type:'build',controller:new AbortController(),log:'Building '+record.name+'…\n'};jobs.set(record.id,job);changed();
 try{if(record.automatic)await prepareAutomatic(record,text=>logJob(job,text),{forceFresh:true});job.engine=await engine(record,text=>logJob(job,text));if(record.needsInstall){await require('./setup-key.cjs').detachDependencies(record);await job.engine.tasks(job.engine.plan.setup,'setup');record.setupKey=await require('./setup-key.cjs').remember(record);record.needsInstall=false;}await job.engine.tasks(job.engine.plan.build,'build');await require('./workspaces.cjs').release(record);job.status='complete';logJob(job,'Build completed in a separate environment. Run the project to verify it.\n');await save();}
 catch(error){await job.engine?.stop();await require('./workspaces.cjs').reject(record,error);job.status='failed';record.lastFailure=error.appdockFailure||require('./failures.cjs').classify(error,{phase:'build',output:job.log});logJob(job,error.message+'\n');await save();throw error;}finally{changed();}
}
async function exportApp(record,destination){
  if(jobs.get(record.id)?.status==='running')throw new Error('An operation is already running for this app.');
  const job={status:'running',type:'export',log:'Exporting '+record.name+'…\n'};jobs.set(record.id,job);changed();
  try{const result=await require('./export.cjs').build(record,destination,text=>logJob(job,text));job.status='complete';job.result=result;return result;}catch(e){job.status='failed';logJob(job,e.message+'\n');throw e;}finally{changed();}
}
ipcMain.handle('library',async(event,method,payload)=>{
  if(event.sender.isDestroyed())return null;
  if(!library||library.isDestroyed()||event.sender!==library.webContents||!isMainFrame(event))throw new Error('Unauthorized library request.');
  if(method==='pendingProject'){const value=pendingProject;pendingProject=null;return value;}
  switch(method){
    case 'list':return records.map(r=>{const job=jobs.get(r.id);return{...r,windowOpen:running.has(r.id),running:r.kind==='project'?!!running.get(r.id)?.engine?.children.size:running.has(r.id),completed:running.get(r.id)?.result?.mode==='tool'&&running.get(r.id)?.result?.code===0,lastError:r.lastError||running.get(r.id)?.engine?.failed?.message,services:running.get(r.id)?.engine?.statuses||{},logs:running.get(r.id)?.logs||'',job:job?{status:job.status,type:job.type,log:job.log,result:job.result,cancellable:!!(job.controller||job.engine||job.process)}:null};});
    case 'choose': {const result=await dialog.showOpenDialog(library,{properties:[payload==='file'?'openFile':'openDirectory'],...(payload==='file'?{filters:[{name:'Project entry / program',extensions:['html','htm','py','js','mjs','cjs','ts','tsx','mts','cts','rs','go','c','cpp','java','exe','jar','ipynb','rb','r','ps1','sh']},{name:'All files',extensions:['*']}]}:{})});return result.canceled?null:result.filePaths[0];}
    case 'inspect':return inspect(payload);
    case 'codexProjects':return managed.codexProjects();
    case 'add':return add(payload);
    case 'launch':return launch(payload);
    case 'diagnostics':{const r=find(payload);return require('./diagnostics.cjs').support(r,{log:running.get(r.id)?.logs||r.lastLogs||jobs.get(r.id)?.log||'',statuses:running.get(r.id)?.engine?.statuses||{},environment:{...process.env,...await projectEnv(r.id)},version:app.getVersion()});}
    case 'recipe':{const r=find(payload);if(r.kind!=='project')throw new Error('This project uses a legacy adapter. Add appdock.json schemaVersion 2 to use project recipes.');const session=new ProjectSession(r,{env:await projectEnv(r.id)});return{plan:r.plan,preflight:await session.preflight(),configuredEnv:Object.keys(await projectEnv(r.id))};}
    case 'saveEnvironment':{const r=find(payload.id);closeApp(r.id);await storeEnv(r.id,payload.environment);changed();return;}
    case 'saveRecipe':{const r=find(payload.id),plan=require('./projects.cjs').validate({...payload.plan,configured:true});closeApp(r.id);await fs.writeFile(path.join(versionRoot(r),'appdock.json'),JSON.stringify(plan,null,2));if(payload.environment)await storeEnv(r.id,payload.environment);Object.assign(r,{kind:'project',framework:'recipe',plan,label:'Project recipe',command:plan.run?.command||plan.services[0]?.command,runtimeTrusted:false,needsInstall:plan.setup.length>0});r.version=await core.fingerprint(r.root);revokeNative(r);await save();changed();return;}
    case 'job':return jobs.get(payload)?{status:jobs.get(payload).status,type:jobs.get(payload).type,log:jobs.get(payload).log,result:jobs.get(payload).result,cancellable:!!(jobs.get(payload).controller||jobs.get(payload).engine||jobs.get(payload).process)}:null;
    case 'demo': {let r=records.find(r=>r.demo);if(!r){
      const destination=path.join(app.getPath('userData'),'examples','Focus Desk');await fs.mkdir(destination,{recursive:true});await fs.copyFile(path.join(__dirname,'..','examples','focus','index.html'),path.join(destination,'index.html'));
      r=await add({source:destination,name:'Focus Desk',color:'#bba4ef'});r.demo=true;await save();}return launch(r.id);}
    case 'action': {const r=find(payload.id);switch(payload.action){
      case 'save-diagnostics':{const report=require('./diagnostics.cjs').support(r,{log:running.get(r.id)?.logs||r.lastLogs||jobs.get(r.id)?.log||'',statuses:running.get(r.id)?.engine?.statuses||{},environment:{...process.env,...await projectEnv(r.id)},version:app.getVersion()});const destination=await dialog.showSaveDialog(library,{title:'Save reviewed diagnostics',defaultPath:'AppDock-diagnostics.json',filters:[{name:'JSON report',extensions:['json']}]});if(destination.canceled)return null;await fs.writeFile(destination.filePath,JSON.stringify(report,null,2));return true;}
      case 'setup':return setup(r);
      case 'build':return buildProject(r);
      case 'cancel':{const job=jobs.get(r.id);job?.controller?.abort();if(job?.engine)await job.engine.stop();if(job?.process)stopProcess(job);if(job?.status==='running'){job.status='cancelled';await require('./workspaces.cjs').reject(r,new Error('Operation cancelled.'));logJob(job,'Cancelled by user.\n');}return;}
      case 'export':{const result=await dialog.showOpenDialog(library,{title:'Choose a parent folder for the Windows app',properties:['openDirectory','createDirectory']});if(result.canceled)return null;const destination=path.join(result.filePaths[0],core.safeName(r.name)+'-Windows-'+Date.now().toString(36));const built=await exportApp(r,destination);shell.showItemInFolder(built.executable);return built;}
      case 'stop':closeApp(r.id);return;
      case 'shortcut':return shortcuts(r);
      case 'snapshot-data':{if(running.has(r.id)||jobs.get(r.id)?.status==='running')throw new Error('Stop the project before taking a consistent data snapshot.');const destination=await require('./project-data.cjs').snapshot(r);await shell.openPath(destination);return destination;}
      case 'rollback':{closeApp(r.id);await Promise.allSettled([...closing]);Object.assign(r,await require('./workspaces.cjs').rollback(r));r.lastError=null;r.lastFailure=null;await save();changed();return;}
      case 'latest-source':{delete r.usePreviousEnvironment;await save();changed();return;}
      case 'workspace':await shell.openPath(r.stateRoot||r.root);return;
      case 'reveal':if(r.kind==='url')return shell.openExternal(r.url);shell.showItemInFolder(r.originSource||r.source);return;
      case 'revoke':revokeNative(r);await save();changed();return;
    case 'trust':if(['static','url'].includes(r.kind))return;{const result=await dialog.showMessageBox(library,{type:'warning',buttons:['Cancel','Approve runtime'],defaultId:0,cancelId:0,title:'Run project code',message:`Allow ${r.name} to run its project code?`,detail:'Project scripts and dependency setup run with your Windows account permissions and may read or change files. Review the source before approving.'});if(result.response===1){const fresh=await inspect(r.originSource||r.source);if(fresh.kind==='selection')throw new Error('Choose a specific subproject first.');const keepSetup=JSON.stringify(r.plan?.setup)===JSON.stringify(fresh.plan?.setup)&&r.needsInstall===false;Object.assign(r,fresh,{name:r.name,id:r.id,color:r.color,needsInstall:keepSetup?false:fresh.needsInstall});r.version=await core.fingerprint(versionRoot(r));r.grants={};r.runtimeTrusted=true;await save();changed();}}return;
      case 'remove':closeApp(r.id);await jobs.get(r.id)?.engine?.stop();if(jobs.get(r.id)?.process)stopProcess(jobs.get(r.id));if(r.shortcut)await fs.unlink(r.shortcut).catch(()=>{});records=records.filter(x=>x.id!==r.id);await save();changed();return;
      default:throw new Error('Unknown action');
    }}
    default:throw new Error('Unknown operation');
  }
});
ipcMain.handle('tool',async(event,method,payload)=>{
  const pair=[...running.entries()].find(([_id,s])=>s.win.webContents===event.sender);if(!pair)throw new Error('Unknown tool');
  const[id,state]=pair,record=find(id);
  if(!['tool','project'].includes(record.kind)||!await trustedDocument(event,state.win.webContents,path.join(__dirname,'ui','tool.html')))throw new Error('Unauthorized tool request');
  if(method==='info')return{name:record.name,source:record.source,mode:record.plan?.mode||'tool',terminalSupported:record.kind==='project'&&require('./terminal.cjs').supported(),terminal:record.plan?.terminal===true};
  if(method==='status')return{services:state.engine?.statuses||{},logs:state.logs||'',active:!!state.toolRun||!!state.engine?.children.size};
  if(method==='input'){const child=state.engine?.children.get('app')||state.process;if(typeof payload!=='string'||payload.length>65536)throw new Error('Input must be text up to 64 KB.');if(!child?.stdin?.writable)throw new Error('No running process is accepting input.');await new Promise((resolve,reject)=>child.stdin.write(payload,error=>error?reject(error):resolve()));return;}
  if(method==='resize'){const size=require('./terminal.cjs').dimensions(payload?.columns,payload?.rows);state.engine?.children.get('app')?.resize?.(size.columns,size.rows);return;}
  if(method==='ack'){if(!Number.isInteger(payload)||payload<0||payload>1048576)throw new Error('Invalid terminal acknowledgement.');state.pendingTerminalBytes=Math.max(0,(state.pendingTerminalBytes||0)-payload);if(state.pendingTerminalBytes<16384)state.engine?.children.get('app')?.resume?.();return;}
  if(method==='cancel'){state.cancelToolRun=true;if(state.engine)await state.engine.stop();stopProcess(state);return;}
  if(method!=='run')throw new Error('Unknown tool operation');
  if(state.process)throw new Error('Tool is already running.');
  await syncVersion(record);if(!record.runtimeTrusted)throw new Error('Source changed. Approve the new project version in AppDock.');
  const terminal=payload?.terminal===true;const terminalSize=terminal?require('./terminal.cjs').dimensions(payload.columns,payload.rows):{};if(terminal&&(record.kind!=='project'||record.plan.mode!=='tool'))throw new Error('Terminal mode requires a command-line project.');payload=Array.isArray(payload)?payload:payload?.args;
  if(!Array.isArray(payload)||payload.length>100||payload.some(x=>typeof x!=='string'||x.includes('\0')||x.length>10000))throw new Error('Arguments must be an array of up to 100 strings.');
  let command,args;
  if(record.framework==='custom')[command,...args]=record.command;
  else{command=record.framework==='python'?(syncFs.existsSync(runtime.python(record))?runtime.python(record):'python'):'node';args=[record.entry];}
  const output=text=>{if(!state.win.isDestroyed())state.win.webContents.send('tool-output',text);};
  if(record.kind==='project'){
    if(state.toolRun||state.engine?.children.size)throw new Error('Project is already running.');
    state.toolRun=true;state.runError=null;state.cancelToolRun=false;try{
    state.logs='';state.pendingTerminalBytes=0;state.engine=await engine(record,(text,metadata)=>{state.logs=(state.logs+text).slice(-70000);if(!metadata?.terminal)output(text);},statuses=>{state.services=statuses;},{terminal,terminalSize,onTerminal:text=>{if(state.win.isDestroyed())return;state.pendingTerminalBytes+=Buffer.byteLength(text);state.win.webContents.send('tool-terminal',text);if(state.pendingTerminalBytes>65536)state.engine?.children.get('app')?.pause?.();}});
    if(state.cancelToolRun||state.win.isDestroyed()){await state.engine.stop();throw new Error('Operation cancelled.');}
    let result;try{result=await state.engine.start(payload);record.lastError=null;record.lastFailure=null;await save();}catch(error){record.lastError=error.message;record.lastFailure=error.appdockFailure;await save();throw error;}state.result=result;changed();return{...result,code:result.code||0};
    }catch(error){state.runError=error.message;throw error;}finally{state.toolRun=false;}
  }
  output('Running '+record.name+'…\n');
  let code=0;try{await runtime.runStep(command,[...args,...payload],record.root,state,output);}catch(e){code=1;output('\n'+e.message+'\n');stopProcess(state);}return{code};
});
ipcMain.handle('native',async(event,method,payload)=>{
  const pair=[...running.entries()].find(([_id,s])=>s.win.webContents===event.sender);if(!pair)throw new Error('Unknown app');
  const [id,state]=pair,record=find(id);
  if(record.kind!=='static'||!isMainFrame(event)||new URL(event.senderFrame.url).host!==id||new URL(event.senderFrame.url).protocol!=='appdock:')throw new Error('Native bridge is limited to the local app main frame.');
  if(method==='info')return{name:record.name,version:record.version,platform:process.platform};
  if(!['notify','pin','readFile','writeFile','tray'].includes(method))throw new Error('Unknown native capability');
  if(await syncVersion(record)){state.win.setAlwaysOnTop(false);changed();throw new Error('Project updated. Reload before requesting native access.');}
  if(record.grants[method]!==record.version){
    const labels={notify:'send desktop notifications',pin:'stay above other windows',readFile:'read a file you choose',writeFile:'save text to a file you choose',tray:'add a system tray icon and keep running when its window closes'};
    const result=await dialog.showMessageBox(state.win,{type:'question',buttons:['Don’t allow','Allow this version'],defaultId:0,cancelId:0,title:record.name,message:`Allow ${record.name} to ${labels[method]}?`,detail:'This permission applies to the current local source version. You can revoke it in AppDock. Remote scripts are not versioned.'});
    if(result.response!==1)throw new Error('Permission was not granted.');
    if(await syncVersion(record))throw new Error('Source changed during approval. Try again.');
    record.grants[method]=record.version;await save();changed();
  }
  if(method==='tray'){
    if(payload?.enabled===false){state.tray?.destroy();state.tray=null;return true;}
    if(!state.tray){state.tray=new Tray(icon());state.tray.setToolTip(record.name);state.tray.setContextMenu(Menu.buildFromTemplate([{label:'Open '+record.name,click:()=>{state.win.show();state.win.focus();}},{label:'Quit',click:()=>closeApp(id)}]));state.tray.on('double-click',()=>state.win.show());}return true;
  }
  if(method==='readFile'){
    const approvedVersion=record.version;
    const result=await dialog.showOpenDialog(state.win,{title:`Choose a file for ${record.name}`,properties:['openFile']});if(result.canceled)return null;
    if(await syncVersion(record)||record.grants.readFile!==approvedVersion)throw new Error('App permissions changed while choosing the file.');
    const file=result.filePaths[0];if((await fs.stat(file)).size>10*1024*1024)throw new Error('Text file is larger than 10 MB.');return{name:path.basename(file),text:await fs.readFile(file,'utf8')};
  }
  if(method==='writeFile'){
    const approvedVersion=record.version;
    const text=String(payload?.text||'');if(Buffer.byteLength(text)>10*1024*1024)throw new Error('Text is larger than 10 MB.');
    const result=await dialog.showSaveDialog(state.win,{title:`Save a file from ${record.name}`,defaultPath:core.safeName(payload?.name||'export.txt')});if(result.canceled)return null;if(await syncVersion(record)||record.grants.writeFile!==approvedVersion)throw new Error('App permissions changed while choosing the destination.');await fs.writeFile(result.filePath,text,'utf8');return{name:path.basename(result.filePath)};
  }
  if(method==='pin'){state.win.setAlwaysOnTop(payload?.enabled===true,'floating');return true;}
  if(!Notification.isSupported())throw new Error('Notifications are unavailable on this system.');
  new Notification({title:String(payload?.title||record.name).slice(0,120),body:String(payload?.body||'').slice(0,500),icon:icon()}).show();return true;
});
if(process.argv.includes('--make-executable'))app.setPath('userData',path.join(app.getPath('temp'),'make-app-command-'+process.pid));
const gotLock=app.requestSingleInstanceLock();
if(!gotLock)app.quit();
else {
  app.on('second-instance',(_event,argv)=>{if(standalone?.directLaunch){running.get(standalone.id)?.win.show();return;}const id=argv.find(a=>a.startsWith('--launch='))?.slice(9);if(id)launch(id).catch(e=>dialog.showErrorBox('Could not open app',e.message));else requestStop(argv).then(stopped=>stopped||reviewProject(argv)).then(opened=>{if(!opened)showCreator();}).catch(e=>dialog.showErrorBox('Could not review project',e.message));});
  app.whenReady().then(async()=>{
    try {records=JSON.parse(await fs.readFile(catalog(),'utf8'));}catch(e){if(e.code!=='ENOENT'){dialog.showErrorBox('Library could not be read','Your library was left untouched. '+e.message);app.quit();return;}}
    if(process.argv.includes('--creator-smoke')){showCreator();await require('./creator-smoke.cjs').run({app,getCreator:()=>creator,dialog});return;}
    if(process.argv.includes('--make-executable')){const index=process.argv.indexOf('--make-executable'),source=process.argv[index+1],output=process.argv.find(value=>value.startsWith('--output='))?.slice(9),target=process.argv.find(value=>value.startsWith('--target='))?.slice(9);if(!source||!output)throw new Error('Specify a project and --output=/absolute/path/App.exe');const result=await require('./executable.cjs').make(source,output,{target,overwrite:process.argv.includes('--overwrite')});const resultFile=process.argv.find(value=>value.startsWith('--result-file='))?.slice(14);if(resultFile){if(!path.isAbsolute(resultFile))throw new Error('Result path must be absolute');await fs.writeFile(resultFile,JSON.stringify(result));}console.log(JSON.stringify(result));app.exit(0);return;}
    if(process.argv.includes('--terminal-smoke')){await require('./terminal-smoke.cjs').run({app,add,launch,running,closeApp});return;}
    if(process.argv.includes('--language-smoke')){await require('./language-smoke.cjs').run({app,add,launch,running,closeApp,showLibrary,getLibrary:()=>library,core,records});return;}
    if(process.argv.includes('--integration-smoke')){await require('./integration-smoke.cjs').run({app,reviewProject,getLibrary:()=>library,running,records});return;}
    if(smoke&&!standalone?.directLaunch){await require(process.argv.includes('--real-projects-smoke')?'./real-project-smoke.cjs':process.argv.includes('--project-smoke')?'./project-smoke.cjs':'./smoke.cjs').run({app,add,launch,records,running,closeApp,shortcuts,save,showLibrary,getLibrary:()=>library,core,setup,exportApp});return;}
    if(standalone){
      const existing=records.find(r=>r.id===standalone.id);
      if(!existing){const record={...standalone};if(record.kind!=='url'){record.root=path.isAbsolute(record.root)?record.root:path.join(app.getAppPath(),record.root);record.source=path.isAbsolute(record.source)?record.source:path.join(app.getAppPath(),record.source);if(!standalone.directLaunch)record.version=await core.fingerprint(record.root);}records=[record];await save();}
      const record=find(standalone.id);
      if(record.kind!=='url'){record.root=path.isAbsolute(standalone.root)?standalone.root:path.join(app.getAppPath(),standalone.root);record.source=path.isAbsolute(standalone.source)?standalone.source:path.join(app.getAppPath(),standalone.source);await save();}
      if(process.env.APPDOCK_EXPORT_TEST){
        if(!['static','url'].includes(record.kind)){showLibrary();await library.loadFile(path.join(__dirname,'ui','standalone.html'));await fs.writeFile(process.env.APPDOCK_EXPORT_TEST,JSON.stringify({passed:true,screen:'first-run-approval',mode:record.plan?.mode||record.kind,trustRequired:!record.runtimeTrusted,title:await library.webContents.executeJavaScript('document.title'),approveButton:await library.webContents.executeJavaScript('!!document.getElementById("approve")')}));}
        else{await launch(record.id);const win=running.get(record.id).win;await fs.writeFile(process.env.APPDOCK_EXPORT_TEST,JSON.stringify({passed:true,title:await win.webContents.executeJavaScript('document.title'),node:await win.webContents.executeJavaScript('typeof require')}));}app.exit(0);return;
      }
      if(standalone.directLaunch){await openDirect(record);return;}
      if(record.kind==='static'||record.kind==='url'){try{await launch(record.id);}catch(e){dialog.showErrorBox(record.name,e.message);app.quit();}return;}
      showLibrary();await library.loadFile(path.join(__dirname,'ui','standalone.html'));
      return;
    }
    if(app.isPackaged&&!process.env.APPDOCK_DATA)await integration.registerDesktop(process.env.PORTABLE_EXECUTABLE_FILE||process.execPath,app.getPath('userData'));
    if(await requestStop(process.argv)){showLibrary();return;}if(await reviewProject(process.argv))return;
    const id=process.argv.find(a=>a.startsWith('--launch='))?.slice(9);if(id)try{await launch(id);}catch(e){dialog.showErrorBox('Could not open app',e.message);showLibrary();}else if(process.argv.includes('--library'))showLibrary();else showCreator();
  }).catch(e=>{console.error(e);app.exit(1);});
  app.on('window-all-closed',()=>{if(!smoke&&starting.size===0&&![...jobs.values()].some(j=>j.status==='running')&&process.platform!=='darwin')app.quit();});
  app.on('activate',()=>standalone?.directLaunch?running.get(standalone.id)?.win.show():showCreator());
  let cleanupDone=false;app.on('before-quit',event=>{if(cleanupDone)return;const sessions=[...running.values()].map(s=>s.engine).concat([...jobs.values()].map(j=>j.engine)).filter(Boolean);if(sessions.length||closing.size||directPreparation||creatorPendingOperation){event.preventDefault();creatorController?.abort(new Error('Operation cancelled.'));directController?.abort(new Error('Opening cancelled.'));Promise.allSettled([...sessions.map(s=>s.stop()),...closing,...(directPreparation?[directPreparation]:[]),...(creatorPendingOperation?[creatorPendingOperation]:[])]).then(()=>{cleanupDone=true;app.quit();});}for(const id of running.keys())closeApp(id);for(const job of jobs.values()){job.controller?.abort();stopProcess(job);}});
}
