// A supervised per-session host owns native ConPTY state and worker threads.
const {EventEmitter}=require('node:events');
const {PassThrough,Writable}=require('node:stream');
const path=require('node:path');
function supported(){return ['darwin','linux'].includes(process.platform)||(process.platform==='win32'&&process.arch==='x64'&&!!require('./process-broker.cjs').location());}
function dimensions(columns=100,rows=30){if(!Number.isInteger(columns)||columns<20||columns>400||!Number.isInteger(rows)||rows<5||rows>200)throw new Error('Terminal size must be 20–400 columns and 5–200 rows.');return{columns,rows};}
function spawn(command,args,options,size={}){
 if(!supported())throw new Error('Interactive terminals are unavailable on this OS/architecture.');
 const checked=dimensions(size.columns,size.rows),allowed=/^(?:systemroot|windir|comspec|temp|tmp|path|pathext|home|userprofile|localappdata|appdata|programdata|username|userdomain|number_of_processors|processor_architecture|os)$/i;
 const hostEnvironment={...Object.fromEntries(Object.entries(process.env).filter(([name])=>allowed.test(name))),ELECTRON_RUN_AS_NODE:'1',APPDOCK_PROCESS_BROKER:require('./process-broker.cjs').location()};
 const host=require('./process-broker.cjs').spawn(process.execPath,[path.join(__dirname,'terminal-worker.cjs')],{cwd:options.cwd,env:hostEnvironment,windowsHide:true,stdio:['pipe','pipe','pipe']});
 const child=new EventEmitter();Object.assign(child,{pid:host.pid,exitCode:null,appdockSupervised:true,appdockTerminal:true,stdout:new PassThrough(),stderr:new PassThrough()});
 let buffer='',reportedCode=null,ended=false;
 const send=message=>{if(!ended&&host.stdin.writable)host.stdin.write(JSON.stringify(message)+'\n');};host.stdin.on('error',()=>{});
 child.stdin=new Writable({write(chunk,encoding,done){send({type:'input',data:chunk.toString('utf8')});done();},final(done){host.stdin.end();done();}});
 child.kill=signal=>{if(signal==='SIGKILL')host.kill('SIGKILL');else host.stdin.end();return true;};
 child.resize=(cols,rows)=>send({type:'resize',...dimensions(cols,rows)});child.pause=()=>send({type:'pause'});child.resume=()=>send({type:'resume'});
 host.stdout.setEncoding('utf8');host.stdout.on('data',chunk=>{buffer+=chunk;if(buffer.length>4*1024*1024){child.stderr.write('Terminal host exceeded its message limit.');host.kill('SIGKILL');return;}let boundary;while((boundary=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,boundary);buffer=buffer.slice(boundary+1);try{const message=JSON.parse(line);if(message.type==='data')child.stdout.write(message.data);else if(message.type==='exit')reportedCode=message.code;else if(message.type==='error')child.stderr.write(message.message);}catch{child.stderr.write('Invalid terminal-host message.');host.kill('SIGKILL');}}});
 host.stderr.on('data',chunk=>child.stderr.write(chunk));host.on('error',error=>child.emit('error',error));host.on('close',(code,signal)=>{ended=true;child.exitCode=reportedCode??code;child.stdout.end();child.stderr.end();child.emit('exit',child.exitCode,signal);child.emit('close',child.exitCode,signal);});
 send({type:'start',command,args,options:{cwd:options.cwd,env:options.env,windowsVerbatimArguments:!!options.windowsVerbatimArguments},size:checked});return child;
}
module.exports={supported,dimensions,spawn};
