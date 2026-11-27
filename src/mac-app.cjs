const fs=process.versions.electron?require('original-fs').promises:require('node:fs/promises'),path=require('node:path');
const {execFile}=require('node:child_process'),{promisify}=require('node:util');
const execute=promisify(execFile);
async function makeBundle(template,destination,spec,{signal,onLog=()=>{},signBundle}={}){
 destination=await require('./output-path.cjs').resolveOutput(destination);const relative=path.relative(await fs.realpath(template),destination);if(relative===''||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative)))throw new Error('Save the new app outside the converter bundle.');
 if(!(await fs.stat(path.join(template,'Contents/MacOS/Make App')).catch(()=>null))?.isFile())throw new Error('Use the complete Make App.app converter to create a macOS application.');
 if(await fs.lstat(destination).then(()=>true,()=>false))throw new Error('Output already exists. Choose a new app name.');
 await fs.mkdir(path.dirname(destination),{recursive:true});const holder=await fs.mkdtemp(path.join(path.dirname(destination),'.make-app-')),pending=path.join(holder,path.basename(destination));
 try{
  onLog('Preparing macOS application…\n');
  // Electron's normal fs.cp treats app.asar as a virtual directory. Copy raw
  // bundle files with original-fs and keep framework links relative to the copy.
  const realTemplate=await fs.realpath(template);
  async function copy(from,to){signal?.throwIfAborted();const stat=await fs.lstat(from);if(stat.isSymbolicLink()){
   const target=await fs.realpath(from),rel=path.relative(realTemplate,target);if(rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel))throw new Error('Converter bundle link escapes its application.');await fs.symlink(await fs.readlink(from),to);
  }else if(stat.isDirectory()){await fs.mkdir(to,{mode:stat.mode&0o777});for(const name of await fs.readdir(from))await copy(path.join(from,name),path.join(to,name));}else if(stat.isFile()){await fs.copyFile(from,to);await fs.chmod(to,stat.mode&0o777);}else throw new Error('Unsupported converter bundle entry.');}
  await copy(template,pending);signal?.throwIfAborted();
  const resources=path.join(pending,'Contents/Resources');await fs.writeFile(path.join(resources,'make-app-project.json'),JSON.stringify(spec),{mode:0o600});
  const plist=path.join(pending,'Contents/Info.plist');
  if(signBundle)await signBundle(pending,spec);else{
   for(const [key,value]of [['CFBundleDisplayName',spec.record.name],['CFBundleIdentifier','app.makeapp.project.'+spec.record.id]])await execute('/usr/bin/plutil',['-replace',key,'-string',value,plist],{signal});
   await execute('/usr/bin/codesign',['--force','--deep','--sign','-',pending],{signal});
  }
  signal?.throwIfAborted();await fs.rename(pending,destination);return{executable:destination,name:spec.record.name,format:'app',platform:'darwin',arch:process.arch,sourceCopied:false,requiresAppDockInstallation:false,requiresExistingProjectFolder:true,executionStarted:false};
 }finally{await fs.rm(holder,{recursive:true,force:true});}
}
module.exports={makeBundle};
