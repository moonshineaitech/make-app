const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('dock', Object.freeze({
  pendingProject:()=>ipcRenderer.invoke('library','pendingProject'),
  onOpenProject:(callback)=>ipcRenderer.on('open-project',callback),
  list:()=>ipcRenderer.invoke('library','list'),
  choose:(mode)=>ipcRenderer.invoke('library','choose',mode),
  inspect:(source)=>ipcRenderer.invoke('library','inspect',source),
  codexProjects:()=>ipcRenderer.invoke('library','codexProjects'),
  diagnostics:(id)=>ipcRenderer.invoke('library','diagnostics',id),
  recipe:(id)=>ipcRenderer.invoke('library','recipe',id),
  saveRecipe:(id,plan,environment)=>ipcRenderer.invoke('library','saveRecipe',{id,plan,environment}),
  saveEnvironment:(id,environment)=>ipcRenderer.invoke('library','saveEnvironment',{id,environment}),
  add:(config)=>ipcRenderer.invoke('library','add',config),
  launch:(id)=>ipcRenderer.invoke('library','launch',id),
  action:(id,action)=>ipcRenderer.invoke('library','action',{id,action}),
  job:(id)=>ipcRenderer.invoke('library','job',id),
  demo:()=>ipcRenderer.invoke('library','demo'),
  onChange:(callback)=>{const handler=()=>callback();ipcRenderer.on('changed',handler);return()=>ipcRenderer.removeListener('changed',handler);}
}));
