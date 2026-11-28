const path=require('node:path');
function host(platform=process.platform,arch=process.arch){
 const names={win32:'Windows',darwin:'macOS',linux:'Linux'};
 const supported=!!names[platform]&&['x64','arm64'].includes(arch);
 return{platform,arch,name:names[platform]||platform,supported,extension:platform==='win32'?'.exe':platform==='darwin'?'.app':'.run',format:platform==='darwin'?'Application bundle':'Executable',nodeName:platform==='win32'?'node.exe':'node',builderName:platform==='win32'?'Make-App.exe':platform==='darwin'?'Make App.app':'Make-App.AppImage'};
}
function builderCommand(builder,args=[],platform=process.platform){return platform==='darwin'&&builder.endsWith('.app')?{command:path.join(builder,'Contents/MacOS/Make App'),args}:{command:builder,args};}
function capabilities(){return{...host(),webExport:true,webDevices:['iPhone','iPad','Android','ChromeOS','desktop browsers'],originalProjectFolderRequired:false,standaloneDesktopOutput:true,crossCompilation:false};}
module.exports={host,builderCommand,capabilities};
