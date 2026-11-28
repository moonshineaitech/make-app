const path=require('node:path');
function host(platform=process.platform,arch=process.arch){
 const names={win32:'Windows',darwin:'macOS',linux:'Linux'};
 const supported=!!names[platform]&&['x64','arm64'].includes(arch);
 return{platform,arch,name:names[platform]||platform,supported,extension:platform==='win32'?'.exe':platform==='darwin'?'.app':'.run',format:platform==='darwin'?'Application bundle':'Executable',nodeName:platform==='win32'?'node.exe':'node',builderName:platform==='win32'?'Make-App.exe':platform==='darwin'?'Make App.app':'Make-App.AppImage'};
}
function builderCommand(builder,args=[],platform=process.platform){return platform==='darwin'&&builder.endsWith('.app')?{command:path.join(builder,'Contents/MacOS/Make App'),args}:{command:builder,args};}
function targets(){return[['win32','x64'],['darwin','arm64'],['darwin','x64'],['linux','x64'],['linux','arm64']].map(([platform,arch])=>({...host(platform,arch),cpu:arch==='arm64'?(platform==='darwin'?'Apple Silicon':'ARM64'):(platform==='darwin'?'Intel':'Intel / AMD'),share:platform==='darwin'?'Zip the complete .app bundle.':platform==='linux'?'Share the .run file with its executable permission.':'Share the single .exe file.'}));}
function target(platform,arch,current=host()){
 const chosen=targets().find(t=>t.platform===(platform||current.platform)&&t.arch===(arch||current.arch));
 if(!chosen)throw Error('This operating system and CPU combination is not supported.');
 return{...chosen,buildable:chosen.platform===current.platform&&chosen.arch===current.arch,reason:chosen.platform===current.platform&&chosen.arch===current.arch?'Ready to build on this computer.':'Create this app on '+chosen.name+' '+chosen.cpu+' using its matching Make App download. Projects stay local; desktop output is built for the computer running Make App.'};
}
function capabilities(){return{...host(),version:require('../package.json').version,targets:targets(),webExport:true,webDevices:['iPhone','iPad','Android','ChromeOS','desktop browsers'],originalProjectFolderRequired:false,standaloneDesktopOutput:true,crossCompilation:false};}
module.exports={host,builderCommand,capabilities,targets,target};
