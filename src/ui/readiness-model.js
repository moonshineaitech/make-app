// One explanation and next action for each blocked creator state.
(function(scope){
 function explain(s){
  if(s.failure?.operation==='choose')return{title:'The file picker could not open.',copy:s.failure.message,label:'Choose a game or app file',action:'file'};
  if(s.failure)return{title:s.failure.operation==='open'?'The saved app could not open.':'Your app could not be created.',copy:s.failure.message,label:s.failure.operation==='open'?'Create a fresh app':'Try again',action:'recreate'};
  if(!s.source?.trim())return{copy:'Choose the folder containing your project or game files, or choose its HTML file, script or exported game executable.',label:'Choose a project folder',action:'choose'};
  if(!s.platform)return{copy:'Make App is still checking this computer. Try again in a moment.',label:'Check again',action:'retry'};
  if(!s.selected)return{copy:s.inspectionError||'The project is still being inspected. Check again to read its setup. If the project is in a cloud folder, make its files available on this computer first.',label:'Choose another folder',action:'choose'};
  if(s.selected.selection)return{copy:'This folder contains several projects or game files. Select the one you want in Project details.',label:'Choose the project inside',action:'project'};
  if(s.selected.configured===false)return s.selected.targets?.length?{copy:'Choose which executable entry point to turn into an app. Your project has more than one runnable target.',label:'Choose an entry point',action:'entry'}:{copy:'No runnable entry was found in this folder. Choose the game’s HTML file, script or exported executable directly, or choose its project folder. No configuration file is needed for a recognized entry.',label:'Choose a game or app file',action:'file'};
  if(s.format==='web'&&!s.selected.webAvailable)return{copy:'This project does not have an existing static web build. Desktop export can run supported games and apps; web export needs a built frontend.',label:'Use desktop export',action:'desktop'};
  if(s.format!=='web'&&!s.target?.buildable)return{copy:'The selected output is for another OS or processor. Build the app for this computer, or create that output on a matching computer.',label:'Use this computer',action:'host'};
  if(s.selected.standalone?.supported===false){const game=s.selected.requirements?.some(r=>['godot','Unity'].includes(r));return{copy:s.selected.standalone.reason,label:game?'Choose the exported game folder':'Choose another project',action:'choose'};}
  return{copy:'Check this project again to confirm its runnable setup.',label:'Check project again',action:'retry'};
 }
 const api=Object.freeze({explain});if(typeof module!=='undefined'&&module.exports)module.exports=api;else scope.makeAppReadinessModel=api;
})(globalThis);
