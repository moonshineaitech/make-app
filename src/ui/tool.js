const $=id=>document.getElementById(id);
let mode='tool',terminal=null,fit=null,usingTerminal=false;
const infoReady=tool.info().then(info=>{
 mode=info.mode;$('name').textContent=info.name;document.title=info.name;$('source').textContent=info.source;
 $('terminal-option').hidden=!info.terminalSupported||mode!=='tool';$('terminal-enabled').checked=info.terminal;
 if(mode==='native'){$('run').textContent='Open native app';$('status').textContent='This project opens its own native window.';}
 if(mode==='worker')$('run').textContent='Start services';
});
function openTerminal(){
 if(!terminal){terminal=new Terminal({screenReaderMode:true,scrollback:1000,fontSize:13,fontFamily:'Consolas, monospace',theme:{background:'#11151b',foreground:'#ced8e8'},linkHandler:{activate(){}}});fit=new FitAddon.FitAddon();terminal.loadAddon(fit);terminal.open($('terminal'));terminal.onData(text=>tool.input(text).catch(error=>$('status').textContent=error.message));new ResizeObserver(()=>{if(usingTerminal){fit.fit();tool.resize({columns:Math.min(400,Math.max(20,terminal.cols)),rows:Math.min(200,Math.max(5,terminal.rows))}).catch(()=>{});}}).observe($('terminal'));}
 terminal.reset();fit.fit();terminal.focus();return{columns:Math.min(400,Math.max(20,terminal.cols)),rows:Math.min(200,Math.max(5,terminal.rows))};
}
tool.onOutput(text=>{$('log').textContent=($('log').textContent+text).slice(-70000);$('log').scrollTop=$('log').scrollHeight;});
tool.onTerminal(text=>{if(terminal)terminal.write(text,()=>tool.ack(new TextEncoder().encode(text).length).catch(()=>{}));});
$('run').onclick=async()=>{await infoReady;try{
 const args=parseProjectArguments($('args').value);$('run').disabled=true;$('cancel').disabled=false;$('terminal-enabled').disabled=true;$('log').textContent='';$('status').textContent='Starting…';usingTerminal=mode==='tool'&&$('terminal-enabled').checked;$('terminal').hidden=!usingTerminal;$('log').hidden=usingTerminal;$('input-form').hidden=usingTerminal;document.body.classList.toggle('terminal-active',usingTerminal);
 const size=usingTerminal?openTerminal():{};const result=await tool.run({args,terminal:usingTerminal,...size});$('status').textContent=result.mode&&result.mode!=='tool'?'Running. Keep this controller open.':'Finished with exit code '+result.code;
 }catch(error){$('status').textContent=error.message;$('run').disabled=false;$('cancel').disabled=true;}finally{if(mode==='tool'){$('run').disabled=false;$('cancel').disabled=true;}$('terminal-enabled').disabled=false;}};
$('cancel').onclick=async()=>{await tool.cancel();$('status').textContent='Stopped.';$('run').disabled=false;$('cancel').disabled=true;};
setInterval(async()=>{try{const state=await tool.status();if(mode!=='tool'){const statuses=Object.entries(state.services).map(([name,s])=>`${name}: ${s.status}`).join(' · ');if(statuses)$('status').textContent=statuses;if(!state.active){$('run').disabled=false;$('cancel').disabled=true;}}}catch{}},1000);
$('input-form').onsubmit=async event=>{event.preventDefault();try{await tool.input($('stdin').value+'\n');$('stdin').value='';}catch(error){$('status').textContent=error.message;}};
tool.onAutoStart(async()=>{await infoReady;$('run').click();});
