const {build}=require('./package.json');
const platform=process.platform;
module.exports={...build,afterPack:async context=>{if(process.platform!=='win32')await require('./scripts/prepare-terminal.cjs').prepare(require('node:path').join(context.appOutDir,process.platform==='darwin'?'Make App.app/Contents/Resources':'resources','app.asar.unpacked/node_modules/node-pty'));},win:{...build.win,target:['portable']},npmRebuild:platform!=='win32',
 extraResources:platform==='darwin'?[]:platform==='linux'?[{from:`native/bin/appdock-launcher-linux-${process.arch}`,to:'bin/appdock-launcher'}]:build.extraResources,
 mac:{...build.mac,target:['zip'],artifactName:'Make-App-${version}-macOS-${arch}.${ext}',identity:null},
 linux:{...build.linux,target:['AppImage'],artifactName:'Make-App-${version}-Linux-${arch}.${ext}'}};
