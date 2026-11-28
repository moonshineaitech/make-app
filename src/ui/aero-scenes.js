// Bitmap materials and source-pixel geometry; every value and action remains a real control.
(() => {
 const scenes=window.makeAppScenes||{},root=document.documentElement,main=document.querySelector('.creator-shell'),viewport=document.getElementById('creator-viewport');
 if(window.makeApp?.window)document.body.classList.add('native-window');
 const byId=id=>document.getElementById(id),original=new Map(),moved=new Map(),originalHidden=new Map();
 const photoMedia=matchMedia('(min-width:860px)'),forced=matchMedia('(forced-colors:active)');
 let scene,active=false;
 for(const action of ['minimize','maximize','close'])byId('scene-'+action).disabled=!window.makeApp?.window;
 const remember=node=>{if(node&&!original.has(node))original.set(node,node.getAttribute('style'));return node;};
 function box(node,r){if(!node||!r)return;remember(node);Object.assign(node.style,{left:r[0]+'px',top:r[1]+'px',width:r[2]+'px',height:r[3]+'px'});node.classList.add('photo-slot');}
 const measuring=document.createElement('canvas').getContext('2d');
 function metrics(spec,size=spec.fontSize){measuring.font=spec.fontStyle+' '+spec.weight+' '+size+'px Geist';measuring.letterSpacing=spec.letterSpacing+'px';return measuring.measureText(spec.text||'Focus Notes');}
 function text(node,spec,value){
  if(!node||!spec)return;
  box(node,spec.box);Object.assign(node.style,{fontSize:spec.fontSize+'px',fontWeight:spec.weight,lineHeight:spec.fontSize+'px',color:spec.color,letterSpacing:spec.letterSpacing+'px',fontStyle:spec.fontStyle});
  if(value!==undefined)node.textContent=value;
  if(spec.ink){
   const m=metrics(spec),sx=spec.ink[2]/Math.max(1,m.actualBoundingBoxLeft+m.actualBoundingBoxRight),sy=spec.ink[3]/Math.max(1,m.actualBoundingBoxAscent+m.actualBoundingBoxDescent);
   const baseline=(spec.fontSize-m.fontBoundingBoxAscent-m.fontBoundingBoxDescent)/2+m.fontBoundingBoxAscent;
   Object.assign(node.style,{left:(spec.ink[0]+m.actualBoundingBoxLeft*sx)+'px',top:(spec.ink[1]-(baseline-m.actualBoundingBoxAscent)*sy)+'px',width:Math.max(spec.box[2],m.width+20)+'px',height:spec.fontSize+'px',transform:'scale('+sx+','+sy+')',transformOrigin:'0 0'});
  }
 }
 function restore(){for(const [node,style]of original){if(style===null)node.removeAttribute('style');else node.setAttribute('style',style);node.classList.remove('photo-slot','photo-control');}for(const[node,hidden]of originalHidden)node.hidden=hidden;for(const[node,anchor]of moved)anchor.after(node);delete root.dataset.photo;viewport.style.height='';viewport.style.width='';viewport.style.maxWidth='';}
 function moveToInformation(node){if(!node)return;if(!moved.has(node)){const anchor=document.createComment('original project information position');node.before(anchor);moved.set(node,anchor);}byId('project-information-content').append(node);}
 function material(node,key){if(!node||!scene.controls[key])return;box(node,scene.controls[key]);node.classList.add('photo-control');node.style.backgroundImage='url("assets/photographic/'+scene.id+'/'+key+'.png")';}
 const staticNodes={
  headline:()=>document.querySelector('.creator-intro h1'),subtitle:()=>document.querySelector('.creator-intro .intro'),
  sourceLabel:()=>byId('source-label'),savedLabel:()=>document.querySelector('label[for=saved]'),formatLabel:()=>byId('format-label'),nameLabel:()=>byId('name-label'),
  brandSecondary:()=>byId('scene-secondary-brand'),reviewTitle:()=>byId('scene-review-title'),reviewKind:()=>byId('scene-review-kind'),reviewSetup:()=>byId('scene-setup'),reviewOrigin:()=>byId('scene-origin'),setupLabel:()=>byId('scene-setup-title'),originLabel:()=>byId('scene-location-title'),footer:()=>byId('footer-copy'),
  stepOne:()=>byId('scene-step-one'),stepTwo:()=>byId('scene-step-two'),stepThree:()=>byId('scene-step-three'),stepSource:()=>byId('scene-step-source'),stepOutput:()=>byId('scene-step-output'),stepCreate:()=>byId('scene-step-create'),stepSourceCopy:()=>byId('scene-step-source-copy'),stepOutputCopy:()=>byId('scene-step-output-copy'),stepCreateCopy:()=>byId('scene-step-create-copy')
 };
 function resize(){if(!active)return;const scale=Math.min(innerWidth/1487,window.makeApp?.window?Math.max(300,innerHeight-86)/1058:1.4,1.4);main.style.transform='scale('+scale+')';viewport.style.height=(1058*scale)+'px';viewport.style.width=(1487*scale)+'px';viewport.style.maxWidth=(1487*1.4)+'px';}
 function relative(spec,parent){return {...spec,box:[spec.box[0]-parent[0],spec.box[1]-parent[1],spec.box[2],spec.box[3]],ink:spec.ink?[spec.ink[0]-parent[0],spec.ink[1]-parent[1],spec.ink[2],spec.ink[3]]:undefined};}
 function controlText(node,key,value){const spec=scene.text[key];if(!node||!spec)return;remember(node);const parent=scene.controls[node.id==='browse-label'?'browse':node.id==='make-label'?'make':node.id==='desktop-label'?'desktop':'web'];text(node,relative(spec,parent),value);}
 function field(node,id,key){
  material(node,id);const value=scene.text[key],r=scene.controls[id];if(!value)return;
  const ink=value.ink||value.box,initial=metrics(value),size=value.ink?value.fontSize*ink[3]/Math.max(1,initial.actualBoundingBoxAscent+initial.actualBoundingBoxDescent):value.fontSize,m=metrics(value,size);
  const spacing=(ink[2]-m.actualBoundingBoxLeft-m.actualBoundingBoxRight)/Math.max(1,value.text.length-1),baseline=(r[3]-m.fontBoundingBoxAscent-m.fontBoundingBoxDescent)/2+m.fontBoundingBoxAscent,offset=ink[1]-r[1]-(baseline-m.actualBoundingBoxAscent);
  Object.assign(node.style,{fontSize:size+'px',fontWeight:value.weight,color:value.color,fontFamily:"Geist,'Segoe UI',sans-serif",paddingLeft:Math.max(0,ink[0]-r[0]+m.actualBoundingBoxLeft)+'px',paddingRight:'28px',paddingTop:Math.max(0,offset*2)+'px',paddingBottom:Math.max(0,-offset*2)+'px',lineHeight:size+'px',letterSpacing:spacing+'px'});
  if(id==='source'){const browse=scene.controls.browse;if(browse[0]<r[0]+r[2])node.style.paddingRight=(r[0]+r[2]-browse[0]+12)+'px';}
 }
 function mark(label,id){const r=scene.icons[id+'Mark'];if(!r)return;const control=scene.controls[id],node=label.querySelector('.choice-check');box(node,[r[0]-control[0],r[1]-control[1],r[2],r[3]]);node.style.setProperty('--checked-mark','url("assets/photographic/'+scene.id+'/desktopMark.png")');node.style.setProperty('--unchecked-mark','url("assets/photographic/'+scene.id+'/webMark.png")');}
 function apply(){
  const next=scenes[root.dataset.aero],should=!!next&&photoMedia.matches&&!forced.matches;
  if(!should){active=false;restore();scene=null;byId('web-label').textContent='Installable web app';document.querySelector('label[for=saved]').textContent='Or pick a saved Codex project';byId('project-information').close();return;}
  restore();scene=next;active=true;root.dataset.photo=scene.id;
  remember(main);remember(byId('appearance'));remember(document.querySelector('.scene-art'));
  document.querySelector('.scene-art').style.backgroundImage='url("assets/photographic/'+scene.id+'/art.png")';
  main.style.color=scene.colors.ink||'#102032';
  for(const node of document.querySelectorAll('.scene-label,.scene-control'))node.hidden=true;
  for(const [id,getNode]of Object.entries(staticNodes)){const node=getNode(),spec=scene.text[id];if(node){if(!originalHidden.has(node))originalHidden.set(node,node.hidden);node.hidden=!spec;}if(spec)text(node,spec,spec.text);}
  const brand=scene.text.brand,icon=scene.icons.brand||scene.icons.brandIcon;
  const brandBox=icon?[Math.min(icon[0],brand.box[0]),Math.min(icon[1],brand.box[1]),brand.box[0]+brand.box[2]-Math.min(icon[0],brand.box[0]),Math.max(icon[3],brand.box[3])]:brand.box;
  box(byId('appearance'),brandBox);
  text(document.querySelector('.scene-brand-word'),relative(brand,brandBox),'Make App');
  byId('appearance').title=scene.name+' · click to change theme (Alt+T)';
  const titlebar=scene.id==='citrus_circuit'?[30,86,1425,75]:scene.id==='sunset_estuary'?[30,61,1425,76]:scene.id==='cobalt_hydro'?[35,65,1418,69]:scene.id==='pearl_current'?[66,29,1387,64]:[8,8,1471,66];
  box(document.querySelector('.scene-dragbar'),titlebar);
  for(const name of ['minimize','maximize','close']){const node=byId('scene-'+name);box(node,scene.controls[name]);node.querySelector('img').src='assets/photographic/'+scene.id+'/'+name+'.png';node.disabled=!window.makeApp?.window;}
  field(byId('source'),'source','sourceValue');field(byId('saved'),'saved','savedValue');field(byId('name'),'name','nameValue');
  material(byId('browse'),'browse');controlText(byId('browse-label'),'browseLabel','Browse');
  for(const id of ['desktop','web']){const label=document.querySelector('.format:has(input[value='+id+'])');material(label,id);controlText(byId(id==='desktop'?'desktop-label':'web-label'),id+'Label',id==='desktop'?byId('desktop-label').textContent:'Web export');mark(label,id);}
  material(byId('make'),'make');controlText(byId('make-label'),'makeLabel');
  const d=scene.text.detected,di=scene.icons.detected;
  if(d){const r=di?[Math.min(di[0],d.box[0]),Math.min(di[1],d.box[1]),d.box[0]+d.box[2]-Math.min(di[0],d.box[0]),Math.max(44,d.box[3],di[3])]:d.box;box(byId('project-details'),r);text(byId('detected'),relative(d,r));if(di){box(byId('detection-icon'),[di[0]-r[0],di[1]-r[1],di[2],di[3]]);byId('detection-icon').style.setProperty('--photo-detected','url("assets/photographic/'+scene.id+'/detected.png")');}}
  for(const [key,id,textKey]of [['sidebarProject','scene-sidebar-project','sidebarProject'],['sidebarSaved','scene-sidebar-saved','sidebarSaved'],['sidebarChoice','scene-sidebar-choice','sidebarChoice']]){const node=byId(id);node.hidden=!scene.controls[key];if(scene.controls[key]){material(node,key);if(scene.text[textKey]){const t=scene.text[textKey],r=scene.controls[key];Object.assign(node.style,{fontSize:t.fontSize+'px',fontWeight:t.weight,color:t.color,paddingLeft:Math.max(0,t.box[0]-r[0])+'px',textAlign:'left'});}}}
  for(const node of [document.querySelector('.review'),byId('entry-area'),byId('subproject-area'),byId('requirements'),byId('credentials'),byId('web-hint')])moveToInformation(node);
  const action=scene.controls.make;remember(byId('busy-progress'));byId('busy-progress').style.cssText='left:'+action[0]+'px;top:'+(action[1]-12)+'px;width:'+action[2]+'px';
  resize();reflect();
 }
 function reflect(){
  if(!active||!scene)return;
  const web=document.querySelector('input[name=format]:checked').value==='web';
  const action=scene.text.makeLabel,label=byId('make-label'),caption=label.textContent;
  if(action?.ink){
   const canonical=metrics(action),current=metrics({...action,text:caption}),factor=action.ink[2]/Math.max(1,canonical.actualBoundingBoxLeft+canonical.actualBoundingBoxRight),width=Math.min(action.ink[2],(current.actualBoundingBoxLeft+current.actualBoundingBoxRight)*factor),shrink=Math.min(1,action.ink[2]/Math.max(1,(current.actualBoundingBoxLeft+current.actualBoundingBoxRight)*factor));
   controlText(label,'makeLabel');
   const parent=scene.controls.make;
   text(label,relative({...action,text:caption,ink:[action.ink[0]+(action.ink[2]-width)/2,action.ink[1]+action.ink[3]*(1-shrink)/2,width,action.ink[3]*shrink]},parent));
  }
  byId('scene-review-kind').textContent=scene.reviewKind==='format'?byId('desktop-label').textContent:byId('fact-kind').textContent;
  byId('scene-setup').textContent=byId('fact-setup').textContent;
  byId('scene-origin').textContent=web?'Static assets':'Bundled project';byId('scene-location-title').textContent='Project files';
  if(scene.text.reviewTitle)byId('scene-review-title').textContent=scene.text.reviewTitle.text;
  const detection=byId('detected');detection.style.color=document.body.dataset.phase==='error'?'var(--danger)':scene.text.detected?.color||scene.colors.ink||'#102032';
  const short=byId('scene-sidebar-choice'),options=[...byId('saved').options],signature=JSON.stringify(options.map(o=>[o.text,o.value]));if(short.dataset.options!==signature){short.replaceChildren(...options.map(option=>new Option(option.text,option.value)));short.dataset.options=signature;}short.value=byId('saved').value;
  short.disabled=byId('saved').disabled;byId('scene-sidebar-saved').disabled=short.disabled;byId('scene-sidebar-project').disabled=byId('source').disabled;
  const choice=window.makeAppCreator.state().selected;if(choice&&(choice.selection||choice.configured===false)&&document.body.dataset.phase==='ready'&&!['theme-picker','project-information','export-settings','app-views'].some(id=>byId(id).open))byId('project-information').showModal();
 }
 byId('project-details').addEventListener('click',()=>{if(!byId('project-information').open){for(const node of [document.querySelector('.review'),byId('entry-area'),byId('subproject-area'),byId('requirements'),byId('credentials'),byId('web-hint')])moveToInformation(node);byId('project-information').showModal();}});
 byId('close-project-information').addEventListener('click',()=>{byId('project-information').close();if(!active)for(const[node,anchor]of moved)anchor.after(node);});
 byId('scene-sidebar-project').addEventListener('click',()=>byId('source').focus());
 byId('scene-sidebar-saved').addEventListener('click',()=>{byId('scene-sidebar-choice').focus();byId('scene-sidebar-choice').showPicker?.();});
 byId('scene-sidebar-choice').addEventListener('change',event=>{byId('saved').value=event.target.value;byId('saved').dispatchEvent(new Event('change'));});
 for(const action of ['minimize','maximize','close'])byId('scene-'+action).addEventListener('click',()=>window.makeApp?.window?.(action));
 document.querySelector('.scene-dragbar').addEventListener('dblclick',()=>window.makeApp?.window?.('maximize'));
 document.addEventListener('keydown',event=>{if(event.altKey&&event.key.toLowerCase()==='t'){event.preventDefault();byId('appearance').click();}});
 window.addEventListener('make-app:appearance',apply);window.addEventListener('make-app:render',reflect);
 photoMedia.addEventListener('change',apply);forced.addEventListener('change',apply);window.addEventListener('resize',resize);
 new MutationObserver(reflect).observe(document.body,{attributes:true,attributeFilter:['data-phase']});
 apply();
 Promise.all([document.fonts.load('400 30px Geist'),document.fonts.load('700 60px Geist')]).then(apply);
})();
