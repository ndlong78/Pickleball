/* PickleUp V5.18 — keep production Settings focused on guest backup and rescue.
   Presentation only: hiding a card never disables its module, storage or the
   server Auth/RLS boundary. Staging and loopback keep every operator tool. */
(function(root){
'use strict';
const ACCOUNT_CARDS=['accountPanel','syncPilot','activityPilot','planPilot','importPilot','accountRescue','accountPurge'];
const DIAGNOSTIC_CARDS=['pageDiagnostics'];
function decide(location,auth,origin){
 let debug=false;
 try{debug=new URL(location.href).searchParams.get('debug')==='1'}catch(_){}
 const internal=origin?.internal?.(location)===true;
 return {account:internal||auth?.enabled===true,diagnostics:internal||debug};
}
function apply(document,surface){
 for(const [ids,visible]of [[ACCOUNT_CARDS,surface.account],[DIAGNOSTIC_CARDS,surface.diagnostics]]){
  for(const id of ids){
   const card=document.getElementById(id);
   if(!card)continue;
   if(visible)card.removeAttribute('data-surface-hidden');
   else card.setAttribute('data-surface-hidden','');
  }
 }
}
const api={ACCOUNT_CARDS,DIAGNOSTIC_CARDS,decide,apply};
if(typeof module!=='undefined')module.exports=api;
if(root.document){
 const surface=decide(root.location,root.PICKLEUP_AUTH_CONFIG,root.PickleUpAuthOrigin);
 apply(root.document,surface);
 root.PICKLEUP_SETTINGS_SURFACE=Object.freeze(surface);
}
})(typeof window==='undefined'?globalThis:window);
