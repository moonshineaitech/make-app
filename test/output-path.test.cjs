const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {freshOutput}=require('../src/output-path.cjs');
test('automatic app names preserve existing desktop files and directories',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'make-app-output-'));try{
  await fs.writeFile(path.join(root,'Focus Notes.exe'),'keep this app');await fs.mkdir(path.join(root,'Focus Notes-2.exe'));
  assert.equal(await freshOutput(root,'Focus Notes','.exe'),path.join(root,'Focus Notes-3.exe'));assert.equal(await fs.readFile(path.join(root,'Focus Notes.exe'),'utf8'),'keep this app');assert.equal(await freshOutput(root,'CON','.exe'),path.join(root,'My app.exe'));
  await assert.rejects(freshOutput('relative','Example','.exe'));await assert.rejects(freshOutput(root,'Example','/outside'));
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
