/* Rollout boundary only. Supabase Auth/RLS remain the authorization boundary. */
(function(root){
'use strict';
const STAGING='https://pickleup-staging.home-309.workers.dev';
const PROJECT='https://rfeoeagklmaqmkcdhprb.supabase.co';
const paths=new Set(['/','/index.html','/Pickleball/','/Pickleball/index.html']);
const loopback=url=>['localhost','127.0.0.1','[::1]'].includes(url.hostname)
 &&['http:','https:'].includes(url.protocol);
function allowed(location,project){
 try{
  const page=new URL(location.href),api=new URL(project);
  if(page.username||page.password||api.username||api.password||api.search||api.hash
   ||api.pathname!=='/'||!paths.has(page.pathname))return false;
  return page.origin===STAGING&&api.origin===PROJECT||loopback(page)&&loopback(api);
 }catch(_){return false}
}
const api=Object.freeze({allowed});
root.PickleUpAuthOrigin=api;
if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
