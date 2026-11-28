// Freeze build tools into artifacts; ship interpreters only where required.
const fs=require('node:fs/promises'),path=require('node:path');
async function prepare(record,cache,{signal,onLog=()=>{}}={}){
 const roots=[],environment={},kind=record.adapter||'python',runtime=require('./toolchains.cjs'),root=record.root,output=path.join(root,'.make-app');await fs.mkdir(output,{recursive:true});
 const tools=kind==='python'?null:await runtime.prepare(record,cache,onLog,{signal});let env=tools?.env||{};const result={...record,toolchains:[]};
 if(kind==='python'){
  const python=await runtime.provision('python',cache,{},onLog,signal),executable=await fs.realpath(python.executable),home=process.platform==='win32'?path.dirname(executable):path.dirname(path.dirname(executable));roots.push({source:home,prefix:'tools/python'});environment.APPDOCK_PYTHON={path:'tools/python/'+path.relative(home,executable).split(path.sep).join('/')};environment.PYTHONPATH={paths:['project/.make-app/python-packages']};
  const requirements=await fs.stat(path.join(root,'requirements.txt')).catch(()=>null),packaged=await fs.stat(path.join(root,'pyproject.toml')).catch(()=>null)||await fs.stat(path.join(root,'setup.py')).catch(()=>null);if(requirements||packaged){onLog('Installing Python dependencies into the standalone app…\n');await runtime.run(executable,['-m','pip','install','--disable-pip-version-check','--target',path.join(output,'python-packages'),...(packaged?['.']:['-r','requirements.txt'])],{env:{...process.env,PIP_DISABLE_PIP_VERSION_CHECK:'1'},onLog,signal,cwd:root});}
  const rewrite=task=>({...task,command:task.command.map((v,i)=>i===0&&/(?:^|[/\\])(?:python(?:3(?:\.\d+)?)?(?:\.exe)?)$/.test(v)?'python':v)});result.plan={...record.plan,requirements:['python'],setup:[],build:[],...(record.plan.run?{run:rewrite(record.plan.run)}:{}),services:record.plan.services.map(rewrite)};return{record:result,environment,roots};
 }
 const session=new(require('./engine.cjs').ProjectSession)(record,{env,onLog});const abort=()=>session.stop();signal?.addEventListener('abort',abort,{once:true});
 try{
  onLog('Building the standalone '+kind+' app…\n');await session.tasks(session.plan.setup,'package-setup');
  if(kind==='dotnet'){
   const project=record.selectedTarget||record.plan.run.command[record.plan.run.command.indexOf('--project')+1];if(!project||!project.endsWith('proj'))throw Error('Choose the .NET executable project before packaging.');const publish=path.join(output,'publish');await session.tasks([{command:['dotnet','publish',project,'--configuration','Release','--runtime',(process.platform==='win32'?'win':process.platform==='darwin'?'osx':'linux')+'-'+process.arch,'--self-contained','true','-p:UseAppHost=true','--output',publish],cwd:'.'}],'package-publish');
   const xml=await fs.readFile(path.join(root,project),'utf8'),name=/<AssemblyName>\s*([^<]+)\s*<\//i.exec(xml)?.[1]||path.basename(project,path.extname(project));const entry=path.join(publish,name+(process.platform==='win32'?'.exe':''));await fs.access(entry);result.plan={...record.plan,requirements:[],setup:[],build:[],run:{...record.plan.run,command:['{root}/.make-app/publish/'+path.basename(entry)]}};return{record:result,environment,roots};
  }
  await session.tasks(session.plan.build,'package-build');let binary;
  if(kind==='java'){
   const java=tools.tools.find(t=>t.kind==='java');if(!java)throw Error('The Java runtime was not located.');const executable=await fs.realpath(java.executable),home=path.dirname(path.dirname(executable));roots.push({source:home,prefix:'tools/java'});environment.JAVA_HOME={path:'tools/java'};environment.PATH={paths:['tools/java/bin']};await fs.cp(path.join(record.stateRoot,'classes'),path.join(output,'classes'),{recursive:true});result.plan={...record.plan,requirements:['java'],setup:[],build:[],run:{...record.plan.run,command:record.plan.run.command.map(v=>v.replaceAll('.appdock/classes','.make-app/classes'))}};
  }else{
   if(kind==='rust'&&record.plan.run.command[0]==='cargo')binary=path.join(record.stateRoot,'cargo-target/release',record.selectedTarget+(process.platform==='win32'?'.exe':''));
   else if(kind==='cmake')binary=await require('./artifacts.cjs').cmakeExecutable(root,record.selectedTarget,record.stateRoot);
   else{const command=record.plan.run.command[0];binary=command.replaceAll('{root}/.appdock',record.stateRoot).replaceAll('{root}',root);if(!path.isAbsolute(binary))binary=path.resolve(root,binary);}
   if(!require('./bundle-archive.cjs').within(root,binary))throw Error('The compiled artifact is outside the standalone snapshot.');await fs.access(binary);const native=path.join(output,'native');await fs.mkdir(native,{recursive:true});
   await fs.cp(path.dirname(binary),native,{recursive:true,filter:file=>!path.relative(path.dirname(binary),file).split(path.sep).some(p=>['deps','incremental','.fingerprint','build','CMakeFiles'].includes(p))&&!/\.(?:pdb|o|obj|rlib|rmeta|a|lib|d)$/.test(file)});
   // Copy the entry explicitly even if an ancestor happens to be named build.
   await fs.copyFile(binary,path.join(native,path.basename(binary)));await fs.chmod(path.join(native,path.basename(binary)),0o700);
   result.plan={...record.plan,requirements:[],setup:[],build:[],run:{...record.plan.run,command:['{root}/.make-app/native/'+path.basename(binary),...(record.plan.run.command[0]==='cargo'?record.plan.run.command.slice(record.plan.run.command.indexOf('--')+1):record.plan.run.command.slice(1))]}};
  }
  return{record:result,environment,roots};
 }finally{signal?.removeEventListener('abort',abort);await session.stop();}
}
module.exports={prepare};
