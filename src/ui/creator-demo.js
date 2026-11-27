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
  let progress = () => {}, sourceCallback = () => {}, cancelled = false;
  const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
  Object.defineProperty(window,'makeApp',{value:Object.freeze({
    preview:true,
    async capabilities(){return{name,extension,arch:'preview',supported:true};},
    async projects(){return samples.map(sample=>({name:sample.name,path:sample.path}));},
    async initial(){return samples[0].path;},
    async choose(){return samples[(samples.findIndex(sample=>sample.path===document.getElementById('source').value)+1)%samples.length].path;},
    async inspect({source}){await delay(140);const sample=samples.find(item=>item.path===source);if(!sample)throw new Error('This preview uses sample projects. Choose one from the list below.');return{...sample,configured:true,setupTasks:1,buildTasks:sample.webAvailable?1:0,requiredEnvironment:[]};},
    async make({name:appName,format}){cancelled=false;for(const step of ['Reading project requirements…','Preparing the app launcher…','Finishing your app…']){progress(step+'\n');await delay(430);if(cancelled)return{cancelled:true};}return{preview:true,name:appName,format:format==='web'?'web':extension.slice(1)};},
    async cancel(){cancelled=true;},
    async reveal(){if(parent!==window)parent.postMessage({type:'make-app:download'},location.origin);else location.href='../#download';},
    onProgress(callback){progress=callback;},onSource(callback){sourceCallback=callback;}
  }),writable:false});
  document.getElementById('preview-note').hidden=false;
  document.querySelector('.local-label').textContent='Browser preview';
  if(parent!==window)document.body.classList.add('is-embedded');
  if(parent!==window&&'ResizeObserver' in window){
    new ResizeObserver(()=>parent.postMessage({type:'make-app:size',height:Math.ceil(document.getElementById('creator-viewport').getBoundingClientRect().height)+(document.documentElement.dataset.photo?60:2)},location.origin)).observe(document.getElementById('creator-viewport'));
  }
  window.addEventListener('message',event=>{
    if(event.origin!==location.origin||event.source!==parent)return;
    if(event.data?.type==='make-app:format'&&['desktop','web'].includes(event.data.format)){
      const input=document.querySelector(`input[name="format"][value="${event.data.format}"]`);
      input.checked=true;input.dispatchEvent(new Event('change'));
    }
    if(event.data?.type==='make-app:sample'&&Number.isInteger(event.data.index)&&samples[event.data.index])sourceCallback(samples[event.data.index].path);
  });
})();
