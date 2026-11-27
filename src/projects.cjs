// Project recipes are data. Detection never executes imported project code.
const fs=require('node:fs/promises');
const path=require('node:path');
const ids=/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/;
const modes=new Set(['web','native','tool','worker']);
async function exists(p){try{await fs.access(p);return true;}catch{return false;}}
function command(value,label){if(!Array.isArray(value)||!value.length||value.length>200||value.some(v=>typeof v!=='string'||!v||v.includes('\0')))throw new Error(`${label} must be an executable-and-arguments array.`);return value;}
function task(value,label){if(Array.isArray(value))value={command:value};if(!value||typeof value!=='object')throw new Error(`${label} must be a task.`);command(value.command,label);const cwd=value.cwd||'.';if(path.isAbsolute(cwd)||cwd.split(/[\\/]/).includes('..'))throw new Error(`${label} working directory must stay inside the project.`);if(value.env&&Object.entries(value.env).some(([k,v])=>!/^[_A-Za-z][_A-Za-z0-9]*$/.test(k)||typeof v!=='string'||v.includes('\0')))throw new Error(`${label} environment values must be strings.`);return{...value,cwd};}
function localUrl(value){const u=new URL(value.replace(/\{[^}]+\}/g,'43123'));if(u.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(u.hostname))throw new Error('Project URLs must use loopback HTTP.');return value;}
function validate(input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Project recipe must be an object.');
  if(input.terminal!==undefined&&typeof input.terminal!=='boolean')throw new Error('Terminal must be a boolean.');
  const mode=input.mode||'web';if(!modes.has(mode))throw new Error('Mode must be web, native, tool, or worker.');
  const result={...input,schemaVersion:2,mode,setup:(input.setup||[]).map((t,i)=>task(t,`setup[${i}]`)),build:(input.build||[]).map((t,i)=>task(t,`build[${i}]`)),services:(input.services||[]).map((t,i)=>{if(!ids.test(t.id||''))throw new Error('Each service needs a simple unique id.');const service={...task(t,`service ${t.id}`),dependsOn:t.dependsOn||[]};if(service.ready)require('./readiness.cjs').validate(service.ready,localUrl);return service;}),requirements:input.requirements||[],requiredEnv:input.requiredEnv||[]};
  result.verify=(input.verify||[]).map(check=>require('./readiness.cjs').validate(check,localUrl));if(result.verify.length>20)throw new Error('Limit verification to 20 checks.');
  if(input.limits){if(!input.limits||typeof input.limits!=='object'||Array.isArray(input.limits))throw new Error('Resource limits must be an object.');for(const [name,value]of Object.entries(input.limits)){const range={memoryMB:[32,1048576],processes:[1,4096],cpuPercent:[1,100]}[name];if(!range||!Number.isInteger(value)||value<range[0]||value>range[1])throw new Error('Invalid resource limit: '+name);}}
  if(result.services.length>20)throw new Error('Limit a project to 20 managed services.');
  if(result.run)result.run=task(result.run,'run');
  result.stop=(input.stop||[]).map((t,i)=>task(t,`stop[${i}]`));
  if(!result.run&&!result.services.length)throw new Error('A recipe needs a run task or one or more services.');
  if(mode==='web')result.url=localUrl(input.url||'http://127.0.0.1:{port}');
  if(result.requirements.some(x=>typeof x!=='string'||!/^[-A-Za-z0-9_.]+$/.test(x)))throw new Error('Requirements must be executable names.');
  if(result.requiredEnv.some(x=>typeof x!=='string'||!/^[_A-Za-z][_A-Za-z0-9]*$/.test(x)))throw new Error('Required environment entries must be variable names.');
  const seen=new Set();for(const s of result.services){if(seen.has(s.id))throw new Error('Duplicate service id: '+s.id);seen.add(s.id);}
  const done=new Set(),visiting=new Set();function visit(s){if(done.has(s.id))return;if(visiting.has(s.id))throw new Error('Service dependency cycle at '+s.id);visiting.add(s.id);for(const dep of s.dependsOn){const target=result.services.find(x=>x.id===dep);if(!target)throw new Error('Unknown service dependency: '+dep);visit(target);}visiting.delete(s.id);done.add(s.id);}result.services.forEach(visit);
  return result;
}
function record(root,plan,label,profile='default') {plan=validate(plan);return{kind:'project',framework:'recipe',source:root,root,name:plan.name||path.basename(root),label,profile,plan,command:plan.run?.command||plan.services[0]?.command,needsInstall:plan.setup.length>0};}
async function packageManager(root,pkg){const manager=(pkg.packageManager||'').split('@')[0];if(manager==='pnpm'||await exists(path.join(root,'pnpm-lock.yaml')))return'pnpm';if(manager==='yarn'||await exists(path.join(root,'yarn.lock')))return'yarn';if(manager==='bun'||await exists(path.join(root,'bun.lock')))return'bun';return'npm';}
async function discover(root,{shallow=false,target}={}){
  const entries=await fs.readdir(root,{withFileTypes:true});const names=entries.map(e=>e.name);
  const read=async name=>fs.readFile(path.join(root,name),'utf8');
  const manifest=names.includes('appdock.json')?JSON.parse(await read('appdock.json')):null;
  if(manifest?.schemaVersion===2)return record(root,manifest,'Project recipe');
  if(manifest)return null; // Legacy manifest stays compatible.
  const language=await require('./languages.cjs').discover(root,{names,target});if(language)return language;
  const xcode=names.find(n=>n.endsWith('.xcodeproj')||n.endsWith('.xcworkspace'));
  if(xcode)return record(root,{mode:'tool',requirements:['xcodebuild'],run:['xcodebuild',xcode.endsWith('.xcworkspace')?'-workspace':'-project',xcode,'build'],notes:['Apple targets require macOS and the appropriate Xcode SDK. A Windows host cannot launch an iOS or macOS-only app.']},'Apple / Xcode target');
  if(names.includes('project.godot'))return record(root,{mode:'native',requirements:['godot'],run:['godot','--path','.']},'Godot game');
  const unity=names.includes('Assets')&&names.includes('ProjectSettings');
  if(unity)return record(root,{mode:'native',requirements:['Unity'],run:['Unity','-projectPath','{root}'],notes:['Unity must be on PATH or the run command must point to your Unity editor executable.']},'Unity project');
  let pkg;if(names.includes('package.json'))pkg=JSON.parse(await read('package.json'));
  if(pkg){
    const deps={...pkg.dependencies,...pkg.devDependencies},pm=await packageManager(root,pkg),setup=[[pm,'install']],requirements=[pm,'node'];
    if(deps.electron||deps['electron-forge']||deps['@electron-forge/cli']){
      const script=pkg.scripts?.start?'start':pkg.scripts?.dev?'dev':null;
      if(script)return record(root,{name:pkg.name,mode:'native',requirements,setup,run:[pm,'run',script]},'Electron desktop app');
    }
    if(names.includes('src-tauri')||deps['@tauri-apps/cli'])return record(root,{name:pkg.name,mode:'native',requirements:[...requirements,'cargo'],setup,run:pkg.scripts?.tauri?[pm,'run','tauri','dev']:[pm,'exec','tauri','dev']},'Tauri desktop app');
    if(deps.expo)return record(root,{name:pkg.name,mode:'web',requirements,setup,run:[pm,'exec','expo','start','--web','--port','{port}'],notes:['Runs the Expo web target. Device-only native modules need an Android/iOS build.']},'Expo web target');
    if(pkg.scripts?.start&&/(electron|tauri)/i.test(pkg.scripts.start))return record(root,{name:pkg.name,mode:'native',requirements,setup,run:[pm,'run','start']},'Desktop project');
    if(pkg.bin&&!pkg.scripts?.dev){const bin=typeof pkg.bin==='string'?pkg.bin:Object.values(pkg.bin)[0];if(typeof bin==='string')return record(root,{name:pkg.name,mode:'tool',requirements,setup,run:['node',bin]},'Node command-line tool');}
  }
  if(names.includes('manifest.json')){
    const extension=JSON.parse(await read('manifest.json'));
    if(extension.manifest_version){const chrome=process.platform==='win32'?path.join(process.env.ProgramFiles||'C:/Program Files','Google','Chrome','Application','chrome.exe'):'google-chrome';return record(root,{name:extension.name,mode:'native',requirements:process.platform==='win32'?[]:[chrome],run:[chrome,'--user-data-dir={root}/.appdock/chrome-profile','--load-extension={root}','--no-first-run','about:blank'],notes:['Launches an unpacked extension in a separate browser profile. Import the compiled extension folder if its source needs bundling. Chrome must be installed at the configured executable path.']},'Browser extension');}
  }
  const csproj=names.find(n=>n.endsWith('.csproj')||n.endsWith('.fsproj')||n.endsWith('.vbproj'));
  if(csproj){const xml=await read(csproj),web=/Microsoft\.NET\.Sdk\.Web/.test(xml),native=/<Use(WPF|WindowsForms)>true<\//i.test(xml)||/<OutputType>WinExe<\//i.test(xml);return record(root,{name:path.basename(csproj,path.extname(csproj)),mode:web?'web':native?'native':'tool',requirements:['dotnet'],setup:[['dotnet','restore',csproj]],build:[['dotnet','build',csproj,'--configuration','Release','--no-restore']],run:{command:['dotnet','run','--project',csproj,'--configuration','Release','--no-build','--no-launch-profile'],env:{ASPNETCORE_URLS:'http://127.0.0.1:{port}',DOTNET_NOLOGO:'1'}},notes:web?[]:['Desktop GUI projects keep their original native window.']},web?'ASP.NET service':native?'.NET desktop app':'.NET command-line app');}
  if(names.includes('Cargo.toml')){
    const toml=await read('Cargo.toml'),native=/\b(eframe|iced|slint|tauri|bevy|winit|macroquad)\b/.test(toml),web=/\b(axum|actix-web|rocket|warp)\b/.test(toml);
    return record(root,{mode:native?'native':web?'web':'tool',requirements:['cargo'],setup:[['cargo','fetch']],build:[['cargo','build','--release']],run:['cargo','run','--release','--'],notes:web?['Server must honor PORT and HOST, or customize the URL and run command.']:[]},native?'Rust desktop / game':web?'Rust service':'Rust command-line app');
  }
  if(names.includes('go.mod')){
    const goFiles=names.filter(n=>n.endsWith('.go'));let code='';for(const file of goFiles.slice(0,10))code+=await read(file);
    const native=/fyne\.io|wails\/|ebiten\/|gio\.org/.test(code),web=/net\/http|gin-gonic|gofiber|labstack\/echo/.test(code);
    return record(root,{mode:native?'native':web?'web':'tool',requirements:['go'],setup:[['go','mod','download']],build:[['go','build','./...']],run:['go','run','.'],notes:web?['Server must honor PORT / HOST or customize its run recipe.']:[]},native?'Go desktop / game':web?'Go service':'Go command-line app');
  }
  if(names.includes('pom.xml')){
    const xml=await read('pom.xml');if(/spring-boot/.test(xml))return record(root,{mode:'web',requirements:['java','mvn'],setup:[['mvn','dependency:resolve']],run:['mvn','spring-boot:run','-Dspring-boot.run.arguments=--server.address=127.0.0.1 --server.port={port}']},'Java / Spring Boot');
    return record(root,{mode:'tool',requirements:['java','mvn'],setup:[['mvn','dependency:resolve']],build:[['mvn','package','-DskipTests']],run:['mvn','exec:java'],notes:['Configure the exec plugin main class in pom.xml or edit the run recipe.']},'Java / Maven');
  }
  const gradle=names.find(n=>['build.gradle','build.gradle.kts'].includes(n));
  if(gradle){const code=await read(gradle),web=/org\.springframework\.boot/.test(code);return record(root,{mode:web?'web':'tool',requirements:['java','gradle'],setup:[['gradle','classes']],build:[['gradle','build','-x','test']],run:web?['gradle','bootRun','--args=--server.address=127.0.0.1 --server.port={port}']:['gradle','run'],notes:['Requires Gradle on PATH; edit the recipe to use your project wrapper if preferred.']},web?'Java / Spring Boot':'Java / Gradle');}
  if(names.includes('CMakeLists.txt')){const cmake=await read('CMakeLists.txt'),target=/add_executable\(\s*([\w-]+)/i.exec(cmake)?.[1];if(target)return record(root,{mode:'native',requirements:['cmake'],setup:[['cmake','-S','.','-B','.appdock/build']],build:[['cmake','--build','.appdock/build','--config','Release']],run:[process.platform==='win32'?`.appdock/build/Release/${target}.exe`:`.appdock/build/${target}`],notes:['Requires a compatible C/C++ compiler. Adjust the executable path for a single-config generator.']},'C / C++ native project');}
  for(const file of ['app.py','main.py','server.py'])if(names.includes(file)){
    const code=await read(file);if(/(?:import\s+(?:tkinter|PySide\w*|PyQt\w*|pygame|kivy|customtkinter)\b|from\s+(?:tkinter|PySide\w*|PyQt\w*|pygame|kivy|customtkinter)\b)/.test(code)){
      const hasRequirements=await exists(path.join(root,'requirements.txt')),hasPackage=names.includes('pyproject.toml'),interpreter=process.platform==='win32'?'{root}/.appdock/python/Scripts/python.exe':'{root}/.appdock/python/bin/python';
      return record(root,{mode:'native',requirements:['python'],setup:hasRequirements||hasPackage?[['python','-m','venv','.appdock/python'],[interpreter,'-m','pip','install',...(hasRequirements?['-r','requirements.txt']:['.'])]]:[],run:[hasRequirements||hasPackage?interpreter:'python',file]},'Python desktop / game');
    }
  }
  if(names.includes('manage.py'))return record(root,{mode:'web',requirements:['python'],setup:await exists(path.join(root,'requirements.txt'))?[['python','-m','pip','install','-r','requirements.txt']]:[],run:['python','manage.py','runserver','127.0.0.1:{port}','--noreload']},'Django project');
  const compose=names.find(n=>['compose.yaml','compose.yml','docker-compose.yml','docker-compose.yaml'].includes(n));
  if(compose)return record(root,{mode:'worker',requirements:['docker'],setup:[],run:['docker','compose','-p','appdock-{appId}','-f',compose,'up','--build'],stop:[['docker','compose','-p','appdock-{appId}','-f',compose,'stop']],notes:['Starts the complete Compose stack. Add url and change mode to web to open its published interface. Stopping preserves containers and volumes.']},'Docker Compose stack');
  if(!shallow){
    const roots=entries.filter(e=>e.isDirectory()&&!['node_modules','.git','.venv','venv','dist','build','target','outputs','work'].includes(e.name));
    const children=[];
    for(const folder of roots.slice(0,30)){const candidate=path.join(root,folder.name);const recognized=await discover(candidate,{shallow:true});if(recognized)children.push({folder:folder.name,record:recognized});else if(await exists(path.join(candidate,'package.json'))||await exists(path.join(candidate,'requirements.txt')))children.push({folder:folder.name,record:null});}
    if(children.length){return{kind:'selection',source:root,root,name:path.basename(root),label:'Project workspace',candidates:children.map(x=>({path:path.join(root,x.folder),name:x.record?.name||x.folder,label:x.record?.label||'Web / Python project'})),message:'Choose a project inside this workspace, or save a recipe to run several services together.'};}
  }
  return null;
}
module.exports={discover,validate,record,task,localUrl};
