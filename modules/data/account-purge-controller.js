/* Device preview/export, explicit local logout, then atomic clean-cache purge. */
(function(root){
'use strict';
class PurgeError extends Error{constructor(code){super(code);this.code=code;this.name='PurgeError'}}
function create({auth,openRepository,core=root.PickleUpAccountRescueCore,host=root.PickleUpCacheMaintenanceHost,enabled=()=>false,online=()=>root.navigator?.onLine!==false,confirm=()=>false,uuid=()=>root.crypto.randomUUID(),onChange=()=>{},onBusy=()=>{}}){
 let owner=null,authStatus='guest',authError=null,generation=0,closed=false,db=null,scope=null,prepared=null,running=null,capturing=null;
 let state={owner:null,phase:'guest',busy:false,error:null,report:null,blockers:[],previewId:null,requested:false,acknowledged:false};
 const clone=v=>structuredClone(v),emit=()=>onChange(clone(state)),fail=code=>{throw new PurgeError(code)};
 function drop(){prepared=null;scope?.close();scope=null;db?.close();db=null}
 function blank(error=null){state={owner,phase:owner?'ready':'guest',busy:!!running,error,report:null,blockers:[],previewId:null,requested:false,acknowledged:false}}
 function cancel(code='cancelled'){generation++;capturing=null;drop();running?.scope?.close();if(running)running.cancelled=true;blank(code);emit()}
 function guard(stamp,{guest=false}={}){if(closed||stamp!==generation)fail('account_changed');if(enabled()!==true)fail('pilot_disabled');if(guest?authStatus!=='guest'||owner!==null:authStatus!=='authenticated'||!owner)fail('account_changed')}
 const unsubscribe=auth.subscribe(next=>{
  const who=next.status==='authenticated'?next.user?.id||null:null;authStatus=next.status;authError=next.error||null;
  if(running?.expectedGuest&&next.status==='guest'&&who===null){owner=null;prepared=null;state={...state,owner:null,report:null,blockers:[],previewId:null,requested:false,acknowledged:false};emit();return}
  if(who!==owner||running?.expectedGuest&&who){owner=who;cancel();state.error=null;emit()}
 });
 async function release(op){try{await op.lease?.release()}catch(_){}op.scope?.close();op.db?.close();op.snapshot=null}
 return {
  getState:()=>({...clone(state),generation}),
  async capture(){
   if(running||capturing)fail('busy');const stamp=generation,ticket={};guard(stamp);capturing=ticket;drop();state={...state,busy:true,phase:'reading',error:null,report:null,blockers:[],previewId:null,requested:false,acknowledged:false};emit();
   try{const opened=await openRepository();try{guard(stamp)}catch(error){opened.close();throw error}db=opened;if(db.version!==3||db.cachePurgeTransactions!==1)fail('upgrade_required');scope=db.scope('user:'+owner);const view=await scope.getAccountPurgePreview();guard(stamp);const file=await core.create(view.snapshot,{expectedOwner:owner});guard(stamp);const id=uuid();prepared={id,snapshot:view.snapshot,text:file.text};state={...state,phase:'preview',report:file.report,blockers:view.blockers,previewId:id};emit();return clone(file.report)}
   catch(error){if(stamp===generation&&!closed){drop();blank(error.code||'unavailable');emit()}throw error}
   finally{if(capturing===ticket)capturing=null;if(stamp===generation&&!closed){state={...state,busy:false};emit()}}
  },
  download(id){guard(generation);if(running||capturing||!prepared||id!==prepared.id)fail('not_prepared');return {text:prepared.text,id}},
  requested(id){this.download(id);state={...state,requested:true,acknowledged:false};emit()},
  acknowledge(id,value){this.download(id);if(!state.requested)fail('download_required');if(typeof value!=='boolean')fail('invalid_confirmation');state={...state,acknowledged:value};emit()},
  async purge(id){
   if(running||capturing)fail('busy');guard(generation);if(!prepared||prepared.id!==id||!state.requested||!state.acknowledged)fail('confirmation_required');if(state.blockers.length)fail('purge_blocked');if(!online())fail('offline');
   const stamp=generation,op={id:uuid(),owner,scope,db,snapshot:prepared.snapshot,lease:null,expectedGuest:false,cancelled:false};scope=db=null;running=op;state={...state,busy:true,error:null,phase:'checking'};emit();onBusy(op.id,true);
   try{
    await host.preflight();guard(stamp);
    // Native confirmation can stay open indefinitely. Acquire the expiring
    // lease after it, then recheck the entire snapshot before signing out.
    if(await confirm()){guard(stamp)}else{guard(stamp);prepared=null;blank();emit();return {status:'cancelled'}}
    op.lease=await host.acquire(code=>{if(running===op&&!op.cancelled)cancel(code)});guard(stamp);
    const latest=await op.scope.getAccountPurgePreview();guard(stamp);if(JSON.stringify(latest.snapshot)!==JSON.stringify(op.snapshot))fail('preview_changed');if(latest.blockers.length)fail('purge_blocked');
    await op.lease.verify();guard(stamp);if(!online())fail('offline');
    op.expectedGuest=true;prepared=null;state={...state,phase:'logging_out',report:null,blockers:[],previewId:null,requested:false,acknowledged:false};emit();
    const result=await auth.logout();guard(stamp,{guest:true});if(result?.error||authError)fail('logout_failed');
    await op.lease.verify();guard(stamp,{guest:true});state={...state,phase:'purging'};emit();
    await op.scope.purgeAccountCache({expectedSnapshot:op.snapshot,operationId:op.id});guard(stamp,{guest:true});
    state={...state,phase:'done',error:null};emit();return {status:'purged'};
   }catch(error){if(stamp===generation&&!closed){prepared=null;blank(error.code||'unavailable');emit()}throw error}
   finally{await release(op);if(running===op)running=null;onBusy(op.id,false);if(!closed){state={...state,busy:false};emit()}}
  },
  cancel,
  close(){closed=true;cancel();unsubscribe()}
 };
}
const api={create,PurgeError};if(typeof module!=='undefined')module.exports=api;else root.PickleUpAccountPurgeController=api;
})(typeof window==='undefined'?globalThis:window);
