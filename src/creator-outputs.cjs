// A local receipt index. Renderer requests identify a receipt, never a path to execute.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
function create(directory){
 const file=path.join(directory,'created-apps.json');let pending=Promise.resolve();
 const valid=r=>r&&typeof r.id==='string'&&/^[a-f0-9-]{36}$/i.test(r.id)&&typeof r.executable==='string'&&path.isAbsolute(r.executable)&&r.executable.length<=8192&&typeof r.source==='string'&&r.source.length<=8192&&typeof r.name==='string'&&r.name.length<=200&&['desktop','web'].includes(r.format)&&['win32','darwin','linux'].includes(r.platform)&&['x64','arm64'].includes(r.arch);
 async function read(){try{const stat=await fs.lstat(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>1048576)throw Error('Invalid saved-app index');const value=JSON.parse(await fs.readFile(file,'utf8'));if(!Array.isArray(value)||value.some(r=>!valid(r)))throw Error('Invalid saved-app index');return value.slice(0,20);}catch(e){if(e.code==='ENOENT')return[];throw Error('The recent-app list could not be read. Your exported files are unchanged.');}}
 async function write(rows){await fs.mkdir(directory,{recursive:true});const temporary=file+'.'+crypto.randomUUID()+'.tmp';try{await fs.writeFile(temporary,JSON.stringify(rows,null,2)+'\n',{flag:'wx',mode:0o600});await fs.rename(temporary,file);}finally{await fs.rm(temporary,{force:true});}}
 function change(action){const operation=pending.catch(()=>{}).then(action);pending=operation;return operation;}
 async function available(row){const expected=row.format==='web'?'':row.platform==='darwin'?'.app':row.platform==='win32'?'.exe':'.run';if(row.format==='desktop'&&path.extname(row.executable).toLowerCase()!==expected)return false;const stat=await fs.lstat(row.executable).catch(()=>null);return!!stat&&!stat.isSymbolicLink()&&(row.format==='web'||row.platform==='darwin'?stat.isDirectory():stat.isFile());}
 return{
  add(input){return change(async()=>{const row={id:crypto.randomUUID(),name:input.name,source:input.source,executable:input.executable,format:input.format,platform:input.platform,arch:input.arch,createdAt:Date.now(),standalone:!!input.standalone,bytes:input.bytes};if(!valid(row)||!await available(row))throw Error('Only a completed app export can be added to recent apps.');const rows=await read();await write([row,...rows.filter(r=>r.executable!==row.executable)].slice(0,20));return row;});},
  async list(){await pending.catch(()=>{});return Promise.all((await read()).map(async r=>({...r,available:await available(r)})));},
  async get(id){const row=(await this.list()).find(r=>r.id===id);if(!row)throw Error('This app is not in Make App’s recent exports.');if(!row.available)throw Error('This saved app was moved or removed. Create it again or open it from its new location.');return row;},
  clear(){return change(()=>write([]));}
 };
}
module.exports={create};
