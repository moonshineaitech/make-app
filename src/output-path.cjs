const fs=require('node:fs/promises'),path=require('node:path');
async function resolveOutput(value){let current=path.resolve(value);const missing=[];for(;;){try{return path.join(await fs.realpath(current),...missing);}catch(error){if(error.code!=='ENOENT')throw error;const parent=path.dirname(current);if(parent===current)throw error;missing.unshift(path.basename(current));current=parent;}}}
async function freshOutput(directory,name,suffix){
 if(!path.isAbsolute(directory)||!/^\.[a-z0-9]+$|^-web$/i.test(suffix))throw new Error('Choose a valid local output folder and file type.');
 name=require('./core.cjs').safeName(name);
 for(let index=0;index<1000;index++){const destination=path.join(directory,name+(index?'-'+(index+1):'')+suffix);try{await fs.lstat(destination);}catch(error){if(error.code==='ENOENT')return destination;throw error;}}
 throw new Error('Too many apps with this name already exist. Choose another app name.');
}
module.exports={resolveOutput,freshOutput};
