const readline=require('node:readline');let terminal;
const send=message=>process.stdout.write(JSON.stringify(message)+'\n');
readline.createInterface({input:process.stdin,crlfDelay:Infinity}).on('line',line=>{try{if(line.length>1024*1024)throw new Error('Terminal request exceeds its size limit.');const message=JSON.parse(line);
 if(message.type==='start'){if(terminal)throw new Error('A terminal host can start only one session.');terminal=require('./terminal-native.cjs').spawn(message.command,message.args,message.options,message.size);terminal.stdout.on('data',data=>send({type:'data',data:data.toString('utf8')}));terminal.stderr.on('data',data=>send({type:'data',data:data.toString('utf8')}));terminal.once('error',error=>{send({type:'error',message:error.message});process.exit(1);});terminal.once('close',code=>process.stdout.write(JSON.stringify({type:'exit',code})+'\n',()=>process.exit(code||0)));}
 else if(!terminal)throw new Error('Terminal has not started.');
 else if(message.type==='input'){if(typeof message.data!=='string'||message.data.length>65536)throw new Error('Terminal input exceeds 64 KB.');terminal.stdin.write(message.data);}
 else if(message.type==='resize')terminal.resize(message.columns,message.rows);
 else if(message.type==='pause')terminal.pause();else if(message.type==='resume')terminal.resume();else throw new Error('Unknown terminal request.');
 }catch(error){send({type:'error',message:error.message});process.exit(1);}}).on('close',()=>process.exit(130));
