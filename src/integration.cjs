// Local desktop handoff. A handoff opens review; it never grants execution trust.
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
function registrationPath(){const base=process.platform==='win32'?(process.env.APPDATA||path.join(os.homedir(),'AppData','Roaming')):process.platform==='darwin'?path.join(os.homedir(),'Library','Application Support'):(process.env.XDG_CONFIG_HOME||path.join(os.homedir(),'.config'));return path.join(base,'AppDock','integration.json');}
async function projectPath(value){if(typeof value!=='string'||!path.isAbsolute(value)||value.includes('\0'))throw new Error('Provide an absolute local project folder.');const real=await fs.realpath(value);if(!(await fs.stat(real)).isDirectory())throw new Error('Choose a project folder.');return real;}
async function registerDesktop(executable,dataRoot){const file=registrationPath();await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,JSON.stringify({schemaVersion:1,executable,dataRoot,version:'0.6.0'},null,2),{mode:0o600});}
module.exports={registrationPath,projectPath,registerDesktop};
