// A browser-only demonstration of the real renderer. Never replaces Electron IPC.
(() => {
  if (window.makeApp || !['http:', 'https:'].includes(location.protocol)) return;
  const windows = /Win/.test(navigator.platform), linux = /Linux/.test(navigator.platform);
  const samples = [
    {path:'/Projects/Focus Notes',name:'Focus Notes',label:'TypeScript web app',requirements:['Node.js','npm'],webAvailable:true},
    {path:'/Projects/Image Tools',name:'Image Tools',label:'Python command-line tool',requirements:['Python'],webAvailable:false},
    {path:'/Projects/Orbit',name:'Orbit',label:'Rust application',requirements:['Rust','Cargo'],webAvailable:false}
  ];
  for(const sample of samples)if(windows)sample.path='C:'+sample.path;
  const name = windows ? 'Windows' : linux ? 'Linux' : 'macOS', extension = windows ? '.exe' : linux ? '.run' : '.app';
  const platform=windows?'win32':linux?'linux':'darwin';
  const targets=[['win32','x64'],['darwin','arm64'],['darwin','x64'],['linux','x64'],['linux','arm64']].map(([os,arch])=>({platform:os,arch,name:{win32:'Windows',darwin:'macOS',linux:'Linux'}[os],extension:{win32:'.exe',darwin:'.app',linux:'.run'}[os],cpu:arch==='arm64'?(os==='darwin'?'Apple Silicon':'ARM64'):(os==='darwin'?'Intel':'Intel / AMD'),share:os==='darwin'?'Zip the complete .app bundle.':os==='linux'?'Share the .run file with its executable permission.':'Share the single .exe file.'}));
  let progress = () => {}, sourceCallback = () => {}, cancelled = false;
  const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
  Object.defineProperty(window,'makeApp',{value:Object.freeze({
    preview:true,
    async capabilities(){return{name,extension,platform,arch:'x64',supported:true,version:'0.20.0 preview',targets,crossCompilation:false};},
    async checkOutput(){await delay(300);return{status:'preview',detail:'No local app was run. Use the desktop converter to check an actual export.'};},onCheckProgress(){},async outputs(){return[];},async clearOutputs(){},
    async guide(section){if(section==='downloads'){if(parent!==window)parent.postMessage({type:'make-app:download'},location.origin);else location.href='../#download';return;}window.open('https://github.com/moonshineaitech/make-app','_blank','noopener,noreferrer');},
    async projects(){return samples.map(sample=>({name:sample.name,path:sample.path}));},
    async initial(){return samples[0].path;},
    async choose(kind){if(kind==='file')return samples[0].path+'/game.html';return samples[(samples.findIndex(sample=>sample.path===document.getElementById('source').value)+1)%samples.length].path;},
    async inspect({source}){await delay(140);const sample=source===samples[0].path+'/game.html'?{...samples[0],path:source,name:'Sample Game',label:'HTML game / app',requirements:[]}:samples.find(item=>item.path===source);if(!sample)throw new Error('This preview uses sample projects. Choose one from the list below.');return{...sample,standalone:{supported:true,reason:'A supported runtime or compiled build is included.'},configured:true,setupTasks:1,buildTasks:sample.webAvailable?1:0,requiredEnvironment:[]};},
    async make({name:appName,format}){cancelled=false;for(const step of ['Reading project requirements…','Preparing the app launcher…','Finishing your app…']){progress(step+'\n');await delay(430);if(cancelled)return{cancelled:true};}return{preview:true,name:appName,format:format==='web'?'web':extension.slice(1)};},
    async cancel(){cancelled=true;},
    async reveal(){if(parent!==window)parent.postMessage({type:'make-app:download'},location.origin);else location.href='../#download';},
    onProgress(callback){progress=callback;},onSource(callback){sourceCallback=callback;}
  }),writable:false});
  document.getElementById('preview-note').hidden=false;
  document.querySelector('.local-label').textContent='Browser preview';
  if(parent!==window)document.body.classList.add('is-embedded');
  if(parent!==window&&'ResizeObserver' in window){
    new ResizeObserver(()=>parent.postMessage({type:'make-app:size',height:Math.ceil(document.getElementById('creator-viewport').getBoundingClientRect().height)+(document.documentElement.dataset.photo?146:88)},location.origin)).observe(document.getElementById('creator-viewport'));
  }
  window.addEventListener('message',event=>{
    if(event.origin!==location.origin||event.source!==parent)return;
    if(event.data?.type==='make-app:format'&&['desktop','web'].includes(event.data.format)){
      const input=document.querySelector(`input[name="format"][value="${event.data.format}"]`);
      input.checked=true;input.dispatchEvent(new Event('change'));
    }
    if(event.data?.type==='make-app:sample'&&Number.isInteger(event.data.index)&&samples[event.data.index])sourceCallback(samples[event.data.index].path);
    if(event.data?.type==='make-app:theme'&&typeof event.data.theme==='string'&&/^[a-z_]+$/.test(event.data.theme)){
      const choice=document.querySelector('[data-theme-choice="'+event.data.theme+'"]');if(!choice)return;
      const views=document.getElementById('app-views'),activeView=views?.open?views.dataset.view:null;if(views?.open)views.close();
      document.getElementById('appearance').click();choice.click();document.getElementById('close-themes').click();if(activeView)window.makeAppViews.open(activeView);
    }
  });
  window.addEventListener('make-app:appearance',()=>{if(parent!==window)parent.postMessage({type:'make-app:theme',theme:document.documentElement.dataset.aero||null},location.origin);});
  window.addEventListener('make-app:state',event=>{if(parent!==window&&['desktop','web'].includes(event.detail?.format))parent.postMessage({type:'make-app:format',format:event.detail.format},location.origin);});
})();
