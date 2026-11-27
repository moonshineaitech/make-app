const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {nodePlatform}=require('../src/managed.cjs');
const {projectPath}=require('../src/integration.cjs');
test('official runtime archive mappings cover supported desktop architectures',()=>{
 assert.equal(nodePlatform('win32','arm64').releaseFile,'win-arm64-zip');assert.equal(nodePlatform('win32','x64').node,'node.exe');assert.equal(nodePlatform('darwin','arm64').releaseFile,'osx-arm64-tar');assert.equal(nodePlatform('darwin','x64').npm,'lib/node_modules/npm/bin/npm-cli.js');assert.equal(nodePlatform('linux','arm64').releaseFile,'linux-arm64-tar');assert.throws(()=>nodePlatform('linux','ia32'),/does not support/);
});
test('desktop handoff accepts only absolute existing project directories',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'appdock-review-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));assert.equal(await projectPath(root),await fs.realpath(root));await assert.rejects(projectPath('https://example.com'));await assert.rejects(projectPath('../relative'));await fs.writeFile(path.join(root,'file'),'data');await assert.rejects(projectPath(path.join(root,'file')),/folder/);
});
