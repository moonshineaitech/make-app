// A release consumes only the complete native matrix for this exact source SHA.
const fs=require('node:fs/promises');
async function main(){
 const id=process.env.VERIFIED_RUN,repo=process.env.GITHUB_REPOSITORY,sha=process.env.GITHUB_SHA,token=process.env.GH_TOKEN;
 if(!/^\d+$/.test(id||'')||!repo||!sha||!token)throw new Error('Provide a verified native workflow run ID and GitHub context.');
 async function get(route){const r=await fetch('https://api.github.com/repos/'+repo+route,{headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json'},redirect:'error',signal:AbortSignal.timeout(30000)});if(!r.ok)throw new Error('GitHub verification request failed: '+r.status);return r.json();}
 const run=await get('/actions/runs/'+id);if(run.head_sha!==sha||run.conclusion!=='success'||run.status!=='completed'||run.path!=='.github/workflows/cross-platform.yml'||run.head_repository?.full_name!==repo)throw new Error('The native run must pass for this exact repository, workflow and source SHA.');
 const expected=['windows-latest','macos-15','macos-15-intel','ubuntu-24.04','ubuntu-24.04-arm'],jobs=(await get('/actions/runs/'+id+'/jobs?per_page=100')).jobs;
 for(const os of expected){const job=jobs.find(j=>j.name==='desktop ('+os+')');if(job?.conclusion!=='success')throw new Error('Missing passing native target: '+os);}
 const artifacts=(await get('/actions/runs/'+id+'/artifacts?per_page=100')).artifacts.filter(a=>a.name.startsWith('make-app-'));if(artifacts.length!==5||artifacts.some(a=>a.expired))throw new Error('Five unexpired native release artifacts are required.');
 await fs.writeFile('verified-build.json',JSON.stringify({schemaVersion:1,version:require('../package.json').version,sourceCommit:sha,workflowRun:run.html_url,platformJobs:jobs.map(j=>({name:j.name,id:j.id,url:j.html_url,conclusion:j.conclusion})),artifactIds:artifacts.map(a=>a.id)},null,2));console.log('Verified all five native targets for '+sha);
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
