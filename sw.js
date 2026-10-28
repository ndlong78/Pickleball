/* PickleUp V3.5 — small offline shell + on-demand cache for visited pages.
   Page-specific JS/CSS is cached only when the user opens that page. */
const CACHE="pickleup-shell-v4-4-beta";
const SHELL=[
 "./","./index.html","./responsive.css?v=4.4.0",
 "./modules/page-layout.css?v=4.4.0","./modules/page-catalog.js?v=4.4.0","./modules/page-loader.js?v=4.4.0",
 "./modules/web-vitals.js?v=4.4.0","./modules/page-router.js?v=4.4.0","./mobile-ui.js?v=4.4.0","./modules/pwa-client.js?v=4.4.0",
 "./manifest.webmanifest","./icons/icon.svg","./icons/icon-192.png","./icons/icon-512.png"
];
self.addEventListener("install",event=>{
 event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("pickleup-")&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener("message",event=>{if(event.data?.type==="PICKLEUP_SKIP_WAITING")self.skipWaiting()});
self.addEventListener("fetch",event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=="GET"||url.origin!==self.location.origin)return;
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
