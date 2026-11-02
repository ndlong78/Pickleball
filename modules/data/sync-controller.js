/* PR4b: explicitly enabled, account-bound sender for preferences/checkins.
 * No UI wiring or automatic login delivery. Persist immutable requests first. */
(function(root){
'use strict';
class SyncError extends Error{constructor(code){super(code);this.name='SyncError';this.code=code}}
const fail=code=>{throw new SyncError(code)};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function create({auth,repository,owner,pullFactory=root.PickleUpPullController,enabled=()=>false,online=()=>root.navigator?.onLine!==false,now=()=>Date.now(),random=()=>Math.random(),instanceId=root.crypto.randomUUID(),budget=25,policy='preferences-checkins-1',activityCore=root.PickleUpActivityCore,activityConsentRevision=null}){
 const events=policy==='activity-events-1',eventKinds=new Set(['academy_attempts','skill_assessments','training_entries','match_records']);
 if(events&&(!repository.policies?.includes(policy)||!pullFactory.POLICIES?.includes(policy))||activityConsentRevision!==null&&(repository.activityLifecycle!==1||pullFactory.ACTIVITY_LIFECYCLE!==1))fail('upgrade_required');
 if(activityConsentRevision!==null&&(!events||typeof activityConsentRevision!=='string'||! /^[1-9][0-9]{0,18}$/.test(activityConsentRevision)))fail('invalid_options');
 if(!['preferences-checkins-1','activity-events-1'].includes(policy)||events&&(!activityCore||typeof auth.eventRpc!=='function'))fail('invalid_options');
 if(!UUID.test(owner)||!UUID.test(instanceId)||typeof enabled!=='function'||typeof online!=='function'||!Number.isInteger(budget)||budget<1||budget>100)fail('invalid_options');
 const scope=repository.scope('user:'+owner),reader=pullFactory.create({auth,repository,owner,enabled,policy,activityCore,activityConsentRevision});let active=true,busy=false;
 const unsubscribe=auth.subscribe(state=>{if(state.user?.id!==owner){active=false;scope.close();reader.close()}});if(!active)unsubscribe();
 function guard(){if(!active)fail('account_changed');if(enabled()!==true)fail('pilot_disabled');if(online()!==true)fail('offline')}
 async function rpc(method,args){guard();const response=await auth[events?'eventRpc':'syncRpc'](owner,method,args);guard();return response}
 async function summary(){const all=await scope.listOutbox(),operations=events?all.filter(op=>eventKinds.has(op.kind)):all;return {pending:operations.filter(o=>['pending','deferred','sending'].includes(o.state)).length,conflicts:operations.filter(o=>['conflict','blocked'].includes(o.state)).length,...(events?{otherPending:all.filter(op=>!eventKinds.has(op.kind)&&['pending','deferred','sending'].includes(op.state)).length}:{})}}
 return {
  policy,
  async sync({forceRetry=false}={}){
   guard();if(busy)fail('busy');if(typeof forceRetry!=='boolean')fail('invalid_options');busy=true;let lease=false;
   try{
    lease=await scope.acquireLease(instanceId,now(),15000,policy);guard();if(!lease)return {status:'busy'};
    const head=await rpc('prepare_sync',{p_protocol_version:1});
    if(head?.status!=='ok'||!UUID.test(head.epoch))fail(['auth_required','network_error','stale','upgrade_required','unavailable'].includes(head?.status)?head.status:'upgrade_required');
    let cursor=await scope.getSyncCursor(policy);guard();
    if(!cursor||cursor.epoch!==head.epoch){await reader.pull({forceReset:!!cursor});guard();cursor=await scope.getSyncCursor(policy);if(cursor.epoch!==head.epoch)fail('reset_required')}
    let delivered=0;
    for(;delivered<budget;delivered++){
     guard();if(!await scope.acquireLease(instanceId,now(),15000,policy))return {status:'busy',...await summary()};
     const claim=await scope.claimSync({leaseOwner:instanceId,epoch:head.epoch,now:now(),forceRetry,policy,activityConsentRevision});guard();
     if(claim.status==='retry_wait')return {...claim,...await summary()};
     if(claim.status==='idle')break;
     const op=claim.operation,body=op.request;let result;
     try{
      if(events){try{if(body.p_action==='put'){if(body.p_expected_revision!=='0')throw Error();activityCore.payload(op.kind,body.p_payload)}}catch(_){result={status:'invalid',epoch:body.p_epoch}}}
      if(!result)result=await rpc(events?'apply_event_operation':'apply_sync_operation',body);
     }catch(error){if(['account_changed','pilot_disabled','offline','consent_changed'].includes(error.code))throw error;result={status:'network_error'}}
     const transient=['network_error','auth_required','stale','unavailable','limit_exceeded','upgrade_required'].includes(result?.status);
     if(transient||!result){
      const code=result?.status||'network_error',delay=Math.min(60000,1000*2**Math.min(op.attempts-1,6))*(0.75+Math.max(0,Math.min(1,random()))*0.5);
      await scope.deferSync(op.operationId,body,{code,policy,nextAttemptAt:now()+Math.round(delay)});guard();return {status:code,...await summary()};
     }
     let outcome;
     try{if(events&&['applied','conflict'].includes(result?.status)&&result.row)try{activityCore.row(op.kind,result.row,{owner,id:op.id})}catch(_){fail('invalid_response')}outcome=await scope.completeSync(op.operationId,body,result,{policy,activityConsentRevision})}catch(error){if(error.code!=='invalid_response')throw error;await scope.deferSync(op.operationId,body,{code:'invalid_response',policy,nextAttemptAt:now()+60000});return {status:'invalid_response',...await summary()}}
     guard();if(outcome.status==='reset_required'){await reader.pull({forceReset:true});guard();return {status:'needs_review',...await summary()}}
    }
    await reader.pull();guard();const counts=await summary();guard();return {status:counts.conflicts?'needs_review':counts.pending?'pending':'synced',delivered,...counts};
   }finally{busy=false;if(lease&&active)await scope.releaseLease(instanceId,policy)}
  },
  close(){active=false;unsubscribe();reader.close();scope.close()}
 };
}
const api={create,SyncError,ACTIVITY_LIFECYCLE:1,POLICIES:Object.freeze(['preferences-checkins-1','activity-events-1'])};if(typeof module!=='undefined')module.exports=api;else root.PickleUpSyncController=api;
})(typeof window==='undefined'?globalThis:window);
