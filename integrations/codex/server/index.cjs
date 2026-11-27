#!/usr/bin/env node
const {McpServer}=require('@modelcontextprotocol/server');
const {StdioServerTransport}=require('@modelcontextprotocol/server/stdio');
const {z}=require('zod');
const fs=require('node:fs/promises'),path=require('node:path');
const {spawn}=require('node:child_process');
const {detect}=require('./runtime/core.cjs');
const {codexProjects}=require('./runtime/managed.cjs');
const {projectPath,registrationPath}=require('./runtime/integration.cjs');
const server=new McpServer({name:'appdock',version:'0.7.0'});
const result=value=>({content:[{type:'text',text:JSON.stringify(value)}],structuredContent:value});
const guarded=handler=>async args=>{try{return result(await handler(args));}catch(error){return{isError:true,content:[{type:'text',text:error.message}]};}};
const localRead={readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false};
server.registerTool('inspect_project',{title:'Inspect a local project',description:'Detect a launch plan without running project code, installing packages, or returning environment values. Commands and arguments are omitted to avoid exposing embedded credentials.',inputSchema:z.object({path:z.string().min(1),target:z.string().optional()}),annotations:localRead},guarded(async args=>{
  const root=await projectPath(args.path),record=await detect(root,{target:args.target}),plan=record.plan;
  return{path:root,name:record.name,type:record.label,kind:record.kind,automatic:!!record.automatic,mode:plan?.mode||record.kind,configured:plan?.configured!==false,needsInstall:!!record.needsInstall,nodeMajor:record.nodeMajor||null,services:(plan?.services||[]).map(s=>({id:s.id})),setupTasks:plan?.setup?.length||0,buildTasks:plan?.build?.length||0,requiredEnvironment:plan?.requiredEnv||[],candidates:record.candidates?.map(c=>({name:c.name,path:c.path,type:c.label})),language:record.language||record.framework,targets:record.targets||[],selectedTarget:record.selectedTarget||null,explanation:record.executionSummary,executionStarted:false};
}));
server.registerTool('make_executable',{title:'Make a project executable',description:'Create a Windows .exe that opens this project directly, without an AppDock installation or project library. Uses the existing project folder; no source clone is created. Does not run project code. The selected folder must remain in place.',inputSchema:z.object({path:z.string().min(1),output:z.string().min(1),target:z.string().optional()}),annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:false,openWorldHint:false}},guarded(async args=>{
 const root=await projectPath(args.path);if(!path.isAbsolute(args.output)||path.extname(args.output).toLowerCase()!=='.exe')throw new Error('Choose an absolute .exe output path.');let builder=process.env.APPDOCK_BUILDER||path.join(__dirname,'../bin/Make-App.exe');if(!(await fs.stat(builder).catch(()=>null))?.isFile())throw new Error('The Make App builder is missing. Use the complete Windows plugin bundle or set APPDOCK_BUILDER.');const temporary=await fs.mkdtemp(path.join(require('node:os').tmpdir(),'make-app-result-')),resultFile=path.join(temporary,'result.json');
 try{await new Promise((resolve,reject)=>{const child=spawn(builder,['--make-executable',root,'--output='+args.output,'--result-file='+resultFile,...(args.target?['--target='+args.target]:[])],{shell:false,windowsHide:true,stdio:'ignore'});const timer=setTimeout(()=>{child.kill();reject(new Error('Executable creation exceeded two minutes.'));},120000);child.once('error',error=>{clearTimeout(timer);reject(error);});child.once('exit',code=>{clearTimeout(timer);code===0?resolve():reject(new Error('Executable creation failed. Check that the project and output path are available.'));});});return{...JSON.parse(await fs.readFile(resultFile,'utf8')),executionStarted:false};}finally{await fs.rm(temporary,{recursive:true,force:true});}
}));
server.registerTool('list_projects',{title:'Find saved local projects',description:'Read local saved Codex project names and paths. Discovery is a best-effort convenience; arbitrary local folders can be opened too.',inputSchema:z.object({}),annotations:localRead},guarded(async()=>({projects:await codexProjects(),executionStarted:false})));
server.registerTool('open_project',{title:'Open the executable converter',description:'Open Make App with this local project selected. Does not start project code. Save an executable in the converter, or use make_executable directly.',inputSchema:z.object({path:z.string().min(1)}),annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:false,openWorldHint:false}},guarded(async args=>{
  const root=await projectPath(args.path);let executable=process.env.APPDOCK_BUILDER||process.env.APPDOCK_EXECUTABLE||path.join(__dirname,'../bin/Make-App.exe');
  if(!path.isAbsolute(executable)||!(await fs.stat(executable)).isFile())throw new Error('The Make App builder is missing. Use the complete Windows plugin bundle.');
  await new Promise((resolve,reject)=>{const child=spawn(executable,['--open-project='+root],{shell:false,windowsHide:true,detached:true,stdio:'ignore'});child.once('error',reject);child.once('spawn',()=>{child.unref();resolve();});});
  return{path:root,handoffRequested:true,executionStarted:false,message:'Opened the converter with this project selected. Creating an executable does not run project code.'};
}));
server.connect(new StdioServerTransport()).catch(error=>{console.error(error.message);process.exitCode=1;});
