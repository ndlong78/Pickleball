/* Standalone PR5b1b plan lifecycle. No legacy reads, DOM wiring or automatic RPC. */
(function(root){
'use strict';
const POLICY='plans-selections-1';
class PlanError extends Error{constructor(code){super(code);this.name='PlanError';this.code=code}}
const fail=code=>{throw new PlanError(code)};
const clone=value=>structuredClone(value);
function create({auth,repository,core=root.PickleUpPlanCore,pullFactory=root.PickleUpPullController,syncFactory=root.PickleUpSyncController,enabled=()=>false,onChange=()=>{},now=()=>new Date(),channelFactory=name=>root.document&&typeof root.BroadcastChannel==='function'?new root.BroadcastChannel(name):null}={}){
 if(repository?.planLifecycle!==1||pullFactory?.PLAN_LIFECYCLE!==1||syncFactory?.PLAN_LIFECYCLE!==1)fail('upgrade_required');
 if(!core||typeof auth?.planRpc!=='function'||typeof enabled!=='function')fail('invalid_options');
 let generation=0,owner=null,scope=null,reader=null,sender=null,closed=false,initial,api;
 const blank=(mode,who)=>({mode,owner:who,busy:false,error:null,consent:{enabled:false,localRevision:'0'},snapshot:null,projection:null});
 let state=blank('loading',null);
 const channel=enabled()===true?channelFactory('pickleup-plans-1'):null;
 function emit(){onChange(clone(state))}
 function stop(){scope?.close();reader?.close();sender?.close();scope=reader=sender=null}
 function guard(stamp=generation){if(closed||stamp!==generation)fail('account_changed');if(enabled()!==true)fail('pilot_disabled')}
 function notify(){if(!closed&&owner)channel?.postMessage({type:'changed',owner})}
 function account(){guard();if(!owner)fail('auth_required');if(state.mode!=='account'||!state.consent.enabled)fail('source_unavailable')}
 async function load(stamp){
  const own=scope,consent=state.consent;
  const snapshot=await own.getPlanSnapshot();guard(stamp);
  const current=await own.getPlanConsent();guard(stamp);
  if(!current.enabled||current.localRevision!==consent.localRevision)fail('consent_changed');
  let projection;
  try{projection=core.project(snapshot,{owner,now:now()})}
  catch(error){if(stamp===generation&&!closed){stop();state={...blank('error',owner),error:error.code||'invalid_plan'};emit()}throw error}
  state={...state,snapshot,projection};emit();return snapshot;
 }
 async function adopt(next){
  const stamp=++generation;stop();owner=next;
  state=blank(next&&enabled()===true?'loading':'guest',next);emit();
  if(!next||closed||stamp!==generation||enabled()!==true)return;
  try{
   scope=repository.scope('user:'+next);const consent=await scope.getPlanConsent();guard(stamp);
   state={...state,consent,mode:consent.enabled?'account':'guest'};
   if(consent.enabled)await load(stamp);else emit();
  }catch(error){if(stamp===generation&&!closed){state={...blank('error',next),error:error.code||'storage_unavailable'};emit()}}
 }
 const unsubscribe=auth.subscribe(value=>{
  const next=value.status==='authenticated'?value.user?.id||null:null;
  if(next!==owner||state.mode==='loading'&&!scope)initial=adopt(next);
 });
 if(!initial)initial=adopt(null);
 async function task(work){
  guard();if(!owner)fail('auth_required');if(state.busy)fail('busy');
  const stamp=generation;state={...state,busy:true,error:null};emit();
  try{guard(stamp);const result=await work(stamp);guard(stamp);return result}
  catch(error){
   if(stamp===generation&&!closed){
    const expected=stamp+Number(['consent_changed','pilot_disabled'].includes(error.code));
    if(expected!==stamp)await adopt(owner);
    if(expected===generation&&!closed){state={...state,error:error.code||'storage_unavailable'};emit()}
   }
   throw error;
  }finally{if(stamp===generation&&!closed){state={...state,busy:false};emit()}}
 }
 function factory(type,stamp){
  const who=owner,own=scope,consentRevision=state.consent.localRevision;
  const guardedAuth={subscribe:fn=>auth.subscribe(fn),async planRpc(actor,name,args){
   guard(stamp);const consent=await own.getPlanConsent();guard(stamp);
   if(actor!==who||!consent.enabled||consent.localRevision!==consentRevision)fail('consent_changed');
   const result=await auth.planRpc(actor,name,args);guard(stamp);
   const after=await own.getPlanConsent();guard(stamp);
   if(!after.enabled||after.localRevision!==consentRevision)fail('consent_changed');return result;
  }};
  const options={auth:guardedAuth,repository,owner:who,policy:POLICY,planCore:core,enabled,planConsentRevision:consentRevision};
  return type==='reader'?pullFactory.create(options):syncFactory.create({...options,pullFactory});
 }
 async function read(stamp,{forceReset=false}={}){
  reader||=factory('reader',stamp);
  // An empty account needs prepare_sync to establish the epoch before local writes.
  const consent=await scope.getPlanConsent();guard(stamp);
  if(!consent.enabled||consent.localRevision!==state.consent.localRevision)fail('consent_changed');
  const head=await auth.planRpc(owner,'prepare_sync',{p_protocol_version:1});guard(stamp);
  if(head?.status!=='ok')fail(['auth_required','network_error','stale','unavailable','upgrade_required'].includes(head?.status)?head.status:'invalid_response');
  await reader.pull({forceReset});guard(stamp);await load(stamp);notify();return {status:'updated'};
 }
 async function refreshLocal(){
  if(closed)return;
  if(enabled()!==true){await adopt(owner);return}
  if(!owner||!scope)return;
  const stamp=generation;
  try{
   const consent=await scope.getPlanConsent();guard(stamp);
   if(consent.enabled!==state.consent.enabled||consent.localRevision!==state.consent.localRevision){await adopt(owner);return}
   if(consent.enabled&&!state.busy)await load(stamp);
  }catch(error){if(stamp===generation&&!closed){stop();state={...blank('error',owner),error:error.code||'storage_unavailable'};emit()}}
 }
 channel?.addEventListener('message',event=>{if(event.data?.type==='changed'&&event.data.owner===owner)refreshLocal().catch(()=>{})});
 function writable(kind,id,expected,operationId){
  account();if(state.busy)fail('busy');if(!core.KINDS.includes(kind))fail('invalid_plan');
  if(!state.snapshot?.cursor?.epoch)fail('bootstrap_required');
  const row=state.snapshot.records.find(r=>r.kind===kind&&r.id===id);
  const replay=state.snapshot.outbox.some(op=>op.operationId===operationId&&op.kind===kind&&op.id===id);
  if(replay)return {row,replay};
  if((row?.localRevision||'0')!==expected)fail('local_conflict');
  if(row?.reviewRequired)fail('needs_review');return {row,replay:false};
 }
 function write(kind,id,operationId,expectedLocalRevision,action,value){
  return task(async stamp=>{const result=await scope.write({kind,id,operationId,expectedLocalRevision,action,value,planConsentRevision:state.consent.localRevision});guard(stamp);await load(stamp);notify();return result});
 }
 api={
  ready:initial,
  getState(){return clone(state)},refreshLocal,
  async useAccount({expectedConsentRevision=state.consent.localRevision}={}){
   return task(async stamp=>{
    if(state.consent.localRevision!==expectedConsentRevision)fail('local_conflict');
    if(!state.consent.enabled){const consent=await scope.setPlanConsent(true,expectedConsentRevision);guard(stamp);state={...state,consent,mode:'account'};notify()}
    await load(stamp);guard(stamp);return read(stamp);
   });
  },
  async useDevice({expectedConsentRevision=state.consent.localRevision}={}){
   guard();if(!owner)fail('auth_required');
   const who=owner,stamp=++generation;stop();scope=repository.scope('user:'+who);
   state={...blank('guest',who),busy:true};emit();
   try{
    guard(stamp);const consent=await scope.setPlanConsent(false,expectedConsentRevision);guard(stamp);
    state={...state,consent};notify();await adopt(who);return {status:'device'};
   }catch(error){if(stamp===generation&&!closed){await adopt(who);if(generation===stamp+1&&!closed){state={...state,error:error.code||'storage_unavailable'};emit()}}throw error}
  },
  async refresh({forceReset=false}={}){
   return task(async stamp=>{
    scope||=repository.scope('user:'+owner);const consent=await scope.getPlanConsent();guard(stamp);
    if(!consent.enabled)fail('source_unavailable');
    const reset=forceReset||state.mode==='error';
    if(consent.localRevision!==state.consent.localRevision){reader?.close();sender?.close();reader=sender=null}
    state={...state,mode:'account',consent};return read(stamp,{forceReset:reset});
   });
  },
  async sync({forceRetry=false}={}){
   account();return task(async stamp=>{
    sender||=factory('sender',stamp);
    try{return await sender.sync({forceRetry})}
    finally{guard(stamp);await load(stamp);notify()}
   });
  },
  async createPlan({id,operationId,value}){
   writable('personal_plans',id,'0',operationId);const payload=core.payload('personal_plans',value);
   return write('personal_plans',id,operationId,'0','put',payload);
  },
  async updateResult({id,operationId,expectedLocalRevision,value}){
   const {row,replay}=writable('personal_plans',id,expectedLocalRevision,operationId);if(!row||row.deleted&&!replay)fail('entity_not_found');
   return write('personal_plans',id,operationId,expectedLocalRevision,'put',core.payload('personal_plans',value,{revision:'1'}));
  },
  async select({operationId,expectedLocalRevision='0',value}){
   writable('user_selections','self',expectedLocalRevision,operationId);
   return write('user_selections','self',operationId,expectedLocalRevision,'put',core.payload('user_selections',value));
  },
  async deleteEntity({kind,id,operationId,expectedLocalRevision}){
   const {row,replay}=writable(kind,id,expectedLocalRevision,operationId);if(!row)fail('entity_not_found');if(row.deleted&&!replay)fail('already_deleted');
   return write(kind,id,operationId,expectedLocalRevision,'delete',{});
  },
  async restoreEntity({kind,id,operationId,expectedLocalRevision,value={}}){
   const {row,replay}=writable(kind,id,expectedLocalRevision,operationId);if(!replay&&(!row?.base?.deleted_at||row.tailOperationId))fail('restore_requires_ack');
   return write(kind,id,operationId,expectedLocalRevision,'restore',core.payload(kind,value,{action:'restore',revision:row.baseRevision}));
  },
  async previewReview(kind,id){
   account();const stamp=generation,view=await scope.inspectPlanReview(kind,id);guard(stamp);
   if(!view.consent.enabled||view.consent.localRevision!==state.consent.localRevision)fail('consent_changed');
   if(view.record.base)core.row(kind,view.record.base,{owner,id});return view;
  },
  async resolveReview(review,mode,{operationId,action='put',value={},acknowledgeEpochChange=false}={}){
   account();if(review?.record?.namespace!=='user:'+owner)fail('invalid_review');
   const row=review.record;if(row.base)core.row(row.kind,row.base,{owner,id:row.id});
   const payload=mode==='local'?core.payload(row.kind,value,{action,revision:row.baseRevision}):{};
   if(mode==='local'&&row.kind==='personal_plans'&&row.base&&action!=='delete'&&row.overlay?.plan_snapshot){
    for(const key of ['source','schema_version','level_band','plan_snapshot'])if(core.canonical(row.overlay[key])!==core.canonical(row.base[key]))fail('immutable_plan_fields');
   }
   return task(async stamp=>{const result=await scope.resolvePlanReview({review,mode,operationId,action,value:payload,acknowledgeEpochChange});guard(stamp);await load(stamp);notify();return result});
  },
  async exportCache(){
   return task(async stamp=>{
    scope||=repository.scope('user:'+owner);
    const snapshot=await scope.getPlanSnapshot();guard(stamp);
    const consent=await scope.getPlanConsent();guard(stamp);
    const artifact={app:'PickleUp',format:'plans-selections-cache-v1',owner,exportedAt:now().toISOString(),scope:[...core.KINDS],consent,...snapshot};
    JSON.stringify(artifact,(key,value)=>{if(/^(access_token|refresh_token|password|otp|service_role|publishableKey|authorization|secret|db_password|api_key)$/i.test(key))fail('credentials_forbidden');return value});
    return artifact;
   });
  },
  close(){closed=true;generation++;stop();channel?.close();unsubscribe();state=blank('guest',null)}
 };
 return api;
}
const api={create,PlanError,POLICY};if(typeof module!=='undefined')module.exports=api;else root.PickleUpPlanController=api;
})(typeof window==='undefined'?globalThis:window);
