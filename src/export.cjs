const fs=require('node:fs/promises');
const path=require('node:path');
const {inside}=require('./core.cjs');
const {app}=require('electron');
const skip=new Set(['.git','.venv','venv','node_modules','.next','__pycache__','.appdock','.data']);
async function build(record,destination,onLog=()=>{}){
  const runtime=path.dirname(process.execPath);
  if(inside(record.root||runtime,destination)||inside(destination,record.root||runtime))throw new Error('Choose an output folder separate from the project and AppDock runtime.');
  try{await fs.access(destination);throw new Error('Output already exists. Choose a new folder name.');}catch(e){if(e.code!=='ENOENT')throw e;}
  await fs.mkdir(destination,{recursive:true});
  onLog('Copying the desktop runtime…\n');
  await fs.cp(runtime,destination,{recursive:true,filter:source=>{
    const relative=path.relative(runtime,source);return !relative.split(path.sep).includes('resources')&&!relative.endsWith('.pdb')&&!relative.split(path.sep).includes('node_modules');
  }});
  const broker=require('./process-broker.cjs').location();if(broker){await fs.mkdir(path.join(destination,'resources/bin'),{recursive:true});await fs.copyFile(broker,path.join(destination,'resources/bin/appdock-process.exe'));const notices=path.dirname(broker);for(const file of ['RUST-STANDARD-LIBRARY-NOTICES.html','licenses']){try{await fs.cp(path.join(notices,file),path.join(destination,'resources/bin',file),{recursive:true});}catch(error){if(error.code!=='ENOENT')throw error;}}}
  const resource=path.join(destination,'resources','app');await fs.mkdir(resource,{recursive:true});
  onLog('Adding app launcher and permissions broker…\n');
  await fs.cp(path.join(app.getAppPath(),'src'),path.join(resource,'src'),{recursive:true});
  const dependencies=JSON.parse(await fs.readFile(path.join(app.getAppPath(),'package.json'),'utf8')).dependencies||{};const copied=new Set();async function copyDependency(name){if(copied.has(name))return;copied.add(name);const source=path.join(app.getAppPath(),'node_modules',name);await fs.cp(source,path.join(resource,'node_modules',name),{recursive:true,filter:file=>!file.endsWith('.pdb')});const pkg=JSON.parse(await fs.readFile(path.join(source,'package.json'),'utf8'));for(const child of Object.keys(pkg.dependencies||{}))await copyDependency(child);}for(const name of Object.keys(dependencies))await copyDependency(name);
  await fs.writeFile(path.join(resource,'package.json'),JSON.stringify({name:'appdock-export-'+record.id,version:'1.0.0',main:'src/main.cjs',dependencies}));
  const bundled={...record,grants:{},runtimeTrusted:false,shortcut:null,demo:false};
  for(const key of ['originRoot','originSource','stateRoot','workspaceMode','workspaceFolder','workspaceLease','workspaceGeneration','workspaceIdentity','workspaceVerified','previousWorkspace','usePreviousEnvironment','lastLogs','lastFailure','resolvedToolchains','setupKey'])delete bundled[key];bundled.staged=false;
  if(record.kind!=='url'){
    onLog('Copying project source (excluding secrets, environments, and dependencies)…\n');
    await fs.cp(record.root,path.join(resource,'project'),{recursive:true,filter:async source=>{
      const rel=path.relative(record.root,source);if(rel.split(path.sep).some(p=>skip.has(p)||p.startsWith('.env')||p.endsWith('.pem')||p.endsWith('.key')))return false;
      const stat=await fs.lstat(source);if(stat.isSymbolicLink())throw new Error('Export does not follow symbolic links. Copy the linked assets into the project first.');return true;
    }});
    bundled.root='project';const sourceStat=await fs.stat(record.source);bundled.source=sourceStat.isFile()?path.join('project',path.relative(record.root,record.source)):'project';
  }
  await fs.writeFile(path.join(resource,'standalone.json'),JSON.stringify(bundled,null,2));
  const oldExe=path.join(destination,path.basename(process.execPath));
  const exe=path.join(destination,record.name+'.exe');if(oldExe!==exe)await fs.rename(oldExe,exe);
  await fs.writeFile(path.join(destination,'READ ME.txt'),`${record.name}\n\nRun ${record.name}.exe. Keep all files in this folder together.\n\nThis is an unsigned Windows x64 desktop application exported by AppDock.\n${record.kind==='static'?'Static app: no Node, Python, API key, account or AppDock installation is required.\n':record.kind==='url'?'Website app: requires Internet and the website\'s usual login.\n':`Project app: requires its normal runtime / SDK / services. ${record.plan?.requirements?.length?'Requirements: '+record.plan.requirements.join(', ')+'. ':''}On first launch approve project execution and dependency setup. External runtimes, dependencies, and saved environment values are not bundled.\n`}\nLocal app data is stored separately under Windows AppData. Exported source is a snapshot and does not synchronize back to the original.\nDo not include API keys or private data in source. Dot-env files, private .pem/.key files and dependency folders were excluded. Other data files are included.\n`);
  onLog('Windows app exported successfully.\n');return{directory:destination,executable:exe};
}
module.exports={build};
