const {build}=require('./package.json');
const platform=process.platform;
module.exports={...build,afterPack:async context=>{if(process.platform!=='win32')await require('./scripts/prepare-terminal.cjs').prepare(require('node:path').join(context.appOutDir,process.platform==='darwin'?'Make App.app/Contents/Resources':'resources','app.asar.unpacked/node_modules/node-pty'));},win:{...build.win,target:['portable']},npmRebuild:platform!=='win32',
 extraResources:platform==='darwin'?[]:platform==='linux'?[{from:`native/bin/appdock-launcher-linux-${process.arch}`,to:'bin/appdock-launcher'},{from:'native/bin/RUST-STANDARD-LIBRARY-NOTICES.html',to:'bin/RUST-STANDARD-LIBRARY-NOTICES.html'},{from:'native/bin/licenses',to:'bin/licenses'}]:build.extraResources,
 mac:{...build.mac,icon:'src/pwa-icons/icon-512.png',target:['zip'],artifactName:'Make-App-${version}-macOS-${arch}.${ext}',identity:null},
 linux:{...build.linux,icon:'src/pwa-icons/icon-512.png',target:['AppImage'],artifactName:'Make-App-${version}-Linux-'+process.arch+'.${ext}'}};
