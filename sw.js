/* PickleUp V3.5 — small offline shell + on-demand cache for visited pages.
   Page-specific JS/CSS is cached only when the user opens that page. */
const CACHE="pickleup-shell-v5-27-0-stable";
const SHELL=[
 "./","./index.html","./responsive.css?v=5.27.0",
 "./modules/legacy-storage.js?v=5.27.0","./modules/page-layout.css?v=5.27.0","./modules/page-catalog.js?v=5.27.0","./modules/page-loader.js?v=5.27.0",
 "./modules/web-vitals.js?v=5.27.0","./modules/page-router.js?v=5.27.0","./mobile-ui.js?v=5.27.0","./modules/pwa-client.js?v=5.27.0",
 "./manifest.webmanifest","./icons/icon.svg","./icons/icon-192.png","./icons/icon-512.png"
];
self.addEventListener("install",event=>{
 event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("pickleup-")&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
// Public coordination only: no account ID, session, content or Auth credential.
// Persist the short lease so restarting the worker cannot admit a new Auth client.
const LEASE_DB='pickleup-maintenance-v1',LEASE_TTL=15000,LEASE_MAX=60000;
const uuid=value=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
function validLease(row){return row&&Object.keys(row).sort().join(',')==='cache,client,deadline,expires,leaseId'&&typeof row.client==='string'&&row.client.length>0&&row.client.length<=256&&uuid(row.leaseId)&&typeof row.cache==='string'&&/^pickleup-shell-v\d+-\d+-\d+-(stable|beta)$/.test(row.cache)&&Number.isSafeInteger(row.expires)&&Number.isSafeInteger(row.deadline)&&row.expires<=row.deadline&&row.deadline-row.expires<=LEASE_MAX}
function leaseTransaction(change){return new Promise((resolve,reject)=>{
 let abandoned=false;const open=indexedDB.open(LEASE_DB,1);
 open.onblocked=()=>{abandoned=true;reject(Error('unavailable'))};open.onerror=()=>reject(Error('unavailable'));
 open.onupgradeneeded=()=>{if(abandoned){open.transaction.abort();return}open.result.createObjectStore('lease')};
 open.onsuccess=()=>{
  const db=open.result;if(abandoned){db.close();return}db.onversionchange=()=>db.close();let tx,result;
  try{tx=db.transaction('lease','readwrite');const store=tx.objectStore('lease'),get=store.get('active');get.onsuccess=()=>{try{if(get.result!==undefined&&!validLease(get.result))throw Error('unavailable');const next=change(get.result||null);result=next.result;if(next.value===null)store.delete('active');else if(next.value!==undefined)store.put(next.value,'active')}catch(_){tx.abort()}};tx.oncomplete=()=>{db.close();resolve(result)};tx.onabort=()=>{db.close();reject(Error('unavailable'))};tx.onerror=()=>{}}catch(_){db.close();reject(Error('unavailable'))}
 };
})}
async function maintenance(event){
 const data=event.data,client=event.source?.id;
 if(!client||event.source.type!=='window')return {status:'unavailable'};
 if(data.cache!==CACHE)return {status:'upgrade_required'};
 const now=()=>Date.now(),owns=row=>row&&row.client===client&&row.leaseId===data.leaseId&&row.cache===CACHE&&row.expires>now();
 if(data.action==='status')return leaseTransaction(row=>({result:{status:row&&row.expires>now()&&row.client!==client?'maintenance_busy':'ok'}}));
 if(data.action==='check'){
  const status=await leaseTransaction(row=>({result:{status:row&&row.expires>now()&&row.client!==client?'maintenance_busy':'ok'}}));if(status.status!=='ok')return status;
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});return {status:windows.length===1&&windows[0].id===client?'ok':'multiple_tabs'};
 }
 if(!uuid(data.leaseId))return {status:'unavailable'};
 if(data.action==='end')return leaseTransaction(row=>owns(row)?{value:null,result:{status:'ok'}}:{result:{status:'lease_lost'}});
 if(!['begin','renew'].includes(data.action))return {status:'unavailable'};
 // Reserve before enumerating clients: a newly arriving window's Auth gate
 // sees this lease, or it was already present and enumeration refuses begin.
 const reserved=await leaseTransaction(row=>{
  if(data.action==='renew'&&!owns(row))return {result:{status:'lease_lost'}};
  if(row&&row.expires>now()&&!owns(row))return {result:{status:'maintenance_busy'}};
  const deadline=owns(row)?row.deadline:now()+LEASE_MAX;
  if(deadline<=now())return {result:{status:'lease_lost'}};
  return {value:{client,leaseId:data.leaseId,cache:CACHE,deadline,expires:Math.min(now()+LEASE_TTL,deadline)},result:{status:'ok'}};
 });
 if(reserved.status!=='ok')return reserved;
 const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
 if(windows.length!==1||windows[0].id!==client){await leaseTransaction(row=>owns(row)?{value:null,result:{}}:{result:{}});return {status:'multiple_tabs'}}
 return leaseTransaction(row=>({result:{status:owns(row)?'ok':'lease_lost'}}));
}
self.addEventListener('message',event=>{
 if(event.data?.type==='PICKLEUP_SKIP_WAITING'){self.skipWaiting();return}
 if(event.data?.type!=='PICKLEUP_CACHE_MAINTENANCE'||!uuid(event.data.nonce)||!event.ports?.[0])return;
 const reply=result=>{try{event.ports[0].postMessage({protocol:1,nonce:event.data.nonce,cache:CACHE,...result});event.ports[0].close()}catch(_){}};
 event.waitUntil(maintenance(event).then(reply,()=>reply({status:'unavailable'})));
});
self.addEventListener("fetch",event=>{
 const req=event.request,url=new URL(req.url);
 if(url.pathname.includes("/auth/")||url.pathname.includes("/rest/")||url.searchParams.has("code")||url.searchParams.has("token_hash")||url.searchParams.has("auth_callback"))return;
 if(req.method!=="GET"||url.origin!==self.location.origin)return;
 // The content CMS is a separate tool: never cache it or let it replace the app shell.
 if(url.pathname.includes("/cms/")||url.searchParams.has("cms"))return;
 if(req.mode==="navigate"){
  event.respondWith(
   fetch(req).then(async response=>{
    if(response.ok){
     const c=await caches.open(CACHE);
     await c.put("./index.html",response.clone());
    }
    return response;
   }).catch(async()=>await caches.match("./index.html")||Response.error())
  );
  return;
 }
 // Static same-origin assets are cached once per release. Versioned URLs
 // prevent mixed releases, and visited feature pages remain available offline.
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  const cached=await cache.match(req);
  if(cached)return cached;
  try{
   const response=await fetch(req);
   if(response.ok)await cache.put(req,response.clone());
   return response;
  }catch(_){
   return Response.error();
  }
 })());
});
