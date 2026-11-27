const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),{spawn}=require('node:child_process');
const {host,builderCommand}=require('../src/platform.cjs');
async function invoke(file,args,env){const command=builderCommand(file,args);return new Promise((resolve,reject)=>{
 const child=spawn(command.command,command.args,{env:{...process.env,...env,...(process.platform==='linux'?{APPIMAGE_EXTRACT_AND_RUN:'1'}:{})},stdio:['ignore','pipe','pipe'],windowsHide:true});let log='';
 const timer=setTimeout(()=>{child.kill();reject(new Error('Desktop acceptance exceeded 120 seconds. '+log));},120000);for(const stream of [child.stdout,child.stderr])stream.on('data',chunk=>log=(log+chunk).slice(-12000));child.once('error',error=>{clearTimeout(timer);reject(error);});child.once('exit',code=>{clearTimeout(timer);code===0?resolve():reject(new Error('Desktop acceptance exited '+code+': '+log));});
 });}
let diagnosticRoot;
async function main(){
 const base=path.resolve(__dirname,'..'),info=host(),version=require('../package.json').version,root=process.env.APPDOCK_ACCEPTANCE_ROOT||await fs.mkdtemp(path.join(os.tmpdir(),'make-app-acceptance-'));
 const builder=process.env.APPDOCK_PLUGIN_BUILDER||(info.platform==='win32'?path.join(base,`release/Make-App-${version}-Windows.exe`):info.platform==='darwin'?path.join(base,'release',info.arch==='arm64'?'mac-arm64':'mac','Make App.app'):path.join(base,`release/Make-App-${version}-Linux-${info.arch}.AppImage`));
 diagnosticRoot=root;await fs.mkdir(root,{recursive:true});const output=path.join(root,'Generated app'+info.extension),creator=path.join(root,'creator.json'),direct=path.join(root,'direct.json');
 console.log('Checking desktop creator on '+info.platform+'/'+info.arch);await invoke(builder,['--creator-smoke'],{APPDOCK_DATA:path.join(root,'creator'),APPDOCK_CREATOR_SOURCE:path.join(base,'examples/languages/javascript'),APPDOCK_CREATOR_OUTPUT:output,APPDOCK_CREATOR_RESULT:creator});
 const made=JSON.parse(await fs.readFile(creator,'utf8'));if(!made.passed||!made.createdThroughDesktopUI)throw new Error('Desktop creation did not pass.');
 console.log('Checking generated app on '+info.platform+'/'+info.arch);await invoke(output,[],{APPDOCK_DATA:path.join(root,'generated'),APPDOCK_TOOLCACHE:process.env.APPDOCK_TOOLCACHE||path.join(root,'tools'),APPDOCK_DIRECT_TEST:direct,APPDOCK_DIRECT_EXPECT_TEXT:'APPDOCK_SUM=0'});
 const opened=JSON.parse(await fs.readFile(direct,'utf8'));if(!opened.passed||!opened.stopped||opened.executionApprovalClicks!==0)throw new Error('Generated app acceptance did not pass.');
 console.log('Checking harness CLI with automatic output on '+info.platform+'/'+info.arch);
 const cliSource=path.join(root,'cli-project');await fs.cp(path.join(base,'examples/languages/javascript'),cliSource,{recursive:true});
 const readyFile=path.join(root,'parallel-ready');
 await fs.appendFile(path.join(cliSource,'main.cjs'),`\nrequire('node:fs').writeFileSync(${JSON.stringify(readyFile)},'ready');setTimeout(()=>{},6000);\n`);
 const execFile=require('node:util').promisify(require('node:child_process').execFile),cli=path.join(base,'integrations/codex/scripts/make-app.cjs');
 const cliResult=await execFile(process.execPath,[cli,'make',cliSource],{env:{...process.env,APPDOCK_BUILDER:builder,APPDOCK_DATA:path.join(root,'cli-builder')},windowsHide:true,timeout:120000});
 const cliMade=JSON.parse(cliResult.stdout),cliOutput=cliMade.executable;
 if(!cliOutput||cliMade.executionStarted!==false||await fs.realpath(path.dirname(cliOutput))!==await fs.realpath(path.join(root,'Make App Outputs')))throw new Error('CLI did not choose a fresh sibling output.');
 const cliDirect=path.join(root,'cli-direct.json');await invoke(cliOutput,[],{APPDOCK_DATA:path.join(root,'cli-generated'),APPDOCK_TOOLCACHE:process.env.APPDOCK_TOOLCACHE||path.join(root,'tools'),APPDOCK_DIRECT_TEST:cliDirect,APPDOCK_DIRECT_EXPECT_TEXT:'APPDOCK_SUM=0'});
 const cliOpened=JSON.parse(await fs.readFile(cliDirect,'utf8'));if(!cliOpened.passed||!cliOpened.stopped)throw new Error('CLI-generated app did not launch and stop.');
 console.log('Checking simultaneous generated app launches on '+info.platform+'/'+info.arch);
 const parallelReports=[path.join(root,'parallel-ui.json'),path.join(root,'parallel-cli.json')];
 await fs.rm(readyFile,{force:true});
 const parallelInvoke=(file,index)=>invoke(file,[],{APPDOCK_DATA:path.join(root,'parallel-'+index),APPDOCK_TOOLCACHE:process.env.APPDOCK_TOOLCACHE||path.join(root,'tools'),APPDOCK_DIRECT_TEST:parallelReports[index],APPDOCK_DIRECT_EXPECT_TEXT:'APPDOCK_SUM=0'});
 // Start the second runtime while the first is definitely executing its project.
 const first=parallelInvoke(cliOutput,1).then(()=>({ok:true}),error=>({ok:false,error}));
 const readyDeadline=Date.now()+30000;while(!await fs.stat(readyFile).catch(()=>null)&&Date.now()<readyDeadline)await new Promise(resolve=>setTimeout(resolve,50));
 const ready=!!await fs.stat(readyFile).catch(()=>null);
 const parallel=await Promise.allSettled([first.then(result=>{if(!result.ok)throw result.error;}),ready?parallelInvoke(output,0):Promise.reject(new Error('The first app did not reach its running state'))]);
 const failures=parallel.filter(result=>result.status==='rejected');if(failures.length)throw new AggregateError(failures.map(result=>result.reason),'Simultaneous generated apps failed');
 for(const file of parallelReports){const opened=JSON.parse(await fs.readFile(file,'utf8'));if(!opened.passed||!opened.stopped)throw new Error('Simultaneous generated apps did not launch and stop.');}
 await fs.rm(cliOutput,{recursive:true,force:true,maxRetries:5,retryDelay:100});
 await fs.mkdir(path.join(base,'qa'),{recursive:true});await fs.writeFile(path.join(base,'qa',`desktop-${info.platform}-${info.arch}.json`),JSON.stringify({passed:true,platform:info.platform,arch:info.arch,version,desktopConversion:true,directLaunch:true,stopped:true,sourceCopied:false,harnessCliCreation:true,automaticOutput:true,cliAppLaunch:true,simultaneousAppLaunches:true},null,2));console.log('Desktop and harness CLI conversion, simultaneous launch, output and shutdown passed on '+info.platform+'/'+info.arch);
 // Only remove the generated output; keep result files for runner diagnostics.
 await fs.rm(output,{recursive:true,force:true,maxRetries:5,retryDelay:100});
}
main().catch(async error=>{for(const name of ['creator.json','direct.json']){try{console.error(name+': '+await fs.readFile(path.join(diagnosticRoot,name),'utf8'));}catch{}}console.error(error);process.exitCode=1;});
