// The second collection uses original photographic scenery and responsive, live layouts.
window.makeAppStudioThemes = [
 {id:'sapphire_reef',name:'Sapphire Reef',scheme:'dark',layout:'reef',mood:'Deep water. Clear focus.',accent:'#92e6ff',button:'#087998',canvas:'#071e35',ink:'#f3faff',secondary:'#c2deeb',surface:'#102e46',soft:'#193e56'},
 {id:'sakura_glass',name:'Sakura Glass',scheme:'light',layout:'petal',mood:'A little room to blossom.',accent:'#93486e',button:'#91456b',canvas:'#f4e9ee',ink:'#302030',secondary:'#665265',surface:'#fffafc',soft:'#f2e3ed'},
 {id:'solar_atelier',name:'Solar Atelier',scheme:'light',layout:'ribbon',mood:'Made in a different light.',accent:'#875012',button:'#8b5115',canvas:'#eee3cf',ink:'#34291e',secondary:'#6a5845',surface:'#fffaf0',soft:'#f5ead8'},
 {id:'jade_observatory',name:'Jade Observatory',scheme:'light',layout:'atrium',mood:'A fresh perspective.',accent:'#206b50',button:'#236d53',canvas:'#dcebe3',ink:'#17372c',secondary:'#456356',surface:'#f6fff9',soft:'#e1f1e7'},
 {id:'lunar_archive',name:'Lunar Archive',scheme:'dark',layout:'focus',mood:'Quiet space. Bright ideas.',accent:'#bfd6ff',button:'#41638f',canvas:'#111c30',ink:'#f4f7ff',secondary:'#c9d5e8',surface:'#1e2d43',soft:'#2b3c55'},
 {id:'rainforest_lab',name:'Rainforest Lab',scheme:'dark',layout:'canopy',mood:'Good things grow here.',accent:'#b8f2cb',button:'#286747',canvas:'#10291f',ink:'#f0fbf3',secondary:'#c5dfcd',surface:'#1d3a2d',soft:'#2c4e3a'},
 {id:'lavender_signal',name:'Lavender Signal',scheme:'light',layout:'float',mood:'Find your frequency.',accent:'#705499',button:'#74559b',canvas:'#e9e5f4',ink:'#2c2640',secondary:'#60576e',surface:'#fdfbff',soft:'#eee7f7'},
 {id:'pacific_terminal',name:'Pacific Terminal',scheme:'light',layout:'horizon',mood:'Your next horizon.',accent:'#0d5e8e',button:'#12658f',canvas:'#dcecf6',ink:'#153448',secondary:'#486578',surface:'#f8fdff',soft:'#e3f2f9'},
 {id:'champagne_orbit',name:'Champagne Orbit',scheme:'light',layout:'orbit',mood:'An elegant way forward.',accent:'#7b5b32',button:'#7f603a',canvas:'#eee9df',ink:'#342d25',secondary:'#685e51',surface:'#fffdf7',soft:'#f1ebdf'},
 {id:'arctic_iris',name:'Arctic Iris',scheme:'light',layout:'quartz',mood:'Everything, crystal clear.',accent:'#485f9b',button:'#4b63a0',canvas:'#e2eaf5',ink:'#202e49',secondary:'#53647c',surface:'#fbfdff',soft:'#e9eef9'}
];
(() => {
 function applyStudio(){
  const root=document.documentElement,theme=window.makeAppStudioThemes.find(t=>t.id===root.dataset.aero);
  const main=document.querySelector('.creator-shell');if(!main)return;
  let art=document.getElementById('studio-art');
  if(!art){art=document.createElement('figure');art.id='studio-art';art.className='studio-art';art.setAttribute('aria-hidden','true');const image=document.createElement('img');image.alt='';art.append(image);main.insertBefore(art,document.getElementById('creator-form'));}
  art.hidden=!theme;
  const title=main.querySelector('.creator-intro h1'),subtitle=main.querySelector('.creator-intro .intro');
  if(theme){root.dataset.studio=theme.id;root.dataset.studioLayout=theme.layout;art.firstElementChild.src='assets/studio/'+theme.id+'.jpg';title.textContent=theme.mood;subtitle.textContent='Choose a project. Make it an app. Keep creating.';}
  else{delete root.dataset.studio;delete root.dataset.studioLayout;title.textContent='Your project. Now an app.';subtitle.textContent='Choose a project, then save its app.';}
 }
 window.addEventListener('make-app:appearance',applyStudio);
 document.addEventListener('DOMContentLoaded',applyStudio,{once:true});
})();
