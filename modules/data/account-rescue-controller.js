/* Own-account read-only capture and file inspection. No writer or RPC transport. */
(function(root){
'use strict';
class ControllerError extends Error{constructor(code){super(code);this.code=code;this.name='ControllerError'}}
function create({auth,openRepository,core=root.PickleUpAccountRescueCore,onChange=()=>{}}){
 let owner=null,generation=0,serial=0,scope=null,db=null,closed=false,prepared=null;
 let state={owner:null,mode:'guest',busy:false,error:null,report:null,source:null};
 const copy=v=>structuredClone(v),emit=()=>onChange(copy(state));
 function guard(stamp,version){if(closed||stamp!==generation||version!==serial||!owner)throw new ControllerError('account_changed')}
 const unsubscribe=auth.subscribe(next=>{
  const who=next.status==='authenticated'?next.user?.id||null:null;
  if(who===owner)return;owner=who;generation++;serial++;scope?.close();scope=null;prepared=null;state={owner,mode:owner?'ready':'guest',busy:false,error:null,report:null,source:null};emit();
 });
 async function task(work){
  if(closed||!owner)throw new ControllerError('auth_required');if(state.busy)throw new ControllerError('busy');
  const stamp=generation,version=++serial,who=owner;prepared=null;state={...state,busy:true,error:null,report:null,source:null};emit();
  try{const result=await work({who,stamp,version});guard(stamp,version);prepared=result.text||null;state={...state,mode:'ready',report:result.report,source:result.source};emit();return copy(result.report)}
  catch(error){if(stamp===generation&&version===serial&&!closed){prepared=null;state={...state,mode:'error',error:error.code||'unavailable',report:null,source:null};emit()}throw error}
  finally{if(stamp===generation&&version===serial&&!closed){state={...state,busy:false};emit()}}
 }
 return {
  getState:()=>copy(state),
  capture(){return task(async({who,stamp,version})=>{
   if(!db){const opened=await openRepository();try{guard(stamp,version)}catch(error){opened.close();throw error}db=opened}
   scope||=db.scope('user:'+who);const snapshot=await scope.getAccountRescueSnapshot();guard(stamp,version);const result=await core.create(snapshot,{expectedOwner:who});guard(stamp,version);return {...result,source:'device'};
  })},
  inspect(text){return task(async({who,stamp,version})=>{const content=typeof text==='function'?await text():text;guard(stamp,version);const result=await core.preview(content,{expectedOwner:who});guard(stamp,version);return {...result,source:'file'};})},
  // Revalidate owner/version synchronously at the user download click; no cached A artifact under B.
  download(){if(closed||!owner||state.busy||state.source!=='device'||!prepared)throw new ControllerError('not_prepared');return {owner,text:prepared}},
  invalidate(){generation++;serial++;scope?.close();scope=null;db?.close();db=null;prepared=null;state={...state,mode:'error',busy:false,error:'upgrade_required',report:null,source:null};emit()},
  close(){closed=true;generation++;serial++;scope?.close();db?.close();unsubscribe();prepared=null}
 };
}
const api={create,ControllerError};if(typeof module!=='undefined')module.exports=api;else root.PickleUpAccountRescueController=api;
})(typeof window==='undefined'?globalThis:window);
