// Complete app shells built from the original approved collection.
(() => {
 const ids=['midnight_tide','botanical_canopy','stratosphere','pearl_current','citrus_circuit','cobalt_hydro','aurora_lake','sunset_estuary','glacial_quartz','meadow_os'];
 const $=id=>document.getElementById(id),dialog=$('app-views');
 const identity=document.createElement('div');identity.className='original-identity';
 const emblem=document.createElement('img');emblem.alt='';const name=document.createElement('strong'),edition=document.createElement('span');edition.textContent='Original collection';identity.append(emblem,name,edition);$('views-nav').before(identity);
 const rail=document.createElement('aside');rail.className='original-receipt';rail.setAttribute('aria-label','Current project');
 const art=document.createElement('img');art.className='original-signature';art.alt='';const title=document.createElement('h2'),kind=document.createElement('p'),facts=document.createElement('dl');
 function fact(label){const group=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;group.append(dt,dd);facts.append(group);return dd;}
 const output=fact('Output'),setup=fact('First launch'),origin=fact('Project files');
 const actions=document.createElement('div');actions.className='original-actions';
 function action(label,callback){const b=document.createElement('button');b.type='button';b.className='button secondary';b.textContent=label;b.addEventListener('click',callback);actions.append(b);return b;}
 action('Export options',()=>window.makeAppWorkflow.open());action('Back to creator',()=>dialog.close());action('Change design',()=>{dialog.close();$('appearance').click();});
 const foot=document.createElement('p');foot.className='original-foot';foot.textContent='No account. No API key.';rail.append(art,title,kind,facts,actions,foot);dialog.querySelector('.views-layout').append(rail);
 const toolbar=document.createElement('div');toolbar.className='original-toolbar-actions';
 const create=action('Create app',()=>dialog.close());create.className='button primary';toolbar.append(create);
 const native=document.createElement('div');native.className='original-window-controls';
 if(window.makeApp?.window){for(const [id,label]of [['minimize','Minimize window'],['maximize','Maximize or restore window'],['close','Close window']]){const b=document.createElement('button');b.type='button';b.setAttribute('aria-label',label);b.dataset.windowAction=id;const img=document.createElement('img');img.alt='';b.append(img);b.addEventListener('click',()=>window.makeApp.window(id));native.append(b);}}
 toolbar.append(native);dialog.querySelector('.views-toolbar').insertBefore(toolbar,$('close-views'));
 let state=window.makeAppCreator.state();window.addEventListener('make-app:state',event=>{state=event.detail;updateReceipt();});
 function updateReceipt(){
  title.textContent=state.name||$('name').value||'Your next app';kind.textContent=state.selected?.label||$('detected').textContent||'Choose a project';
  output.textContent=state.format==='web'?'Web export':(state.target?.name||'Desktop')+' · '+(state.target?.arch||'');setup.textContent=$('fact-setup').textContent;origin.textContent=state.format==='web'?'Static assets only':'Bundled snapshot';
  create.textContent=state.busy?'View creation':state.phase==='success'?'View saved app':'Create app';create.setAttribute('aria-label',state.busy?'Return to creation progress':'Return to creator');
 }
 function apply(){
  const id=document.documentElement.dataset.aero,original=ids.includes(id);dialog.toggleAttribute('data-original',original);if(original)dialog.dataset.original=id;else delete dialog.dataset.original;
  if(!original){dialog.querySelector('.views-brand img').src='assets/brand.png';return;}
  const scene=window.makeAppScenes[id];name.textContent=scene.name;emblem.src='assets/originals/'+id+'-brand.jpg';art.src='assets/originals/'+id+'-signature.jpg';dialog.querySelector('.views-brand img').src=emblem.src;
  for(const b of native.querySelectorAll('button'))b.querySelector('img').src='assets/photographic/'+id+'/'+b.dataset.windowAction+'.png';
  updateReceipt();
 }
 dialog.querySelector('.views-toolbar').addEventListener('dblclick',event=>{if(event.target.closest('button,a'))return;if(dialog.hasAttribute('data-original'))window.makeApp?.window?.('maximize');});
 window.addEventListener('make-app:appearance',apply);apply();
 const originalButton=$('open-originals');originalButton.addEventListener('click',()=>{if(dialog.open)dialog.close();$('appearance').click();$('collection-original').click();});
 // Non-persistent preview links make every original screen directly reviewable.
 const requested=new URLSearchParams(location.search).get('view');
 if(requested)window.makeAppViews.open(requested);
})();
