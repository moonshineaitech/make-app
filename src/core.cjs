const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const ignored = new Set(['node_modules', '.git', '.next', '.cache', 'coverage', '.DS_Store', '.venv', 'venv', '__pycache__', '.pytest_cache', '.appdock', 'target', 'bin', 'obj', '.gradle', 'Library', 'Temp', 'Logs', '.godot', 'outputs', 'work', 'release', 'marketing', '.wrangler', '.vercel', '.tools', '.data', '.canvas', '.pnpm-store', 'dist']);

function inside(root, target) {
  const rel = path.relative(root, target);
  return rel === '' || (!rel.startsWith('..' + path.sep) && rel !== '..' && !path.isAbsolute(rel));
}
async function resolveAsset(root, urlPath, spa = false) {
  const realRoot = await fs.realpath(root);
  let decoded;
  try { decoded = decodeURIComponent(urlPath); } catch { throw new Error('Invalid URL encoding'); }
  if (decoded.includes('\0') || decoded.includes('\\')) throw new Error('Invalid path');
  let target = path.resolve(realRoot, '.' + (decoded.startsWith('/') ? decoded : '/' + decoded));
  if (!inside(realRoot, target)) throw new Error('Path escapes project');
  try {
    if ((await fs.stat(target)).isDirectory()) target = path.join(target, 'index.html');
    target = await fs.realpath(target);
  } catch (error) {
    if (spa && !path.extname(decoded)) target = await fs.realpath(path.join(realRoot, 'index.html'));
    else throw error;
  }
  if (!inside(realRoot, target)) throw new Error('Symbolic link escapes project');
  return target;
}
function safeUrl(value) {
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('Use an http or https URL without embedded credentials.');
  return url.href;
}
function safeName(value) { const name=String(value).replace(/[<>:"/\\|?*\x00-\x1f]/g, '').replace(/[. ]+$/g, '').slice(0, 70);return !name||/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\.|$)/i.test(name)?'My app':name; }
async function exists(p) { try { await fs.access(p); return true; } catch { return false; } }
async function detectInternal(input,options={}) {
  const source = await fs.realpath(input);
  const stat = await fs.stat(source);
  if (stat.isFile()) {
    const language=await require('./languages.cjs').single(source);if(language)return language;
    if(/\.ipynb$/i.test(source)){
      const interpreter=process.platform==='win32'?'{root}/.appdock/notebook/Scripts/python.exe':'{root}/.appdock/notebook/bin/python';
      return{...require('./projects.cjs').record(path.dirname(source),{name:path.basename(source,'.ipynb'),mode:'tool',requirements:['python'],setup:[['python','-m','venv','.appdock/notebook'],[interpreter,'-m','pip','install','nbconvert','ipykernel']],run:[interpreter,'-m','jupyter','nbconvert','--execute','--to','notebook',path.basename(source),'--output','executed.ipynb','--output-dir','.appdock'],notes:['Executes the notebook and writes .appdock/executed.ipynb. Add the notebook’s Python dependencies to its setup tasks. This is a notebook execution runner; it is not a notebook editor.']},'Jupyter notebook runner'),source};
    }
    if(/\.(exe|jar|rb|r|ps1|sh)$/i.test(source)){
      const ext=path.extname(source).toLowerCase();const interpreter={'.jar':'java','.rb':'ruby','.r':'Rscript','.ps1':'pwsh','.sh':'bash'}[ext];
      const command=ext==='.exe'?['{root}/'+path.basename(source)]:ext==='.jar'?['java','-jar',path.basename(source)]:ext==='.ps1'?['pwsh','-NoProfile','-File',path.basename(source)]:[interpreter,path.basename(source)];
      return {...require('./projects.cjs').record(path.dirname(source),{name:path.basename(source,ext),mode:ext==='.exe'?'native':'tool',requirements:interpreter?[interpreter]:[],run:command},ext==='.exe'?'Native executable':'Script / program'),source};
    }
    if(/\.(py|js|mjs|cjs)$/i.test(source))return{kind:'tool',framework:/\.py$/i.test(source)?'python':'node',source,root:path.dirname(source),entry:path.basename(source),name:path.basename(source,path.extname(source)),label:/\.py$/i.test(source)?'Python desktop tool':'Node desktop tool',needsInstall:false};
    if (!/\.html?$/i.test(source)) throw new Error('Choose an HTML file, Python/Node script, or a project folder.');
    return {kind:'static', source, root:path.dirname(source), entry:path.basename(source), name:path.basename(source, path.extname(source)), label:'HTML app'};
  }
  const automatic=await require('./automatic.cjs').infer(source);if(automatic)return automatic;
  const recognized=await require('./projects.cjs').discover(source,{shallow:true,...options});if(recognized)return recognized;
  const manifestPath=path.join(source,'appdock.json');
  if(await exists(manifestPath)){
    const manifest=JSON.parse(await fs.readFile(manifestPath,'utf8'));
    if(!Array.isArray(manifest.command)||!manifest.command.length||manifest.command.some(x=>typeof x!=='string'||x.includes('\0')))throw new Error('appdock.json needs a command array, such as ["python", "server.py"].');
    if(manifest.install&&(!Array.isArray(manifest.install)||!manifest.install.length||manifest.install.some(x=>typeof x!=='string'||x.includes('\0'))))throw new Error('appdock.json install must be an argument array.');
    if(manifest.mode==='console')return{kind:'tool',framework:'custom',source,root:source,name:manifest.name||path.basename(source),label:'Command-line desktop tool',command:manifest.command,install:manifest.install||null,needsInstall:false};
    const url=manifest.url||'http://127.0.0.1:{port}';
    const checked=new URL(url.replaceAll('{port}','43123'));
    if(checked.protocol!=='http:'||!['localhost','127.0.0.1','[::1]'].includes(checked.hostname))throw new Error('Custom runtimes must expose an http URL on localhost.');
    return{kind:'runtime',framework:'custom',source,root:source,name:manifest.name||path.basename(source),label:'Custom project',command:manifest.command,install:manifest.install||null,url,needsInstall:false};
  }
  const packagePath = path.join(source, 'package.json');
  if (await exists(packagePath)) {
    const pkg = JSON.parse(await fs.readFile(packagePath, 'utf8'));
    const deps = {...pkg.dependencies, ...pkg.devDependencies};
    const script = pkg.scripts?.dev ? 'dev' : pkg.scripts?.start ? 'start' : null;
    if (script && (deps.vite || deps.next)) return {kind:'node', source, root:source, name:pkg.name || path.basename(source), label:deps.next ? 'Next.js project' : 'Vite project', framework:deps.next ? 'next' : 'vite', script, command:`npm run ${script}`, needsInstall:!(await exists(path.join(source,'node_modules')))};
    if (await exists(path.join(source, 'dist', 'index.html'))) return {kind:'static', source, root:path.join(source,'dist'), entry:'index.html', name:pkg.name || path.basename(source), label:'Built web app'};
    if (script) return{kind:'runtime',framework:'node',source,root:source,name:pkg.name||path.basename(source),label:'Node.js project',script,command:['npm','run',script],url:'http://127.0.0.1:{port}',install:['npm','install'],needsInstall:!(await exists(path.join(source,'node_modules')))};
  }
  const candidates=['app.py','main.py','streamlit_app.py','server.py','wsgi.py'];
  for(const filename of candidates){
    if(!(await exists(path.join(source,filename))))continue;
    const code=await fs.readFile(path.join(source,filename),'utf8');
    let framework;
    if(/(?:from\s+streamlit\b|import\s+streamlit\b)/.test(code))framework='streamlit';
    else if(/(?:from\s+flask\b|import\s+flask\b)/.test(code))framework='flask';
    else if(/(?:from\s+fastapi\b|import\s+fastapi\b)/.test(code))framework='fastapi';
    else if(/(?:from\s+gradio\b|import\s+gradio\b)/.test(code))framework='gradio';
    if(framework)return{kind:'python',framework,source,root:source,entry:filename,name:path.basename(source),label:`Python · ${framework[0].toUpperCase()+framework.slice(1)}`,command:`python ${filename}`,needsInstall:!(await exists(path.join(source,'.venv')))};
  }
  if (await exists(path.join(source, 'index.html'))) return {kind:'static', source, root:source, entry:'index.html', name:path.basename(source), label:'Static web app'};
  for(const filename of ['main.py','app.py','main.js','index.js'])if(await exists(path.join(source,filename)))return{kind:'tool',framework:filename.endsWith('.py')?'python':'node',source,root:source,entry:filename,name:path.basename(source),label:filename.endsWith('.py')?'Python desktop tool':'Node desktop tool',needsInstall:false};
  // Codex games often use game.html or a named HTML entry instead of index.html.
  const localEntries=await fs.readdir(source,{withFileTypes:true});
  const html=localEntries.filter(e=>e.isFile()&&/\.html?$/i.test(e.name)).map(e=>e.name).sort();
  if(html.length===1)return{kind:'static',source,root:source,entry:html[0],name:path.basename(source),label:'HTML game / app'};
  if(html.length>1)return{kind:'selection',source,root:source,name:path.basename(source),label:'HTML games / apps',candidates:html.map(name=>({path:path.join(source,name),name:path.basename(name,path.extname(name)),label:'HTML entry point'}))};
  const workspace=await require('./projects.cjs').discover(source,options);if(workspace)return workspace;
  // Keep all neighbouring data/PCK/DLL files when wrapping an exported game.
  if(process.platform==='win32'){
    let games=localEntries.filter(e=>e.isFile()&&/\.exe$/i.test(e.name)&&!/^(?:unins\d*|uninstall|setup|crashpad_handler|UnityCrashHandler\d*|update)(?:\.|$)/i.test(e.name)).map(e=>e.name).sort();
    const nativeGames=games.filter(name=>localEntries.some(e=>e.name.toLowerCase()===(path.basename(name,'.exe')+'.pck').toLowerCase()||e.name.toLowerCase()===(path.basename(name,'.exe')+'_Data').toLowerCase()));if(nativeGames.length)games=nativeGames;
    if(games.length===1)return detectInternal(path.join(source,games[0]),options);
    if(games.length>1)return{kind:'selection',source,root:source,name:path.basename(source),label:'Native games / apps',candidates:games.map(name=>({path:path.join(source,name),name:path.basename(name,'.exe'),label:'Windows executable'}))};
  }
  return require('./projects.cjs').record(source,{mode:'tool',configured:false,run:['your-runtime','your-entrypoint'],requirements:[],notes:['No automatic entry point was found. Set the actual build and run commands in the launch plan before running.']},'Configure project');
}
async function detect(input,options={}){let record=await detectInternal(input,options);if(record.plan?.configured===false)record=await require('./adapters.cjs').discover(record.root,options.adapterDirectory)||record;record.executionSummary=require('./execution-plan.cjs').describe(record);return record;}
async function fingerprint(root, { cache = false, cacheRoot, signal, onStats } = {}) {
  root=await fs.realpath(root);const content=await require('./fingerprint-cache.cjs').open(root,{enabled:cache,cacheRoot,signal});
  const rootNames=await fs.readdir(root),generated=new Set([...(rootNames.includes('Cargo.toml')?['target']:[]),...(rootNames.some(n=>/\.(?:csproj|fsproj|vbproj)$/.test(n))?['bin','obj']:[])]);const hash = crypto.createHash('sha256'); let count=0;
  async function walk(dir) {
    const entries = (await fs.readdir(dir, {withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name));
    for (const entry of entries) {
      if ((ignored.has(entry.name)&&!['bin','obj','target','dist'].includes(entry.name)) || (dir===root&&generated.has(entry.name)) || entry.name.startsWith('.env') || entry.name.endsWith('.log')) continue;
      if (++count > 100000) throw new Error('Project exceeds 100,000 source files. Import a specific subproject or compiled output.');
      const full = path.join(dir,entry.name);
      signal?.throwIfAborted();hash.update(entry.isSymbolicLink()?'L':entry.isDirectory()?'D':entry.isFile()?'F':'?');const relative=path.relative(root,full);hash.update(String(Buffer.byteLength(relative))+':'+relative+'\0');
      if (entry.isSymbolicLink()) { hash.update(await fs.readlink(full)); continue; }
      if (entry.isDirectory()) await walk(full);
      else if(entry.isFile())hash.update(await content.digest(full,relative));else throw new Error('Unsupported source entry: '+relative);
    }
  }
  await walk(root);await content.finish();onStats?.(content.stats);return hash.digest('hex');
}
module.exports={inside,resolveAsset,safeUrl,safeName,detect,fingerprint};
