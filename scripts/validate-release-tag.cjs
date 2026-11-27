const {spawnSync}=require('node:child_process');
const pkg=require('../package.json');
if(!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(pkg.version))throw new Error('Invalid release version');
const tag='v'+pkg.version,existing=spawnSync('git',['rev-parse','-q','--verify','refs/tags/'+tag+'^{commit}'],{encoding:'utf8',windowsHide:true});
if(existing.status===0&&existing.stdout.trim()!==process.env.GITHUB_SHA)throw new Error('The existing tag points to another commit. Do not replace a published release.');
if(process.env.GITHUB_SHA&&!/^[a-f0-9]{40}$/i.test(process.env.GITHUB_SHA))throw new Error('Invalid workflow commit');
console.log(JSON.stringify({tag,commit:process.env.GITHUB_SHA||'local preflight',existingTagMatches:existing.status===0}));
