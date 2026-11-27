const fs=require('node:fs/promises'),path=require('node:path'),{fileURLToPath}=require('node:url');
function isMainFrame(event){const frame=event.senderFrame,main=event.sender?.mainFrame;return !!frame&&!!main&&(frame===main||(Number.isInteger(frame.processId)&&Number.isInteger(frame.routingId)&&frame.processId===main.processId&&frame.routingId===main.routingId));}
async function trustedDocument(event,contents,file){
 if(!contents||contents.isDestroyed()||event.sender!==contents||!isMainFrame(event))return false;
 try{const url=new URL(event.senderFrame.url);if(url.protocol!=='file:'||url.search||url.hash)return false;
  // The portable runtime can reside under a Windows 8.3 alias while Chromium
  // reports its long path. Compare canonical files, never URL string prefixes.
  const [actual,expected]=await Promise.all([fs.realpath(fileURLToPath(url)),fs.realpath(file)]);return path.relative(path.toNamespacedPath(actual),path.toNamespacedPath(expected))==='';
 }catch{return false;}
}
module.exports={isMainFrame,trustedDocument};
