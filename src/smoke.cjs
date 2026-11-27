// Runs only with --smoke-test and an isolated APPDOCK_DATA directory.
const fs=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');
const {dialog,shell}=require('electron');
async function until(fn,timeout=12000){const end=Date.now()+timeout;while(Date.now()<end){if(await fn())return;await new Promise(r=>setTimeout(r,100));}throw new Error('Condition timed out');}
exports.run=async ctx=>{
  const {app,add,launch,running,closeApp,shortcuts,showLibrary,getLibrary,setup,exportApp}=ctx;
  const results=[];
  try{
    const root=path.join(app.getPath('userData'),'fixtures','html');await fs.mkdir(root,{recursive:true});
    const content='<!doctype html><title>Fixture</title><h1 id="title">Working app</h1><script>localStorage.setItem("persisted",localStorage.getItem("persisted")||"yes");</script>';
    await fs.writeFile(path.join(root,'index.html'),content);await fs.writeFile(path.join(root,'.env'),'SECRET=private');
    const a=await add({source:root,name:'Test app'});await launch(a.id);let win=running.get(a.id).win;
    assert.equal(await win.webContents.executeJavaScript('document.querySelector("h1").textContent'),'Working app');
    assert.equal(await win.webContents.executeJavaScript('typeof require'),'undefined');
    assert.equal(await win.webContents.executeJavaScript('typeof dock'),'undefined');
    assert.equal(await win.webContents.executeJavaScript('typeof appdock.notify'),'function');
    assert.equal(await win.webContents.executeJavaScript('fetch("/.env").then(r=>r.status)'),403);
    results.push('Static import, custom protocol, isolated Node and library bridges, hidden-file denial');
    closeApp(a.id);await launch(a.id);win=running.get(a.id).win;
    assert.equal(await win.webContents.executeJavaScript('localStorage.getItem("persisted")'),'yes');results.push('Persistent per-app browser storage');
    const second=await add({source:root,name:'Other app'});await launch(second.id);
    assert.equal(await running.get(second.id).win.webContents.executeJavaScript('localStorage.getItem("unique")'),null);
    await win.webContents.executeJavaScript('localStorage.setItem("unique","first")');assert.equal(await running.get(second.id).win.webContents.executeJavaScript('localStorage.getItem("unique")'),null);closeApp(second.id);results.push('Storage isolation between imported apps');
    const originalDialog=dialog.showMessageBox;dialog.showMessageBox=async()=>({response:0});
    await assert.rejects(win.webContents.executeJavaScript('appdock.alwaysOnTop(true)'));assert.equal(win.isAlwaysOnTop(),false);results.push('Denied native permission does not elevate window');
    dialog.showMessageBox=async()=>({response:1});
    await win.webContents.executeJavaScript('appdock.alwaysOnTop(true)');await until(()=>win.isAlwaysOnTop());assert.equal(a.grants.pin,a.version);results.push('Approved native permission works for the current source version');
    const openDialog=dialog.showOpenDialog,saveDialog=dialog.showSaveDialog;
    const note=path.join(app.getPath('userData'),'chosen-note.txt');await fs.writeFile(note,'Chosen file only');
    dialog.showOpenDialog=async()=>({canceled:false,filePaths:[note]});assert.equal((await win.webContents.executeJavaScript('appdock.readTextFile()')).text,'Chosen file only');
    const saved=path.join(app.getPath('userData'),'saved-note.txt');dialog.showSaveDialog=async()=>({canceled:false,filePath:saved});await win.webContents.executeJavaScript('appdock.saveTextFile("Saved through broker", "note.txt")');assert.equal(await fs.readFile(saved,'utf8'),'Saved through broker');dialog.showOpenDialog=openDialog;dialog.showSaveDialog=saveDialog;results.push('File broker reads and writes only paths selected in native dialogs');
    await win.webContents.executeJavaScript('appdock.tray()');assert.ok(running.get(a.id).tray);results.push('Permission-controlled native system tray icon');
    const previous=a.version;await fs.writeFile(path.join(root,'index.html'),content.replace('Working app','Updated app'));
    await until(()=>a.version!==previous);await until(()=>win.webContents.executeJavaScript('document.querySelector("h1")?.textContent==="Updated app"'));
    assert.deepEqual(a.grants,{});assert.equal(win.isAlwaysOnTop(),false);assert.equal(running.get(a.id).tray,null);dialog.showMessageBox=originalDialog;results.push('Live source update reloads UI and revokes pin, tray, and file grants');
    if(process.platform==='win32'){const shortcut=await shortcuts(a);const details=shell.readShortcutLink(shortcut);assert.ok(details.args.includes(a.id));await fs.unlink(shortcut);a.shortcut=null;results.push('Windows Start menu shortcut targets app ID');}
    showLibrary();const lib=getLibrary();await until(()=>!lib.webContents.isLoading());
    await until(()=>lib.webContents.executeJavaScript('document.querySelectorAll(".app-card").length===2'));
    assert.equal(await lib.webContents.executeJavaScript('typeof dock.add'),'function');assert.equal(await lib.webContents.executeJavaScript('typeof appdock'),'undefined');results.push('Library loads real catalog and exposes only its management bridge');
    const bad=await add({source:'http://127.0.0.1:1',name:'Unavailable site'});await assert.rejects(launch(bad.id));assert.equal(running.has(bad.id),false);results.push('Failed website launch cleans up window and runtime state');
    if(process.env.APPDOCK_VITE_FIXTURE){const v=await add({source:process.env.APPDOCK_VITE_FIXTURE,name:'Vite integration',trustRuntime:true});await launch(v.id);const state=running.get(v.id);assert.ok(state.process.pid);assert.equal(await state.win.webContents.executeJavaScript('document.querySelector("h1").textContent'),'Vite runtime works');closeApp(v.id);assert.equal(running.has(v.id),false);results.push('Real Vite npm runtime becomes ready, renders, and stops');}
    if(process.env.APPDOCK_PYTHON_FIXTURE){const p=await add({source:process.env.APPDOCK_PYTHON_FIXTURE,name:'Python integration',trustRuntime:true});await setup(p);assert.equal(p.needsInstall,false);await launch(p.id);assert.equal(await running.get(p.id).win.webContents.executeJavaScript('document.querySelector("h1").textContent'),'Python runtime works');closeApp(p.id);results.push('Real Python environment setup, pip dependency install, Flask render, and shutdown');}
    const toolRoot=path.join(app.getPath('userData'),'fixtures','script');await fs.mkdir(toolRoot,{recursive:true});await fs.writeFile(path.join(toolRoot,'main.py'),'import sys\nprint("Desktop tool output:", (sys.argv[1] if len(sys.argv)>1 else "ready"))\n');const tool=await add({source:toolRoot,name:'Python script tool',trustRuntime:true});await launch(tool.id);const toolWin=running.get(tool.id).win;await until(()=>toolWin.webContents.executeJavaScript('document.querySelector("#status").textContent.includes("Finished")'));assert.equal((await toolWin.webContents.executeJavaScript('tool.run(["acceptance"])')).code,0);await until(()=>toolWin.webContents.executeJavaScript('document.querySelector("#log").textContent.includes("Desktop tool output: acceptance")'));closeApp(tool.id);results.push('Plain Python script becomes a desktop tool with arguments and streamed output');
    if(process.env.APPDOCK_EXPORT_DEST){const built=await exportApp(a,process.env.APPDOCK_EXPORT_DEST);assert.ok((await fs.stat(built.executable)).size>1000000);assert.equal(JSON.parse(await fs.readFile(path.join(built.directory,'resources','app','standalone.json'),'utf8')).name,'Test app');results.push('Standalone Windows app export includes executable, launcher, source snapshot, and manifest');}
    if(process.env.APPDOCK_DEMO_EXPORT){const demo=await add({source:path.join(__dirname,'..','examples','focus'),name:'Focus Desk',color:'#bba4ef'});await exportApp(demo,process.env.APPDOCK_DEMO_EXPORT);results.push('Exported the included Focus Desk sample as an independent Windows app');}
    if(process.env.APPDOCK_CAPTURE){await lib.webContents.executeJavaScript('window.dock.onChange = () => {};');await lib.webContents.executeJavaScript('document.getElementById("search").value=""');await new Promise(r=>setTimeout(r,500));await fs.writeFile(process.env.APPDOCK_CAPTURE,(await lib.webContents.capturePage()).toPNG());}
    const report={passed:true,at:new Date().toISOString(),electron:process.versions.electron,results};await fs.writeFile(path.join(app.getPath('userData'),'smoke-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));app.exit(0);
  }catch(error){console.error(error);await fs.writeFile(path.join(app.getPath('userData'),'smoke-results.json'),JSON.stringify({passed:false,error:error.stack,results},null,2));app.exit(1);}
};
