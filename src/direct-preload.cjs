const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('projectApp',Object.freeze({info:()=>ipcRenderer.invoke('direct','info'),close:()=>ipcRenderer.invoke('direct','close'),retry:()=>ipcRenderer.invoke('direct','retry'),onState:callback=>ipcRenderer.on('direct-state',(_event,state)=>callback(state))}));
