const path=require('node:path');
const fs=require('node:fs/promises');
const {spawn}=require('node:child_process');
async function exists(p){try{await fs.access(p);return true;}catch{return false;}}
function python(record){return process.platform==='win32'?path.join(record.root,'.venv','Scripts','python.exe'):path.join(record.root,'.venv','bin','python');}
function spec(record,port){
  let command,args,env={PORT:String(port),HOST:'127.0.0.1',BROWSER:'none',GRADIO_SERVER_NAME:'127.0.0.1',GRADIO_SERVER_PORT:String(port),PYTHONUNBUFFERED:'1'};
  if(record.kind==='node'){
    command='npm';args=['run',record.script,'--',...(record.framework==='next'?['--hostname','127.0.0.1','--port',String(port)]:['--host','127.0.0.1','--port',String(port),'--strictPort'])];
  }else if(record.kind==='python'){
    command=python(record);
    if(record.framework==='streamlit')args=['-m','streamlit','run',record.entry,'--server.address=127.0.0.1',`--server.port=${port}`,'--server.headless=true','--browser.gatherUsageStats=false'];
    if(record.framework==='flask')args=['-m','flask','--app',record.entry,'run','--host','127.0.0.1','--port',String(port),'--no-reload'];
    if(record.framework==='fastapi')args=['-m','uvicorn',record.entry.replace(/\.py$/,'')+':app','--host','127.0.0.1','--port',String(port)];
    if(record.framework==='gradio')args=[record.entry];
  }else{[command,...args]=record.command.map(x=>x.replaceAll('{port}',String(port)));}
  return{command,args,env,url:(record.url||'http://127.0.0.1:{port}').replaceAll('{port}',String(port))};
}
function spawnCommand(command,args,options){
  // Windows npm is a batch entry point. Route only npm's own CLI through cmd;
  // reject command metacharacters rather than interpolate arbitrary manifest input.
  if(process.platform==='win32'&&/^(npm|npm\.cmd)$/i.test(command)){
    if(args.some(x=>!/^[-A-Za-z0-9_./:=@]+$/.test(x)))throw new Error('Unsupported characters in npm arguments. Use a direct executable in appdock.json.');
    return require('./process-broker.cjs').spawn('cmd.exe',['/d','/s','/c','npm '+args.join(' ')],options);
  }
  return require('./process-broker.cjs').spawn(command,args,options);
}
async function missing(record){
  if(record.kind==='python')return !(await exists(python(record)));
  if(record.kind==='node'||record.framework==='node')return !(await exists(path.join(record.root,'node_modules')));
  return false;
}
function runStep(command,args,root,state,onLog,timeout=300000){return new Promise((resolve,reject)=>{
  const child=spawnCommand(command,args,{cwd:root,env:{...process.env,PYTHONUNBUFFERED:'1',PIP_DISABLE_PIP_VERSION_CHECK:'1',BROWSER:'none'},windowsHide:true,detached:process.platform!=='win32',stdio:['pipe','pipe','pipe']});
  state.process=child;let settled=false;
  const timer=setTimeout(()=>{if(!settled){settled=true;reject(new Error('Setup exceeded five minutes. Cancel and inspect the project requirements.'));}},timeout);
  child.on('error',e=>{if(settled)return;settled=true;clearTimeout(timer);reject(e);});
  for(const stream of [child.stdout,child.stderr])stream.on('data',d=>onLog(d.toString()));
  child.on('exit',code=>{if(settled)return;settled=true;clearTimeout(timer);state.process=null;if(code===0)resolve();else reject(new Error(`Setup process exited with code ${code}. Check the log.`));});
});}
async function setup(record,state,onLog){
  if(record.kind==='python'||record.kind==='tool'&&record.framework==='python'){
    if(!(await exists(python(record)))){onLog('Creating a project-local Python environment…\n');await runStep('python',['-m','venv',path.join(record.root,'.venv')],record.root,state,onLog);}
    const args=['-m','pip','install'];
    if(await exists(path.join(record.root,'requirements.txt')))args.push('-r','requirements.txt');
    else if(record.framework!=='python')args.push(record.framework,...(record.framework==='fastapi'?['uvicorn']:[]));
    else {onLog('Python environment is ready. No requirements.txt found.\n');return;}
    onLog('Installing Python dependencies into .venv…\n');await runStep(python(record),args,record.root,state,onLog);
  }else if(record.kind==='node'||record.framework==='node'){
    onLog('Installing Node dependencies…\n');await runStep('npm',['install','--no-fund','--no-audit'],record.root,state,onLog);
  }else if(record.install){const[command,...args]=record.install;await runStep(command,args,record.root,state,onLog);}
  else throw new Error('No install step defined. Add an install array to appdock.json or set up dependencies separately.');
}
module.exports={spec,spawnCommand,missing,setup,python,runStep};
