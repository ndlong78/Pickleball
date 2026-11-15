/* PickleUp V5.18/V5.21 — keep public Settings focused on guest backup and rescue.
   Presentation only: hiding a card never disables its module, storage or the
   server Auth/RLS boundary. The Workers host shows operator tools only with an
   explicit pilot/maintenance URL; loopback keeps every tool for tests. */
(function(root){
'use strict';
// V5.31: sign-in, the three account sources and cache rescue are part of the product on the main host.
// V5.33: importing this device's legacy data is offered there too. Cache purge stays an operator tool behind an
// explicit ?pilot=… or ?maintenance=… URL.
const ACCOUNT_CARDS=['accountPanel','syncPilot','activityPilot','planPilot','importPilot','accountRescue'];
const OPERATOR_CARDS=['accountPurge'];
const DIAGNOSTIC_CARDS=['pageDiagnostics'];
function decide(location,auth,origin){
 let url=null;try{url=new URL(location.href)}catch(_){}
 const params=url?.searchParams;
 const internal=origin?.internal?.(location)===true;
 const loopback=internal&&['localhost','127.0.0.1','[::1]'].includes(url?.hostname);
 // The Workers host is also the public site: operator tools appear there only
 // with an explicit ?pilot=… or ?maintenance=… URL; loopback keeps them for tests.
 const tools=!!params&&(params.has('pilot')||params.has('maintenance'));
 return {account:internal,tools:loopback||internal&&tools,diagnostics:loopback||params?.get('debug')==='1'};
}
function apply(document,surface){
 for(const [ids,visible]of [[ACCOUNT_CARDS,surface.account],[OPERATOR_CARDS,surface.tools],[DIAGNOSTIC_CARDS,surface.diagnostics]]){
  for(const id of ids){
   const card=document.getElementById(id);
   if(!card)continue;
   if(visible)card.removeAttribute('data-surface-hidden');
   else card.setAttribute('data-surface-hidden','');
  }
 }
}
const api={ACCOUNT_CARDS,OPERATOR_CARDS,DIAGNOSTIC_CARDS,decide,apply};
if(typeof module!=='undefined')module.exports=api;
if(root.document){
 const surface=decide(root.location,root.PICKLEUP_AUTH_CONFIG,root.PickleUpAuthOrigin);
 apply(root.document,surface);
 root.PICKLEUP_SETTINGS_SURFACE=Object.freeze(surface);
 // Presentation only: mark that the account source is automatic so the manual source controls stay hidden.
 if(root.PickleUpStagingPilot?.auto?.()===true)root.document.documentElement?.setAttribute('data-source-auto','');
}
})(typeof window==='undefined'?globalThis:window);
