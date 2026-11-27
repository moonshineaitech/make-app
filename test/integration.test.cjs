const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {nodePlatform}=require('../src/managed.cjs');
const {projectPath}=require('../src/integration.cjs');
test('official runtime archive mappings cover supported desktop architectures',()=>{
 // Official index.json files identifiers differ from the archive extensions.
 const published=['linux-arm64','linux-x64','osx-arm64-tar','osx-x64-tar','win-arm64-zip','win-x64-zip'];
 for(const platform of ['win32','darwin','linux'])for(const arch of ['x64','arm64'])assert.ok(published.includes(nodePlatform(platform,arch).releaseFile),'Unpublished Node release selector: '+platform+'/'+arch);
 assert.equal(nodePlatform('win32','x64').node,'node.exe');assert.equal(nodePlatform('darwin','x64').npm,'lib/node_modules/npm/bin/npm-cli.js');assert.equal(nodePlatform('linux','arm64').extension,'tar.gz');assert.throws(()=>nodePlatform('linux','ia32'),/does not support/);
});
test('desktop handoff accepts only absolute existing project directories',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'appdock-review-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));assert.equal(await projectPath(root),await fs.realpath(root));await assert.rejects(projectPath('https://example.com'));await assert.rejects(projectPath('../relative'));await fs.writeFile(path.join(root,'file'),'data');await assert.rejects(projectPath(path.join(root,'file')),/folder/);
});
