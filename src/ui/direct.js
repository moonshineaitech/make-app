const $=id=>document.getElementById(id);
function update(state){if(state.name){$('name').textContent=state.name;document.title=state.name;}if(state.log)$('log').textContent=state.log.slice(-12000);if(state.error){$('state').textContent=state.error;$('progress').hidden=true;$('retry').hidden=false;$('close').textContent='Close';}}
projectApp.info().then(update);projectApp.onState(update);$('close').onclick=()=>projectApp.close();$('retry').onclick=()=>projectApp.retry();
