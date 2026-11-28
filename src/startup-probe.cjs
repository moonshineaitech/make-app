// A receiving app participates only in a nonce-scoped, temporary startup check.
const fs=require('node:fs/promises'),path=require('node:path');
async function context(spec,userData){
 const root=process.env.MAKE_APP_CHECK_ROOT,token=process.env.MAKE_APP_CHECK_TOKEN;if(!root&&!token)return null;
 if(spec?.startupCheckVersion!==1||!root||!path.isAbsolute(root)||!/^startup-check-[\w-]+$/.test(path.basename(root))||!/^[a-f0-9]{64}$/.test(token||''))throw Error('Invalid startup check request.');
 const real=await fs.realpath(root),s=await fs.lstat(root),p=path.join(root,'request.json'),requestStat=await fs.lstat(p);if(s.isSymbolicLink()||!s.isDirectory()||!requestStat.isFile()||requestStat.isSymbolicLink()||requestStat.size>1024||path.resolve(userData)!==path.join(real,'profile'))throw Error('The startup check profile is redirected.');
 const request=JSON.parse(await fs.readFile(p,'utf8'));if(request.schemaVersion!==1||request.token!==token)throw Error('The startup check request does not match.');return{root:real,token};
}
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(fn){const deadline=Date.now()+45000;while(Date.now()<deadline){if(await fn())return;await pause(100);}throw Error('The app did not become ready during its startup check.');}
async function finish(ctx,record,state,{app,closeApp,error}={}){
 const mode=record.kind==='static'?'static':record.plan?.mode;let passed=false,detail;
 try{
  if(error)throw error;if(!record.portable)throw Error('This app still depends on its original project folder.');
  if(mode==='native'){await wait(()=>{const status=state?.engine?.statuses.app;if(['failed','exited'].includes(status?.status))throw Error('The native app exited during startup (code '+status.code+'). '+(state.logs||''));return!!state?.engine?.children.get('app');});const child=state.engine.children.get('app');await pause(2000);if(child.exitCode!==null||!state.engine.children.has('app'))throw Error('The native app exited during startup. '+(state.logs||''));detail='The native app process stayed running through the startup check.';}
  else if(mode==='static'||mode==='web'){await wait(()=>state?.win?.webContents.executeJavaScript("document.readyState!=='loading'&&!!document.body&&(document.body.childElementCount>0||document.body.textContent.trim().length>0)"));await pause(1000);if(state.win.isDestroyed()||state.win.webContents.isCrashed())throw Error('The app window closed or crashed during startup.');detail='The app page loaded in its desktop window.';}
  else if(mode==='tool'){await wait(()=>{if(state?.runError)throw Error(state.runError);return state?.toolRun||state?.result;});await pause(2000);if(state.runError)throw Error(state.runError);if(state.result&&state.result.code!==0)throw Error('The command exited with code '+state.result.code+'. '+(state.logs||''));if(!state.result&&!state.toolRun)throw Error('The command stopped without a result.');detail=state.result?'The command finished successfully.':'The command started and stayed running through the startup check.';}
  else throw Error('This app type does not support automatic startup checks.');passed=true;
 }catch(e){error=e;detail=e.message;}
 try{closeApp?.(record.id);await state?.engine?.stop();}catch(e){passed=false;error=e;detail='The app could not be stopped after checking.';}
 const report={schemaVersion:1,token:ctx.token,passed,mode,stopped:true,detail:String(detail||'').slice(0,4000),error:error?String(error.message||error).slice(0,4000):undefined};const temporary=path.join(ctx.root,'result.next.json');await fs.writeFile(temporary,JSON.stringify(report),{mode:0o600});await fs.rename(temporary,path.join(ctx.root,'result.json'));app.exit(passed?0:1);
}
module.exports={context,finish};
