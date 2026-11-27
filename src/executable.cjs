// Creates a native desktop app without cloning the selected project.
const fs=require('node:fs/promises'),sync=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const MAGIC=Buffer.from('APPDOCKEXE000001');
async function hash(file){const digest=crypto.createHash('sha256');for await(const chunk of sync.createReadStream(file))digest.update(chunk);return digest.digest();}
function locations(platform=process.platform){const packaged=process.resourcesPath&&path.join(process.resourcesPath,'bin',platform==='win32'?'appdock-launcher.exe':'appdock-launcher');const info=require('./platform.cjs').host(platform),native=path.join(__dirname,'../native/bin',platform==='win32'?'appdock-launcher-win-x64.exe':'appdock-launcher-'+platform+'-'+process.arch);let bundle;if(platform==='darwin'&&process.resourcesPath)bundle=path.resolve(process.resourcesPath,'../..');return{stub:packaged&&sync.existsSync(packaged)?packaged:native,template:process.env.APPDOCK_EXECUTABLE_TEMPLATE||process.env.PORTABLE_EXECUTABLE_FILE||process.env.APPIMAGE||bundle||path.join(__dirname,'../release/Make-App-'+require('../package.json').version+'-Windows.exe')};}
async function make(source,destination,{name,target,template,stub,overwrite=false,onLog=()=>{},signal,platform=process.platform,signBundle}={}){
 signal?.throwIfAborted();const info=require('./platform.cjs').host(platform);if(!info.supported)throw new Error('Desktop output requires Windows, macOS or Linux on x64 or arm64. Use web export for browser devices.');
 const record=await require('./core.cjs').detect(path.resolve(source),{target});
 if(record.kind==='selection')throw new Error('Choose a runnable project inside this folder.');
 if(record.plan?.configured===false)throw new Error('Choose the executable entry point.');
 if(!path.isAbsolute(destination)||path.extname(destination).toLowerCase()!==info.extension)throw new Error('Choose an absolute '+info.extension+' output path.');
 const defaults=locations(platform);template=template||defaults.template;stub=stub||defaults.stub;
 if(platform!=='darwin')for(const file of [template,stub])if(!(await fs.stat(file).catch(()=>null))?.isFile())throw new Error('Executable builder runtime is unavailable. Use the packaged Make App executable.');
 if([template,stub,record.source].some(file=>path.resolve(file).toLowerCase()===path.resolve(destination).toLowerCase()))throw new Error('The output would replace an input file.');
 if(!overwrite&&await fs.stat(destination).catch(()=>null))throw new Error('Output already exists. Choose another name.');
 const spec={schemaVersion:1,directLaunch:true,localProject:true,createdWith:'Make App '+require('../package.json').version,record:{...record,id:crypto.randomUUID(),name:require('./core.cjs').safeName(name||record.name),version:record.kind==='url'?'remote':await require('./core.cjs').fingerprint(record.root,{cache:true,signal}),executionMode:'project',grants:{},runtimeTrusted:true,createdAt:Date.now()}};
 if(platform==='darwin')return require('./mac-app.cjs').makeBundle(template,destination,spec,{signal,onLog,signBundle});
 const config=Buffer.from(JSON.stringify(spec));const runtimeSize=(await fs.stat(template)).size;if(runtimeSize>512*1024*1024)throw new Error('The builder runtime exceeds the executable size limit.');
 const footer=Buffer.alloc(96);footer.writeBigUInt64LE(BigInt(runtimeSize),0);footer.writeBigUInt64LE(BigInt(config.length),8);(await hash(template)).copy(footer,16);crypto.createHash('sha256').update(config).digest().copy(footer,48);MAGIC.copy(footer,80);
 await fs.mkdir(path.dirname(destination),{recursive:true});const temporary=destination+'.'+crypto.randomUUID()+'.tmp';let output;
 try{onLog('Creating '+path.basename(destination)+'â€¦\n');output=await fs.open(temporary,'wx');for(const file of [stub,template])for await(const chunk of sync.createReadStream(file)){signal?.throwIfAborted();await output.write(chunk);}await output.write(config);await output.write(footer);await output.sync();await output.close();output=null;if(!overwrite&&await fs.stat(destination).catch(()=>null))throw new Error('Output was created by another operation. Choose another name.');signal?.throwIfAborted();if(platform!=='win32')await fs.chmod(temporary,0o755);await fs.rename(temporary,destination);}
 finally{await output?.close();await fs.unlink(temporary).catch(()=>{});}
 onLog('Executable ready. Double-click it to open '+spec.record.name+'.\n');return{executable:destination,name:spec.record.name,kind:record.kind,mode:record.plan?.mode||record.kind,format:info.extension.slice(1),platform,arch:process.arch,sourceCopied:false,requiresAppDockInstallation:false,requiresExistingProjectFolder:record.kind!=='url',bytes:(await fs.stat(destination)).size};
}
module.exports={make,locations,hash};
