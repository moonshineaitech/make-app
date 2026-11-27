// Exports an existing static build. Inspection and export never execute project code.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const allowed=new Set(['.html','.htm','.js','.mjs','.css','.json','.webmanifest','.wasm','.png','.jpg','.jpeg','.gif','.svg','.webp','.avif','.ico','.woff','.woff2','.ttf','.otf','.mp3','.wav','.ogg','.mp4','.webm','.txt','.xml','.pdf']);
const reserved=new Set(['make-app.webmanifest','make-app-sw.js','make-app-register.js','make-app-icon.svg','make-app-180.png','make-app-192.png','make-app-512.png','MAKE-APP-README.txt','make-app-export.json']);
function inside(root,target){const rel=path.relative(root,target);return rel===''||(!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel));}
async function webRoot(source){source=await fs.realpath(source);if(!(await fs.stat(source)).isDirectory())return null;for(const directory of [...['dist','build','out','public'].map(n=>path.join(source,n)),source]){try{const file=path.join(directory,'index.html');if((await fs.lstat(directory)).isSymbolicLink()||(await fs.lstat(file)).isSymbolicLink())continue;if((await fs.stat(file)).isFile()){if(directory===source){const html=await fs.readFile(file,'utf8');if(/(?:src|href)=["'](?:\.\/|\/)?src\//i.test(html)||/<script[^>]+src=["'][^"']+\.(?:ts|tsx|mts|cts)(?:[?"'])/i.test(html))continue;}return directory;}}catch(error){if(error.code!=='ENOENT')throw error;}}return null;}
async function inventory(root,prefix='',result=[]){
 for(const item of await fs.readdir(path.join(root,prefix),{withFileTypes:true})){
  if(item.name.startsWith('.')||['node_modules','vendor','src','test','tests','coverage','work','outputs','release'].includes(item.name))continue;
  const relative=path.join(prefix,item.name),file=path.join(root,relative);if(item.isSymbolicLink())throw new Error('Web export refuses symbolic links: '+relative);
  if(item.isDirectory())await inventory(root,relative,result);else if(item.isFile()&&allowed.has(path.extname(item.name).toLowerCase())){
   if(reserved.has(relative))throw new Error('Project uses a reserved export filename: '+relative);
   const stat=await fs.stat(file);if(stat.size>64*1024*1024)throw new Error('Web asset exceeds 64 MB: '+relative);
   result.push({path:relative,bytes:stat.size});if(result.length>10000||result.reduce((sum,x)=>sum+x.bytes,0)>512*1024*1024)throw new Error('Web export exceeds its 10,000-file / 512 MB limit.');
  }
 }return result;
}
async function exportWeb(source,destination,{name='My app',signal,onLog=()=>{}}={}){
 const original=await fs.realpath(source),root=await webRoot(source);if(!root)throw new Error('No static web build found. Build the web project first, then choose its folder. Server-side code cannot run in a phone browser.');
 destination=await require('./output-path.cjs').resolveOutput(destination);if(inside(original,destination))throw new Error('Save the web export outside the project folder.');
 if(await fs.lstat(destination).then(()=>true,e=>{if(e.code==='ENOENT')return false;throw e;}))throw new Error('Output already exists. Choose a new folder.');
 const files=await inventory(root);signal?.throwIfAborted();await fs.mkdir(path.dirname(destination),{recursive:true});const temporary=await fs.mkdtemp(path.join(path.dirname(destination),'.make-app-web-'));
 try{
  const hashes=[];for(const entry of files){signal?.throwIfAborted();const from=path.join(root,entry.path),to=path.join(temporary,entry.path);await fs.mkdir(path.dirname(to),{recursive:true});const bytes=await fs.readFile(from);
   if(/\.(?:json|js|mjs|html?|txt|xml)$/i.test(entry.path)&&/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bgh[pousr]_[A-Za-z0-9]{30,}|\bAKIA[A-Z0-9]{16}\b/.test(bytes.toString()))throw new Error('Possible embedded credential in web asset: '+entry.path);
   await fs.writeFile(to,bytes);hashes.push({path:entry.path.split(path.sep).join('/'),sha256:crypto.createHash('sha256').update(bytes).digest('hex')});onLog('Added '+entry.path+'\n');
  }
  const title=String(name).slice(0,70),version=crypto.createHash('sha256').update('0.8.0'+JSON.stringify(hashes)).digest('hex').slice(0,20),index=path.join(temporary,'index.html');let html=await fs.readFile(index,'utf8');
  for(const size of [180,192,512])await fs.copyFile(path.join(__dirname,'pwa-icons','icon-'+size+'.png'),path.join(temporary,'make-app-'+size+'.png'));
  const tags='<link rel="manifest" href="./make-app.webmanifest"><meta name="theme-color" content="#202734"><link rel="apple-touch-icon" href="./make-app-180.png"><meta name="apple-mobile-web-app-capable" content="yes"><script src="./make-app-register.js" defer></script>';
  html=/<\/head>/i.test(html)?html.replace(/<\/head>/i,tags+'</head>'):tags+html;await fs.writeFile(index,html);hashes.find(x=>x.path==='index.html').sha256=crypto.createHash('sha256').update(html).digest('hex');
  await fs.writeFile(path.join(temporary,'make-app.webmanifest'),JSON.stringify({id:'./',name:title,short_name:title.slice(0,20),start_url:'./',scope:'./',display:'standalone',background_color:'#f7f8fa',theme_color:'#202734',icons:[{src:'./make-app-192.png',sizes:'192x192',type:'image/png'},{src:'./make-app-512.png',sizes:'512x512',type:'image/png'},{src:'./make-app-icon.svg',sizes:'any',type:'image/svg+xml',purpose:'any maskable'}]},null,2));
  await fs.writeFile(path.join(temporary,'make-app-icon.svg'),'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="104" fill="#202734"/><path d="M120 156h272v208H120zM120 212h272" stroke="#f7f8fa" stroke-width="24" fill="none"/></svg>');
  await fs.writeFile(path.join(temporary,'make-app-register.js'),"if('serviceWorker' in navigator&&window.isSecureContext)window.addEventListener('load',()=>navigator.serviceWorker.register('./make-app-sw.js').catch(()=>{}));\n");
  const assets=['./',...hashes.map(x=>'./'+x.path),'./make-app.webmanifest','./make-app-icon.svg','./make-app-180.png','./make-app-192.png','./make-app-512.png','./make-app-register.js'];
  await fs.writeFile(path.join(temporary,'make-app-sw.js'),`const PREFIX='make-app:'+self.registration.scope+':',CACHE=PREFIX+'${version}',FILES=${JSON.stringify(assets)};self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k))))));self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin)return;e.respondWith(fetch(e.request).catch(()=>caches.match(e.request).then(r=>r||(e.request.mode==='navigate'?caches.match('./'):Response.error()))));});\n`);
  await fs.writeFile(path.join(temporary,'MAKE-APP-README.txt'),'Upload the contents of this folder to any static HTTPS host. Open its URL on iPhone, iPad, Android, ChromeOS or a desktop browser. Use Add to Home Screen / Install App when offered. Installation support depends on the browser. Offline access starts after a successful first visit and service-worker installation. External APIs, authentication and backend services still need connectivity. Do not open index.html through file:// for installation. This export contains static public assets only; review your project build for embedded secrets before sharing.\n');
  await fs.writeFile(path.join(temporary,'make-app-export.json'),JSON.stringify({schemaVersion:1,format:'web',name:title,version,files:hashes,requiresHttps:true,projectCodeExecuted:false},null,2));signal?.throwIfAborted();await fs.rename(temporary,destination);
  return{executable:destination,name:title,format:'web',files:files.length,bytes:files.reduce((n,f)=>n+f.bytes,0),requiresExistingProjectFolder:false,requiresHttps:true,executionStarted:false};
 }finally{await fs.rm(temporary,{recursive:true,force:true});}
}
module.exports={webRoot,inventory,exportWeb};
