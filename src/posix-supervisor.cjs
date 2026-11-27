// The pipe belongs to the controller. EOF or controller termination stops the
// separate child process group, including descendants, with bounded escalation.
const {spawn}=require('node:child_process');let child,buffer=Buffer.alloc(0),started=false,stopping=false,timer;
function stop(){if(stopping)return;stopping=true;if(!child?.pid)return process.exit(130);try{process.kill(-child.pid,'SIGTERM');}catch{}timer=setTimeout(()=>{try{process.kill(-child.pid,'SIGKILL');}catch{}process.exit(130);},1500);}
process.once('SIGTERM',stop);process.once('SIGINT',stop);process.stdin.on('end',stop);
process.stdin.on('data',chunk=>{
 if(started){child?.stdin?.write(chunk);return;}buffer=Buffer.concat([buffer,chunk]);if(buffer.length>1024*1024){console.error('Supervisor request exceeds 1 MB.');return process.exit(1);}const boundary=buffer.indexOf(10);if(boundary<0)return;
 try{const spec=JSON.parse(buffer.subarray(0,boundary).toString());started=true;if(typeof spec.command!=='string'||!Array.isArray(spec.args))throw new Error('Invalid supervisor request');child=spawn(spec.command,spec.args,{cwd:spec.cwd,env:spec.env,detached:true,stdio:['pipe','inherit','inherit']});child.stdin.on('error',()=>{});const remaining=buffer.subarray(boundary+1);buffer=null;if(remaining.length)child.stdin.write(remaining);child.once('error',error=>{console.error(error.message);process.exit(1);});child.once('close',(code,signal)=>{clearTimeout(timer);try{process.kill(-child.pid,'SIGKILL');}catch{}process.exit(code??(signal?130:1));});}
 catch(error){console.error(error.message);process.exit(1);}
});
