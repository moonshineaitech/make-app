// Deliberately fail closed when a publisher certificate is unavailable.
const {build}=require('./package.json');
module.exports={...build,forceCodeSigning:true,win:{...build.win,signExecutable:true}};
