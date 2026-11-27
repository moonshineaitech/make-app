const fs=require('node:fs/promises'),sync=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawn}=require('node:child_process');
function within(root,file){const relative=path.relative(root,file);return relative!==''&&!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative);}
async function digest(file){const hash=crypto.createHash('sha256');for await(const chunk of sync.createReadStream(file))hash.update(chunk);return hash.digest('hex');}
async function verifyBundle(root){
 const manifest=JSON.parse(await fs.readFile(path.join(root,'bundle-integrity.json'),'utf8'));if(manifest.schemaVersion!==1||!Array.isArray(manifest.files)||manifest.files.length<5)throw new Error('The plugin integrity manifest is incomplete. Download the complete release ZIP.');
 const realRoot=await fs.realpath(root);
 for(const entry of manifest.files){const file=path.resolve(root,entry.path);if(!within(root,file)||!/^[a-f0-9]{64}$/.test(entry.sha256))throw new Error('Invalid path or checksum in the plugin package.');const stat=await fs.lstat(file);if(!within(realRoot,await fs.realpath(file))||!stat.isFile()||stat.isSymbolicLink()||stat.size!==entry.bytes||await digest(file)!==entry.sha256)throw new Error('A plugin file is missing or damaged: '+entry.path);}
}
function plan(pluginRoot,operation){
 if(!['install','uninstall'].includes(operation))throw new Error('Choose install or uninstall.');const marketplace=path.resolve(pluginRoot,'../..');
 return operation==='install'?[['plugin','marketplace','add',marketplace],['plugin','add','make-app@make-app']]:[['plugin','remove','make-app@make-app']];
}
async function locate(env=process.env){
 const candidates=[env.CODEX_EXECUTABLE,...String(env.PATH||env.Path||'').split(path.delimiter).flatMap(folder=>[path.join(folder,'codex.exe'),path.join(folder,'codex')]),...(env.LOCALAPPDATA?[path.join(env.LOCALAPPDATA,'Microsoft/WindowsApps/codex.exe')]:[])].filter(Boolean);
 for(const file of candidates)try{if((await fs.stat(file)).isFile())return path.resolve(file);}catch{}
 if(process.platform==='win32'){
  const powershell=path.join(env.SystemRoot||'C:/Windows','System32/WindowsPowerShell/v1.0/powershell.exe');
  const output=await command(powershell,['-NoProfile','-NonInteractive','-Command',"(Get-Command codex.exe -CommandType Application -ErrorAction Stop).Source"],{env,timeout:15000}).catch(()=>null);
  if(output){const file=output.trim();if(path.isAbsolute(file)&&(await fs.stat(file).catch(()=>null))?.isFile())return file;}
  const packageRoot=await command(powershell,['-NoProfile','-NonInteractive','-Command',"Get-AppxPackage -Name OpenAI.Codex | Select-Object -First 1 -ExpandProperty InstallLocation"],{env,timeout:15000}).catch(()=>null);
  if(packageRoot){const file=path.join(packageRoot.trim(),'app/resources/codex.exe');if(path.isAbsolute(file)&&(await fs.stat(file).catch(()=>null))?.isFile())return file;}
 }
 throw new Error('Codex CLI was not found. Install or update the Codex desktop app, then try again. Make App itself works without Codex.');
}
function command(executable,args,{env=process.env,timeout=60000,onOutput=()=>{}}={}){return new Promise((resolve,reject)=>{
 const child=spawn(executable,args,{env,shell:false,windowsHide:true,stdio:['ignore','pipe','pipe']});let output='';const timer=setTimeout(()=>{child.kill();reject(new Error('Codex did not respond within '+timeout/1000+' seconds.'));},timeout);
 for(const stream of [child.stdout,child.stderr])stream.on('data',data=>{output=(output+data.toString()).slice(-32000);onOutput(data.toString());});child.once('error',error=>{clearTimeout(timer);reject(error);});child.once('close',code=>{clearTimeout(timer);code===0?resolve(output):reject(new Error('Codex exited with code '+code+'. '+output.slice(-2000)));});
});}
async function install(operation='install',{pluginRoot=path.resolve(__dirname,'..'),env=process.env,onOutput=text=>process.stdout.write(text),dryRun=false}={}){
 await verifyBundle(pluginRoot);const steps=plan(pluginRoot,operation);if(dryRun)return{operation,steps,plugin:'make-app@make-app',profileChanged:false};const executable=await locate(env);for(const args of steps)await command(executable,args,{env,onOutput});return{operation,plugin:'make-app@make-app',completed:true};
}
if(require.main===module)install(process.argv[2]||'install',{dryRun:process.argv.includes('--dry-run')}).then(result=>{console.log(JSON.stringify(result,null,2));if(!process.argv.includes('--dry-run'))console.log(result.operation==='install'?'Installed. Open a new Codex chat and ask: Make an executable for this project.':'Removed the Make App plugin. Other plugins and project files were left in place.');}).catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={within,verifyBundle,plan,locate,command,install};
