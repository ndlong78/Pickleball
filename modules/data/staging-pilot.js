/* Synthetic-data rollout only. Server Auth/RLS remain the authority. */
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
root.PickleUpStagingPilot=Object.freeze({available,mode,
 enabled(scope){const selected=mode();return scopes.has(scope)&&(selected==='account-data'||scope==='preferences-checkins'&&selected==='preferences-checkins')},
 entry(){return available()?origin+'/?page=settings&pilot=account-data':null}
});
})(window);
