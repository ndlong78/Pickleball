/* PR4a read-only canonical cache. Dormant until explicitly enabled by a caller.
 * No sender, legacy writes, auto-import or UI source switch. */
(function(root){
'use strict';
const KINDS=new Set(['profiles','user_preferences','personal_plans','academy_attempts','skill_assessments','practice_checkins','training_entries','match_records','user_selections','legacy_score_snapshots','legacy_imports','legacy_import_items']);
const CACHED=new Set(['user_preferences','practice_checkins']);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const decimal=value=>typeof value==='string'&&/^(0|[1-9][0-9]{0,18})$/.test(value)&&BigInt(value)<=9223372036854775807n;
class PullError extends Error{constructor(code){super(code);this.name='PullError';this.code=code}}
const fail=code=>{throw new PullError(code)};
function create({auth,repository,owner,enabled=()=>false,pageSize=50,maxPages=201,maxBytes=16*1024*1024,policy='preferences-checkins-1',activityCore=root.PickleUpActivityCore,activityConsentRevision=null,planCore=root.PickleUpPlanCore,planConsentRevision=null}){
 const plans=policy==='plans-selections-1',events=policy==='activity-events-1',cached=plans?new Set(['personal_plans','user_selections']):events?new Set(['academy_attempts','skill_assessments','training_entries','match_records']):CACHED;
 if(plans&&(repository.planLifecycle!==1||typeof auth.planRpc!=='function'||!planCore))fail('upgrade_required');
 if(plans&&(!decimal(planConsentRevision)||planConsentRevision==='0')||!plans&&planConsentRevision!==null)fail('invalid_options');
 if(events&&!repository.policies?.includes(policy)||activityConsentRevision!==null&&repository.activityLifecycle!==1)fail('upgrade_required');
 if(activityConsentRevision!==null&&(!events||!decimal(activityConsentRevision)||activityConsentRevision==='0'))fail('invalid_options');
 if(!['preferences-checkins-1','activity-events-1','plans-selections-1'].includes(policy)||events&&(!activityCore||typeof auth.eventRpc!=='function'))fail('invalid_options');
 if(typeof enabled!=='function'||!UUID.test(owner)||!Number.isInteger(pageSize)||pageSize<1||pageSize>200||!Number.isInteger(maxPages)||maxPages<1||maxPages>201||!Number.isInteger(maxBytes)||maxBytes<1||maxBytes>16*1024*1024)fail('invalid_options');
 const scope=repository.scope('user:'+owner);let active=true,busy=false;
 const unsubscribe=auth.subscribe(state=>{if(state.user?.id!==owner){active=false;scope.close()}});
 if(!active)unsubscribe();
 function guard(){if(!active)fail('account_changed');if(enabled()!==true)fail('pilot_disabled')}
 async function fetchCycle(start){
  let after=start.afterRevision,high=null,epoch=start.epoch,bytes=0,count=0;const latest=new Map();
  for(let index=0;index<maxPages;index++){
   guard();const page=await auth[plans?'planRpc':events?'eventRpc':'importRpc'](owner,'pull_changes',{p_after_revision:after,p_limit:pageSize,p_high_water:high,p_epoch:epoch,p_protocol_version:1});guard();
   if(page?.status!=='ok')fail(['reset_required','auth_required','stale','network_error','unavailable','upgrade_required','limit_exceeded'].includes(page?.status)?page.status:'invalid_response');
   bytes+=new TextEncoder().encode(JSON.stringify(page)).length;if(bytes>maxBytes)fail('pull_limit');
   if(!decimal(page.high_water)||!decimal(page.next_revision)||typeof page.has_more!=='boolean'||!(page.epoch===null||UUID.test(page.epoch))||page.high_water!=='0'&&page.epoch===null||!Array.isArray(page.changes)||page.changes.length>pageSize)fail('invalid_response');
   if(high!==null&&(page.high_water!==high||page.epoch!==epoch))fail('invalid_response');
   if(index===0&&epoch!==null&&page.epoch!==epoch)fail('reset_required');
   high=page.high_water;epoch=page.epoch;
   if(BigInt(high)<BigInt(after))fail('reset_required');
   let next=BigInt(after);
   for(const change of page.changes){
    const row=change?.row;
    if(!decimal(change?.server_revision)||BigInt(change.server_revision)!==next+1n||BigInt(change.server_revision)>BigInt(high)||!KINDS.has(change.entity_kind)||typeof change.entity_key!=='string'||!row||row.user_id!==owner||!decimal(row.revision)||row.revision==='0'||change.record_revision!==row.revision)fail('invalid_response');
    next++;if(++count>10050)fail('pull_limit');
    if(cached.has(change.entity_kind)){if(events||plans)try{(plans?planCore:activityCore).row(change.entity_kind,row,{owner,id:change.entity_key})}catch(_){fail('invalid_response')}latest.set(change.entity_kind+':'+change.entity_key,{kind:change.entity_kind,id:change.entity_key,row});}
   }
   if(page.next_revision!==next.toString()||page.has_more!==(next<BigInt(high))||page.has_more&&next===BigInt(after))fail('invalid_response');
   if(!page.has_more)return {rows:[...latest.values()],afterRevision:high,epoch};
   after=page.next_revision;
  }fail('pull_limit');
 }
 return {
  async pull({forceReset=false}={}){
   guard();if(busy)fail('busy');if(typeof forceReset!=='boolean')fail('invalid_options');busy=true;
   try{
    const cursor=await scope.getSyncCursor(policy);guard();let reset=forceReset||!!cursor&&cursor.policy!==policy,result;
    try{result=await fetchCycle(reset?{afterRevision:'0',epoch:null}:cursor||{afterRevision:'0',epoch:null})}
    catch(error){if(error.code!=='reset_required'||reset)throw error;guard();reset=true;result=await fetchCycle({afterRevision:'0',epoch:null})}
    guard();if(cursor&&cursor.epoch!==result.epoch)reset=true;
    const saved=await scope.applyCanonicalSnapshot({...result,reset,policy,activityConsentRevision,planConsentRevision,expectedLocalVersion:cursor?.localVersion||'0'});guard();
    return {status:'updated',cursor:saved,reset,records:result.rows.length};
   }finally{busy=false}
  },
  close(){active=false;unsubscribe();scope.close()}
 };
}
const api={create,PullError,ACTIVITY_LIFECYCLE:1,PLAN_LIFECYCLE:1,POLICIES:Object.freeze(['preferences-checkins-1','activity-events-1','plans-selections-1'])};if(typeof module!=='undefined')module.exports=api;else root.PickleUpPullController=api;
})(typeof window==='undefined'?globalThis:window);
