// Keep Create actionable: explain missing setup and offer the next useful action.
(() => {
 const $=id=>document.getElementById(id),dialog=document.createElement('dialog');
 dialog.id='creation-help';dialog.className='export-settings creation-help';dialog.setAttribute('aria-labelledby','creation-help-title');dialog.setAttribute('aria-describedby','creation-help-copy');
 dialog.innerHTML='<header class="export-settings-header"><div><p class="view-eyebrow">LET’S GET IT READY</p><h2 id="creation-help-title" tabindex="-1">One step before creating.</h2></div><button id="close-creation-help" class="icon-button" type="button" aria-label="Close creation help">×</button></header><p id="creation-help-copy" class="export-intro"></p><p id="creation-help-context"></p><div class="export-result-actions"><button id="fix-creation" type="button" class="button primary"></button><button id="retry-inspection" type="button" class="button secondary">Check project again</button><button id="copy-creation-details" type="button" class="button secondary">Copy details</button></div><p id="creation-help-notice" role="status" aria-live="polite"></p>';
 document.body.append(dialog);let current,fix,report;
 function explain(s){
  if(!s.source.trim())return{copy:'Choose the folder containing your project or game files. Make App will detect how to run it.',label:'Choose a project folder',action:'choose'};
  if(!s.platform)return{copy:'Make App is still checking this computer. Try again in a moment.',label:'Check again',action:'retry'};
  if(!s.selected)return{copy:s.inspectionError||'The project is still being inspected. Check again to read its setup. If the project is in a cloud folder, make its files available on this computer first.',label:'Choose another folder',action:'choose'};
  if(s.selected.selection)return{copy:'This folder contains several projects. Select the game or app you want inside Project details.',label:'Choose the project inside',action:'project'};
  if(s.selected.configured===false)return{copy:'This project has several entry points, or no runnable entry point was found. Choose the game executable or entry point in Project details.',label:'Review entry points',action:'entry'};
  if(s.format==='web'&&!s.selected.webAvailable)return{copy:'This project does not have an existing static web build. Desktop export can run supported games and apps; web export needs a built frontend.',label:'Use desktop export',action:'desktop'};
  if(s.format!=='web'&&!s.target?.buildable)return{copy:'The selected output is for another OS or processor. Build the app for this computer, or create that output on a matching computer.',label:'Use this computer',action:'host'};
  if(s.selected.standalone?.supported===false)return{copy:s.selected.standalone.reason,label:'Choose another project',action:'choose'};
  return{copy:'Make App could not confirm a runnable setup. Check the detected project and its requirements before creating.',label:'Review project details',action:'entry'};
 }
 function close(){dialog.close();}
 function open(s){current=s;const result=explain(s);fix=result.action;for(const id of ['project-information','export-settings','app-views','theme-picker'])if($(id)?.open)$(id).close();
  $('creation-help-copy').textContent=result.copy;$('fix-creation').textContent=result.label;$('retry-inspection').disabled=!s.source.trim();$('creation-help-notice').textContent='';
  const p=s.platform;$('creation-help-context').textContent=p?'Make App '+(p.version||'preview')+' · '+p.name+' '+p.arch:'';
  report=[$('creation-help-context').textContent,'Project: '+s.source,'Detected: '+(s.selected?.label||'Not confirmed'),'Output: '+s.format+' · '+(s.target?.name||'')+' '+(s.target?.arch||''),'Reason: '+result.copy].join('\n');
  if(!dialog.open)dialog.showModal();$('creation-help-title').focus();
 }
 $('close-creation-help').onclick=close;dialog.addEventListener('close',()=>$('make').focus({preventScroll:true}));
 $('retry-inspection').onclick=()=>{close();$('source').dispatchEvent(new Event('change'));};
 $('fix-creation').onclick=async()=>{close();if(fix==='choose')$('browse').click();else if(fix==='retry')$('source').dispatchEvent(new Event('change'));else if(fix==='host')window.makeAppCreator.selectTarget(current.platform.platform,current.platform.arch);else if(fix==='desktop')window.makeAppCreator.useFormat('desktop');else{$('project-details').click();$(fix==='project'?'subproject':'entry').focus();}};
 $('copy-creation-details').onclick=async()=>{try{if(window.makeApp.copyText)await window.makeApp.copyText(report);else await navigator.clipboard.writeText(report);$('creation-help-notice').textContent='Details copied. Review the project path before sharing them.';}catch{$('creation-help-notice').textContent='Copy the reason shown above.';}};
 window.makeAppReadiness=Object.freeze({open});
})();
