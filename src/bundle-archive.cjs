// A streamed, checked archive. No shell, external archiver, or absolute links.
const sync=process.versions.electron?require('original-fs'):require('node:fs'),fs=sync.promises,path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib');
const {Readable}=require('node:stream'),{pipeline}=require('node:stream/promises');
const MAGIC=Buffer.from('MAKEAPP-BUNDLE-1\n'),MAX_BYTES=32*1024**3,MAX_FILES=500000;
function safe(value){if(typeof value!=='string'||!value||value.length>4096||/[\\:\x00-\x1f]/.test(value)||value.startsWith('/')||value.split('/').some(p=>!p||p==='.'||p==='..'||/[. ]$/.test(p)||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p)))throw Error('Unsafe bundled path: '+String(value).slice(0,100));return value;}
function within(root,file){const rel=path.relative(root,file);return rel===''||rel!=='..'&&!rel.startsWith('..'+path.sep)&&!path.isAbsolute(rel);}
async function digest(file,{offset=0,bytes,signal,onProgress=()=>{}}={}){const h=crypto.createHash('sha256');let completed=0,last=0;onProgress({phase:'verify',completedBytes:0,totalBytes:bytes});for await(const b of sync.createReadStream(file,{start:offset,...(bytes!==undefined?{end:offset+bytes-1}:{})})){signal?.throwIfAborted();h.update(b);completed+=b.length;if(Date.now()-last>=200){onProgress({phase:'verify',completedBytes:completed,totalBytes:bytes});last=Date.now();}}signal?.throwIfAborted();onProgress({phase:'verify',completedBytes:completed,totalBytes:bytes});return h.digest('hex');}
async function pack(roots,destination,{filter=()=>true,onLog=()=>{},signal,resolveLink}={}){
 let files=0,total=0,last=Date.now();const mappings=await Promise.all(roots.map(async r=>({...r,source:await fs.realpath(r.source)})));
 const header=value=>{const json=Buffer.from(JSON.stringify(value));if(json.length>16384)throw Error('Bundle entry header is too large.');const size=Buffer.alloc(4);size.writeUInt32LE(json.length);return Buffer.concat([size,json]);};
 async function* walk(mapping,from,relative){signal?.throwIfAborted();if(!await filter(from,relative,mapping))return;const name=safe(mapping.prefix+(relative?'/'+relative.split(path.sep).join('/') :'')),stat=await fs.lstat(from);if(++files>MAX_FILES)throw Error('Project exceeds the bundle file limit.');
  if(stat.isSymbolicLink()){const target=await fs.realpath(from);let owner=mappings.find(r=>within(r.source,target));if(!owner&&resolveLink){const extra=await resolveLink({file:from,relative,mapping,target});if(extra){safe(extra.prefix);if(mappings.some(r=>r.prefix===extra.prefix))throw Error('Duplicate dependency root.');owner={...extra,source:await fs.realpath(extra.source)};if(!within(owner.source,target))throw Error('Invalid dependency link root.');mappings.push(owner);}}if(!owner)throw Error('A project link points outside the bundled project: '+relative+'. Copy that dependency into the project first.');const link=safe(owner.prefix+(target===owner.source?'':'/'+path.relative(owner.source,target).split(path.sep).join('/')));yield header({path:name,type:'link',target:link,directory:(await fs.stat(target)).isDirectory()});return;}
  if(stat.isDirectory()){yield header({path:name,type:'directory'});for(const entry of (await fs.readdir(from)).sort())yield* walk(mapping,path.join(from,entry),relative?path.join(relative,entry):entry);return;}
  if(!stat.isFile())throw Error('Unsupported project file: '+relative);if(!Number.isSafeInteger(stat.size)||(total+=stat.size)>MAX_BYTES)throw Error('Project exceeds the 32 GB uncompressed bundle limit.');yield header({path:name,type:'file',bytes:stat.size,mode:stat.mode&0o111?0o700:0o600});let copied=0;for await(const b of sync.createReadStream(from)){signal?.throwIfAborted();copied+=b.length;if(copied>stat.size)throw Error('Project changed while bundling: '+relative);yield b;}const after=await fs.stat(from);if(copied!==stat.size||after.size!==stat.size||after.mtimeMs!==stat.mtimeMs)throw Error('Project changed while bundling: '+relative);if(Date.now()-last>3000){onLog('Bundling '+files+' files ('+Math.round(total/1048576)+' MB)…\n');last=Date.now();}
 }
 async function* entries(){yield MAGIC;for(const mapping of mappings)yield* walk(mapping,mapping.source,'');yield Buffer.alloc(4);}
 try{await pipeline(Readable.from(entries()),zlib.createGzip({level:1}),sync.createWriteStream(destination,{flags:'wx',mode:0o600}),{signal});return{bytes:(await fs.stat(destination)).size,sha256:await digest(destination),files,uncompressedBytes:total};}catch(e){await fs.rm(destination,{force:true});throw e;}
}
async function unpack(file,destination,{offset=0,bytes,sha256,signal,linkRoot=destination,onProgress=()=>{},uncompressedBytes,files}={}){
 if(!Number.isSafeInteger(offset)||offset<0||!Number.isSafeInteger(bytes)||bytes<=0||!Number.isSafeInteger(offset+bytes)||!/^[a-f0-9]{64}$/.test(sha256||''))throw Error('Invalid bundled project descriptor.');if(await digest(file,{offset,bytes,signal,onProgress})!==sha256)throw Error('Bundled project failed its integrity check.');
 // Only unpack into a new, private directory. File contents cannot traverse links.
 await fs.mkdir(destination,{mode:0o700});const realDestination=await fs.realpath(destination);let iterator,stream,input;const links=[],seen=new Set(),directories=new Map(),writes=new Set();let pending=Buffer.alloc(0),ended=false,total=0,count=0,completedBytes=0,completedFiles=0,lastProgress=0,writeError;
 const check=()=>{signal?.throwIfAborted();if(writeError)throw writeError;};
 function notify(force=false){if(force||Date.now()-lastProgress>=200){onProgress({phase:'extract',completedBytes,totalBytes:uncompressedBytes,completedFiles,totalFiles:files});lastProgress=Date.now();}}
 function directory(target){let ready=directories.get(target);if(!ready){ready=fs.mkdir(target,{recursive:true,mode:0o700});directories.set(target,ready);}return ready;}
 function queue(target,data,mode){let task;task=(async()=>{check();await fs.writeFile(target,data,{flag:'wx',mode,signal});completedBytes+=data.length;completedFiles++;notify();})().catch(error=>{writeError ||= error;}).finally(()=>writes.delete(task));writes.add(task);}
 async function drain(){await Promise.all(writes);check();}
 const abort=()=>{input?.destroy();stream?.destroy(signal.reason instanceof Error?signal.reason:new Error('Opening cancelled.'));};
 try{
  input=sync.createReadStream(file,{start:offset,end:offset+bytes-1});stream=zlib.createGunzip();input.on('error',e=>stream.destroy(e));input.pipe(stream);iterator=stream[Symbol.asyncIterator]();signal?.addEventListener('abort',abort,{once:true});check();notify(true);
  async function read(n){check();while(pending.length<n){const part=await iterator.next();check();if(part.done){ended=true;throw Error('Bundled project is truncated.');}pending=pending.length?Buffer.concat([pending,part.value]):part.value;}const value=pending.subarray(0,n);pending=pending.subarray(n);return value;}
  if(!(await read(MAGIC.length)).equals(MAGIC))throw Error('Unknown bundled project format.');
  for(;;){const length=(await read(4)).readUInt32LE();if(length===0)break;if(length>16384||++count>MAX_FILES)throw Error('Invalid bundled entry count or header.');const entry=JSON.parse((await read(length)).toString('utf8')),name=safe(entry.path),key=process.platform==='win32'?name.toLowerCase():name;if(seen.has(key))throw Error('Duplicate bundled file: '+name);seen.add(key);const target=path.join(destination,...name.split('/'));
   if(entry.type==='directory'){await directory(target);completedFiles++;notify();}
   else if(entry.type==='link'){safe(entry.target);links.push({...entry,targetPath:target});}
   else if(entry.type==='file'){
    if(!Number.isSafeInteger(entry.bytes)||entry.bytes<0||(total+=entry.bytes)>MAX_BYTES)throw Error('Invalid bundled file size.');await directory(path.dirname(target));check();const mode=entry.mode===0o700?0o700:0o600;
    // Bound small-file work to eight writers and 2 MiB of file payloads. Larger
    // assets remain streamed; links are created only after all writes finish.
    if(entry.bytes<=262144){if(writes.size>=8){await Promise.race(writes);check();}queue(target,await read(entry.bytes),mode);}
    else{const handle=await fs.open(target,'wx',mode);try{let left=entry.bytes;while(left){const b=await read(Math.min(left,65536));let at=0;while(at<b.length){check();const {bytesWritten}=await handle.write(b,at);if(!bytesWritten)throw Error('Could not extract the standalone app.');at+=bytesWritten;}left-=b.length;completedBytes+=b.length;notify();}completedFiles++;}finally{await handle.close();}}
   }
   else throw Error('Unknown bundled entry type.');
  }
  if(pending.length)throw Error('Unexpected trailing bundle data.');const tail=await iterator.next();if(!tail.done)throw Error('Unexpected trailing bundle data.');ended=true;await drain();
  // Link targets must be present and cannot themselves be links. Links are last.
  for(const entry of links){check();const to=path.join(destination,...entry.target.split('/'));let ancestor=path.dirname(entry.targetPath);while(ancestor!==destination){if((await fs.lstat(ancestor).catch(()=>null))?.isSymbolicLink())throw Error('Bundled link traverses another link.');ancestor=path.dirname(ancestor);}if(!within(realDestination,await fs.realpath(to)))throw Error('Bundled link escapes its project.');await directory(path.dirname(entry.targetPath));await fs.symlink(process.platform==='win32'&&entry.directory?path.join(linkRoot,...entry.target.split('/')):path.relative(path.dirname(entry.targetPath),to),entry.targetPath,entry.directory?(process.platform==='win32'?'junction':'dir'):'file');completedFiles++;notify();}
  check();notify(true);check();
  return{files:count,uncompressedBytes:total};
 }catch(e){stream?.destroy();input?.destroy();await Promise.all(writes);await fs.rm(destination,{recursive:true,force:true,maxRetries:5,retryDelay:100});throw e;}finally{signal?.removeEventListener('abort',abort);if(!ended)stream?.destroy();input?.destroy();}
}
module.exports={pack,unpack,digest,safe,within};
