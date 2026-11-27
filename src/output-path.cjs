const fs=require('node:fs/promises'),path=require('node:path');
async function resolveOutput(value){let current=path.resolve(value);const missing=[];for(;;){try{return path.join(await fs.realpath(current),...missing);}catch(error){if(error.code!=='ENOENT')throw error;const parent=path.dirname(current);if(parent===current)throw error;missing.unshift(path.basename(current));current=parent;}}}
module.exports={resolveOutput};
