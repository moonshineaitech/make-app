const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const terminal=require('../src/terminal.cjs'),{ProjectSession}=require('../src/engine.cjs');
const windows=process.platform==='win32'&&process.arch==='x64';
async function until(check){const deadline=Date.now()+7000;while(Date.now()<deadline){if(await check())return;await new Promise(r=>setTimeout(r,40));}throw new Error('Terminal condition timed out');}
test('terminal validates dimensions and recipe setting',()=>{assert.throws(()=>terminal.dimensions(0,30));assert.throws(()=>terminal.dimensions(80,999));assert.deepEqual(terminal.dimensions(),{columns:100,rows:30});assert.throws(()=>require('../src/projects.cjs').validate({mode:'tool',run:['node'],terminal:'yes'}));});
test('terminal exposes real TTY, Unicode, raw input, resize and clean exit',{skip:!windows},async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'appdock-terminal-'));let child;
 try{const file=path.join(root,'program.cjs');await fs.writeFile(file,`process.stdin.setRawMode(true);process.stdin.resume();console.log('TTY='+process.stdin.isTTY+'/'+process.stdout.isTTY+' café');process.stdout.on('resize',()=>console.log('SIZE='+process.stdout.columns+'x'+process.stdout.rows));process.stdin.on('data',d=>{console.log('INPUT='+d);if(d.toString()==='q')process.exit(0)});`);
 child=terminal.spawn(process.execPath,[file],{cwd:root,env:{...process.env}},{columns:80,rows:24});let output='';child.stdout.on('data',data=>output+=data);const closed=new Promise((resolve,reject)=>{child.once('close',resolve);child.once('error',reject);});await until(()=>output.includes('TTY=true/true café'));child.resize(110,32);await until(()=>output.includes('SIZE=110x32'));child.stdin.write('q');assert.equal(await closed,0);assert.match(output,/INPUT=q/);
 }finally{if(child?.exitCode===null)await require('../src/engine.cjs').kill(child);await fs.rm(root,{recursive:true,force:true});}
});
test('session terminal redacts secrets across chunks without log prefixes',{skip:!windows},async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'appdock-terminal-session-'));let session;
 try{let output='',log='';session=new ProjectSession({id:'terminal-test',root,plan:{mode:'tool',requirements:[],requiredEnv:['APPDOCK_SECRET'],run:[process.execPath,'-e',`process.stdout.write('sensitive-');setTimeout(()=>{console.log('test-value');console.log('TTY='+process.stdout.isTTY)},30)`]}},{terminal:true,env:{APPDOCK_SECRET:'sensitive-test-value'},onTerminal:text=>output+=text,onLog:text=>log+=text});assert.equal((await session.start()).code,0);assert.match(output,/\[redacted\]/);assert.match(output,/TTY=true/);assert.ok(!output.includes('[app]'));assert.ok(!log.includes('sensitive-test-value'));
 }finally{await session?.stop();await fs.rm(root,{recursive:true,force:true});}
});
test('terminal descendants stop when their controller crashes',{skip:!windows},async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'appdock-terminal-owner-'));let owner,port;
 try{const marker=path.join(root,'port.txt'),server=path.join(root,'server.cjs'),controller=path.join(root,'controller.cjs');await fs.writeFile(server,`const s=require('node:http').createServer((q,r)=>r.end('alive'));s.listen(0,'127.0.0.1',()=>require('node:fs').writeFileSync(${JSON.stringify(marker)},String(s.address().port)));`);
 await fs.writeFile(controller,`require(${JSON.stringify(require.resolve('../src/terminal.cjs'))}).spawn(process.execPath,[${JSON.stringify(server)}],{cwd:${JSON.stringify(root)},env:{...process.env}});setInterval(()=>{},1000);`);
 owner=require('node:child_process').spawn(process.execPath,[controller],{stdio:'ignore',windowsHide:true});await until(async()=>{try{port=Number(await fs.readFile(marker,'utf8'));return port>0;}catch{return false;}});assert.equal(await(await fetch('http://127.0.0.1:'+port)).text(),'alive');owner.kill('SIGKILL');await until(async()=>{try{await fetch('http://127.0.0.1:'+port,{signal:AbortSignal.timeout(200)});return false;}catch{return true;}});
 // Windows releases ConPTY directory handles shortly after the server closes.
 }finally{owner?.kill('SIGKILL');await fs.rm(root,{recursive:true,force:true,maxRetries:10,retryDelay:100});}
});
