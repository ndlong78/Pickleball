/* Same-origin worker lease. No Auth or account data crosses this channel. */
(function(root){
'use strict';
class MaintenanceError extends Error{constructor(code){super(code);this.code=code;this.name='MaintenanceError'}}
const fail=code=>{throw new MaintenanceError(code)};
function create({navigator=root.navigator,location=root.location,cache='pickleup-shell-v'+String(root.PICKLEUP_BUILD).replaceAll('.','-')+'-stable',channel=()=>new root.MessageChannel(),uuid=()=>root.crypto.randomUUID(),timeout=2000,interval=3000}={}){
 async function service(controlled=false){
  if(!navigator?.serviceWorker?.getRegistration){if(controlled)fail('worker_required');return null}
  const reg=await navigator.serviceWorker.getRegistration();if(!reg?.active){if(controlled)fail('worker_required');return null}
  const expected=new URL('sw.js',location.href).href,origin=new URL(location.href).origin;
  const known=[origin+'/sw.js',origin+'/Pickleball/sw.js'];
  // An ancestor app worker can gate normal Auth while the prefix registration
  // installs. Purge itself requires the exact currently controlling worker.
  if(controlled?(reg.active.scriptURL!==expected||navigator.serviceWorker.controller!==reg.active):!known.includes(reg.active.scriptURL))fail('upgrade_required');return reg.active;
 }
 function rpc(worker,action,leaseId){return new Promise((resolve,reject)=>{
  let settled=false;const ports=channel(),nonce=uuid(),timer=setTimeout(()=>finish(null,'worker_unavailable'),timeout);
  function finish(value,error){if(settled)return;settled=true;clearTimeout(timer);try{ports.port1.close();ports.port2.close()}catch(_){}if(error)reject(new MaintenanceError(error));else resolve(value)}
  ports.port1.onmessage=event=>{const r=event.data;if(r?.nonce!==nonce||r.protocol!==1||r.cache!==cache){finish(null,'upgrade_required');return}if(r.status!=='ok'){finish(null,['maintenance_busy','multiple_tabs','lease_lost','upgrade_required'].includes(r.status)?r.status:'worker_unavailable');return}finish(r)};
  try{worker.postMessage({type:'PICKLEUP_CACHE_MAINTENANCE',nonce,cache,action,...(leaseId?{leaseId}:{})},[ports.port2])}catch(_){finish(null,'worker_unavailable')}
 })}
 return {
  async authGate(){const worker=await service();if(!worker)return;try{await rpc(worker,'status')}catch(error){const next=await service();if(next&&next!==worker){await rpc(next,'status');return}throw error}},
  async preflight(){await rpc(await service(true),'check')},
  async acquire(onLost=()=>{}){
   const worker=await service(true),leaseId=uuid();await rpc(worker,'begin',leaseId);let active=true,timer=null,checking=false;
   const verify=async()=>{if(!active)fail('lease_lost');if(await service(true)!==worker)fail('upgrade_required');await rpc(worker,'renew',leaseId);if(!active)fail('lease_lost')};
   const release=async()=>{if(!active)return;active=false;clearInterval(timer);try{await rpc(worker,'end',leaseId)}catch(_){}};
   timer=setInterval(async()=>{if(checking||!active)return;checking=true;try{await verify()}catch(error){if(active){await release();onLost(error.code||'lease_lost')}}finally{checking=false}},interval);
   return {verify,release};
  }
 };
}
const api={create,MaintenanceError};if(typeof module!=='undefined')module.exports=api;else root.PickleUpCacheMaintenanceHost={...api,...create()};
})(typeof window==='undefined'?globalThis:window);
