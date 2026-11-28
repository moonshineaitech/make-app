// Keep progress available before the renderer subscribes and across error states.
function create(name,publish=()=>{}){
 let state={name,status:'Opening your app…',log:'',progress:null,detail:''},lastPhase,events=0,verified=false,extracted=false,cached=false;
 const started=Date.now();
 function update(next){const {log,...rest}=next;state={...state,...rest,...(log?{log:(state.log+log).slice(-16000)}:{})};publish(state);}
 function progress(info){
  events++;const {phase,completedBytes,totalBytes,completedFiles,totalFiles}=info;
  const byteTotal=Number.isSafeInteger(totalBytes)&&totalBytes>0,fileTotal=Number.isSafeInteger(totalFiles)&&totalFiles>0;
  let ratio=byteTotal?completedBytes/totalBytes:fileTotal?completedFiles/totalFiles:null;
  if(phase==='extract'&&fileTotal&&completedFiles<totalFiles&&ratio>=1)ratio=1-Number.EPSILON;
  if(phase==='verify'&&byteTotal&&completedBytes===totalBytes)verified=true;
  if(phase==='extract'&&completedBytes===totalBytes&&completedFiles===totalFiles)extracted=true;
  if(phase==='cached')cached=true;
  const status=phase==='verify'?'Checking app files…':phase==='extract'?'Preparing your app…':'Starting your app…';
  const percent=Number.isFinite(ratio)?Math.floor(Math.max(0,Math.min(1,ratio))*100):null;
  const parts=[];if(percent!==null&&phase!=='cached')parts.push(percent+'%');
  if(phase==='extract'&&fileTotal)parts.push(completedFiles.toLocaleString('en-US')+' of '+totalFiles.toLocaleString('en-US')+' files');
  const size=value=>(value/1048576).toLocaleString('en-US',{maximumFractionDigits:1});
  if(byteTotal&&phase!=='cached')parts.push(size(completedBytes)+' of '+size(totalBytes)+' MB');
  update({phase,status,progress:phase==='cached'||percent===null?null:{value:Math.max(0,Math.min(1,ratio)),max:1},detail:parts.join(' · '),...(lastPhase!==phase?{log:status+'\n'}:{})});lastPhase=phase;
 }
 return{update,progress,get state(){return state;},summary:()=>({verified,extracted,cached,events,elapsedMs:Date.now()-started})};
}
module.exports={create};
