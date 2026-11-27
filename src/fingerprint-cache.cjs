// Optional acceleration for direct launchers. Permission/trust checks use fresh
// content reads; cached hashes never authorize native capabilities.
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
function rootDirectory(){return process.env.APPDOCK_FINGERPRINT_CACHE||(process.env.APPDOCK_TOOLCACHE?path.join(process.env.APPDOCK_TOOLCACHE,'fingerprints'):path.join(process.platform==='win32'?(process.env.LOCALAPPDATA||os.tmpdir()):process.env.XDG_CACHE_HOME||path.join(os.homedir(),'.cache'),'make-app','fingerprints'));}
function key(stat){return[stat.dev,stat.ino,stat.size,stat.mtimeNs,stat.ctimeNs,stat.mode].join(':');}
async function open(root,{enabled=false,cacheRoot,signal}={}){
 const directory=cacheRoot||rootDirectory(),file=path.join(directory,crypto.createHash('sha256').update(process.platform==='win32'?root.toLowerCase():root).digest('hex')+'.json');let previous={};
 if(enabled)try{if((await fs.stat(file)).size<=16*1024*1024){const data=JSON.parse(await fs.readFile(file,'utf8'));if(data.schemaVersion===1&&data.files&&typeof data.files==='object')previous=data.files;}}catch{}
 const next=Object.create(null),stats={files:0,cacheHits:0,bytesRead:0};
 return{stats,async digest(filename,relative){signal?.throwIfAborted();stats.files++;
  // Cloud-file hydration can change metadata on the first read. Reread from
  // fresh metadata; never accept a hash whose own before/after samples differ.
  for(let attempt=0;attempt<3;attempt++){
   signal?.throwIfAborted();const before=await fs.stat(filename,{bigint:true}),identity=key(before),cached=previous[relative];let hash;
   if(enabled&&cached?.key===identity&&/^[a-f0-9]{64}$/.test(cached.hash)){hash=cached.hash;stats.cacheHits++;}
   else{const digest=crypto.createHash('sha256');for await(const chunk of require('node:fs').createReadStream(filename)){signal?.throwIfAborted();digest.update(chunk);stats.bytesRead+=chunk.length;}if(key(await fs.stat(filename,{bigint:true}))!==identity)continue;hash=digest.digest('hex');}
   next[relative]={key:identity,hash};return hash;
  }
  throw new Error('Source changed while hashing. Retry with a stable project.');
 },async finish(){if(!enabled)return;const data=JSON.stringify({schemaVersion:1,files:next});if(Buffer.byteLength(data)>16*1024*1024)return;const temporary=file+'.'+crypto.randomUUID()+'.tmp';try{await fs.mkdir(directory,{recursive:true,mode:0o700});await fs.writeFile(temporary,data,{mode:0o600});await fs.rename(temporary,file);}catch{await fs.rm(temporary,{force:true}).catch(()=>{});/* Cache failures must not prevent a verified launch. */}}};
}
module.exports={open};
