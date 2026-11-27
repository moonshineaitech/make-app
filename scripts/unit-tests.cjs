const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
if(Number(process.versions.node.split('.')[0])<22){console.error('Use Node.js 24 LTS (minimum 22.12) to develop and test AppDock.');process.exit(1);}
const root=path.resolve(__dirname,'..'),files=fs.readdirSync(path.join(root,'test')).filter(f=>f.endsWith('.test.cjs')).map(f=>path.join(root,'test',f)),result=spawnSync(process.execPath,['--test','--test-reporter=tap','--test-timeout=15000',...files],{stdio:'inherit',windowsHide:true});process.exit(result.status??1);
