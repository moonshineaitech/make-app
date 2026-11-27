const fs=require('node:fs/promises'),sync=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const exec=require('node:util').promisify(require('node:child_process').execFile);
async function hash(file){const h=crypto.createHash('sha256');for await(const b of sync.createReadStream(file))h.update(b);return h.digest('hex');}
async function main(){
 const base=path.resolve(__dirname,'..'),pkg=require('../package.json'),host=require('../src/platform.cjs').host(),system={win32:'Windows',darwin:'macOS',linux:'Linux'}[host.platform];
 const output=path.resolve(process.argv.find(a=>a.startsWith('--output='))?.slice(9)||path.join(base,'public-release'));
 const node=process.env.APPDOCK_PLUGIN_NODE,builder=process.env.APPDOCK_PLUGIN_BUILDER,asset=process.env.APPDOCK_CONVERTER_ASSET||builder;
 if(!node||!builder||!asset)throw new Error('Set APPDOCK_PLUGIN_NODE, APPDOCK_PLUGIN_BUILDER and (for macOS) APPDOCK_CONVERTER_ASSET.');
 await fs.mkdir(output,{recursive:true});const staging=await fs.mkdtemp(path.join(require('node:os').tmpdir(),'make-app-release-'));
 try{
  await require('./assemble-plugin.cjs').assemble({base,destination:path.join(staging,'marketplace'),node,builder});
  const cli='marketplace/plugins/make-app/scripts/make-app.cjs';
  if(host.platform==='win32'){
   await fs.writeFile(path.join(staging,'Make App.cmd'),['@echo off','"%~dp0marketplace\\plugins\\make-app\\bin\\node.exe" "%~dp0'+cli.replaceAll('/','\\')+'" %*','exit /b %ERRORLEVEL%',''].join('\r\n'));
   await fs.writeFile(path.join(staging,'Connect Coding Tool.cmd'),['@echo off','"%~dp0marketplace\\plugins\\make-app\\bin\\node.exe" "%~dp0'+cli.replaceAll('/','\\')+'" connect','set "result=%ERRORLEVEL%"','if not defined MAKE_APP_INSTALL_NO_PAUSE pause','exit /b %result%',''].join('\r\n'));
  }else{
   for(const [name,args]of [['make-app','"$@"'],['Connect Coding Tool.'+(host.platform==='darwin'?'command':'sh'),'connect']]){
    const file=path.join(staging,name);await fs.writeFile(file,['#!/bin/sh','set -eu','base=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)','exec "$base/marketplace/plugins/make-app/bin/node" "$base/'+cli+'" '+args,''].join('\n'));await fs.chmod(file,0o755);
   }
  }
  for(const operation of ['Install','Uninstall']){
   if(host.platform==='win32'){
    const text=['@echo off','setlocal','"%~dp0marketplace\\plugins\\make-app\\bin\\node.exe" "%~dp0marketplace\\plugins\\make-app\\scripts\\install.cjs" '+operation.toLowerCase(),'set "result=%ERRORLEVEL%"','if not defined MAKE_APP_INSTALL_NO_PAUSE pause','exit /b %result%',''].join('\r\n');
    await fs.writeFile(path.join(staging,operation+' Codex Plugin.cmd'),text);
   }else{
    const file=path.join(staging,operation+' Codex Plugin.'+(host.platform==='darwin'?'command':'sh'));
    const text=['#!/bin/sh','set -eu','base=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)','exec "$base/marketplace/plugins/make-app/bin/node" "$base/marketplace/plugins/make-app/scripts/install.cjs" '+operation.toLowerCase(),''].join('\n');
    await fs.writeFile(file,text);await fs.chmod(file,0o755);
   }
  }
  await fs.writeFile(path.join(staging,'START HERE.txt'),[
   `Make App ${pkg.version} — ${system} ${host.arch} preview`,'',
   'Extract this entire archive to a folder you will keep. Open the Install Codex Plugin script (Linux: run it from your file manager or terminal). Codex must already be installed. Open a new chat and ask: Make an app for this project.','',
   'Node and the converter are included. No administrator rights, global Node installation, manual MCP config or API key are required. Keep the folder in place while installed. Use the matching Uninstall script to remove this plugin.','',
   'Other coding tools: open Connect Coding Tool, choose your harness and project folder. Project-scoped adapters support Codex, Claude Code, Cursor, VS Code/Copilot, Gemini CLI and OpenCode. A generic MCP config and Make App command are included for other harnesses. No Codex installation is required for these paths.','',
   'Desktop outputs require their original project folder and a compatible desktop OS. Static web exports can be hosted over HTTPS for phones, tablets and browsers. They do not run server-side code.','',
   'This independent preview is unsigned and is not an approved OpenAI Directory listing.',''].join('\n'));
  const extension=host.platform==='win32'?'zip':'tar.gz',pluginName=`Make-App-Codex-Plugin-${system}-${host.arch}.${extension}`;
  const script=["import pathlib,sys,zipfile,tarfile","root=pathlib.Path(sys.argv[1])","if sys.argv[3]=='zip':"," with zipfile.ZipFile(sys.argv[2],'x',zipfile.ZIP_DEFLATED,compresslevel=6) as z:","  for p in root.rglob('*'):","   if p.is_file():z.write(p,p.relative_to(root))","else:"," with tarfile.open(sys.argv[2],'x:gz',dereference=False) as z:","  for p in root.iterdir():z.add(p,arcname=p.name)"].join('\n');
  await exec(process.env.APPDOCK_PYTHON||(host.platform==='win32'?'python':'python3'),['-c',script,staging,path.join(output,pluginName),extension]);
  const converterName=`Make-App-${system}-${host.arch}.`+(host.platform==='win32'?'exe':host.platform==='darwin'?'zip':'AppImage');
  await fs.copyFile(asset,path.join(output,converterName),sync.constants.COPYFILE_EXCL);
  const files=[];for(const name of [converterName,pluginName])files.push({name,bytes:(await fs.stat(path.join(output,name))).size,sha256:await hash(path.join(output,name))});
  if(await fs.stat(path.join(base,'qa/sbom.cdx.json')).catch(()=>null)){
   const name=`sbom-${host.platform}-${host.arch}.cdx.json`;await fs.copyFile(path.join(base,'qa/sbom.cdx.json'),path.join(output,name));files.push({name,bytes:(await fs.stat(path.join(output,name))).size,sha256:await hash(path.join(output,name))});
  }
  await fs.writeFile(path.join(output,`SHA256SUMS-${host.platform}-${host.arch}.txt`),files.map(f=>f.sha256+'  '+f.name).join('\n')+'\n');
  const coldFile=path.join(base,'qa',`cold-start-${host.platform}-${host.arch}.json`),desktopFile=path.join(base,'qa',`desktop-${host.platform}-${host.arch}.json`);
  const validation={desktop:await fs.readFile(desktopFile,'utf8').then(JSON.parse,()=>null),coldStart:await fs.readFile(coldFile,'utf8').then(JSON.parse,()=>null)};
  await fs.writeFile(path.join(output,`release-manifest-${host.platform}-${host.arch}.json`),JSON.stringify({version:pkg.version,platform:host.platform,arch:host.arch,unsignedPreview:true,desktopProjectFolderRequired:true,validation,files},null,2)+'\n');
  console.log(JSON.stringify({output,files}));
 }finally{await fs.rm(staging,{recursive:true,force:true});}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
