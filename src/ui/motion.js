// One shared motion layer for the original collection, Studio, website and launch screens.
(() => {
 const root=document.documentElement,reduced=matchMedia('(prefers-reduced-motion:reduce)'),coarse=matchMedia('(hover:none)');
 const controls='button,a[href],summary,.format,input,select,textarea,[role=tab]';
 const panels='section,article,aside,nav,footer,.glass,.workspace,.view-card,.view-feature,.views-stage,.original-receipt,.review,.creation-bar,.app-header,.folder-row,.studio-art,.setup-step,.steps,.project-row,.product-frame,.agent-panel,.how-card,.sidebar,.app-card,.toolbar,.topbar';
 const text='h1,h2,h3,p,label,dt,dd,summary,.eyebrow,.scene-label,.scene-brand-word,.step-label';
 const pictures='img,.symbol';
 const selector=controls+','+panels+','+text+','+pictures;
 const known=new WeakSet(),entered=new WeakSet(),visible=new Set(),owned=new Set(),running=new WeakMap(),sheens=new WeakMap();
 let timer,frame,point,started=false,lastPhase,lastPointerTarget;
 const quiet=()=>reduced.matches||root.dataset.motion==='quiet';
 const active=()=>!quiet()&&!document.hidden;
 const subtle=()=>root.dataset.motion==='subtle';
 const usable=e=>{const origin=e.closest('.motion-sheen')?.parentElement||e;return origin.isConnected&&!origin.closest('[hidden],[aria-hidden=true]:not(.scene-art),.sr-only')&&getComputedStyle(origin).display!=='contents'&&origin.getClientRects().length>0};
 function animate(e,keyframes,options={}){
  if(!active()||!usable(e))return;
  const a=e.animate(keyframes,{duration:subtle()?240:440,easing:'cubic-bezier(.2,.75,.2,1)',...options});owned.add(a);
  let set=running.get(e);if(!set){set=new Set();running.set(e,set)}set.add(a);
  a.finished.catch(()=>{}).finally(()=>{owned.delete(a);set.delete(a)});return a;
 }
 function enter(e,index=0){
  if(entered.has(e)||!active()||!usable(e))return;entered.add(e);
  const picture=e.matches(pictures),reading=e.matches(text),distance=subtle()?2:reading?0:picture?4:6;
  animate(e,[{opacity:picture?0.86:reading?0.94:1,translate:'0 '+distance+'px'},{opacity:1,translate:'0 0'}],{duration:picture?600:reading?300:380,delay:Math.min(index*18,100)});
 }
 function surface(e){
  if(!e||e.matches('input,select,textarea,img,.symbol')||!usable(e))return null;
  let host=sheens.get(e);if(!host?.isConnected){
   if(getComputedStyle(e).position==='static')e.classList.add('motion-host');
   host=document.createElement('span');host.className='motion-sheen';host.setAttribute('aria-hidden','true');e.append(host);sheens.set(e,host);
  }return host;
 }
 function shine(e,working=false){
  if(!active())return;const host=surface(e);if(!host||host.childElementCount>1)return;
  const film=document.createElement('span');film.className='motion-film';host.append(film);
  if(working){host.classList.add('motion-working');return;}
  const a=animate(film,[{translate:'0 0',opacity:0},{translate:'80% 0',opacity:subtle()?.12:.28,offset:.28},{translate:'280% 0',opacity:0}],{duration:subtle()?650:950});
  if(a)a.finished.catch(()=>{}).finally(()=>film.remove());else film.remove();
 }
 function press(e,event){
  if(!active()||e.disabled||!usable(e))return;
  animate(e,[{scale:1},{scale:.975,offset:.32},{scale:1}],{duration:360,easing:'cubic-bezier(.2,.85,.25,1)'});
  const host=surface(e);if(!host)return;const rect=e.getBoundingClientRect(),width=e.offsetWidth||rect.width,height=e.offsetHeight||rect.height,ripple=document.createElement('span');ripple.className='motion-ripple';
  const x=event?.clientX?(event.clientX-rect.left)*width/rect.width:width/2,y=event?.clientY?(event.clientY-rect.top)*height/rect.height:height/2;
  ripple.style.left=(x-18)+'px';ripple.style.top=(y-18)+'px';host.append(ripple);
  const a=animate(ripple,[{scale:.3,opacity:.5},{scale:Math.min(20,Math.max(width,height)/20),opacity:0}],{duration:subtle()?420:700});
  if(a)a.finished.catch(()=>{}).finally(()=>ripple.remove());else ripple.remove();
 }
 function glow(e){
  if(!active()||!usable(e))return;
  const normal=getComputedStyle(e).boxShadow,color=getComputedStyle(root).getPropertyValue('--accent-line').trim()||'#87d8ef';
  animate(e,[{boxShadow:normal},{boxShadow:'0 0 0 3px '+color+', 0 0 20px '+color,offset:.38},{boxShadow:normal}],{duration:600});
 }
 function pictureAt(e){return e?.closest?.('.studio-art,.view-feature,.original-receipt,.original-identity,.theme-choice,.view-theme-card,.brand,.hero-product,.symbol')?.querySelector('img')||e?.closest?.('img,.symbol')}
 function resetPicture(e){if(!e)return;e.classList.remove('motion-pointed');for(const p of ['--motion-photo-x','--motion-photo-y','--motion-photo-angle'])e.style.removeProperty(p)}
 function pointer(event){
  if(!active()||coarse.matches)return;point={x:event.clientX,y:event.clientY,target:event.target};if(frame)return;
  frame=requestAnimationFrame(()=>{frame=undefined;const image=pictureAt(point.target);if(image!==lastPointerTarget){resetPicture(lastPointerTarget);lastPointerTarget=image}if(!image?.matches('.motion-picture')||!usable(image))return;const r=image.getBoundingClientRect(),x=Math.max(-1,Math.min(1,(point.x-r.left)/r.width*2-1)),y=Math.max(-1,Math.min(1,(point.y-r.top)/r.height*2-1)),amount=subtle()?1:3;image.classList.add('motion-pointed');image.style.setProperty('--motion-photo-x',x*amount+'px');image.style.setProperty('--motion-photo-y',y*amount+'px');image.style.setProperty('--motion-photo-angle',x*(subtle()?.15:.45)+'deg')});
 }
 const observer=new IntersectionObserver(entries=>{
  let index=0;for(const {target,isIntersecting}of entries){target.classList.toggle('motion-in-view',isIntersecting);if(isIntersecting){visible.add(target);enter(target,index++)}else visible.delete(target)}
 },{threshold:.08});
 function register(node){
  if(node.nodeType!==1||node.closest('.motion-sheen,.motion-water'))return;
  const elements=[...(node.matches(selector)?[node]:[]),...node.querySelectorAll(selector)];let index=0;
  for(const e of elements){if(known.has(e)||e.closest('.motion-sheen,.motion-water,.sr-only')||e.matches('.scene-art,.scene-dragbar,.scene-caption,.original-window-controls button,#terminal *,pre,pre *'))continue;
   known.add(e);if(e.matches(controls))e.classList.add(e.matches('input,select,textarea')?'motion-field':'motion-button');if(e.matches(panels))e.classList.add('motion-panel');if(e.matches(pictures)){e.classList.add('motion-picture');e.style.setProperty('--motion-photo-delay',(-index++%7)+'s')}
   observer.observe(e);
  }
 }
 function reveal(container){
  if(!active())return;let i=0;for(const e of container.querySelectorAll(selector)){if(known.has(e)&&usable(e)){entered.delete(e);enter(e,i++)}}
  if(container.matches('dialog'))animate(container,[{translate:'0 10px',scale:.994},{translate:'0 0',scale:1}],{duration:390});
 }
 function phase(){
  const phase=document.body.dataset.phase;if(phase===lastPhase)return;lastPhase=phase;
  for(const host of document.querySelectorAll('.motion-working')){host.classList.remove('motion-working');host.replaceChildren()}
  if(phase==='creating')shine(document.getElementById('make'),true);
  if(phase==='success'){for(const e of document.querySelectorAll('.result-area,.success-card,#reveal')){if(usable(e)){enter(e);glow(e);shine(e)}}}
  if(phase==='error'){const e=document.getElementById('status');if(e)animate(e,[{translate:'0 0'},{translate:'-2px 0',offset:.25},{translate:'2px 0',offset:.65},{translate:'0 0'}],{duration:260})}
 }
 function schedule(){
  clearTimeout(timer);if(!active())return;timer=setTimeout(()=>{
   if(active()){
    const dialog=[...document.querySelectorAll('dialog[open]')].at(-1),candidates=[...visible].filter(e=>e.isConnected&&e.matches('button,.format,.glass,.view-card,.studio-art,.original-receipt,.creation-bar')&&(!dialog||dialog.contains(e))&&!e.disabled&&usable(e));
    const e=candidates[Math.floor(Math.random()*candidates.length)];if(e)shine(e);
   }schedule();
  },subtle()?16000:10000);
 }
 function preference(){
  if(!root.dataset.motion){try{const p=JSON.parse(localStorage.getItem('make-app-motion'));if(['system','full','subtle','quiet'].includes(p))root.dataset.motion=p}catch{}}
  root.dataset.motionReady='true';
  if(quiet()){for(const a of owned)a.cancel();for(const e of document.querySelectorAll('.motion-sheen')){e.classList.remove('motion-working');e.replaceChildren()}resetPicture(lastPointerTarget)}
  schedule();
 }
 function start(){
  if(started)return;started=true;preference();register(document.body);
  const art=document.querySelector('.scene-art');if(art){const wash=document.createElement('span');wash.className='motion-water';wash.setAttribute('aria-hidden','true');art.append(wash)}
  new MutationObserver(records=>{
   for(const record of records){
    if(record.type==='childList'){
     for(const n of record.addedNodes)register(n);
     for(const n of record.removedNodes){if(n.nodeType!==1)continue;for(const e of [n,...n.querySelectorAll(selector)]){observer.unobserve(e);visible.delete(e);for(const a of running.get(e)||[])a.cancel()}}
    }else if(record.attributeName==='data-motion')preference();
    else if(record.attributeName==='data-phase')phase();
    else if(record.attributeName==='open'){root.toggleAttribute('data-motion-dialog',!!document.querySelector('dialog[open]'));if(record.target.open)reveal(record.target)}
    else if(record.attributeName==='hidden'&&!record.target.hidden)enter(record.target);
    else if((record.attributeName==='aria-pressed'&&record.target.getAttribute('aria-pressed')==='true')||(record.attributeName==='aria-current'&&record.target.hasAttribute('aria-current'))){glow(record.target);shine(record.target)}
   }
  }).observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['open','hidden','aria-pressed','aria-current','data-motion','data-phase']});
  document.addEventListener('pointermove',pointer,{passive:true});document.addEventListener('pointerleave',()=>resetPicture(lastPointerTarget));
  document.addEventListener('pointerover',event=>{const e=event.target.closest(controls)||event.target.closest(panels);if(e&&!e.contains(event.relatedTarget)&&!e.disabled)shine(e)});
  document.addEventListener('pointerdown',event=>{const e=event.target.closest(controls);if(e)press(e,event)},{passive:true});
  document.addEventListener('focusin',event=>{const e=event.target.closest(controls);if(e){glow(e);shine(e)}});
  document.addEventListener('keydown',event=>{if(event.repeat||!['Enter',' '].includes(event.key))return;const e=event.target.closest('button,a[href],summary,.format');if(e)press(e)});
  document.addEventListener('change',event=>{if(event.target.matches('input,select,textarea')){glow(event.target);const format=event.target.closest('.format');if(format)shine(format)}});
  document.addEventListener('visibilitychange',()=>{root.toggleAttribute('data-motion-paused',document.hidden);if(document.hidden){for(const a of owned)a.cancel();cancelAnimationFrame(frame);frame=undefined;resetPicture(lastPointerTarget)}schedule()});
  reduced.addEventListener('change',preference);window.addEventListener('storage',event=>{if(event.key==='make-app-motion'){try{root.dataset.motion=JSON.parse(event.newValue)||'system'}catch{root.dataset.motion='system'}}});
  window.addEventListener('resize',()=>{for(const a of owned)a.cancel();resetPicture(lastPointerTarget)});
  window.addEventListener('make-app:appearance',()=>{for(const a of owned)a.cancel();requestAnimationFrame(()=>{register(document.body);reveal(document.querySelector('.creator-shell')||document.body);schedule()})});
  window.addEventListener('make-app:created',()=>{requestAnimationFrame(phase)});
  window.makeAppMotion=Object.freeze({get mode(){return quiet()?'quiet':subtle()?'subtle':'full'},get activeAnimations(){return owned.size},preview(element){if(usable(element)&&active()){shine(element);glow(element);}},effects:['shine','entrance','spring','ripple','image-depth','panel-light','state-feedback']});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
