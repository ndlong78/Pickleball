/* Rollout gate only. Server Auth/RLS remain the authority.
   V5.31 (plan A1): on the main host a signed-in user gets the account source by default; the old ?pilot= URLs still
   work for operators, and the ?maintenance= URL keeps every account source off so the cache tool can run. */
(function(root){
'use strict';
const origin='https://pickleup-staging.home-309.workers.dev',project='https://rfeoeagklmaqmkcdhprb.supabase.co';
const paths=new Set(['/', '/index.html', '/Pickleball/', '/Pickleball/index.html']);
const scopes=new Set(['preferences-checkins','activity-events','plans-selections']);
function available(){
 try{
  const url=new URL(root.location.href),auth=root.PICKLEUP_AUTH_CONFIG;
  return url.origin===origin&&paths.has(url.pathname)&&auth?.enabled===true
   &&[project,project+'/'].includes(auth.url)&&typeof auth.publishableKey==='string'&&auth.publishableKey.startsWith('sb_publishable_');
 }catch(_){return false}
}
function mode(){
 if(!available())return null;
 const values=new URL(root.location.href).searchParams.getAll('pilot');
 return values.length===1&&['preferences-checkins','account-data'].includes(values[0])?values[0]:null;
}
// Default account source: main host, no operator query at all.
function auto(){
 if(!available())return false;
 try{const q=new URL(root.location.href).searchParams;return !q.has('pilot')&&!q.has('maintenance')}catch(_){return false}
}
/* Default-source helper shared by the three account runtimes. When `isAuto()` is true and someone is signed in it
   (1) chooses the account source if this device has not done so, (2) repeats a first read that never completed and
   (3) runs an optional `settle` step. It only calls the controller's own explicit actions, tries each need once per
   account until the browser regains focus or connectivity, and never runs while the source is busy or offline. */
function adopter(source,isAuto){
 let running=false,tried=null;
 const need=s=>!s||!s.owner||s.busy?null:s.mode==='guest'?'adopt':s.mode!=='account'?null:!s.snapshot?.cursor?.epoch?'read':source.settle?.(s)?'settle':null;
 async function run(force=false){
  if(running||isAuto()!==true)return false;
  const s=source.state();if(!s?.owner){tried=null;return false}
  const what=need(s);if(!what||root.navigator?.onLine===false)return false;
  const key=s.owner+':'+what;if(!force&&tried===key)return false;
  tried=key;running=true;
  let done=false;
  try{await(what==='adopt'?source.useAccount():what==='read'?source.refresh():source.applySettle(s));done=true}
  catch(_){}
  finally{running=false}
  // State changes that arrived while this step was running were ignored, so look once more for the next need.
  if(done)schedule(false);
  return done;
 }
 function schedule(force){Promise.resolve().then(()=>run(force)).catch(()=>{})}
 return {run,schedule};
}
/* Automatic sender shared by the three account runtimes (plan A2). It only decides WHEN to call the controller's own
   sync(); leases, per-request backoff, idempotent requests and conflict handling stay in the sync controller.
   - waits `debounce` after the last local change, then sends while unsent operations exist;
   - `synced`/`pending` clear the backoff; every other outcome (offline, auth, busy, needs_review, retry_wait, errors)
     backs off exponentially from `base` to `max`, so a failing server or an unresolved conflict is never hammered;
   - `wake()` (focus/online) clears the backoff; account changes reset it; nothing runs while busy, offline, without a
     completed first read, or when `isAuto()` is false. */
function syncer(source,isAuto,{setTimer=(fn,ms)=>root.setTimeout(fn,ms),clearTimer=id=>root.clearTimeout(id),now=()=>Date.now(),debounce=1200,base=5000,max=300000}={}){
 let running=false,timer=null,due=0,failures=0,notBefore=0,owner=null;
 const unsent=s=>(s?.snapshot?.outbox||[]).filter(o=>o.state==='pending'||o.state==='deferred').length;
 const ready=s=>isAuto()===true&&!!s?.owner&&s.mode==='account'&&!s.busy&&!!s.snapshot?.cursor?.epoch&&root.navigator?.onLine!==false;
 function arm(delay){
  const at=now()+delay;if(timer!==null&&due<=at)return;
  if(timer!==null)clearTimer(timer);
  due=at;timer=setTimer(()=>{timer=null;run().catch(()=>{})},delay);
 }
 async function run(){
  if(running)return 'running';
  const s=source.state();
  if((s?.owner||null)!==owner){owner=s?.owner||null;failures=0;notBefore=0}
  if(!ready(s)||!unsent(s))return 'idle';
  const wait=notBefore-now();if(wait>0){arm(wait);return 'waiting'}
  running=true;let status;
  try{status=(await source.sync())?.status||'unknown'}catch(error){status=typeof error?.code==='string'?error.code:'error'}finally{running=false}
  if(status==='synced'){failures=0;notBefore=0}
  else if(status==='pending'){failures=0;notBefore=0;arm(debounce)}
  else{failures++;const delay=Math.min(max,base*2**Math.min(failures-1,6));notBefore=now()+delay;arm(delay)}
  return status;
 }
 return {
  run,
  changed(){const s=source.state();if((s?.owner||null)!==owner){owner=s?.owner||null;failures=0;notBefore=0}if(ready(s)&&unsent(s))arm(Math.max(debounce,notBefore-now()))},
  wake(){failures=0;notBefore=0;const s=source.state();if(ready(s)&&unsent(s))arm(debounce)},
  stop(){if(timer!==null)clearTimer(timer);timer=null}
 };
}
root.PickleUpStagingPilot=Object.freeze({available,mode,auto,adopter,syncer,
 enabled(scope){if(!scopes.has(scope))return false;if(auto())return true;const selected=mode();return selected==='account-data'||scope==='preferences-checkins'&&selected==='preferences-checkins'},
 entry(){return available()?origin+'/?page=settings&pilot=account-data':null}
});
})(window);
