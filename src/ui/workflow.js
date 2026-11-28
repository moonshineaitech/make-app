(() => {
 const $=id=>document.getElementById(id),dialog=$('export-settings'),controller=window.makeAppCreator;let state=controller.state();
 const close=()=>dialog.close();
 function open(){for(const id of ['app-views','theme-picker','project-information'])if($(id).open)$(id).close();draw();if(!dialog.open)dialog.showModal();$('export-settings-title').focus({preventScroll:true});}
 function draw(){
  const host=state.platform,target=state.target,web=state.format==='web';
  $('desktop-targets').hidden=web;$('export-desktop').setAttribute('aria-pressed',String(!web));$('export-web').setAttribute('aria-pressed',String(web));
  $('export-save-section').hidden=web||!!window.makeApp.preview;$('export-ask-save').checked=$('ask-save').checked;$('export-ask-save').disabled=!!state.busy;
  $('export-options-button').dataset.ready=String(web||!target||target.buildable);
  $('export-target-badge').textContent=web?'Web':target?target.name+' '+target.arch:'';$('export-options-button').setAttribute('aria-label','Export options: '+(web?'static web app':target?target.name+' '+target.arch:'desktop app'));
  for(const b of dialog.querySelectorAll('[data-target-platform]')){b.setAttribute('aria-pressed',String(b.dataset.targetPlatform===target?.platform));b.disabled=!!state.busy;}
  const options=host?.targets?.filter(t=>t.platform===target?.platform)||[],select=$('export-architecture');
  const signature=options.map(t=>t.arch).join();if(select.dataset.signature!==signature){select.replaceChildren(...options.map(t=>new Option(t.cpu+' · '+t.arch,t.arch)));select.dataset.signature=signature;}if(target)select.value=target.arch;select.disabled=!!state.busy;
  $('export-buildability').textContent=target?.buildable?'Ready to build on this computer. The app will run on '+target.name+' '+target.cpu+'.':target?'Build this target on '+target.name+' '+target.cpu+' with its matching Make App download. Desktop apps are built for the current OS and CPU.':'';
  $('export-buildability').dataset.ready=String(!!target?.buildable);$('use-this-computer').disabled=!!state.busy||!host||!!target?.buildable;
  const p=state.selected,ready=!!p&&!p.selection&&p.configured!==false&&(web?p.webAvailable:p.standalone?.supported!==false&&target?.buildable);
  $('export-readiness-summary').textContent=!p?'Choose a project folder to check its setup.':p.selection?'This workspace has several projects. Choose one in Project details.':p.configured===false?'Choose a runnable entry point in Project details.':web?(p.webAvailable?'An existing static build is ready to export.':'Build the static frontend first, then choose its folder.'):p.standalone?.supported===false?p.standalone.reason:!target?.buildable?'Choose this computer’s target to create the app here.':'Ready to create a standalone app.';
  $('export-readiness-summary').dataset.ready=String(ready);const checks=$('export-checks');checks.replaceChildren();
  for(const [text,done]of [[p?'Project: '+p.name:'Choose a project folder.',!!p&&!p.selection],[web?'Public static assets are copied to a new folder.':'Project files, dependencies and the supported runtime or compiled build are bundled.',!!p&&(web?!!p.webAvailable:p.standalone?.supported!==false)],[web?'Use an HTTPS host for browser installation.':'First launch verifies and extracts a private writable copy. Later launches reuse it.',true],[p?.requiredEnvironment?.length?'Required settings: '+p.requiredEnvironment.join(', ')+'. Provide these separately.':'External accounts and credentials are not supplied by Make App.',!p?.requiredEnvironment?.length]]){const li=document.createElement('li');li.textContent=text;li.dataset.ready=String(done);checks.append(li);}
  $('export-sharing-copy').textContent=web?'Host the exported folder over HTTPS for phones, tablets and browsers. Native code and backend services still need their own host.':(target?.share||'Use the output for the matching OS and CPU.')+' The original project folder and Make App are not required on the receiving computer.'+(target?.platform==='win32'?' Single-file output is limited to 2 GB.':'');
  $('export-host').textContent=host?(window.makeApp.preview?'Browser demonstration · ':'This computer: ')+host.name+' '+host.arch:'';
  const completed=state.completed;$('latest-export').hidden=!completed?.executable;$('latest-export-path').textContent=completed?.executable||'';
  for(const id of ['export-desktop','export-web','show-latest-output','copy-output','another-app'])$(id).disabled=!!state.busy;
 }
 for(const button of dialog.querySelectorAll('[data-target-platform]'))button.onclick=()=>{const os=button.dataset.targetPlatform,choices=state.platform.targets.filter(t=>t.platform===os),choice=choices.find(t=>t.arch===state.platform.arch)||choices[0];controller.selectTarget(os,choice.arch);};
 $('export-architecture').onchange=()=>controller.selectTarget(state.target.platform,$('export-architecture').value);
 $('export-ask-save').onchange=()=>{$('ask-save').checked=$('export-ask-save').checked;$('ask-save').dispatchEvent(new Event('change'));};
 $('use-this-computer').onclick=()=>controller.selectTarget(state.platform.platform,state.platform.arch);
 $('matching-downloads').onclick=()=>window.makeApp.guide?.('downloads');
 $('export-desktop').onclick=()=>controller.useFormat('desktop');$('export-web').onclick=()=>controller.useFormat('web');
 $('close-export-settings').onclick=close;$('export-back').onclick=()=>{close();$('make').focus();};$('show-latest-output').onclick=()=>$('reveal').click();
 $('export-options-button').onclick=open;$('projects-tool').onclick=()=>window.makeAppViews.open('projects');
 $('export-settings-title').tabIndex=-1;window.addEventListener('make-app:state',event=>{state=event.detail;draw();});
 document.addEventListener('keydown',event=>{if(event.altKey&&event.key.toLowerCase()==='e'){event.preventDefault();open();}});
 dialog.addEventListener('close',()=>$('export-options-button').focus({preventScroll:true}));window.makeAppWorkflow=Object.freeze({open,close});draw();
})();
