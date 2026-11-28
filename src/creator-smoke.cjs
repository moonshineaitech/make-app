const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
async function until(fn){const deadline=Date.now()+180000;while(Date.now()<deadline){if(await fn())return;await new Promise(resolve=>setTimeout(resolve,80));}throw new Error('Desktop creator acceptance timed out');}
exports.run=async({app,getCreator,dialog})=>{
 const savedDialog=dialog.showSaveDialog;let savePrompts=0;
 const originalEnvironment=Object.fromEntries(['APPDOCK_DATA','APPDOCK_TOOLCACHE','APPDOCK_DIRECT_TEST','APPDOCK_DIRECT_EXPECT_TEXT'].map(key=>[key,process.env[key]]));
 try{
  const win=getCreator();await until(()=>!win.webContents.isLoading());const run=code=>win.webContents.executeJavaScript(code);
  const windowControls={api:await run("typeof makeApp.window==='function'"),invalidRejected:await run("makeApp.window('unexpected').then(()=>false,()=>true)")};assert.ok(windowControls.api&&windowControls.invalidRejected);
  assert.ok(await run("makeApp.openCreated().then(()=>false,()=>true)"),'Opening is scoped to a successfully created desktop app');
  if(process.platform==='win32'){
   await run("makeApp.window('maximize')");await until(()=>win.isMaximized());await run("makeApp.window('maximize')");await until(()=>!win.isMaximized());await run("makeApp.window('minimize')");await until(()=>win.isMinimized());win.restore();windowControls.maximizeRestore=true;windowControls.minimize=true;
  }
  const source=process.env.APPDOCK_CREATOR_SOURCE,output=process.env.APPDOCK_CREATOR_OUTPUT,result=process.env.APPDOCK_CREATOR_RESULT;assert.ok(source&&output&&result);app.setPath('desktop',path.dirname(output));
  dialog.showSaveDialog=async()=>{savePrompts++;return{canceled:false,filePath:output};};
  await run(`document.getElementById('source').value=${JSON.stringify(source)};document.getElementById('source').dispatchEvent(new Event('change'));true`);await until(()=>run('!document.getElementById("make").disabled'));
  const name=path.basename(output,require('./platform.cjs').host().extension);await run(`document.getElementById('name').value=${JSON.stringify(name)};document.getElementById('name').dispatchEvent(new Event('input'));true`);
  if(process.env.APPDOCK_CREATOR_CAPTURE)await fs.writeFile(process.env.APPDOCK_CREATOR_CAPTURE,(await win.webContents.capturePage()).toPNG());
  await run("window.addEventListener('make-app:created',event=>{window.__creatorMade=event.detail;},{once:true});true");
  await run('document.getElementById("make").click();true');await until(async()=>{if(await run('document.body.dataset.phase==="error"'))throw new Error(await run('document.getElementById("status").textContent'));return run('document.getElementById("make-label").textContent==="Open app"&&!document.getElementById("make").disabled');});assert.equal(savePrompts,0,'Default desktop creation must not ask where to save');
  if(process.platform==='darwin'){const raw=require('original-fs').promises;assert.ok((await raw.stat(output)).isDirectory());assert.ok((await raw.stat(path.join(output,'Contents/MacOS/Make App'))).isFile());assert.ok((await raw.stat(path.join(output,'Contents/Resources/app.asar'))).size>1000);}else assert.ok((await fs.stat(output)).size>1000000);
  const actualOutput=await run('window.__creatorMade.executable');assert.equal(await fs.realpath(actualOutput),await fs.realpath(output));
  if(process.env.APPDOCK_CREATOR_SUCCESS_CAPTURE)await fs.writeFile(process.env.APPDOCK_CREATOR_SUCCESS_CAPTURE,(await win.webContents.capturePage()).toJPEG(90));
  const openedReport=path.join(path.dirname(result),'creator-open.json');await fs.rm(openedReport,{force:true});process.env.APPDOCK_DATA=path.join(path.dirname(result),'creator-open');process.env.APPDOCK_TOOLCACHE||=path.join(path.dirname(result),'tools');process.env.APPDOCK_DIRECT_TEST=openedReport;process.env.APPDOCK_DIRECT_EXPECT_TEXT=process.env.APPDOCK_CREATOR_EXPECT_TEXT??'APPDOCK_SUM=0';
  await run('document.getElementById("make").click();true');await until(()=>fs.stat(openedReport).catch(()=>false));const opened=JSON.parse(await fs.readFile(openedReport,'utf8'));assert.ok(opened.passed&&opened.stopped&&opened.oneClick&&opened.standalone&&opened.bundledNode);assert.equal(opened.projectFolderRequired,false);assert.equal(opened.setupClicks,0);assert.ok(!win.webContents.getURL().endsWith('/index.html'));
  await win.loadFile(path.join(__dirname,'ui/creator.html'));await until(()=>run('document.getElementById("source").value==='+JSON.stringify(source)+'&&!document.getElementById("make").disabled&&document.getElementById("make-label").textContent==="Create app"'));
  await fs.writeFile(result,JSON.stringify({passed:true,version:app.getVersion(),executable:output,createdThroughDesktopUI:true,automaticDesktopOutput:true,savePrompts,openFromCreator:true,openedAppStopped:true,lastProjectRestored:true,windowControls,libraryRequired:false,sourceCopied:true,originalProjectFolderRequired:false,standalone:true}));app.exit(0);
 }catch(error){const view=await getCreator().webContents.executeJavaScript('({status:document.getElementById("status")?.textContent,detected:document.getElementById("detected")?.textContent,disabled:document.getElementById("make")?.disabled})').catch(()=>null);await fs.writeFile(process.env.APPDOCK_CREATOR_RESULT,JSON.stringify({passed:false,error:error.stack,view}));app.exit(1);}
 finally{dialog.showSaveDialog=savedDialog;for(const[key,value]of Object.entries(originalEnvironment))if(value===undefined)delete process.env[key];else process.env[key]=value;}
};
