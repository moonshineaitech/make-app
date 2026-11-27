const fs=require('node:fs'),path=require('node:path');
function location(){if(process.platform!=='win32'||process.arch!=='x64')return null;for(const candidate of [process.env.APPDOCK_PROCESS_BROKER,process.resourcesPath&&path.join(process.resourcesPath,'bin/appdock-process.exe'),path.join(__dirname,'../native/bin/appdock-process-win-x64.exe')].filter(Boolean))if(fs.existsSync(candidate))return candidate;return null;}
function wrap(command,args,options){const broker=location();if(!broker)return{command,args,options};return{command:broker,args:[...(options.windowsVerbatimArguments?['--windows-verbatim']:[]),command,...args],options:{...options,windowsVerbatimArguments:false,stdio:['pipe','pipe','pipe']}};}
function spawn(command,args,options){const spec=wrap(command,args,options),child=require('node:child_process').spawn(spec.command,spec.args,spec.options);child.appdockSupervised=spec.command!==command;return child;}
module.exports={location,wrap,spawn};
