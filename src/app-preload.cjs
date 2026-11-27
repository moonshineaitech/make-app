const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('appdock', Object.freeze({
  notify:(title,body)=>ipcRenderer.invoke('native','notify',{title,body}),
  alwaysOnTop:(enabled)=>ipcRenderer.invoke('native','pin',{enabled}),
  tray:(enabled=true)=>ipcRenderer.invoke('native','tray',{enabled}),
  readTextFile:()=>ipcRenderer.invoke('native','readFile'),
  saveTextFile:(text,name)=>ipcRenderer.invoke('native','writeFile',{text,name}),
  info:()=>ipcRenderer.invoke('native','info')
}));
