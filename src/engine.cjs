const fs=require('node:fs/promises');
const path=require('node:path');
const net=require('node:net');
const {spawn}=require('node:child_process');
const {validate}=require('./projects.cjs');
const {inside}=require('./core.cjs');
const diagnostics=require('./diagnostics.cjs');

async function executable(command,env=process.env,cwd=process.cwd()){
  const ext=process.platform==='win32'?(env.PATHEXT||'.COM;.EXE;.BAT;.CMD').toLowerCase().split(';'):[''];
  const names=process.platform==='win32'?(path.extname(command)?[command]:ext.map(x=>command+x)):[command];
  const dirs=/[\\/]/.test(command)||path.isAbsolute(command)?['']:String(env.PATH||env.Path||'').split(path.delimiter);
  for(const name of names)for(const dir of dirs){const full=path.resolve(cwd,dir.replace(/^"|"$/g,''),name);try{const stat=await fs.stat(full);if(stat.isFile()){if(process.platform!=='win32')await fs.access(full,require('node:fs').constants.X_OK);return full;}}catch{}}
  return null;
}
function kill(child){
  if(!child?.pid)return Promise.resolve();
  if(child.appdockSupervised){return new Promise(resolve=>{if(child.exitCode!==null)return resolve();const timer=setTimeout(()=>{child.kill('SIGKILL');resolve();},4000);child.once('close',()=>{clearTimeout(timer);resolve();});child.stdin?.end();});}
  return new Promise(resolve=>{if(process.platform==='win32'){const killer=spawn('taskkill.exe',['/pid',String(child.pid),'/t','/f'],{windowsHide:true,stdio:'ignore'});killer.once('error',resolve);killer.once('exit',resolve);}else{try{process.kill(-child.pid,'SIGTERM');}catch{child.kill();}resolve();}});
}
async function launch(command,args,options){
  const broker=options.appdockTerminal?{spawn:(command,args,opts)=>require('./terminal.cjs').spawn(command,args,opts,options.terminalSize)}:require('./process-broker.cjs');
  if(['pnpm','yarn'].includes(command)&&options.env?.['APPDOCK_PM_'+command.toUpperCase()])return broker.spawn(options.env.APPDOCK_NODE,[options.env['APPDOCK_PM_'+command.toUpperCase()],...args],options);
  if(options.env?.APPDOCK_PYTHON&&['python','python3'].includes(command))return broker.spawn(options.env.APPDOCK_PYTHON,args,options);
  if(options.env?.APPDOCK_NODE&&command==='node')return broker.spawn(options.env.APPDOCK_NODE,args,options);
  if(options.env?.APPDOCK_NODE&&options.env.APPDOCK_NPM&&/^(npm|npm\.cmd)$/i.test(command))return broker.spawn(options.env.APPDOCK_NODE,[options.env.APPDOCK_NPM,...args],options);
  const file=await executable(command,options.env,options.cwd);if(!file)throw new Error(`Missing executable: ${command}. Install it or set an absolute path in the project recipe.`);
  if(process.platform==='win32'&&/\.(cmd|bat)$/i.test(file)){
    const quote=s=>{if(/[&|<>^%!\r\n"]/.test(s))throw new Error('A Windows batch argument contains unsupported shell characters. Use an executable or script entry point instead.');return '"'+s+'"';};
    return broker.spawn('cmd.exe',['/d','/s','/c','"'+[file,...args].map(quote).join(' ')+'"'],{...options,windowsVerbatimArguments:true});
  }
  return broker.spawn(file,args,options);
}
async function port(){return new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const value=server.address().port;server.close(()=>resolve(value));});});}
function interpolate(value,context){return String(value).replace(/\{(root|state|appId|port|ports\.[\w-]+|env\.[\w]+)\}/g,(_all,key)=>{const result=key.startsWith('ports.')?context.ports[key.slice(6)]:key.startsWith('env.')?context.env[key.slice(4)]:context[key];if(result===undefined||result==='')throw new Error(`Missing recipe value: ${key}`);return String(result);});}
function order(services){const sorted=[],done=new Set();function visit(service){if(done.has(service.id))return;for(const id of service.dependsOn||[])visit(services.find(s=>s.id===id));done.add(service.id);sorted.push(service);}services.forEach(visit);return sorted;}
function redactor(secrets,emit){secrets=[...new Set(secrets.filter(Boolean))].sort((a,b)=>b.length-a.length);const patterns=secrets.map(value=>{const prefix=new Array(value.length).fill(0);for(let i=1,j=0;i<value.length;i++){while(j&&value[i]!==value[j])j=prefix[j-1];if(value[i]===value[j])j++;prefix[i]=j;}return{value,prefix};});let pending='';function drain(final=false){for(const secret of secrets)pending=pending.split(secret).join('[redacted]');let keep=0;if(!final)for(const {value,prefix}of patterns){let j=0;for(let i=0;i<pending.length;i++){while(j&&pending[i]!==value[j])j=prefix[j-1];if(pending[i]===value[j])j++;if(j===value.length)j=prefix[j-1];}keep=Math.max(keep,j);}const length=pending.length-keep;if(length){emit(pending.slice(0,length));pending=pending.slice(length);}}return{write(text){pending+=text;drain();},end(){drain(true);}};}
class ProjectSession{
  constructor(record,{onLog=()=>{},onState=()=>{},env={},terminal=false,terminalSize={},onTerminal=()=>{}}={}){this.record=record;this.terminal=terminal;this.terminalSize=terminalSize;this.onTerminal=onTerminal;this.plan=validate(record.plan);this.onState=onState;this.env={...require('./environment.cjs').projectEnvironment(record,env),...(record.workspaceFolder?{APPDOCK_PROJECT_DATA:path.join(record.workspaceFolder,'data')}:{} )};this.secretValues=[...diagnostics.secrets(this.env),...this.plan.requiredEnv.map(name=>this.env[name])].filter(Boolean);this.recentOutput='';this.phase='created';this.receipt=new (require('./runs.cjs').RunRecord)(record);this.abortController=new AbortController();this.log=(text,metadata)=>{const safe=diagnostics.redact(text,this.secretValues);this.recentOutput=(this.recentOutput+safe).slice(-24000);onLog(safe,metadata);};this.children=new Map();this.statuses={};this.cancelled=false;this.stopping=false;this.ports={};}
  async context(){if(!this.mainPort)this.mainPort=await port();for(const service of this.plan.services)if(!this.ports[service.id])this.ports[service.id]=await port();return{root:this.record.root,state:this.record.stateRoot||path.join(this.record.root,'.appdock'),appId:this.record.id||'project',port:this.mainPort,ports:this.ports,env:this.env};}
  setState(id,status,details={}){this.statuses[id]={status,...details};this.receipt.event(this.phase,{task:id,status});this.receipt.flush().catch(error=>this.log('[AppDock] Could not persist run status: '+error.message+'\n'));this.onState({...this.statuses});}
  async preflight(){
    const requirements=[];for(const name of new Set(this.plan.requirements)){const location=['pnpm','yarn'].includes(name)&&this.env['APPDOCK_PM_'+name.toUpperCase()]?this.env['APPDOCK_PM_'+name.toUpperCase()]:['python','python3'].includes(name)&&this.env.APPDOCK_PYTHON?this.env.APPDOCK_PYTHON:name==='node'&&this.env.APPDOCK_NODE?this.env.APPDOCK_NODE:name==='npm'&&this.env.APPDOCK_NPM?this.env.APPDOCK_NPM:await executable(name,this.env,this.record.root);requirements.push({name,available:!!location,path:location});}
    const missingEnv=this.plan.requiredEnv.filter(name=>!this.env[name]);
    const issues=this.plan.configured===false?['Set this project’s actual build and run commands in its launch plan.']:[];
    return{ready:requirements.every(x=>x.available)&&missingEnv.length===0&&!issues.length,requirements,missingEnv,issues,mode:this.plan.mode,services:this.plan.services.map(s=>({id:s.id,dependsOn:s.dependsOn})),setup:this.plan.setup,build:this.plan.build,run:this.plan.run,notes:this.plan.notes||[]};
  }
  async check(){const result=await this.preflight();if(!result.ready)throw new Error([...result.issues,...result.requirements.filter(x=>!x.available).map(x=>'Install or configure '+x.name),...result.missingEnv.map(x=>'Set environment variable '+x)].join('\n'));}
  async startTask(task,id,{args=[],background=false,native=false,timeout=300000}={}){
    if(this.cancelled)throw new Error('Operation cancelled.');
    const ctx=await this.context(),root=await fs.realpath(this.record.root),cwd=await fs.realpath(path.resolve(root,task.cwd||'.'));
    if(!inside(root,cwd))throw new Error('Working directory escapes the project through a symbolic link.');
    const expand=value=>interpolate(this.record.stateRoot?String(value).replaceAll('{root}/.appdock','{state}').replaceAll('{root}\\.appdock','{state}').replace(/^\.appdock(?=[/\\]|$)/,'{state}'):value,ctx);let values=task.command.map(expand);
    if(values[0]==='cmake'&&values.includes('-S')&&this.env.APPDOCK_ZIG_EXE){values.push('-G','Ninja','-DCMAKE_C_COMPILER:FILEPATH='+this.env.APPDOCK_ZIG_EXE,'-DCMAKE_C_COMPILER_ARG1=cc','-DCMAKE_CXX_COMPILER:FILEPATH='+this.env.APPDOCK_ZIG_EXE,'-DCMAKE_CXX_COMPILER_ARG1=c++');}
    if(values[0]==='@appdock/cmake-run')values=[await require('./artifacts.cjs').cmakeExecutable(root,values[1],this.record.stateRoot),...values.slice(2)];
    const env={...this.env,PORT:String(this.mainPort),HOST:'127.0.0.1',BROWSER:'none',PYTHONUNBUFFERED:'1',PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN:this.record.portable?'false':'error',...(this.record.workspaceFolder?{APPDOCK_PROJECT_DATA:path.join(this.record.workspaceFolder,'data')}:{}),...(Object.fromEntries(Object.entries(task.env||{}).map(([k,v])=>[k,k.endsWith('_DATA_DIR')&&this.env[k]?this.env[k]:expand(v)])))};
    if(this.record.stateRoot&&this.record.adapter==='rust')env.CARGO_TARGET_DIR=path.join(this.record.stateRoot,'cargo-target');
    if(this.plan.limits){if(process.platform!=='win32'||!require('./process-broker.cjs').location())throw new Error('Enforced resource limits currently require the Windows supervisor.');for(const [name,key]of Object.entries({memoryMB:'MEMORY_MB',processes:'PROCESSES',cpuPercent:'CPU_PERCENT'}))if(this.plan.limits[name])env['APPDOCK_LIMIT_'+key]=String(this.plan.limits[name]);}
    if(this.ports[id])env.PORT=String(this.ports[id]);
    this.log(`[${id}] ${diagnostics.command([path.basename(values[0]),...values.slice(1)])}\n`);this.setState(id,'starting');
    const terminal=this.terminal&&id==='app'&&this.plan.mode==='tool';
    const child=await launch(values[0],[...values.slice(1),...args],{cwd,env,appdockTerminal:terminal,terminalSize:this.terminalSize,windowsHide:!native,detached:process.platform!=='win32',stdio:['pipe','pipe','pipe']});
    if(this.cancelled){await kill(child);throw new Error('Operation cancelled.');}
    child.stdin?.on('error',()=>{});this.children.set(id,child);
    const result={child,done:null,exited:false,code:null,error:null};
    result.done=new Promise((resolve,reject)=>{
      let timer;
      if(!background&&!terminal)timer=setTimeout(()=>{result.error=new Error(`${id} exceeded ${Math.round(timeout/1000)} seconds.`);kill(child).finally(()=>reject(result.error));},timeout);
      child.once('error',error=>{result.error=error;result.exited=true;clearTimeout(timer);this.children.delete(id);this.setState(id,'failed',{message:error.message});reject(error);});
      for(const stream of [child.stdout,child.stderr]){stream.setEncoding('utf8');let lineStart=true;const filter=redactor([...this.secretValues,...diagnostics.secrets(env)],text=>{if(terminal){this.log(text,{terminal:true});this.onTerminal(text);return;}let formatted='';for(const part of text.match(/[^\n]*\n|[^\n]+$/g)||[]){if(lineStart)formatted+='['+id+'] ';formatted+=part;lineStart=part.endsWith('\n');}this.log(formatted);});stream.on('data',data=>filter.write(data.toString()));stream.on('end',()=>filter.end());}
      child.once('exit',(code,signal)=>{result.exited=true;result.code=code;clearTimeout(timer);if(this.children.get(id)===child)this.children.delete(id);this.setState(id,this.cancelled?'stopped':code===0?'exited':'failed',{code,signal});if(code===0||this.cancelled)resolve({code:code||0});else{result.error=new Error(`${id} exited with code ${code}${signal?' ('+signal+')':''}.`);reject(result.error);}});
    });
    // Background process failures are observed during readiness and in the status panel.
    if(background)result.done.then(()=>{if(this.started&&!this.cancelled)this.stop().catch(error=>this.log('[AppDock] Shutdown failed: '+error.message+'\n'));},error=>{this.log(`[${id}] ${error.message}\n`);if(!this.cancelled){this.failed=error;if(this.started)this.stop().catch(error=>this.log('[AppDock] Shutdown failed: '+error.message+'\n'));}});
    this.setState(id,'running',{pid:child.pid});return result;
  }
  async tasks(tasks,phase){this.phase=phase;this.receipt.event(phase);await this.receipt.flush();try{await this.check();await require('./artifacts.cjs').prepare(this.record);for(let i=0;i<tasks.length;i++){const result=await this.startTask(tasks[i],`${phase}-${i+1}`);await result.done;if(this.cancelled)throw new Error('Operation cancelled.');}await this.receipt.finish(phase+'-complete');return{ok:true};}catch(error){await this.failure(error);throw error;}}
  async failure(error){const fault=require('./failures.cjs').classify(error,{phase:this.phase,output:this.recentOutput,values:this.secretValues});this.failureDetails=fault;error.appdockFailure=fault;await this.receipt.finish(this.cancelled?'cancelled':'failed',{failure:fault});}
  async verified(result){this.readiness=result.mode==='tool'?'completed':this.plan.verify.length?'verified':result.mode==='web'?'responding':'started';this.phase='running';this.receipt.event(this.phase,{readiness:this.readiness});await this.receipt.finish(result.mode==='tool'?'completed':'running',{readiness:this.readiness});await require('./workspaces.cjs').commit(this.record);return{...result,readiness:this.readiness,runId:this.receipt.value.id};}
  async ready(service,result){
    const ready=service.ready;if(!ready)return;
    const ctx=await this.context(),deadline=Date.now()+Math.min(180000,Math.max(100,ready.timeoutMs||60000));let lastReason='No successful response';
    this.phase='verify';
    while(Date.now()<deadline){
      if(this.cancelled)throw new Error('Operation cancelled.');if(this.failed)throw this.failed;if(result.exited)throw result.error||new Error(service.id+' exited before it became ready.');
      try{const verification=await require('./readiness.cjs').probe(ready,value=>interpolate(value,ctx),this.abortController.signal);this.setState(service.id,'ready',{pid:result.child.pid,...verification});return verification;}
      catch(error){lastReason=error.message;}
      await new Promise(r=>setTimeout(r,150));
    }
    throw new Error(service.id+' did not become ready before its deadline. Last check: '+lastReason);
  }
  async start(args=[]){
    try{
      await this.check();if(this.record.workspaceReused)this.log('Reusing the verified build. Use Build project to rebuild it.\n');else await this.tasks(this.plan.build,'build');this.phase='launch';this.receipt.value.outcome='in-progress';
      for(const service of order(this.plan.services)){const result=await this.startTask(service,service.id,{background:true});await this.ready(service,result);}
      let main;if(this.plan.run){main=await this.startTask(this.plan.run,'app',{args,background:this.plan.mode!=='tool',native:this.plan.mode==='native'});if(this.plan.mode==='tool'){const result=await main.done;if(this.cancelled)throw new Error('Operation cancelled.');return await this.verified({...result,mode:'tool'});}}
      if(this.plan.mode==='web'){
        const ctx=await this.context(),url=interpolate(this.plan.url,ctx),sentinel=main||{get exited(){return false;},child:{pid:null}};
        await this.ready({id:'interface',ready:{url,timeoutMs:90000}},sentinel);for(let i=0;i<this.plan.verify.length;i++)await this.ready({id:'verify-'+(i+1),ready:this.plan.verify[i]},sentinel);this.started=true;return await this.verified({mode:'web',url});
      }
      for(let i=0;i<this.plan.verify.length;i++)await this.ready({id:'verify-'+(i+1),ready:this.plan.verify[i]},main||{exited:false,child:{pid:null}});this.started=true;return await this.verified({mode:this.plan.mode,pid:main?.child.pid});
    }catch(error){await this.failure(error);await require('./workspaces.cjs').reject(this.record,error);await this.stop();throw error;}
  }
  stop(){if(!this.stopPromise)this.stopPromise=this.stopInternal();return this.stopPromise;}
  async stopInternal(){
    this.stopping=true;this.cancelled=true;this.abortController.abort(new Error('Operation cancelled.'));
    await Promise.allSettled([...this.children.values()].reverse().map(kill));this.children.clear();
    // Optional stop hooks stop Compose resources without deleting volumes.
    for(const step of this.plan.stop||[]){try{const value=Array.isArray(step)?{command:step}:step;const ctx=await this.context(),parts=value.command.map(x=>interpolate(x,ctx)),child=await launch(parts[0],parts.slice(1),{cwd:this.record.root,env:this.env,windowsHide:true,stdio:'ignore'});await new Promise(resolve=>{const timer=setTimeout(()=>{kill(child).finally(resolve);},15000);child.once('error',()=>{clearTimeout(timer);resolve();});child.once('exit',()=>{clearTimeout(timer);resolve();});});}catch(error){this.log('[stop] '+error.message+'\n');}}
    for(const id of Object.keys(this.statuses))this.setState(id,'stopped');try{if(this.failed&&!this.failureDetails)await this.failure(this.failed);else if(!this.failureDetails&&this.receipt.value.outcome==='running')await this.receipt.finish('stopped');await this.receipt.queue;}catch(error){this.log('[AppDock] Could not save shutdown status: '+error.message+'\n');}
  }
}
module.exports={ProjectSession,executable,interpolate,order,launch,kill,redactor};
