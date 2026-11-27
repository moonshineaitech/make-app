// Focused utility views share the creator's real state and actions.
(() => {
 const $=id=>document.getElementById(id),root=document.documentElement,dialog=$('app-views'),content=$('view-content');
 const definitions=[['overview','At a glance','i-window'],['projects','Projects','i-folder'],['details','Project details','i-code'],['outputs','Output formats','i-monitor'],['setup','First launch','i-drive'],['activity','Build activity','i-terminal'],['results','Recent apps','i-download'],['connections','Coding tools','i-command'],['designs','Appearance','i-sun'],['preferences','Preferences','i-menu'],['help','Help & languages','i-help'],['about','About Make App','i-shield']];
 const load=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
 const save=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}};
 const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
 const icon=name=>{const e=node('span','icon '+name);e.setAttribute('aria-hidden','true');return e;};
 const button=(text,action,kind='secondary',glyph)=>{const e=node('button','button '+kind);e.type='button';if(glyph)e.append(icon(glyph));e.append(document.createTextNode(text));e.addEventListener('click',action);return e;};
 const notice=text=>{$('view-notice').textContent=text;};
 let state={},view='overview',lastResult,filter='',pinnedOnly=false,designFilter='',designCollection='all';
 const primaryViews=new Set(['overview','projects','results','designs']);
 const moreMenu=node('div','views-more-menu');moreMenu.id='views-more-menu';moreMenu.setAttribute('popover','auto');moreMenu.setAttribute('role','menu');moreMenu.setAttribute('aria-label','All app views');dialog.append(moreMenu);
 const moreButton=button('More',()=>{if(moreMenu.matches(':popover-open'))moreMenu.hidePopover();else{moreMenu.showPopover();positionMenu();(moreMenu.querySelector('[aria-current=page]')||moreMenu.querySelector('button')).focus();}},'quiet','i-menu');moreButton.id='views-more';moreButton.setAttribute('aria-haspopup','menu');moreButton.setAttribute('aria-controls',moreMenu.id);moreButton.setAttribute('aria-expanded','false');moreButton.hidden=true;
 function positionMenu(){const r=moreButton.getBoundingClientRect(),m=moreMenu.getBoundingClientRect();moreMenu.style.left=Math.max(12,Math.min(r.right-m.width,innerWidth-m.width-12))+'px';moreMenu.style.top=Math.max(12,Math.min(r.bottom+10,innerHeight-m.height-12))+'px';}
 function navLayout(){const compact=innerWidth<=650||['midnight_tide','stratosphere','aurora_lake','glacial_quartz','citrus_circuit'].includes(dialog.dataset.original);$('views-nav').dataset.compact=String(compact);moreButton.hidden=!compact;moreButton.classList.toggle('is-current',!primaryViews.has(view));moreButton.setAttribute('aria-label','More views'+(!primaryViews.has(view)?', current: '+definitions.find(d=>d[0]===view)[1]:''));if(!compact&&moreMenu.matches(':popover-open'))moreMenu.hidePopover();else if(moreMenu.matches(':popover-open'))positionMenu();}
 function selectView(id){if(moreMenu.matches(':popover-open'))moreMenu.hidePopover();view=id;filter='';render();content.querySelector('h1').focus({preventScroll:true});}
 moreMenu.addEventListener('toggle',()=>moreButton.setAttribute('aria-expanded',String(moreMenu.matches(':popover-open'))));
 moreMenu.addEventListener('keydown',event=>{const items=[...moreMenu.querySelectorAll('button')],index=items.indexOf(document.activeElement);let next;if(event.key==='ArrowDown')next=(index+1)%items.length;else if(event.key==='ArrowUp')next=(index-1+items.length)%items.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=items.length-1;if(next!==undefined){event.preventDefault();items[next].focus();}});
 window.addEventListener('resize',navLayout);new MutationObserver(navLayout).observe(dialog,{attributes:true,attributeFilter:['data-original']});
 dialog.addEventListener('close',()=>{if(moreMenu.matches(':popover-open'))moreMenu.hidePopover();});
 let recent=load('make-app-recent-outputs',[]);if(!Array.isArray(recent))recent=[];
 recent=recent.filter(r=>r&&typeof r.name==='string'&&typeof r.source==='string'&&r.source.length<8192).slice(0,20);
 let pins=load('make-app-pinned-projects',[]);if(!Array.isArray(pins))pins=[];
 pins=pins.filter(p=>typeof p==='string').slice(0,100);
 const projects=()=>[...$('saved').options].filter(o=>o.value).map(o=>({name:o.text,path:o.value}));
 function close(){if(moreMenu.matches(':popover-open'))moreMenu.hidePopover();dialog.close();}
 function returnToCreator(focus){close();if(focus)$(focus)?.focus();}
 function openProject(path){if(state.busy){notice('Finish or cancel the current app first.');return;}window.dispatchEvent(new CustomEvent('make-app:open-project',{detail:{path}}));returnToCreator('name');}
 function open(viewId='overview'){
  if(!definitions.some(d=>d[0]===viewId))viewId='overview';view=viewId;filter='';
  if($('theme-picker').open)$('theme-picker').close();if($('project-information').open)$('project-information').close();
  render();if(!dialog.open)dialog.showModal();content.querySelector('h1').focus({preventScroll:true});
 }
 function header(eyebrow,title,copy){const e=node('header','view-heading');e.append(node('p','view-eyebrow',eyebrow),node('h1','',title),node('p','view-intro',copy));content.append(e);}
 function card(title,copy,glyph){const e=node('article','view-card');if(glyph)e.append(icon(glyph));if(title)e.append(node('h2','',title));if(copy)e.append(node('p','',copy));return e;}
 function grid(...cards){const e=node('div','view-grid');e.append(...cards);content.append(e);return e;}
 function empty(title,copy,action){const e=card(title,copy,'i-folder');e.classList.add('view-empty');if(action)e.append(action);content.append(e);}
 function facts(items,parent=content){const dl=node('dl','view-facts');for(const [title,value]of items){const group=node('div');group.append(node('dt','',title),node('dd','',value||'Not selected'));dl.append(group);}parent.append(dl);return dl;}
 async function copy(text){try{await navigator.clipboard.writeText(text);notice('Copied to clipboard.');}catch{notice('Clipboard is unavailable here. Select the command or path to copy it.');}}
 function guide(section){
  const paths={downloads:'releases',connections:'blob/main/docs/HARNESSES.md',languages:'blob/main/docs/LANGUAGES.md',source:''};
  if(window.makeApp.guide)window.makeApp.guide(section).catch(e=>notice(e.message));
  else window.open('https://github.com/moonshineaitech/make-app/'+paths[section],'_blank','noopener,noreferrer');
 }
 function pickFormat(format){const input=document.querySelector('input[name=format][value='+format+']');if(input.disabled||state.busy){notice('This output is unavailable for the current project.');return;}input.checked=true;input.dispatchEvent(new Event('change'));returnToCreator('name');}
 function chooseTheme(id){const top=dialog.querySelector('.views-stage').scrollTop;close();$('appearance').click();document.querySelector('[data-theme-choice="'+id+'"]').click();$('close-themes').click();open('designs');dialog.querySelector('.views-stage').scrollTop=top;notice('Atmosphere applied. Your project is unchanged.');}
 function overview(){
  header('YOUR WORKSPACE','Open what you’re building.','Your projects, your desktop, your atmosphere. Everything stays on this computer.');
  const hero=node('div','view-feature workspace-feature'),art=node('figure','workspace-art'),img=node('img');img.src=dialog.dataset.original?'assets/originals/'+dialog.dataset.original+'-signature.jpg':themeImage();img.alt='';art.append(img);
  const body=node('div','view-feature-copy');body.append(node('p','view-eyebrow',state.selected?'CURRENT PROJECT':'START HERE'),node('h2','',state.name||'Your next app'),node('p','',state.selected?.label||'Choose a project folder. Make App detects its setup for you.'));
  const chips=node('div','workspace-chips');chips.append(node('span','',state.format==='web'?'Web export':(state.platform?.name||'Desktop')+' app'),node('span','',state.selected?'Project detected':'Choose a folder'));body.append(chips,button(state.selected?'Continue creating':'Choose a project',()=>{returnToCreator();if(!state.selected)$('browse').click();},'primary','i-arrow'));hero.append(art,body);content.append(hero);
  const shortcuts=node('div','workspace-shortcuts');for(const [label,id,glyph]of [['Your projects','projects','i-folder'],['Change atmosphere','designs','i-sun'],['Connect a coding tool','connections','i-command']])shortcuts.append(button(label,()=>open(id),'quiet',glyph));content.append(shortcuts);
  const section=node('section','workspace-projects'),top=node('div','workspace-section-heading');top.append(node('h2','','Saved projects'),button('View all',()=>open('projects'),'quiet','i-arrow'));section.append(top);
  const saved=projects().sort((a,b)=>Number(pins.includes(b.path))-Number(pins.includes(a.path))||a.name.localeCompare(b.name)).slice(0,3);
  if(!saved.length)section.append(node('p','workspace-empty','Your saved projects will appear here. Start by choosing a folder.'));
  for(const project of saved){const row=node('article','project-row'),picture=node('span','project-picture'),text=node('div','project-copy');picture.append(icon('i-folder'));text.append(node('h3','',project.name),node('p','path-text',project.path));const use=button('Open',()=>openProject(project.path),'secondary','i-arrow');use.disabled=!!state.busy;row.append(picture,text,use);section.append(row);}content.append(section);
 }
 function projectView(){
  header('PROJECT LIBRARY','Your projects.','Choose a saved project or browse a folder to create its app.');
  const toolbar=node('div','view-toolbar'),search=node('input');search.type='search';search.placeholder='Search projects or folders';search.setAttribute('aria-label','Search projects');search.value=filter;
  const list=node('div','project-list');search.addEventListener('input',()=>{filter=search.value;draw();});
  const pinButton=button(pinnedOnly?'Show all':'Pinned only',()=>{pinnedOnly=!pinnedOnly;pinButton.textContent=pinnedOnly?'Show all':'Pinned only';pinButton.setAttribute('aria-pressed',String(pinnedOnly));draw();});pinButton.setAttribute('aria-pressed',String(pinnedOnly));
  toolbar.append(search,pinButton,button('Browse folder',()=>{returnToCreator();$('browse').click();},'primary','i-folder'));content.append(toolbar,list);
  function draw(){list.replaceChildren();const items=projects().filter(p=>(p.name+' '+p.path).toLocaleLowerCase().includes(filter.toLocaleLowerCase())&&(!pinnedOnly||pins.includes(p.path))).sort((a,b)=>Number(pins.includes(b.path))-Number(pins.includes(a.path))||a.name.localeCompare(b.name));
   if(!items.length){list.append(card('Nothing here yet',filter?'Try a different name or folder.':'Browse a project folder, or switch back to all projects.','i-folder'));return;}
   for(const project of items){const row=node('article','project-row'),picture=node('span','project-picture');picture.append(icon('i-folder'));const text=node('div','project-copy');text.append(node('h2','',project.name),node('p','path-text',project.path));const pin=button(pins.includes(project.path)?'Unpin':'Pin',()=>{pins=pins.includes(project.path)?pins.filter(p=>p!==project.path):[...pins,project.path];save('make-app-pinned-projects',pins);draw();},'quiet');pin.setAttribute('aria-label',(pins.includes(project.path)?'Unpin ':'Pin ')+project.name);const use=button('Open',()=>openProject(project.path),'secondary','i-arrow');use.disabled=!!state.busy;row.append(picture,text,pin,use);list.append(row);}
  }draw();
 }
 function details(){
  header('PROJECT INSPECTION',state.name||'Everything starts with a folder.',state.selected?.label||'Choose a project to see its detected runtime, setup and entry points.');
  if(!state.source){empty('Choose your project','Make App reads the project structure to find its setup.',button('Browse a folder',()=>{returnToCreator();$('browse').click();},'primary'));return;}
  const a=card('Project folder',state.source,'i-folder');a.classList.add('path-card');a.append(button('Copy folder path',()=>copy(state.source),'quiet','i-copy'));content.append(a);
  facts([['Detected project',state.selected?.label||$('detected').textContent],['Output',state.format==='web'?'Static web export':(state.platform?.name||'Desktop')+' app'],['First launch',$('fact-setup').textContent],['Project copies','None for desktop output']]);
  const requirements=state.selected?.requirements||[];const b=card('What it uses',requirements.length?requirements.join(' · '):'Project requirements appear after inspection.','i-code');
  const c=card('Entry point',$('entry').selectedOptions[0]?.value?$('entry').selectedOptions[0].textContent:'Detected automatically','i-terminal');c.append(button('Review entry points',()=>{returnToCreator();$('project-details').click();}));grid(b,c);
 }
 function outputs(){
  header('ONE PROJECT, TWO WAYS TO SHARE','Choose where your app will live.','Create an app for this computer, or export a ready-built static frontend for the web.');
  const desktop=card((state.platform?.name||'Desktop')+' app','A one-click launcher for the original project folder. Setup runs on first launch.','i-monitor');facts([['File type',state.platform?.extension||'Native desktop app'],['Works on','A compatible desktop computer'],['Project folder','Keep the original folder in place']],desktop);desktop.append(button('Use desktop output',()=>pickFormat('desktop'),'primary','i-arrow'));
  const web=card('Installable web app','Export existing static assets for an HTTPS host, phones and browsers.','i-globe');facts([['Devices','Phones, tablets and browsers'],['Hosting','An HTTPS static host'],['Availability',state.selected?(state.selected.webAvailable?'Static build detected':'No static build detected'):'Choose a project first']],web);const choose=button('Use web output',()=>pickFormat('web'),'primary','i-arrow');choose.disabled=!state.selected?.webAvailable;web.append(choose);grid(desktop,web);
 }
 function setup(){
  header('FIRST LAUNCH','Let the setup take care of itself.','Your app opens the original project and prepares the runtime it needs.');
  const rows=[['01','Inspect',state.selected?.label||'Choose a project to detect its language and framework.'],['02','Prepare',state.selected?.requirements?.length?'Uses '+state.selected.requirements.join(' and ')+'.':$('requirements').textContent||'Project requirements are detected automatically.'],['03','Open','The finished desktop app launches your project with one click.']];
  const list=node('div','setup-steps');for(const [number,title,copy]of rows){const e=node('article','setup-step');e.append(node('span','step-number',number),node('h2','',title),node('p','',copy));list.append(e);}content.append(list);
  const settings=state.selected?.requiredEnvironment||[];const note=card(settings.length?'Project settings':'Before you share',settings.length?'This project needs: '+settings.join(', ')+'.':state.format==='web'?'Host the exported folder over HTTPS. Native code and backend services need their own runtime.':'The desktop app needs its original folder and a compatible computer.','i-shield');content.append(note,button('Back to your app',()=>returnToCreator(),'primary','i-arrow'));
 }
 function activity(){
  header('BUILD ACTIVITY',state.busy?'Making room for your next app.':document.body.dataset.phase==='success'?'Your app is ready.':'Every step, in one place.','Follow the current creation. You can return to the creator at any time.');
  const status=card(state.name||'No active creation',$('status').textContent||'Create an app to see its progress here.',state.busy?'i-loader':document.body.dataset.phase==='success'?'i-circle-check':'i-terminal');
  if(state.busy){const progress=node('progress');progress.setAttribute('aria-label','Creating app');status.append(progress,button('Cancel creation',()=>$('cancel').click()));}
  else status.append(button('Return to creator',()=>returnToCreator(),'primary','i-arrow'));content.append(status);
  const pre=node('pre','activity-log',$('log').textContent||'Build messages will appear here.');pre.tabIndex=0;pre.setAttribute('aria-label','Build messages');content.append(pre);
 }
 function results(){
  header('MADE BY YOU','Small ideas. Real apps.','Your recent creations, stored on this computer.');
  if(lastResult){const current=card(lastResult.name||state.name||'Your app',lastResult.preview?'Browser demonstration complete. Use the desktop app to create the real file.':$('status').textContent,'i-circle-check');current.classList.add('success-card');if(!$('reveal').hidden)current.append(button(lastResult.preview?'Get Make App':'Show saved app',()=>$('reveal').click(),'primary','i-folder'));content.append(current);}
  if(!recent.length&&!lastResult){empty('Your first app belongs here','Choose a project and create its desktop app or static web export.',button('Create an app',()=>returnToCreator(),'primary'));return;}
  if(recent.length){const toolbar=node('div','view-toolbar');toolbar.append(node('p','',recent.length+' recent '+(recent.length===1?'app':'apps')),button('Clear list',()=>{recent=[];save('make-app-recent-outputs',recent);render();notice('Recent list cleared. Your saved files are unchanged.');},'quiet'));content.append(toolbar);}
  for(const r of recent){const e=node('article','project-row'),text=node('div','project-copy');text.append(node('h2','',r.name),node('p','path-text',r.executable||r.source),node('p','',new Date(r.createdAt).toLocaleDateString(undefined,{month:'short',day:'numeric'})+' · '+(r.format==='web'?'Web export':'Desktop app')));e.append(icon(r.format==='web'?'i-globe':'i-window'),text,button('Copy path',()=>copy(r.executable||r.source),'quiet','i-copy'),button('Create again',()=>openProject(r.source)));content.append(e);}
 }
 function connections(){
  header('FITS THE WAY YOU WORK','A familiar tool. A new possibility.','Use the local converter directly, from Codex, or through another coding tool.');
  const clients=[['codex','Codex'],['claude','Claude Code'],['cursor','Cursor'],['vscode','VS Code / Copilot'],['gemini','Gemini CLI'],['opencode','OpenCode'],['generic','Another MCP client']];
  const host=card('Connect your coding tool','The complete integration bundle includes the local runtime and guided setup.','i-command');const label=node('label','', 'Your coding tool'),select=node('select');select.id='connection-client';label.htmlFor=select.id;for(const [id,name]of clients)select.append(new Option(name,id));host.append(label,select);
  const steps=node('ol','connection-steps');for(const text of ['Download and extract the integration bundle for your computer.','Open Connect Coding Tool and choose your project folder.','Open a fresh chat in your coding tool.'])steps.append(node('li','',text));host.append(steps,button('Open setup guide',()=>guide('connections'),'primary','i-up-right'));
  const advanced=node('details'),summary=node('summary','', 'Connection command'),command=node('pre','copy-command');command.tabIndex=0;const update=()=>{const p=state.source||'C:\\Projects\\My Project';command.textContent=state.platform?.name==='Windows'?"& '.\\Make App.cmd' connect "+select.value+" --project '"+p.replaceAll("'","''")+"'":"./make-app connect "+select.value+" --project '"+p.replaceAll("'","'\"'\"'")+"'";};select.addEventListener('change',update);update();advanced.append(summary,command,button('Copy command',()=>copy(command.textContent),'secondary','i-copy'));host.append(advanced);content.append(host);
  grid(card('Local by default','The project and converter run on your computer. A cloud-only chat needs a local bridge.','i-lock'),card('No Make App account','The converter and integration are free and open source. Your harness may have its own requirements.','i-shield'));
 }
 function themeImage(){const studio=window.makeAppStudioThemes.find(t=>t.id===root.dataset.aero);return studio?'assets/studio/'+studio.id+'.jpg':root.dataset.aero?'assets/aero/'+root.dataset.aero+'.jpg':'assets/brand.png';}
 function designs(){
  header('APPEARANCE','Find your atmosphere.','Twenty complete designs. Your project and creation progress stay with you.');
  const tools=node('div','design-library-tools'),tabs=node('div','design-library-tabs');tabs.setAttribute('role','group');tabs.setAttribute('aria-label','Filter design collection');
  const search=node('input');search.type='search';search.placeholder='Search atmospheres';search.setAttribute('aria-label','Search atmospheres');search.value=designFilter;
  const gallery=node('div','view-theme-grid'),status=node('p','design-library-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  function filterDesigns(){let count=0;for(const item of gallery.children){item.hidden=(designCollection!=='all'&&item.dataset.collection!==designCollection)||!item.dataset.name.includes(designFilter.toLocaleLowerCase());if(!item.hidden)count++;}status.textContent=count+' '+(count===1?'atmosphere':'atmospheres')+(designFilter?' matching “'+designFilter+'”':'');for(const b of tabs.children)b.setAttribute('aria-pressed',String(b.dataset.collection===designCollection));}
  for(const [id,label]of [['all','All 20'],['original','Originals'],['studio','Studio']]){const b=button(label,()=>{designCollection=id;filterDesigns();},'quiet');b.dataset.collection=id;tabs.append(b);}search.addEventListener('input',()=>{designFilter=search.value;filterDesigns();});tools.append(tabs,search);content.append(tools,status);
  for(const b of document.querySelectorAll('[data-theme-choice]')){const item=node('button','view-theme-card');item.type='button';const current=b.dataset.themeChoice===root.dataset.aero;item.setAttribute('aria-pressed',String(current));item.dataset.collection=b.dataset.collection;item.dataset.name=b.textContent.toLocaleLowerCase();const img=node('img');img.src=b.querySelector('img').getAttribute('src');img.alt='';img.loading='lazy';const caption=node('span','design-card-caption'),copy=node('span');copy.append(node('strong','',b.querySelector('strong').textContent),node('small','',b.dataset.collection==='original'?'Original collection':'Studio collection'));caption.append(copy);if(current){const check=node('span','design-current');check.append(icon('i-circle-check'),node('span','','Current'));caption.append(check);}item.append(img,caption);item.addEventListener('click',()=>chooseTheme(b.dataset.themeChoice));gallery.append(item);}content.append(gallery);filterDesigns();
  const classic=node('div','design-classic-note');classic.append(node('p','','Prefer a quieter canvas? Classic includes system, light and dark modes.'),button('Classic & theme settings',()=>{close();$('appearance').click();},'quiet','i-sun'));content.append(classic);
 }
 function preferences(){
  header('MAKE YOURSELF COMFORTABLE','A few thoughtful adjustments.','Saved on this device, ready the next time you open Make App.');
  const settings=[['density','Spacing',[['comfortable','Comfortable'],['compact','Compact']],'Comfortable'],['motion','Motion',[['system','Follow system'],['full','Glass motion'],['subtle','Subtle motion'],['quiet','Reduced motion']],'Follow system']];
  for(const [key,title,options]of settings){const c=card(title,key==='density'?'Choose the spacing for utility views and the new layouts.':'Glass shine, gentle depth and responsive movement. Choose the level that feels right.');const label=node('label','sr-only',title),select=node('select');select.id='preference-'+key;label.htmlFor=select.id;for(const [id,text]of options)select.append(new Option(text,id));select.value=root.dataset[key]||options[0][0];select.addEventListener('change',()=>{root.dataset[key]=select.value;save('make-app-'+key,select.value);notice(title+' saved.');});c.append(label,select);content.append(c);}
  const c=card('Your atmosphere','Choose from twenty photographic designs, or use Classic with system, light and dark modes.','i-sun');c.append(button('Change appearance',()=>open('designs')));content.append(c);
 }
 function help(){
  header('A LITTLE GUIDANCE','From project folder to double-click.','The essentials, without the detour.');
  const faq=[['What can I make?','Web apps, desktop applications, servers, command-line tools and supported native projects. Detection depends on the files and entry points in the selected folder.'],['Which languages are supported?','JavaScript, TypeScript, Python, Rust, Go, Java, Kotlin, C#, C and C++, plus supported engines such as Godot. A project still needs a runnable entry point and its required dependencies.'],['Can I send the app to another computer?','Desktop outputs require the original project folder and a compatible host. Static web exports can be hosted over HTTPS for phones, tablets and browsers.'],['When does my project run?','Creating the desktop app packages a launcher. Opening that launcher starts the project and handles its setup.'],['Why is web export unavailable?','Make App needs an existing static frontend build. Build the frontend first, then select its folder. Backend services need their own host.'],['How do I change the design?','Click Make App in a photographic titlebar, press Alt+T, or open Appearance from Views. Press Alt+G to open Views.']];
  for(const [title,copy]of faq){const d=node('details','view-faq');d.append(node('summary','',title),node('p','',copy));content.append(d);}content.append(button('Open documentation',()=>guide('source'),'secondary','i-up-right'));
 }
 function about(){
  header('MAKE APP','Made to be opened.','A free, local way to turn your existing project into a desktop app or static web export.');
  const feature=node('div','view-feature about-feature'),image=node('img');image.src=themeImage();image.alt='';const body=node('div','view-feature-copy');body.append(node('p','view-eyebrow','INDEPENDENT · OPEN SOURCE'),node('h2','', 'Your project stays yours.'),node('p','', 'No Make App account. No Make App API key. Your original folder stays in place.'),button('Explore the source',()=>guide('source'),'primary','i-up-right'));feature.append(image,body);content.append(feature);
  facts([['Desktop','Windows · macOS · Linux'],['Web exports','Phones · tablets · browsers'],['License','MIT'],['Release','0.15 preview']]);
  content.append(card('Built with care','An independent project. Publisher signing, notarization and physical-device acceptance remain separate release checks.','i-shield'));
 }
 const renderers={overview,projects:projectView,details,outputs,setup,activity,results,connections,designs,preferences,help,about};
 function render(){
  content.replaceChildren();$('view-notice').textContent='';for(const b of $('views-nav').querySelectorAll('button')){b.classList.toggle('is-current',b.dataset.view===view);if(b.dataset.view===view)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}
  for(const b of moreMenu.querySelectorAll('[data-menu-view]')){if(b.dataset.menuView===view)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}
  renderers[view]();const heading=content.querySelector('h1');heading.id='views-title';heading.tabIndex=-1;dialog.dataset.view=view;navLayout();
 }
 for(const [id,title,glyph]of definitions){const b=button(title,()=>selectView(id),'quiet',glyph);b.dataset.view=id;if(!primaryViews.has(id))b.dataset.secondary='true';$('views-nav').append(b);const item=button(title,()=>selectView(id),'quiet',glyph);item.dataset.menuView=id;item.setAttribute('role','menuitem');item.tabIndex=-1;moreMenu.append(item);}
 $('views-nav').append(moreButton);navLayout();
 $('open-views').addEventListener('click',()=>open());$('close-views').addEventListener('click',close);
 dialog.querySelector('.views-brand').addEventListener('click',event=>{event.preventDefault();returnToCreator();});
 dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();});
 let projectCount=projects().length;window.addEventListener('make-app:state',event=>{state=event.detail;const count=projects().length,changed=count!==projectCount;projectCount=count;if(dialog.open&&(['overview','details','setup','activity','results'].includes(view)||(view==='projects'&&changed)))render();});
 window.addEventListener('make-app:progress',()=>{if(dialog.open&&view==='activity'){const log=content.querySelector('.activity-log');if(log)log.textContent=$('log').textContent;}});
 window.addEventListener('make-app:created',event=>{lastResult=event.detail;if(!lastResult.preview){recent=[lastResult,...recent.filter(r=>r.executable!==lastResult.executable)].slice(0,20);save('make-app-recent-outputs',recent);}if(dialog.open)render();});
 window.addEventListener('make-app:appearance',()=>{if(dialog.open)render();});
 document.addEventListener('keydown',event=>{if(event.altKey&&event.key.toLowerCase()==='g'){event.preventDefault();open();}});
 let collection='all';const search=$('theme-search');function filterThemes(){for(const b of document.querySelectorAll('[data-theme-choice]'))b.hidden=(collection!=='all'&&b.dataset.collection!==collection)||!b.textContent.toLocaleLowerCase().includes(search.value.toLocaleLowerCase());}search.addEventListener('input',filterThemes);for(const b of document.querySelectorAll('[data-collection]')){if(b.hasAttribute('data-theme-choice'))continue;b.addEventListener('click',()=>{collection=b.dataset.collection;search.value='';for(const choice of document.querySelectorAll('.collection-switcher button'))choice.setAttribute('aria-pressed',String(choice===b));filterThemes();});}
 $('theme-shuffle').addEventListener('click',()=>{const buttons=[...document.querySelectorAll('[data-theme-choice]')].filter(b=>b.getAttribute('aria-pressed')!=='true'&&(collection==='all'||b.dataset.collection===collection));const b=buttons[Math.floor(Math.random()*buttons.length)];if(b){search.value='';filterThemes();b.click();b.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});}});
 for(const [key,valid]of [['density',['comfortable','compact']],['motion',['system','full','subtle','quiet']]]){const value=load('make-app-'+key,valid[0]);if(valid.includes(value))root.dataset[key]=value;}
 window.makeAppViews=Object.freeze({open});
})();
