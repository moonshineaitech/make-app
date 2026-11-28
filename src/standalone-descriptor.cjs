// Read bounded embedded settings without opening or executing the exported app.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const unsupported=message=>Object.assign(Error(message),{code:'EXPORT_UNSUPPORTED'});
async function read(file){
 const stat=await fs.lstat(file);if(stat.isSymbolicLink())throw Error('The saved app is a link. Choose its original export.');let body,expected;
 if(stat.isDirectory()&&path.extname(file).toLowerCase()==='.app'){
  const root=await fs.realpath(file),config=path.join(root,'Contents/Resources/make-app-project.json'),real=await fs.realpath(config),relative=path.relative(root,real);if(relative.startsWith('..')||path.isAbsolute(relative))throw Error('The app settings are redirected.');
  const s=await fs.lstat(config);if(!s.isFile()||s.isSymbolicLink()||s.size>1048576)throw Error('The app settings are invalid.');body=await fs.readFile(config);if(body.length>1048576)throw Error('The app settings are too large.');
 }else if(stat.isFile()){
  const handle=await fs.open(file,'r');try{
   if(stat.size<96)throw unsupported('This file does not contain supported Make App export settings.');const footer=Buffer.alloc(96),tail=await handle.read(footer,0,96,stat.size-96);if(tail.bytesRead!==96||footer.subarray(80).toString()!=='APPDOCKEXE000001')throw unsupported('This file does not contain supported Make App export settings.');
   const length=Number(footer.readBigUInt64LE(8));if(!Number.isSafeInteger(length)||length<2||length>1048576||length>stat.size-96)throw Error('The standalone app settings are damaged.');body=Buffer.alloc(length);const result=await handle.read(body,0,length,stat.size-96-length);if(result.bytesRead!==length)throw Error('The standalone app settings are incomplete.');expected=footer.subarray(48,80);
  }finally{await handle.close();}
 }else throw unsupported('Choose a standalone desktop export.');
 const digest=crypto.createHash('sha256').update(body).digest();if(expected&&!digest.equals(expected))throw Error('The standalone app settings failed verification. Create the app again.');const spec=JSON.parse(body);if(spec.schemaVersion!==2||!spec.record||!spec.bundle)throw unsupported('This app uses an older export format. Create a new standalone app first.');return{spec,identity:digest.toString('hex'),file:{bytes:stat.size,mtimeMs:stat.mtimeMs}};
}
module.exports={read};
