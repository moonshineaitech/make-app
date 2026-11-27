// Produces an app's own one-file Windows executable; it never registers a library item.
const fs=require('node:fs/promises'),sync=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const MAGIC=Buffer.from('APPDOCKEXE000001');
async function hash(file){const digest=crypto.createHash('sha256');for await(const chunk of sync.createReadStream(file))digest.update(chunk);return digest.digest();}
function locations(){const packaged=process.resourcesPath&&path.join(process.resourcesPath,'bin','appdock-launcher.exe');return{stub:packaged&&sync.existsSync(packaged)?packaged:path.join(__dirname,'../native/bin/appdock-launcher-win-x64.exe'),template:process.env.APPDOCK_EXECUTABLE_TEMPLATE||process.env.PORTABLE_EXECUTABLE_FILE||path.join(__dirname,'../release/Make-App-0.7.0-Windows.exe')};}
async function make(source,destination,{name,target,template,stub,overwrite=false,onLog=()=>{}}={}){
 const record=await require('./core.cjs').detect(path.resolve(source),{target});
 if(record.kind==='selection')throw new Error('Choose a runnable project inside this folder.');
 if(record.plan?.configured===false)throw new Error('Choose the executable entry point.');
 if(!path.isAbsolute(destination)||path.extname(destination).toLowerCase()!=='.exe')throw new Error('Choose an absolute .exe output path.');
 const defaults=locations();template=template||defaults.template;stub=stub||defaults.stub;
 for(const file of [template,stub])if(!(await fs.stat(file).catch(()=>null))?.isFile())throw new Error('Executable builder runtime is unavailable. Use the packaged Make App executable.');
 if([template,stub,record.source].some(file=>path.resolve(file).toLowerCase()===path.resolve(destination).toLowerCase()))throw new Error('The output would replace an input file.');
 if(!overwrite&&await fs.stat(destination).catch(()=>null))throw new Error('Output already exists. Choose another name.');
 const spec={schemaVersion:1,directLaunch:true,localProject:true,createdWith:'AppDock 0.7.0',record:{...record,id:crypto.randomUUID(),name:require('./core.cjs').safeName(name||record.name),version:record.kind==='url'?'remote':await require('./core.cjs').fingerprint(record.root),executionMode:'project',grants:{},runtimeTrusted:true,createdAt:Date.now()}};
 const config=Buffer.from(JSON.stringify(spec));const runtimeSize=(await fs.stat(template)).size;if(runtimeSize>512*1024*1024)throw new Error('The builder runtime exceeds the executable size limit.');
 const footer=Buffer.alloc(96);footer.writeBigUInt64LE(BigInt(runtimeSize),0);footer.writeBigUInt64LE(BigInt(config.length),8);(await hash(template)).copy(footer,16);crypto.createHash('sha256').update(config).digest().copy(footer,48);MAGIC.copy(footer,80);
 await fs.mkdir(path.dirname(destination),{recursive:true});const temporary=destination+'.'+crypto.randomUUID()+'.tmp';let output;
 try{onLog('Creating '+path.basename(destination)+'…\n');output=await fs.open(temporary,'wx');for(const file of [stub,template])for await(const chunk of sync.createReadStream(file))await output.write(chunk);await output.write(config);await output.write(footer);await output.sync();await output.close();output=null;if(!overwrite&&await fs.stat(destination).catch(()=>null))throw new Error('Output was created by another operation. Choose another name.');await fs.rename(temporary,destination);}
 finally{await output?.close();await fs.unlink(temporary).catch(()=>{});}
 onLog('Executable ready. Double-click it to open '+spec.record.name+'.\n');return{executable:destination,name:spec.record.name,kind:record.kind,mode:record.plan?.mode||record.kind,sourceCopied:false,requiresAppDockInstallation:false,requiresExistingProjectFolder:record.kind!=='url',bytes:(await fs.stat(destination)).size};
}
module.exports={make,locations,hash};
