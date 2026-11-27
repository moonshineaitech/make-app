const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),{spawn}=require('node:child_process');
const {host,builderCommand}=require('../src/platform.cjs');
async function invoke(file,args,env){const command=builderCommand(file,args);return new Promise((resolve,reject)=>{
 const child=spawn(command.command,command.args,{env:{...process.env,...env,...(process.platform==='linux'?{APPIMAGE_EXTRACT_AND_RUN:'1'}:{})},stdio:['ignore','pipe','pipe'],windowsHide:true});let log='';
 const timer=setTimeout(()=>{child.kill();reject(new Error('Desktop acceptance exceeded 120 seconds. '+log));},120000);for(const stream of [child.stdout,child.stderr])stream.on('data',chunk=>log=(log+chunk).slice(-12000));child.once('error',error=>{clearTimeout(timer);reject(error);});child.once('exit',code=>{clearTimeout(timer);code===0?resolve():reject(new Error('Desktop acceptance exited '+code+': '+log));});
 });}
async function main(){
 const base=path.resolve(__dirname,'..'),info=host(),version=require('../package.json').version,root=process.env.APPDOCK_ACCEPTANCE_ROOT||await fs.mkdtemp(path.join(os.tmpdir(),'make-app-acceptance-'));
 const builder=process.env.APPDOCK_PLUGIN_BUILDER||(info.platform==='win32'?path.join(base,`release/Make-App-${version}-Windows.exe`):info.platform==='darwin'?path.join(base,'release',info.arch==='arm64'?'mac-arm64':'mac','Make App.app'):path.join(base,`release/Make-App-${version}-Linux-${info.arch}.AppImage`));
 await fs.mkdir(root,{recursive:true});const output=path.join(root,'Generated app'+info.extension),creator=path.join(root,'creator.json'),direct=path.join(root,'direct.json');
 await invoke(builder,['--creator-smoke'],{APPDOCK_DATA:path.join(root,'creator'),APPDOCK_CREATOR_SOURCE:path.join(base,'examples/languages/javascript'),APPDOCK_CREATOR_OUTPUT:output,APPDOCK_CREATOR_RESULT:creator});
 const made=JSON.parse(await fs.readFile(creator,'utf8'));if(!made.passed||!made.createdThroughDesktopUI)throw new Error('Desktop creation did not pass.');
 await invoke(output,[],{APPDOCK_DATA:path.join(root,'generated'),APPDOCK_TOOLCACHE:process.env.APPDOCK_TOOLCACHE||path.join(root,'tools'),APPDOCK_DIRECT_TEST:direct,APPDOCK_DIRECT_EXPECT_TEXT:'APPDOCK_SUM=0'});
 const opened=JSON.parse(await fs.readFile(direct,'utf8'));if(!opened.passed||!opened.stopped||opened.executionApprovalClicks!==0)throw new Error('Generated app acceptance did not pass.');
 await fs.mkdir(path.join(base,'qa'),{recursive:true});await fs.writeFile(path.join(base,'qa',`desktop-${info.platform}-${info.arch}.json`),JSON.stringify({passed:true,platform:info.platform,arch:info.arch,version,desktopConversion:true,directLaunch:true,stopped:true,sourceCopied:false},null,2));console.log('Desktop conversion, direct launch, output and shutdown passed on '+info.platform+'/'+info.arch);
 // Only remove the generated output; keep result files for runner diagnostics.
 await fs.rm(output,{recursive:true,force:true,maxRetries:5,retryDelay:100});
}
main().catch(error=>{console.error(error);process.exitCode=1;});
