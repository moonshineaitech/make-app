const fs=require('node:fs/promises'),path=require('node:path');
async function prepare(root=path.resolve(__dirname,'../node_modules/node-pty')){
 if(process.platform==='win32')return;
 async function visit(folder,depth=0){if(depth>4)return;for(const item of await fs.readdir(folder,{withFileTypes:true})){const file=path.join(folder,item.name);if(item.isDirectory())await visit(file,depth+1);else if(item.isFile()&&item.name==='spawn-helper'){const stat=await fs.stat(file);if(!(stat.mode&0o111)){await fs.chmod(file,0o755);console.log('Restored terminal spawn-helper execute permission.');}}}}
 await visit(root);
}
if(require.main===module)prepare().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={prepare};
