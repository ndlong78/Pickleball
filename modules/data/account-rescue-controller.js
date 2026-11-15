/* Own-account capture, file inspection and (2c) one-by-one re-queueing of recovered unsent operations through an injected
   restorer. This controller itself has no writer or RPC transport; private ids and payloads never leave RAM. */
(function(root){
'use strict';
const FAILED=new Set(['offline','pilot_disabled','source_unavailable','bootstrap_required','busy','needs_review','account_changed','local_conflict','network_error','auth_required','unavailable','stale','upgrade_required','invalid_response','not_prepared']);
class ControllerError extends Error{constructor(code){super(code);this.code=code;this.name='ControllerError'}}
function create({auth,openRepository,core=root.PickleUpAccountRescueCore,restoreCore=root.PickleUpRestorePreviewCore,planCore=root.PickleUpRestorePlanCore,restorer=()=>root.PICKLEUP_DATA,onChange=()=>{}}){
 let owner=null,generation=0,serial=0,scope=null,db=null,closed=false,prepared=null,selectedFile=null,planItems=null;
 let state={owner:null,mode:'guest',busy:false,error:null,report:null,source:null,comparison:null,plan:null};
 const copy=v=>structuredClone(v),emit=()=>onChange(copy(state));
 function guard(stamp,version){if(closed||stamp!==generation||version!==serial||!owner)throw new ControllerError('account_changed')}
 const unsubscribe=auth.subscribe(next=>{
  const who=next.status==='authenticated'?next.user?.id||null:null;
  if(who===owner)return;owner=who;generation++;serial++;scope?.close();scope=null;prepared=selectedFile=planItems=null;state={owner,mode:owner?'ready':'guest',busy:false,error:null,report:null,source:null,comparison:null,plan:null};emit();
 });
 async function task(work){
  if(closed||!owner)throw new ControllerError('auth_required');if(state.busy)throw new ControllerError('busy');
  const stamp=generation,version=++serial,who=owner;prepared=selectedFile=planItems=null;state={...state,busy:true,error:null,report:null,source:null,comparison:null,plan:null};emit();
  try{const result=await work({who,stamp,version});guard(stamp,version);prepared=result.text||null;selectedFile=result.fileSnapshot||null;planItems=result.planItems||null;state={...state,mode:'ready',report:result.report,source:result.source,comparison:result.comparison||null,plan:result.plan||null};emit();return copy(result.report)}
  catch(error){if(stamp===generation&&version===serial&&!closed){prepared=selectedFile=planItems=null;state={...state,mode:'error',error:error.code||'unavailable',report:null,source:null,comparison:null,plan:null};emit()}throw error}
  finally{if(stamp===generation&&version===serial&&!closed){state={...state,busy:false};emit()}}
 }
 return {
  getState:()=>copy(state),
  capture(){return task(async({who,stamp,version})=>{
   if(!db){const opened=await openRepository();try{guard(stamp,version)}catch(error){opened.close();throw error}db=opened}
   scope||=db.scope('user:'+who);const snapshot=await scope.getAccountRescueSnapshot();guard(stamp,version);const result=await core.create(snapshot,{expectedOwner:who});guard(stamp,version);return {...result,source:'device'};
  })},
  inspect(text){return task(async({who,stamp,version})=>{const content=typeof text==='function'?await text():text;guard(stamp,version);const result=await core.preview(content,{expectedOwner:who});guard(stamp,version);return {...result,source:'file',fileSnapshot:result.artifact.payload.snapshot};})},
  compareFile(){
   if(!selectedFile||state.source!=='file')throw new ControllerError('not_prepared');
   const fileSnapshot=selectedFile,fileReport=copy(state.report);
   return task(async({who,stamp,version})=>{
    if(!restoreCore)throw new ControllerError('unavailable');
    if(!db){const opened=await openRepository();try{guard(stamp,version)}catch(error){opened.close();throw error}db=opened}
    scope||=db.scope('user:'+who);const current=await scope.getAccountRescueSnapshot();guard(stamp,version);
    const comparison=restoreCore.compare(fileSnapshot,current,{expectedOwner:who});guard(stamp,version);
    return {report:fileReport,source:'file',fileSnapshot,comparison};
   });
  },
  // 2b: dry run. Which unsent operations in the chosen file could be offered for review? Reads only; writes nothing.
  planRestore(){
   if(!selectedFile||state.source!=='file')throw new ControllerError('not_prepared');
   const fileSnapshot=selectedFile,fileReport=copy(state.report),comparison=state.comparison?copy(state.comparison):null;
   return task(async({who,stamp,version})=>{
    if(!planCore)throw new ControllerError('unavailable');
    if(!db){const opened=await openRepository();try{guard(stamp,version)}catch(error){opened.close();throw error}db=opened}
    scope||=db.scope('user:'+who);const current=await scope.getAccountRescueSnapshot();guard(stamp,version);
    const result=planCore.plan(fileSnapshot,current,{expectedOwner:who});guard(stamp,version);
    const blocking=['device_has_unsent_change','device_has_open_conflict'];
    const items=result.items.map(i=>({kind:i.kind,action:i.action,state:i.state,warnings:[...i.warnings],restorable:planCore.SUPPORTED.has(i.kind)&&i.dependsOn===null&&!i.warnings.some(w=>blocking.includes(w)),status:null}));
    return {report:fileReport,source:'file',fileSnapshot,comparison,planItems:result.items.map(i=>({operationId:i.operationId,kind:i.kind,id:i.id})),plan:{summary:copy(result.summary),items}};
   });
  },
  // 2c: re-queue exactly one recovered operation. The restorer pulls fresh data and decides; nothing is sent from here.
  async restoreItem(index){
   if(closed||!owner||state.busy||!selectedFile||!planItems||!state.plan||!Number.isInteger(index))throw new ControllerError('not_prepared');
   const item=planItems[index],view=state.plan.items[index];
   if(!item||!view||!view.restorable||view.status)throw new ControllerError('not_prepared');
   const op=selectedFile.stores.outbox.find(row=>row.operationId===item.operationId);if(!op)throw new ControllerError('not_prepared');
   const target=typeof restorer==='function'?restorer():restorer;if(!target||typeof target.restoreIntent!=='function')throw new ControllerError('unavailable');
   const stamp=generation,version=serial,mark=status=>{if(stamp===generation&&version===serial&&!closed&&state.plan){const items=state.plan.items.map((x,i)=>i===index?{...x,status}:x);state={...state,busy:false,plan:{...state.plan,items}};emit()}};
   state={...state,busy:true};emit();
   try{const result=await target.restoreIntent({kind:item.kind,id:item.id,op:copy(op)});guard(stamp,version);mark('queued');return {status:result?.status||'queued'}}
   catch(error){const code=typeof error?.code==='string'?error.code:'unknown';mark(code.startsWith('restore_')?'blocked:'+code.slice(8):'failed:'+(FAILED.has(code)?code:'unknown'));throw error}
  },
  // Revalidate owner/version synchronously at the user download click; no cached A artifact under B.
  download(){if(closed||!owner||state.busy||state.source!=='device'||!prepared)throw new ControllerError('not_prepared');return {owner,text:prepared}},
  invalidate(){generation++;serial++;scope?.close();scope=null;db?.close();db=null;prepared=selectedFile=planItems=null;state={...state,mode:'error',busy:false,error:'upgrade_required',report:null,source:null,comparison:null,plan:null};emit()},
  close(){closed=true;generation++;serial++;scope?.close();db?.close();unsubscribe();prepared=selectedFile=planItems=null}
 };
}
const api={create,ControllerError};if(typeof module!=='undefined')module.exports=api;else root.PickleUpAccountRescueController=api;
})(typeof window==='undefined'?globalThis:window);
