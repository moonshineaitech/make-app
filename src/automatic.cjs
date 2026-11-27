// Infer a launch plan from actual entry scripts. No configuration is written to the project.
const fs=require('node:fs/promises');const path=require('node:path');
const {record}=require('./projects.cjs');
async function read(file){try{return await fs.readFile(file,'utf8');}catch{return'';}}
async function exists(file){try{await fs.access(file);return true;}catch{return false;}}
function scriptKind(script,deps={}){
  if(/(?:^|[;&]\s*|\s)(?:electron(?:-forge)?|tauri)(?:\s|$)/.test(script))return'native';
  if(/\bvinext\s+(dev|start)\b/.test(script))return'vinext';
  if(/\bnext\s+(dev|start)\b/.test(script))return'next';
  if(/^(?:\w+=\S+\s+)*(?:npx\s+)?vite(?:\s|$)/.test(script))return'vite';
  return'node';
}
async function entryText(root,script){
 const queue=[...script.matchAll(/(?:[\w.-]+\/)*[\w.-]+\.(?:[cm]?js|tsx?|jsx)\b/g)].slice(0,4).map(match=>({file:path.resolve(root,match[0]),depth:0})),seen=new Set();let code='',bytes=0;
 while(queue.length&&seen.size<20){const {file,depth}=queue.shift(),relative=path.relative(root,file);if(relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative)||seen.has(file))continue;seen.add(file);let text='';try{const stat=await fs.lstat(file);if(!stat.isFile()||stat.size>1024*1024||bytes+stat.size>2*1024*1024)continue;text=await fs.readFile(file,'utf8');bytes+=stat.size;}catch{continue;}code+='\n'+text;if(depth>=2)continue;
 for(const match of text.matchAll(/(?:from\s*|import\s*\(\s*)['"](\.[^'"]+)['"]/g)){const base=path.resolve(path.dirname(file),match[1]);for(const suffix of path.extname(base)?['']:['.ts','.js','.mjs','/index.ts','/index.js'])if(await exists(base+suffix)){queue.push({file:base+suffix,depth:depth+1});break;}}
 }return code;
}
function healthCheck(code,port){const route=[...code.matchAll(/\.get\s*\(\s*['"](\/(?:readyz|healthz|api\/health|health))['"]/g)].map(match=>match[1]).sort((a,b)=>(a==='/readyz'?-1:b==='/readyz'?1:0))[0];if(!route)return null;const json=route==='/readyz'&&/\.json\(\s*\{\s*ready\b/.test(code)?{ready:true}:/\.json\(\s*\{\s*ok\s*:\s*true/.test(code)?{ok:true}:undefined;return{url:'http://127.0.0.1:'+port+route,status:200,...(json?{json}:{})};}
function dataVariables(code){return [...new Set([...code.matchAll(/process\.env\.([A-Z][A-Z0-9_]*_DATA_DIR)\b/g)].map(match=>match[1]))];}
function envPorts(code){const env={};for(const match of code.matchAll(/process\.env\.([A-Z][A-Z0-9_]*PORT)\b/g))env[match[1]]='{port}';return env;}
function directScript(script){if(/[;&|<>\r\n]/.test(script))return null;const parts=(script.match(/"[^"]*"|'[^']*'|\S+/g)||[]).map(p=>p.replace(/^(["'])(.*)\1$/,'$2'));if(parts[0]==='tsx'){parts.shift();if(parts[0]==='watch')parts.shift();return['node','node_modules/tsx/dist/cli.mjs',...parts.filter(p=>!p.startsWith('--clear-screen'))];}if(parts[0]==='node')return parts.filter(p=>p!=='--watch'&&!p.startsWith('--watch-path'));return null;}
async function workspaces(root,pkg){let declared=pkg.workspaces;if(!declared){const yaml=await read(path.join(root,'pnpm-workspace.yaml')),block=/^packages:\s*\r?\n((?:[ \t]+[^\n]*\n?)*)/m.exec(yaml)?.[1]||'';declared=[...block.matchAll(/^\s*-\s*['\"]?([^'\"#\r\n]+)['\"]?\s*$/gm)].map(match=>match[1].trim());}const patterns=Array.isArray(declared)?declared:declared?.packages||[];const result=[];for(const pattern of patterns){if(typeof pattern!=='string'||pattern.includes('..'))continue;if(pattern.endsWith('/*')){const parent=pattern.slice(0,-2);try{for(const entry of await fs.readdir(path.join(root,parent),{withFileTypes:true}))if(entry.isDirectory())result.push(path.join(parent,entry.name));}catch{}}else if(!pattern.includes('*'))result.push(pattern);}return result.filter((v,i,a)=>a.indexOf(v)===i).slice(0,20);}
function runtimeMajor(pkg,versionFile){const match=String(versionFile||'').trim().match(/^v?(\d+)(?:\.|$)/);if(match)return Number(match[1]);const range=pkg.engines?.node||'';if(/^\s*(?:\^|~)?(\d+)(?:\.x|\.\d+|$)/.test(range)&&!range.includes('||'))return Number(range.match(/\d+/)[0]);const minimum=range.match(/>=\s*(\d+)/);return minimum?Math.max(24,Number(minimum[1])):24;}
async function inferInternal(root){
  if(await exists(path.join(root,'appdock.json')))return null;
  const raw=await read(path.join(root,'package.json'));if(!raw)return null;const pkg=JSON.parse(raw),scripts=pkg.scripts||{},deps={...pkg.dependencies,...pkg.devDependencies};
  const script=scripts.dev?'dev':scripts.start?'start':scripts.serve?'serve':null;if(!script)return null;
  if(/python3?\s+-m\s+http\.server/.test(scripts[script])&&await exists(path.join(root,'index.html')))return{kind:'static',source:root,root,entry:'index.html',name:pkg.name||path.basename(root),label:'Static app',automatic:true};
  const pm=await require('./package-managers.cjs').specification(root,pkg),manager=pm.manager;const major=runtimeMajor(pkg,await read(path.join(root,'.nvmrc'))||await read(path.join(root,'.node-version')));
  const npmSetup=['npm',...require('./package-managers.cjs').setup(pm).slice(1)];
  const metadata={language:deps.typescript||/\b(?:tsx|ts-node|tsc)\b|\.(?:ts|tsx)\b/.test(scripts[script])?'typescript':'javascript',nodeMajor:major,packageManager:manager,automatic:true,evidence:['package.json scripts.'+script],nodeRange:pkg.engines?.node||'>=20'};
  const folders=await workspaces(root,pkg),children=[];
  for(const folder of folders){const content=await read(path.join(root,folder,'package.json'));if(!content)continue;const child=JSON.parse(content),name=child.scripts?.dev?'dev':child.scripts?.start?'start':null;if(name)children.push({folder,pkg:child,script:name,kind:scriptKind(child.scripts[name],{...child.dependencies,...child.devDependencies})});}
  if(children.length>1&&children.some(c=>c.kind==='vite'||c.kind==='next'||c.kind==='vinext')){
    const frontend=children.find(c=>['vite','next','vinext'].includes(c.kind));const backends=children.filter(c=>c!==frontend);const services=[];const aliases={};
    for(const child of backends){const id=child.folder.replace(/[^A-Za-z0-9_-]/g,'_'),code=await entryText(path.join(root,child.folder),child.pkg.scripts[child.script]);const fixed=code.match(/(?:process\.env\.PORT\s*\)?\s*\|\|\s*|listen\(\s*)(\d{4,5})/);if(fixed)aliases[fixed[1]]=id;
      const direct=manager==='yarn'?null:directScript(child.pkg.scripts[child.script]);services.push({id,command:direct||['npm','run',child.script,'--workspace',child.folder],...(direct?{cwd:child.folder}:{}),env:{NODE_ENV:'development',...Object.fromEntries(dataVariables(code).map(k=>[k,`{env.APPDOCK_PROJECT_DATA}/${id}`])),...Object.fromEntries(Object.keys(envPorts(code)).map(k=>[k,`{ports.${id}}`]))},ready:healthCheck(code,`{ports.${id}}`)||{tcp:`{ports.${id}}`}});
    }
    const id=frontend.folder.replace(/[^A-Za-z0-9_-]/g,'_'),config=await read(path.join(root,frontend.folder,'vite.config.ts'))||await read(path.join(root,frontend.folder,'vite.config.js'));
    // Match each local proxy target to the backend's declared default port.
    for(const match of config.matchAll(/https?:\/\/(?:localhost|127\.0\.0\.1):(\d{4,5})/g))if(!aliases[match[1]]&&backends.length===1)aliases[match[1]]=services[0].id;
    const env={};for(const [fixed,backend]of Object.entries(aliases))env['APPDOCK_PROXY_'+fixed]=`http://127.0.0.1:{ports.${backend}}`;
    const command=['npm','run',frontend.script,'--workspace',frontend.folder,'--',...(frontend.kind==='next'?['--hostname','127.0.0.1','--port',`{ports.${id}}`]:['--host','127.0.0.1','--port',`{ports.${id}}`]),...(frontend.kind==='vite'?['--config',`{root}/.appdock/vite-${id}.mjs`]:[])];
    services.push({id,command,env,dependsOn:backends.map(c=>c.folder.replace(/[^A-Za-z0-9_-]/g,'_')),ready:{url:`http://127.0.0.1:{ports.${id}}`}});
    return{...record(root,{name:path.basename(root),mode:'web',requirements:['node','npm'],setup:[npmSetup],services,url:`http://127.0.0.1:{ports.${id}}`,notes:['Workspace servers and frontend are inferred from package.json and their local proxy configuration.']},'Full-stack workspace'),...metadata,workspaceFolders:children.map(c=>c.folder),wrappers:[{id,folder:frontend.folder}],evidence:[...metadata.evidence,'package.json workspaces','frontend proxy targets']};
  }
  const kind=scriptKind(scripts[script],deps),code=await entryText(root,scripts[script]),config=await read(path.join(root,'vite.config.ts'))||await read(path.join(root,'vite.config.js'));
  const env={NODE_ENV:'development',...Object.fromEntries(dataVariables(code).map(k=>[k,'{env.APPDOCK_PROJECT_DATA}/app'])),...envPorts(code)};metadata.managedDataVariables=dataVariables(code);
  for(const match of config.matchAll(/process\.env\.([A-Z][A-Z0-9_]*(?:NODE_PREVIEW|LOCAL_PREVIEW))\s*===\s*["']1["']/g)){env[match[1]]='1';metadata.evidence.push('vite.config: '+match[1]+' local preview');}
  let command=['npm','run',script];
  if(kind==='node'&&manager!=='yarn')command=directScript(scripts[script])||command;
  if(kind==='next'||kind==='vinext')command.push('--','--hostname','127.0.0.1','--port','{port}');
  if(kind==='vite')command.push('--','--host','127.0.0.1','--port','{port}');
  const cli=pkg.bin||/\b(?:commander|yargs|readline)\b|process\.argv|console\.(?:log|error)/.test(code)&&!/(?:\.listen\s*\(|createServer\s*\(|\bexpress\s*\()/i.test(code);
  const mode=kind==='native'?'native':kind==='node'&&cli?'tool':'web';
  const result=record(root,{name:path.basename(root),mode,terminal:mode==='tool'&&Object.keys(deps).some(name=>['ink','blessed','neo-blessed','terminal-kit'].includes(name)),requirements:['node','npm'],setup:[npmSetup],verify:healthCheck(code,'{port}')?[healthCheck(code,'{port}')]:[],build:(pkg.bin&&scripts.build||script==='start'&&['next','vinext'].includes(kind)&&scripts.build)?[['npm','run','build']]:[],run:{command,env},notes:['Launch command is inferred from the actual package script, rather than dependency names.']},kind==='native'?(deps.electron?'Electron desktop app':'Native desktop project'):kind==='node'?(mode==='tool'?'Node command-line app':'Node server'):kind==='vinext'?'Vinext app':kind==='next'?'Next.js app':'Vite app');
  return{...result,...metadata,framework:kind};
}
async function infer(root){const result=await inferInternal(root);if(!result?.plan)return result;const pkg=JSON.parse(await read(path.join(root,'package.json')));const code=await entryText(root,Object.values(pkg.scripts||{}).join(' ')),configuration=(await read(path.join(root,'.npmrc')))+'\n'+(await read(path.join(root,'.yarnrc.yml')));result.requestedEnvironmentNames=[...new Set([...code.matchAll(/process\.env(?:\.([A-Z][A-Z0-9_]*)|\[['"]([A-Z][A-Z0-9_]*)['"]\])/g)].map(match=>match[1]||match[2]).concat([...configuration.matchAll(/\$\{([A-Z][A-Z0-9_]*)\}/g)].map(match=>match[1])))];return require('./package-managers.cjs').adapt(result,await require('./package-managers.cjs').specification(root,pkg));}
module.exports={infer,scriptKind,runtimeMajor,envPorts};
