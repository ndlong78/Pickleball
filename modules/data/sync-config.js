/* Explicit synthetic-data staging trial. This is not an authorization boundary. */
(function(root){
 'use strict';
 let enabled=false;
 try{
  const url=new URL(root.location.href),auth=root.PICKLEUP_AUTH_CONFIG;
  enabled=url.origin==='https://pickleup-staging.home-309.workers.dev'
   && ['/', '/index.html', '/Pickleball/', '/Pickleball/index.html'].includes(url.pathname)
   && url.searchParams.getAll('pilot').length===1
   && url.searchParams.get('pilot')==='preferences-checkins'
   && auth?.enabled===true
   && ['https://rfeoeagklmaqmkcdhprb.supabase.co','https://rfeoeagklmaqmkcdhprb.supabase.co/'].includes(auth.url);
 }catch(_){}
 root.PICKLEUP_SYNC_CONFIG=Object.freeze({enabled,scope:enabled?'staging-preferences-checkins':null});
})(window);
