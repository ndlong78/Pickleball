/* PR2: dormant local persistence. No Auth, network, legacy storage or UI writes. */
(function(root){
'use strict';
const VERSION=1;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KINDS=new Set(['profiles','user_preferences','personal_plans','academy_attempts','skill_assessments','practice_checkins','training_entries','match_records','user_selections']);
const EVENTS=new Set(['academy_attempts','skill_assessments','training_entries','match_records']);
const SINGLETONS=new Set(['profiles','user_preferences','user_selections']);
const PULL_KINDS=new Set(['user_preferences','practice_checkins']);
const DEFAULT_POLICY='preferences-checkins-1',ACTIVITY_POLICY='activity-events-1',PLAN_POLICY='plans-selections-1';
const PLANS=new Set(['personal_plans','user_selections']);
function policyConfig(policy){
 if(policy===DEFAULT_POLICY)return {slot:1,kinds:PULL_KINDS,lease:'senderLease'};
 if(policy===ACTIVITY_POLICY)return {slot:ACTIVITY_POLICY,kinds:EVENTS,lease:'activitySenderLease'};
 if(policy===PLAN_POLICY)return {slot:PLAN_POLICY,kinds:PLANS,lease:'planSenderLease'};
 fail('invalid_policy');
}
const STORES={records:['namespace','kind','id'],outbox:['namespace','operationId'],conflicts:['namespace','conflictId'],sync_cursor:['namespace','protocol'],import_receipts:['namespace','fingerprint','adapterVersion'],legacy_snapshots:['installationId','snapshotId'],device_state:['namespace','deviceId','key'],metadata:['namespace','key']};
class RepositoryError extends Error{constructor(code){super(code);this.name='RepositoryError';this.code=code}}
const fail=code=>{throw new RepositoryError(code)};
const revision=v=>typeof v==='string'&&/^(0|[1-9][0-9]{0,18})$/.test(v);
const copy=v=>structuredClone(v);
function canonical(value,depth=0){
 if(depth>12)fail('invalid_payload');
 if(value===null||typeof value==='boolean'||typeof value==='string')return JSON.stringify(value);
 if(typeof value==='number'&&Number.isFinite(value))return JSON.stringify(value);
 if(Array.isArray(value))return '['+Array.from(value,v=>canonical(v,depth+1)).join(',')+']';
 if(value&&Object.getPrototypeOf(value)===Object.prototype){
  const keys=Object.keys(value).sort();
  if(keys.some(k=>/^(access_token|refresh_token|password|otp|service_role|publishableKey)$/i.test(k)))fail('credentials_forbidden');
  return '{'+keys.map(k=>JSON.stringify(k)+':'+canonical(value[k],depth+1)).join(',')+'}';
 }
 fail('invalid_payload');
}
const request=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
function storageError(error){return error instanceof RepositoryError?error:new RepositoryError(error?.name==='QuotaExceededError'?'quota_exceeded':error?.name==='VersionError'?'upgrade_required':'storage_unavailable')}
function open({name='pickleup-v6',indexedDB=root.indexedDB,onBlocked=()=>{},onVersionChange=()=>{}}={}){
 if(!indexedDB)return Promise.reject(new RepositoryError('storage_unavailable'));
 return new Promise((resolve,reject)=>{
  let abandoned=false,opening;
  try{opening=indexedDB.open(name,VERSION)}catch(error){reject(storageError(error));return}
  opening.onblocked=()=>{abandoned=true;reject(new RepositoryError('upgrade_blocked'));onBlocked()};
  opening.onerror=()=>reject(storageError(opening.error));
  opening.onupgradeneeded=()=>{
   if(abandoned){opening.transaction.abort();return}
   for(const [store,keyPath] of Object.entries(STORES)){
    const table=opening.result.createObjectStore(store,{keyPath});
    if(store!=='legacy_snapshots')table.createIndex('namespace','namespace');
   }
  };
  opening.onsuccess=()=>{
   const db=opening.result;
   if(abandoned){db.close();return}
   const scopes=new Set();let closed=false;
   function close(){closed=true;for(const scope of scopes)scope.close();db.close()}
   db.onversionchange=()=>{close();onVersionChange()};
   function scope(namespace){
    if(closed)fail('storage_closed');
    if(typeof namespace!=='string'||! /^(guest|user):/.test(namespace)||!UUID.test(namespace.slice(namespace.indexOf(':')+1)))fail('invalid_namespace');
    const guest=namespace.startsWith('guest:');let active=true;
    const transactions=new Set();
    async function transaction(stores,mode,work){
     if(!active||closed)fail('scope_closed');
     let tx;try{tx=db.transaction(stores,mode)}catch(error){throw storageError(error)}
     transactions.add(tx);
     const done=new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=()=>reject(storageError(tx.error));tx.onerror=()=>{}});
     // Attach a rejection handler before request callbacks can abort the transaction.
     done.catch(()=>{});
     try{
      const result=await work(tx);
      await done;
      if(!active||closed)fail('scope_closed');
      return result;
     }catch(error){try{tx.abort()}catch(_){}await done.catch(()=>{});throw storageError(error)}finally{transactions.delete(tx)}
    }
    function identity(kind,id){
     if(!KINDS.has(kind)||typeof id!=='string'||(EVENTS.has(kind)||kind==='personal_plans')&&id!==id.toLowerCase())fail('invalid_entity');
     if(SINGLETONS.has(kind)?id!=='self':kind==='practice_checkins'?!/^\d{4}-\d{2}-\d{2}$/.test(id)||!Number.isFinite(Date.parse(id+'T00:00:00Z'))||new Date(id+'T00:00:00Z').toISOString().slice(0,10)!==id:!UUID.test(id))fail('invalid_entity');
    }
    const syncStores=['records','outbox','metadata','conflicts','sync_cursor'];
    const rowKey=op=>[namespace,op.kind,op.id];
    function syncIdentity(op,policy=DEFAULT_POLICY){if(guest||!policyConfig(policy).kinds.has(op.kind))fail('invalid_sync_operation');identity(op.kind,op.id)}
    async function touchCursor(tx,policy=DEFAULT_POLICY){const store=tx.objectStore('sync_cursor'),cursor=await request(store.get([namespace,policyConfig(policy).slot]));if(cursor)await request(store.put({...cursor,localVersion:(BigInt(cursor.localVersion)+1n).toString()}));return cursor}
    async function block(tx,op,row,reason){
     const conflicts=tx.objectStore('conflicts'),prior=await request(conflicts.get([namespace,op.operationId]));
     op.state=reason==='conflict'||reason==='remote_changed'?'conflict':'blocked';op.reason=reason;
     await request(tx.objectStore('outbox').put(op));
     await request(conflicts.put(prior||{namespace,conflictId:op.operationId,kind:op.kind,id:op.id,state:'open',reason,originalBase:row.reviewBase||{row:op.baseSnapshot||null,revision:op.expectedRevision,epoch:op.request?.p_epoch||row.baseEpoch||null},local:row.overlay,deleted:row.deleted}));
     await request(tx.objectStore('records').put({...row,reviewRequired:true,reviewReason:reason,localRevision:(BigInt(row.localRevision)+1n).toString()}));
    }
    function domainSnapshot(policy){
     if(guest)fail('auth_required');const config=policyConfig(policy);
     return transaction(['records','outbox','conflicts','sync_cursor'],'readonly',async tx=>{
      const own=async name=>(await request(tx.objectStore(name).index('namespace').getAll(namespace))).filter(row=>config.kinds.has(row.kind));
      return {records:await own('records'),outbox:await own('outbox'),conflicts:await own('conflicts'),cursor:await request(tx.objectStore('sync_cursor').get([namespace,config.slot]))};
     });
    }
    async function activityConsent(tx){
     const saved=await request(tx.objectStore('metadata').get([namespace,'activity-consent-1']));
     if(!saved)return {enabled:false,localRevision:'0'};
     if(typeof saved.enabled!=='boolean'||!revision(saved.localRevision)||saved.localRevision==='0')fail('invalid_consent');
     return {enabled:saved.enabled,localRevision:saved.localRevision};
    }
    async function requireActivityConsent(tx,expected){
     if(guest||!revision(expected)||expected==='0')fail('consent_changed');
     const consent=await activityConsent(tx);
     if(!consent.enabled||consent.localRevision!==expected)fail('consent_changed');
    }
    async function activityReview(tx,kind,id){
     identity(kind,id);if(guest||!EVENTS.has(kind))fail('invalid_review');
     const record=await request(tx.objectStore('records').get([namespace,kind,id]));if(!record)fail('entity_not_found');
     const own=async store=>(await request(tx.objectStore(store).index('namespace').getAll(namespace))).filter(row=>row.kind===kind&&row.id===id);
     return {record,operations:(await own('outbox')).filter(op=>!['acked','resolved'].includes(op.state)),conflicts:(await own('conflicts')).filter(row=>row.state==='open'),cursor:await request(tx.objectStore('sync_cursor').get([namespace,ACTIVITY_POLICY])),consent:await activityConsent(tx)};
    }
    async function planConsent(tx){
     const saved=await request(tx.objectStore('metadata').get([namespace,'plans-selections-consent-1']));
     if(!saved)return {enabled:false,localRevision:'0'};
     if(typeof saved.enabled!=='boolean'||!revision(saved.localRevision)||saved.localRevision==='0')fail('invalid_consent');
     return {enabled:saved.enabled,localRevision:saved.localRevision};
    }
    async function requirePlanConsent(tx,expected){
     if(guest||!revision(expected)||expected==='0')fail('consent_changed');
     const consent=await planConsent(tx);if(!consent.enabled||consent.localRevision!==expected)fail('consent_changed');
    }
    async function practiceFence(tx,fence){
     if(guest||!fence||!['plan','activity'].some(k=>fence[k]?.enabled===true))fail('source_unavailable');
     for(const [key,read] of [['plan',planConsent],['activity',activityConsent]]){
      const expected=fence[key];if(expected===null)continue;
      if(!expected||typeof expected.enabled!=='boolean'||!revision(expected.localRevision))fail('invalid_consent');
      const current=await read(tx);if(current.enabled!==expected.enabled||current.localRevision!==expected.localRevision)fail('consent_changed');
     }
    }
    function practiceValue(value){
     canonical(value);
     if(!value||value.schemaVersion!==1||Object.keys(value).sort().join(',')!=='lessons,schemaVersion'||!value.lessons||Object.getPrototypeOf(value.lessons)!==Object.prototype)fail('invalid_device_state');
     if(Object.keys(value.lessons).length>80)fail('invalid_device_state');
     for(const [id,lesson] of Object.entries(value.lessons)){
      if(!/^PU-0(?:0[1-9]|[1-7][0-9]|80)$/.test(id)||!lesson||Object.keys(lesson).sort().join(',')!=='checked,focus'||!Number.isInteger(lesson.focus)||lesson.focus<0||lesson.focus>5||!Array.isArray(lesson.checked)||lesson.checked.length>6||new Set(lesson.checked).size!==lesson.checked.length||lesson.checked.some(i=>!Number.isInteger(i)||i<0||i>5))fail('invalid_device_state');
     }
     return value;
    }
    async function practiceRow(tx){
     const metadata=tx.objectStore('metadata'),identity=await request(metadata.get([namespace,'academy-device-id-1']));
     const deviceId=identity?identity.value:root.crypto.randomUUID();if(!UUID.test(deviceId))fail('invalid_device_state');
     if(!identity)await request(metadata.put({namespace,key:'academy-device-id-1',value:deviceId}));
     const row=await request(tx.objectStore('device_state').get([namespace,deviceId,'academy-practice-1']));
     if(row&&(!revision(row.localRevision)||row.localRevision==='0'))fail('invalid_device_state');
     return {namespace,deviceId,key:'academy-practice-1',localRevision:row?.localRevision||'0',value:practiceValue(row?row.value:{schemaVersion:1,lessons:{}})};
    }
    async function courtFence(tx,binding){
     if(guest||!binding||typeof binding.planId!=='string'||typeof binding.epoch!=='string'||!UUID.test(binding.planId)||binding.planId!==binding.planId.toLowerCase()||!UUID.test(binding.epoch))fail('plan_unavailable');
     await requirePlanConsent(tx,binding.consentRevision);
     const records=tx.objectStore('records'),plan=await request(records.get([namespace,'personal_plans',binding.planId])),selection=await request(records.get([namespace,'user_selections','self'])),cursor=await request(tx.objectStore('sync_cursor').get([namespace,PLAN_POLICY]));
     if(!plan?.base||!selection?.base||cursor?.epoch!==binding.epoch||plan.baseEpoch!==binding.epoch||selection.baseEpoch!==binding.epoch||plan.localRevision!==binding.planRevision||selection.localRevision!==binding.selectionRevision||plan.base.user_id!==namespace.slice(5)||selection.base.user_id!==namespace.slice(5)||plan.base.id!==binding.planId||selection.base.selected_personal_plan_id!==binding.planId||[plan,selection].some(r=>r.deleted||r.reviewRequired||r.tailOperationId||r.base.deleted_at))fail('plan_unavailable');
    }
    function courtValue(value,planId){
     canonical(value);
     if(!value||Object.getPrototypeOf(value)!==Object.prototype||Object.keys(value).sort().join(',')!=='ended,epoch,index,planId,remaining,schemaVersion'||value.schemaVersion!==1||value.planId!==planId||typeof value.epoch!=='string'||!UUID.test(value.epoch)||!Number.isInteger(value.index)||value.index<0||value.index>6||!Number.isInteger(value.remaining)||value.remaining<0||value.remaining>[600,720,720,900,360,300,0][value.index]||typeof value.ended!=='boolean'||value.ended!==(value.index===6))fail('invalid_device_state');
     return value;
    }
    async function courtRow(tx,planId){
     const metadata=tx.objectStore('metadata'),identity=await request(metadata.get([namespace,'court-device-id-1'])),deviceId=identity?identity.value:root.crypto.randomUUID();
     if(typeof deviceId!=='string'||!UUID.test(deviceId))fail('invalid_device_state');
     if(!identity)await request(metadata.put({namespace,key:'court-device-id-1',value:deviceId}));
     const key='court-checkpoint-1:'+planId,row=await request(tx.objectStore('device_state').get([namespace,deviceId,key]));
     if(row&&(!revision(row.localRevision)||row.localRevision==='0'))fail('invalid_device_state');
     return {namespace,deviceId,key,localRevision:row?.localRevision||'0',value:row?courtValue(row.value,planId):null};
    }
    async function planEdges(tx,kind,id,action,payload,old){
     const records=tx.objectStore('records'),outbox=tx.objectStore('outbox'),dependencies=[];
     const depend=async record=>{if(record.tailOperationId){const op=await request(outbox.get([namespace,record.tailOperationId]));if(!op||!PLANS.has(op.kind)||['acked','resolved','blocked','conflict'].includes(op.state))fail('dependency_unavailable');dependencies.push(op.operationId)}};
     let requiresPlan=null;
     if(kind==='user_selections'&&action!=='delete'){
      requiresPlan=({...old?.base,...old?.overlay,...payload}).selected_personal_plan_id||null;
      if(requiresPlan){
       const target=await request(records.get([namespace,'personal_plans',requiresPlan]));
       if(!target||target.deleted||target.reviewRequired||!target.base&&!target.tailOperationId)fail('plan_unavailable');await depend(target);
      }
     }else if(kind==='personal_plans'&&action==='delete'){
      const selected=await request(records.get([namespace,'user_selections','self']));
      if(selected&&!selected.deleted&&({...selected.base,...selected.overlay}).selected_personal_plan_id===id)fail('plan_selected');
      if(selected?.base&&!selected.base.deleted_at&&selected.base.selected_personal_plan_id===id)await depend(selected);
     }
     return {planDependencies:dependencies,requiresPlan};
    }
    async function planReview(tx,kind,id){
     identity(kind,id);if(guest||!PLANS.has(kind))fail('invalid_review');
     const own=async name=>(await request(tx.objectStore(name).index('namespace').getAll(namespace))).filter(row=>PLANS.has(row.kind));
     const records=await own('records'),operations=(await own('outbox')).filter(o=>!['acked','resolved'].includes(o.state)),record=records.find(r=>r.kind===kind&&r.id===id);
     if(!record)fail('entity_not_found');
     return {record,operations:operations.filter(o=>o.kind===kind&&o.id===id),conflicts:(await own('conflicts')).filter(c=>c.state==='open'&&c.kind===kind&&c.id===id),cursor:await request(tx.objectStore('sync_cursor').get([namespace,PLAN_POLICY])),consent:await planConsent(tx),relatedRecords:records,relatedOperations:operations};
    }
    const api={
     close(){active=false;for(const tx of transactions){try{tx.abort()}catch(_){}}scopes.delete(api)},
     getDomainSnapshot(){return domainSnapshot(DEFAULT_POLICY)},
     getActivitySnapshot(){return domainSnapshot(ACTIVITY_POLICY)},
     getPlanSnapshot(){return domainSnapshot(PLAN_POLICY)},
     getAccountRescueSnapshot(){
      if(guest)fail('auth_required');
      const names=['records','outbox','conflicts','sync_cursor','import_receipts','device_state','metadata'];
      return transaction(names,'readonly',async tx=>{
       let bytes=0,count=0;
       const collect=name=>new Promise((resolve,reject)=>{
        const rows=[],cursor=tx.objectStore(name).index('namespace').openCursor(namespace);
        cursor.onerror=()=>reject(storageError(cursor.error));
        cursor.onsuccess=()=>{try{const at=cursor.result;if(!at){resolve(rows);return}const row=at.value;bytes+=new TextEncoder().encode(canonical(row)).length;if(bytes>31*1024*1024||++count>100000)fail('rescue_too_large');rows.push(row);at.continue()}catch(error){reject(error)}};
       });
       const rows=await Promise.all(names.map(collect));return {owner:namespace.slice(5),repositoryVersion:VERSION,coverage:'local-cache-only',stores:Object.fromEntries(names.map((name,i)=>[name,rows[i]]))};
      });
     },
     getPlanConsent(){if(guest)fail('auth_required');return transaction(['metadata'],'readonly',planConsent)},
     setPlanConsent(enabled,expectedLocalRevision){
      if(guest||typeof enabled!=='boolean'||!revision(expectedLocalRevision))fail('invalid_consent');
      return transaction(['metadata'],'readwrite',async tx=>{const prior=await planConsent(tx);if(prior.localRevision!==expectedLocalRevision)fail('local_conflict');const consent={enabled,localRevision:(BigInt(expectedLocalRevision)+1n).toString()};await request(tx.objectStore('metadata').put({namespace,key:'plans-selections-consent-1',...consent}));return consent});
     },
     getActivityConsent(){if(guest)fail('auth_required');return transaction(['metadata'],'readonly',activityConsent)},
     setActivityConsent(enabled,expectedLocalRevision){
      if(guest||typeof enabled!=='boolean'||!revision(expectedLocalRevision))fail('invalid_consent');
      return transaction(['metadata'],'readwrite',async tx=>{
       const prior=await activityConsent(tx);if(prior.localRevision!==expectedLocalRevision)fail('local_conflict');
       const consent={enabled,localRevision:(BigInt(expectedLocalRevision)+1n).toString()};
       await request(tx.objectStore('metadata').put({namespace,key:'activity-consent-1',...consent}));return consent;
      });
     },
     getDomainConsent(){return transaction(['metadata'],'readonly',async tx=>(await request(tx.objectStore('metadata').get([namespace,'preferences-checkins-consent-1'])))?.enabled===true)},
     getDomainTimezone(){return transaction(['metadata'],'readonly',async tx=>(await request(tx.objectStore('metadata').get([namespace,'checkin-timezone-1'])))?.value||null)},
     setDomainTimezone(value){if(guest||typeof value!=='string'||value.length>80)fail('invalid_timezone');return transaction(['metadata'],'readwrite',tx=>request(tx.objectStore('metadata').put({namespace,key:'checkin-timezone-1',value})))},
     setDomainConsent(enabled){
      if(guest||typeof enabled!=='boolean')fail('invalid_consent');
      return transaction(['metadata'],'readwrite',tx=>request(tx.objectStore('metadata').put({namespace,key:'preferences-checkins-consent-1',enabled})));
     },
     read(kind,id){identity(kind,id);return transaction(['records'],'readonly',tx=>request(tx.objectStore('records').get([namespace,kind,id])))},
     listOutbox(){return transaction(['outbox'],'readonly',tx=>request(tx.objectStore('outbox').index('namespace').getAll(namespace)))},
     async write({kind,id,value,operationId,expectedLocalRevision='0',action='put',activityConsentRevision=null,planConsentRevision=null,trainingPlan=null}){
      identity(kind,id);
      if(!UUID.test(operationId)||!revision(expectedLocalRevision)||!['put','delete','restore'].includes(action))fail('invalid_operation');
      trainingPlan=copy(trainingPlan);
      const snapshot=copy(value);
      if(!snapshot||Object.getPrototypeOf(snapshot)!==Object.prototype)fail('invalid_payload');
      const signature=canonical({kind,id,value:snapshot,operationId,expectedLocalRevision,action,...(trainingPlan?{trainingPlan}: {})});
      if(new TextEncoder().encode(signature).length>256*1024)fail('payload_too_large');
      if(action==='restore'&&EVENTS.has(kind))fail('append_only');
      if(action==='delete'&&canonical(snapshot)!=='{}'&&!(kind==='practice_checkins'&&Object.keys(snapshot).length===1&&typeof snapshot.timezone_at_entry==='string'&&snapshot.timezone_at_entry.length<=80))fail('invalid_payload');
      return transaction(['records','outbox','metadata','sync_cursor'],'readwrite',async tx=>{
       if(activityConsentRevision!==null){if(!EVENTS.has(kind))fail('invalid_policy');await requireActivityConsent(tx,activityConsentRevision)}
       if(planConsentRevision!==null){if(!PLANS.has(kind))fail('invalid_policy');await requirePlanConsent(tx,planConsentRevision)}
       const records=tx.objectStore('records'),outbox=tx.objectStore('outbox'),metadata=tx.objectStore('metadata');
       const receiptKey=[namespace,'operation:'+operationId];
       const prior=await request(metadata.get(receiptKey));
       if(prior){if(prior.signature!==signature)fail('operation_mismatch');return {status:'replayed',localRevision:prior.localRevision}}
       if(trainingPlan!==null){
        if(kind!=='training_entries'||action!=='put'||activityConsentRevision===null)fail('invalid_policy');
        await requirePlanConsent(tx,trainingPlan.consentRevision);
        const target=await request(records.get([namespace,'personal_plans',snapshot.plan_id])),cursor=await request(tx.objectStore('sync_cursor').get([namespace,PLAN_POLICY])),activityCursor=await request(tx.objectStore('sync_cursor').get([namespace,ACTIVITY_POLICY]));
        if(!target?.base||target.base.user_id!==namespace.slice(5)||target.base.id!==snapshot.plan_id||target.base.deleted_at||target.deleted||target.reviewRequired||target.localRevision!==trainingPlan.localRevision||target.baseEpoch!==trainingPlan.epoch||cursor?.epoch!==trainingPlan.epoch||activityCursor?.epoch!==trainingPlan.epoch||target.base.level_band!==snapshot.level_band||!target.base.plan_snapshot?.exercises?.some(x=>x.id===snapshot.exercise_id&&x.skill===snapshot.skill))fail('plan_unavailable');
       }
       const key=[namespace,kind,id],old=await request(records.get(key));
       if((old?.localRevision||'0')!==expectedLocalRevision)fail('local_conflict');
       if(old?.deleted&&action==='put')fail('explicit_restore_required');
       if(!old?.deleted&&action==='restore')fail('not_deleted');
       if(old&&EVENTS.has(kind)&&action==='put')fail('append_only');
       const localRevision=(BigInt(expectedLocalRevision)+1n).toString();
       const overlay=action==='delete'?null:PULL_KINDS.has(kind)||PLANS.has(kind)?{...(old?.overlay||old?.base||{}),...snapshot}:snapshot;
       const record={...old,namespace,kind,id,base:old?.base||null,baseRevision:old?.baseRevision||'0',overlay,deleted:action==='delete',localRevision,localUpdatedAt:new Date().toISOString(),tailOperationId:guest?null:operationId};
       const edges=planConsentRevision!==null?await planEdges(tx,kind,id,action,snapshot,old):{};
       if(!guest)await request(outbox.add({...edges,namespace,operationId,kind,id,action,payload:snapshot,baseSnapshot:old?.base||null,expectedRevision:old?.tailOperationId?null:record.baseRevision,dependsOn:old?.tailOperationId||null,state:old?.tailOperationId?'deferred':'pending',protocol:1}));
       await request(records.put(record));
       await request(metadata.add({namespace,key:receiptKey[1],signature,localRevision}));
       return {status:'saved_locally',localRevision};
      });
     },
     claimSync({leaseOwner,epoch,now=Date.now(),forceRetry=false,policy=DEFAULT_POLICY,activityConsentRevision=null,planConsentRevision=null}){
      const config=policyConfig(policy);
      if(guest||!UUID.test(leaseOwner)||!UUID.test(epoch)||!Number.isSafeInteger(now)||typeof forceRetry!=='boolean')fail('invalid_sync_operation');
      return transaction(syncStores,'readwrite',async tx=>{
       if(activityConsentRevision!==null){if(policy!==ACTIVITY_POLICY)fail('invalid_policy');await requireActivityConsent(tx,activityConsentRevision)}
       if(policy===PLAN_POLICY)await requirePlanConsent(tx,planConsentRevision);else if(planConsentRevision!==null)fail('invalid_policy');
       const lease=await request(tx.objectStore('metadata').get([namespace,config.lease])),cursor=await request(tx.objectStore('sync_cursor').get([namespace,config.slot]));
       if(lease?.owner!==leaseOwner||lease.until<=now)fail('lease_lost');if(cursor?.epoch!==epoch)fail('reset_required');
       const store=tx.objectStore('outbox'),all=await request(store.index('namespace').getAll(namespace)),byId=new Map(all.map(o=>[o.operationId,o]));
       const candidates=all.filter(o=>config.kinds.has(o.kind)&&['pending','deferred','sending'].includes(o.state)).sort((a,b)=>Number(!!b.request)-Number(!!a.request));
       let paused=null;
       for(const op of candidates){
        syncIdentity(op,policy);const parent=op.dependsOn?byId.get(op.dependsOn):null;
        if(op.dependsOn&&parent?.state!=='acked')continue;
        const row=await request(tx.objectStore('records').get(rowKey(op)));if(!row)fail('invalid_sync_operation');
        if((row.baseRevision!=='0'&&row.baseEpoch!==epoch)||op.request&&op.request.p_epoch!==epoch){await block(tx,op,row,'reset_required');continue}
        if(!op.request&&row.reviewRequired){await block(tx,op,row,row.reviewReason==='reset_required'?'reset_required':'remote_changed');continue}
        if(policy===PLAN_POLICY&&!op.request){
         if(!op.planDependencies){try{Object.assign(op,await planEdges(tx,op.kind,op.id,op.action,op.payload,{...row,overlay:null}))}catch(_){await block(tx,op,row,'dependency_changed');continue}}
         const deps=op.planDependencies.map(id=>byId.get(id));
         if(deps.some(dep=>!dep||!PLANS.has(dep.kind)||['resolved','conflict','blocked'].includes(dep.state))){await block(tx,op,row,'dependency_changed');continue}
         if(deps.some(dep=>dep.state!=='acked'))continue;
         if(op.requiresPlan){const target=await request(tx.objectStore('records').get([namespace,'personal_plans',op.requiresPlan]));if(!target?.base||target.base.deleted_at||target.deleted||target.reviewRequired||target.baseEpoch!==epoch){await block(tx,op,row,'dependency_changed');continue}}
         if(op.kind==='personal_plans'&&op.action==='delete'){const selected=await request(tx.objectStore('records').get([namespace,'user_selections','self']));if(selected?.base&&!selected.base.deleted_at&&selected.base.selected_personal_plan_id===op.id){await block(tx,op,row,'dependency_changed');continue}}
        }
        if(!forceRetry&&((op.attempts||0)>=8||(op.nextAttemptAt||0)>now)){paused={status:'retry_wait',retryAt:op.nextAttemptAt||now,exhausted:(op.attempts||0)>=8};continue}
        if(!op.request){
         if(parent){if(parent.ackEpoch!==epoch){await block(tx,op,row,'reset_required');continue}op.expectedRevision=parent.ackRevision}
         if(!revision(op.expectedRevision))fail('invalid_sync_operation');
         op.request={p_operation_id:op.operationId,p_kind:op.kind,p_entity_key:op.id,p_action:op.action,p_expected_revision:op.expectedRevision,p_epoch:epoch,p_payload:copy(op.payload),p_protocol_version:1};
        }
        op.state='sending';op.attempts=(op.attempts||0)+1;op.nextAttemptAt=0;
        await request(store.put(op));return {status:'claimed',operation:op};
       }return paused||{status:'idle'};
      });
     },
     completeSync(operationId,frozen,result,{policy=DEFAULT_POLICY,activityConsentRevision=null,planConsentRevision=null}={}){
      const config=policyConfig(policy);
      if(guest||!UUID.test(operationId))fail('invalid_sync_operation');const body=copy(frozen),response=copy(result);canonical(response);
      return transaction(syncStores,'readwrite',async tx=>{
       if(activityConsentRevision!==null){if(policy!==ACTIVITY_POLICY)fail('invalid_policy');await requireActivityConsent(tx,activityConsentRevision)}
       if(policy===PLAN_POLICY)await requirePlanConsent(tx,planConsentRevision);else if(planConsentRevision!==null)fail('invalid_policy');
       const store=tx.objectStore('outbox'),op=await request(store.get([namespace,operationId]));
       if(!op||canonical(op.request)!==canonical(body))fail('operation_mismatch');
       syncIdentity(op,policy);
       if(op.state==='acked')return {status:'acked'};
       if(op.state!=='sending')return {status:'stale'};
       const row=await request(tx.objectStore('records').get(rowKey(op))),cursor=await request(tx.objectStore('sync_cursor').get([namespace,config.slot]));
       if(cursor?.epoch!==body.p_epoch||response.status==='reset_required'){await block(tx,op,row,'reset_required');await touchCursor(tx,policy);return {status:'reset_required'}}
       if(response.epoch!==body.p_epoch)fail('invalid_response');
       if(!['applied','conflict','invalid'].includes(response.status))fail('invalid_response');
       const remote=response.status==='conflict'?(response.row??null):response.row;
       if(response.status!=='invalid'&&remote!==null&&(!remote||remote.user_id!==namespace.slice(5)||!revision(remote.revision)||remote.revision==='0'||BigInt(remote.revision)>9223372036854775807n||!Object.hasOwn(remote,'deleted_at')||!(remote.deleted_at===null||typeof remote.deleted_at==='string')||op.kind==='practice_checkins'&&remote.local_date!==op.id||(EVENTS.has(op.kind)||op.kind==='personal_plans')&&remote.id!==op.id))fail('invalid_response');
       if(response.status==='applied'&&(!remote||remote.revision!==(BigInt(body.p_expected_revision)+1n).toString()))fail('invalid_response');
       const newer=remote&&BigInt(remote.revision)>=BigInt(row.baseRevision);
       const current={...row,...(response.status!=='invalid'&&(newer||remote===null&&row.baseRevision==='0')?{base:remote,baseRevision:remote?.revision||'0',baseMissing:remote===null,baseEpoch:body.p_epoch}:{})};
       if(response.status!=='applied'){
        await block(tx,op,current,response.status==='conflict'?'conflict':'invalid');await touchCursor(tx,policy);return {status:'needs_review'};
       }
       op.state='acked';op.ackRevision=remote.revision;op.ackEpoch=body.p_epoch;await request(store.put(op));
       const tail=current.tailOperationId===operationId;
       current.overlay=tail?null:current.overlay;current.deleted=tail?current.base.deleted_at!==null:current.deleted;current.tailOperationId=tail?null:current.tailOperationId;
       current.reviewRequired=!tail&&BigInt(current.baseRevision)>BigInt(op.ackRevision);current.localRevision=(BigInt(current.localRevision)+1n).toString();
       if(!current.reviewRequired){delete current.reviewBase;delete current.reviewReason}else current.reviewReason='remote_changed';
       await request(tx.objectStore('records').put(current));await touchCursor(tx,policy);return {status:'acked'};
      });
     },
     deferSync(operationId,frozen,{code,nextAttemptAt,policy=DEFAULT_POLICY}){
      if(!['network_error','auth_required','stale','unavailable','limit_exceeded','invalid_response','upgrade_required'].includes(code)||!Number.isSafeInteger(nextAttemptAt))fail('invalid_sync_operation');const body=copy(frozen);
      return transaction(['outbox'],'readwrite',async tx=>{const store=tx.objectStore('outbox'),op=await request(store.get([namespace,operationId]));if(!op||canonical(op.request)!==canonical(body))fail('operation_mismatch');syncIdentity(op,policy);if(op.state==='sending'){op.nextAttemptAt=nextAttemptAt;op.lastError=code;await request(store.put(op))}});
     },
     inspectSyncConflict(conflictId,{policy=DEFAULT_POLICY}={}){
      const config=policyConfig(policy);
      return transaction(['records','outbox','conflicts','sync_cursor'],'readonly',async tx=>{
       const conflict=await request(tx.objectStore('conflicts').get([namespace,conflictId]));if(!conflict||!config.kinds.has(conflict.kind))fail('conflict_not_found');
       return {conflict,record:await request(tx.objectStore('records').get([namespace,conflict.kind,conflict.id])),operations:(await request(tx.objectStore('outbox').index('namespace').getAll(namespace))).filter(o=>o.kind===conflict.kind&&o.id===conflict.id),cursor:await request(tx.objectStore('sync_cursor').get([namespace,config.slot]))};
      });
     },
     inspectActivityReview(kind,id){return transaction(syncStores,'readonly',tx=>activityReview(tx,kind,id))},
     resolveActivityReview({review,mode,operationId,acknowledgeEpochChange=false}){
      if(guest||!UUID.test(operationId)||!['server','retry_create','retry_delete'].includes(mode)||typeof acknowledgeEpochChange!=='boolean')fail('invalid_resolution');
      const preview=copy(review);if(!preview?.record||preview.record.namespace!==namespace)fail('invalid_review');
      const signature=canonical({activityResolution:preview,mode,acknowledgeEpochChange});
      if(new TextEncoder().encode(signature).length>4*1024*1024)fail('review_limit');
      return transaction(syncStores,'readwrite',async tx=>{
       await requireActivityConsent(tx,preview.consent?.localRevision);
       const metadata=tx.objectStore('metadata'),receiptKey=[namespace,'operation:'+operationId],prior=await request(metadata.get(receiptKey));
       if(prior){if(prior.signature!==signature)fail('operation_mismatch');return {...prior.result,status:'replayed'}}
       const view=await activityReview(tx,preview.record.kind,preview.record.id);
       if(canonical(view)!==canonical(preview))fail('local_conflict');
       const {record:row,operations,conflicts,cursor}=view;
       if(!cursor||!UUID.test(cursor.epoch)||!row.reviewRequired&&!conflicts.length&&!operations.some(op=>['blocked','conflict'].includes(op.state)))fail('review_not_required');
       if(operations.some(op=>op.state==='sending'))fail('uncertain_operation');
       if((row.reviewReason==='reset_required'||conflicts.some(c=>c.reason==='reset_required')||operations.some(op=>op.request&&op.request.p_epoch!==cursor.epoch))&&!acknowledgeEpochChange)fail('epoch_review_required');
       const tail=operations.find(op=>op.operationId===row.tailOperationId);
       if(mode!=='server'&&!tail)fail('invalid_resolution');
       if(mode==='retry_create'&&(tail.action!=='put'||row.deleted||row.base!==null||row.baseRevision!=='0'||canonical(row.overlay)!==canonical(tail.payload)))fail('append_only');
       if(mode==='retry_delete'&&(tail.action!=='delete'||!row.deleted||!row.base||row.base.deleted_at!==null))fail('invalid_resolution');
       const store=tx.objectStore('outbox'),archive=tx.objectStore('conflicts');
       if(await request(store.get([namespace,operationId]))||await request(archive.get([namespace,operationId])))fail('operation_mismatch');
       const queued=mode!=='server',localRevision=(BigInt(row.localRevision)+1n).toString();
       await request(archive.add({namespace,conflictId:operationId,kind:row.kind,id:row.id,state:'resolved',reason:row.reviewReason||conflicts[0]?.reason||'needs_review',resolution:{mode,operationId,epoch:cursor.epoch,revision:row.baseRevision,originalBase:row.reviewBase||conflicts[0]?.originalBase||null,local:copy(row.overlay),deleted:row.deleted,remote:copy(row.base),operations:copy(operations),consent:copy(view.consent)}}));
       for(const old of operations)await request(store.put({...old,state:'resolved',resolutionId:operationId}));
       for(const conflict of conflicts)await request(archive.put({...conflict,state:'resolved',resolutionId:operationId}));
       if(queued)await request(store.add({namespace,operationId,kind:row.kind,id:row.id,action:mode==='retry_delete'?'delete':'put',payload:mode==='retry_delete'?{}:copy(tail.payload),baseSnapshot:copy(row.base),expectedRevision:row.baseRevision,dependsOn:null,state:'pending',protocol:1}));
       await request(tx.objectStore('records').put({...row,localRevision,overlay:queued&&mode==='retry_create'?copy(tail.payload):null,deleted:queued?mode==='retry_delete':!!row.base?.deleted_at,tailOperationId:queued?operationId:null,reviewRequired:false,reviewBase:null,reviewReason:null}));
       const result={status:'resolved',localRevision,operationId,queued};await request(metadata.add({namespace,key:receiptKey[1],signature,result}));await touchCursor(tx,ACTIVITY_POLICY);return result;
      });
     },
     inspectPlanReview(kind,id){return transaction(syncStores,'readonly',tx=>planReview(tx,kind,id))},
     resolvePlanReview({review,mode,operationId,action='put',value={},acknowledgeEpochChange=false}){
      if(guest||!UUID.test(operationId)||!['server','local'].includes(mode)||!['put','delete','restore'].includes(action)||typeof acknowledgeEpochChange!=='boolean')fail('invalid_resolution');
      const preview=copy(review),payload=copy(value);if(preview?.record?.namespace!==namespace||!PLANS.has(preview.record.kind))fail('invalid_review');
      const signature=canonical({planResolution:preview,mode,action,value:payload,acknowledgeEpochChange});if(new TextEncoder().encode(signature).length>4*1024*1024)fail('review_limit');
      return transaction(syncStores,'readwrite',async tx=>{
       await requirePlanConsent(tx,preview.consent?.localRevision);
       const metadata=tx.objectStore('metadata'),receiptKey=[namespace,'operation:'+operationId],prior=await request(metadata.get(receiptKey));
       if(prior){if(prior.signature!==signature)fail('operation_mismatch');return {...prior.result,status:'replayed'}}
       const view=await planReview(tx,preview.record.kind,preview.record.id);if(canonical(view)!==canonical(preview))fail('local_conflict');
       const {record:row,operations,conflicts,cursor}=view;
       if(!cursor||!UUID.test(cursor.epoch)||!row.reviewRequired&&!conflicts.length&&!operations.some(op=>['blocked','conflict'].includes(op.state)))fail('review_not_required');
       if(operations.some(op=>op.state==='sending'))fail('uncertain_operation');
       if((row.reviewReason==='reset_required'||conflicts.some(c=>c.reason==='reset_required')||operations.some(op=>op.request&&op.request.p_epoch!==cursor.epoch))&&!acknowledgeEpochChange)fail('epoch_review_required');
       const queued=mode==='local';
       if(queued&&(row.base?.deleted_at&&action==='put'||!row.base?.deleted_at&&action==='restore'))fail('explicit_restore_required');
       const edges=queued?await planEdges(tx,row.kind,row.id,action,payload,{...row,overlay:null}):{};
       const store=tx.objectStore('outbox'),archive=tx.objectStore('conflicts');if(await request(store.get([namespace,operationId]))||await request(archive.get([namespace,operationId])))fail('operation_mismatch');
       const localRevision=(BigInt(row.localRevision)+1n).toString();
       await request(archive.add({namespace,conflictId:operationId,kind:row.kind,id:row.id,state:'resolved',reason:row.reviewReason||conflicts[0]?.reason||'needs_review',resolution:{mode,operationId,action,value:copy(payload),epoch:cursor.epoch,revision:row.baseRevision,originalBase:row.reviewBase||conflicts[0]?.originalBase||null,local:copy(row.overlay),deleted:row.deleted,remote:copy(row.base),operations:copy(operations),consent:copy(view.consent),relatedRecords:copy(view.relatedRecords),relatedOperations:copy(view.relatedOperations)}}));
       for(const old of operations)await request(store.put({...old,state:'resolved',resolutionId:operationId}));for(const conflict of conflicts)await request(archive.put({...conflict,state:'resolved',resolutionId:operationId}));
       if(queued)await request(store.add({...edges,namespace,operationId,kind:row.kind,id:row.id,action,payload,baseSnapshot:copy(row.base),expectedRevision:row.baseRevision,dependsOn:null,state:'pending',protocol:1}));
       await request(tx.objectStore('records').put({...row,localRevision,overlay:queued&&action!=='delete'?{...row.base,...payload}:null,deleted:queued?action==='delete':!!row.base?.deleted_at,tailOperationId:queued?operationId:null,reviewRequired:false,reviewBase:null,reviewReason:null}));
       const result={status:'resolved',localRevision,operationId,queued};await request(metadata.add({namespace,key:receiptKey[1],signature,result}));await touchCursor(tx,PLAN_POLICY);return result;
      });
     },
     resolveSyncConflict({conflictId,expectedLocalRevision,expectedRemoteRevision,epoch,mode,operationId,action='put',value={},acknowledgeEpochChange=false}){
      if(guest||!UUID.test(conflictId)||!revision(expectedLocalRevision)||!revision(expectedRemoteRevision)||!UUID.test(epoch)||!['server','local'].includes(mode)||!UUID.test(operationId)||!['put','delete','restore'].includes(action))fail('invalid_resolution');
      const snapshot=copy(value);if(!snapshot||Object.getPrototypeOf(snapshot)!==Object.prototype||new TextEncoder().encode(canonical(snapshot)).length>256*1024)fail('invalid_payload');
      const decision=canonical({resolution:conflictId,mode,epoch,expectedLocalRevision,expectedRemoteRevision,action,value:snapshot,acknowledgeEpochChange});
      return transaction(syncStores,'readwrite',async tx=>{
       const priorDecision=await request(tx.objectStore('metadata').get([namespace,'operation:'+operationId]));if(priorDecision){if(priorDecision.signature!==decision)fail('operation_mismatch');return {status:'replayed',localRevision:priorDecision.localRevision}}
       const conflicts=tx.objectStore('conflicts'),conflict=await request(conflicts.get([namespace,conflictId]));if(conflict?.state!=='open')fail('conflict_not_found');if(!PULL_KINDS.has(conflict.kind))fail('unsupported_resolution');
       const store=tx.objectStore('outbox'),records=tx.objectStore('records'),row=await request(records.get([namespace,conflict.kind,conflict.id])),cursor=await request(tx.objectStore('sync_cursor').get([namespace,1]));
       if(row.localRevision!==expectedLocalRevision||row.baseRevision!==expectedRemoteRevision||cursor?.epoch!==epoch)fail('local_conflict');
       if(conflict.reason==='reset_required'&&acknowledgeEpochChange!==true)fail('epoch_review_required');
       if(await request(tx.objectStore('metadata').get([namespace,'operation:'+operationId]))||await request(store.get([namespace,operationId])))fail('operation_mismatch');
       if(mode==='local'&&(row.base?.deleted_at&&action==='put'||!row.base?.deleted_at&&action==='restore'))fail('explicit_restore_required');
       if(mode==='local'&&action==='delete'&&canonical(snapshot)!=='{}'&&!(conflict.kind==='practice_checkins'&&Object.keys(snapshot).length===1&&typeof snapshot.timezone_at_entry==='string'))fail('invalid_payload');
       const operations=(await request(store.index('namespace').getAll(namespace))).filter(o=>o.kind===conflict.kind&&o.id===conflict.id&&!['acked','resolved'].includes(o.state));
       if(operations.some(o=>o.state==='sending'))fail('uncertain_operation');
       conflict.state='resolved';conflict.resolution={mode,operationId,epoch,revision:row.baseRevision,local:row.overlay,deleted:row.deleted,remote:row.base,operations:copy(operations)};
       await request(conflicts.put(conflict));for(const old of operations){old.state='resolved';old.resolutionId=operationId;await request(store.put(old));const other=await request(conflicts.get([namespace,old.operationId]));if(other&&other.conflictId!==conflictId){other.state='resolved';other.resolutionId=operationId;await request(conflicts.put(other))}}
       const localRevision=(BigInt(row.localRevision)+1n).toString();
       if(mode==='local')await request(store.add({namespace,operationId,kind:row.kind,id:row.id,action,payload:snapshot,baseSnapshot:row.base,expectedRevision:row.baseRevision,dependsOn:null,state:'pending',protocol:1}));
       await request(records.put({...row,localRevision,overlay:mode==='local'?(action==='delete'?null:{...(row.base||{}),...snapshot}):null,deleted:mode==='local'?action==='delete':!!row.base?.deleted_at,tailOperationId:mode==='local'?operationId:null,reviewRequired:false,reviewBase:null,reviewReason:null}));
       await request(tx.objectStore('metadata').add({namespace,key:'operation:'+operationId,signature:decision,localRevision}));await touchCursor(tx);return {status:'resolved',localRevision};
      });
     },
     getSyncCursor(policy=DEFAULT_POLICY){return transaction(['sync_cursor'],'readonly',tx=>request(tx.objectStore('sync_cursor').get([namespace,policyConfig(policy).slot])))},
     // PR4a commits a complete bounded pull cycle, never a partial bootstrap.
     // A reset replaces server bases only; pending requests/overlays survive.
     async applyCanonicalSnapshot({rows,afterRevision,epoch,expectedLocalVersion='0',reset=false,policy=DEFAULT_POLICY,activityConsentRevision=null,planConsentRevision=null}){
      const config=policyConfig(policy);
      if(guest)fail('auth_required');
      if(!Array.isArray(rows)||rows.length>10050||rows.length>0&&afterRevision==='0'||!revision(afterRevision)||BigInt(afterRevision)>9223372036854775807n||!revision(expectedLocalVersion)||typeof reset!=='boolean'||!(epoch===null||UUID.test(epoch))||afterRevision!=='0'&&epoch===null)fail('invalid_snapshot');
      const snapshot=copy(rows),unique=new Set();
      if(new TextEncoder().encode(canonical(snapshot)).length>16*1024*1024)fail('payload_too_large');
      for(const item of snapshot){
       if(!config.kinds.has(item.kind))fail('invalid_snapshot');identity(item.kind,item.id);
       const tag=item.kind+':'+item.id,row=item.row;
       if(unique.has(tag)||!row||row.user_id!==namespace.slice(5)||!revision(row.revision)||row.revision==='0'||BigInt(row.revision)>9223372036854775807n||!Object.hasOwn(row,'deleted_at')||!(row.deleted_at===null||typeof row.deleted_at==='string')||item.kind==='practice_checkins'&&row.local_date!==item.id||(EVENTS.has(item.kind)||item.kind==='personal_plans')&&row.id!==item.id)fail('invalid_snapshot');unique.add(tag);
      }
      return transaction(['records','sync_cursor',...(activityConsentRevision!==null||policy===PLAN_POLICY?['metadata']:[])],'readwrite',async tx=>{
       if(activityConsentRevision!==null){if(policy!==ACTIVITY_POLICY)fail('invalid_policy');await requireActivityConsent(tx,activityConsentRevision)}
       if(policy===PLAN_POLICY)await requirePlanConsent(tx,planConsentRevision);else if(planConsentRevision!==null)fail('invalid_policy');
       const cursors=tx.objectStore('sync_cursor'),store=tx.objectStore('records'),prior=await request(cursors.get([namespace,config.slot]));
       if((prior?.localVersion||'0')!==expectedLocalVersion)fail('cursor_conflict');
       if(!reset&&prior&&(prior.policy!==policy||prior.epoch!==epoch||BigInt(afterRevision)<BigInt(prior.afterRevision)))fail('reset_required');
       const oldRows=(await request(store.index('namespace').getAll(namespace))).filter(r=>config.kinds.has(r.kind));
       const oldByKey=new Map(oldRows.map(r=>[r.kind+':'+r.id,r])),incoming=new Map(snapshot.map(r=>[r.kind+':'+r.id,r]));
       const keys=reset?new Set([...oldByKey.keys(),...incoming.keys()]):new Set(incoming.keys());
       for(const key of keys){
        const old=oldByKey.get(key),item=incoming.get(key),base=item?.row||null;
        if(!reset&&old?.baseEpoch===epoch&&BigInt(base.revision)<BigInt(old.baseRevision))fail('invalid_snapshot');
        const pending=!!old?.tailOperationId,changed=reset||canonical(old?.base||null)!==canonical(base);
        const record={...old,namespace,kind:item?.kind||old.kind,id:item?.id||old.id,base,baseRevision:base?.revision||'0',baseEpoch:epoch,baseMissing:base===null,
         overlay:pending?old.overlay:null,deleted:pending?old.deleted:base!==null&&base.deleted_at!==null,
         tailOperationId:pending?old.tailOperationId:null,localRevision:(BigInt(old?.localRevision||'0')+1n).toString(),reviewRequired:pending&&(old.reviewRequired||changed)||false};
        if(pending&&changed){
         record.reviewReason=reset?'reset_required':old.reviewReason||'remote_changed';
         if(!old.reviewBase)record.reviewBase={row:old.base,revision:old.baseRevision,epoch:old.baseEpoch??prior?.epoch??null};
        }
        await request(store.put(record));
       }
       const cursor={namespace,protocol:config.slot,policy,afterRevision,epoch,localVersion:(BigInt(expectedLocalVersion)+1n).toString()};
       await request(cursors.put(cursor));return cursor;
      });
     },
     getImportCheckpoint(fingerprint,adapterVersion){
      if(!/^[a-f0-9]{64}$/.test(fingerprint)||typeof adapterVersion!=='string'||adapterVersion.length>40)fail('invalid_checkpoint');
      return transaction(['import_receipts'],'readonly',tx=>request(tx.objectStore('import_receipts').get([namespace,fingerprint,adapterVersion])));
     },
     saveImportCheckpoint(fingerprint,adapterVersion,value,expectedLocalRevision='0'){
      if(guest||!/^[a-f0-9]{64}$/.test(fingerprint)||typeof adapterVersion!=='string'||adapterVersion.length<1||adapterVersion.length>40||!revision(expectedLocalRevision))fail('invalid_checkpoint');
      const snapshot=copy(value);if(new TextEncoder().encode(canonical(snapshot)).length>4*1024*1024)fail('payload_too_large');
      return transaction(['import_receipts'],'readwrite',async tx=>{
       const store=tx.objectStore('import_receipts'),old=await request(store.get([namespace,fingerprint,adapterVersion]));
       if((old?.localRevision||'0')!==expectedLocalRevision)fail('local_conflict');
       const localRevision=(BigInt(expectedLocalRevision)+1n).toString();
       await request(store.put({namespace,fingerprint,adapterVersion,localRevision,value:snapshot}));return localRevision;
      });
     },
     setDeviceState(deviceId,key,value){
      if(!UUID.test(deviceId)||!['timer','checklist','focus'].includes(key))fail('invalid_device_key');
      const snapshot=copy(value);if(new TextEncoder().encode(canonical(snapshot)).length>64*1024)fail('payload_too_large');
      return transaction(['device_state'],'readwrite',tx=>request(tx.objectStore('device_state').put({namespace,deviceId,key,value:snapshot})))
     },
     getDeviceState(deviceId,key){return transaction(['device_state'],'readonly',tx=>request(tx.objectStore('device_state').get([namespace,deviceId,key])))},
     getCourtCheckpoint(binding){const proof=copy(binding);return transaction(['metadata','records','sync_cursor','device_state'],'readwrite',async tx=>{await courtFence(tx,proof);return courtRow(tx,proof.planId)})},
     saveCourtCheckpoint(value,expectedLocalRevision,binding){
      const proof=copy(binding),snapshot=copy(value);courtValue(snapshot,proof?.planId);if(!revision(expectedLocalRevision))fail('invalid_device_state');
      return transaction(['metadata','records','sync_cursor','device_state'],'readwrite',async tx=>{
       await courtFence(tx,proof);if(snapshot.epoch!==proof.epoch)fail('plan_unavailable');const row=await courtRow(tx,proof.planId);
       if(row.localRevision!==expectedLocalRevision)fail('local_conflict');
       row.value=snapshot;row.localRevision=(BigInt(row.localRevision)+1n).toString();await request(tx.objectStore('device_state').put(row));return row;
      });
     },
     getAcademyPractice(fence){const captured=copy(fence);return transaction(['metadata','device_state'],'readwrite',async tx=>{await practiceFence(tx,captured);return practiceRow(tx)})},
     changeAcademyPractice(patch,fence){
      const intent=copy(patch),captured=copy(fence);canonical(intent);
      if(!intent||!/^PU-0(?:0[1-9]|[1-7][0-9]|80)$/.test(intent.lessonId)||!['check','focus','reset'].includes(intent.action)||Object.keys(intent).sort().join(',')!==({check:'action,checked,index,lessonId',focus:'action,index,lessonId',reset:'action,lessonId'})[intent.action]||intent.action!=='reset'&&(!Number.isInteger(intent.index)||intent.index<0||intent.index>5)||intent.action==='check'&&typeof intent.checked!=='boolean')fail('invalid_device_state');
      return transaction(['metadata','device_state'],'readwrite',async tx=>{
       await practiceFence(tx,captured);const row=await practiceRow(tx),lesson=row.value.lessons[intent.lessonId]||{checked:[],focus:0};
       if(intent.action==='focus')lesson.focus=intent.index;
       else if(intent.action==='reset')lesson.checked=[];
       else{const checked=new Set(lesson.checked);if(intent.checked)checked.add(intent.index);else checked.delete(intent.index);lesson.checked=[...checked].sort((a,b)=>a-b)}
       row.value.lessons[intent.lessonId]=lesson;row.localRevision=(BigInt(row.localRevision)+1n).toString();
       await request(tx.objectStore('device_state').put(row));return row;
      });
     },
     // Advisory cross-tab lease only; a future sender must still use RPC receipts.
     acquireLease(owner,now=Date.now(),duration=15000,policy=DEFAULT_POLICY){
      const config=policyConfig(policy);
      if(!UUID.test(owner)||!Number.isSafeInteger(now)||!Number.isInteger(duration)||duration<1||duration>60000)fail('invalid_lease');
      return transaction(['metadata'],'readwrite',async tx=>{
       const store=tx.objectStore('metadata'),key=[namespace,config.lease],lease=await request(store.get(key));
       if(lease&&lease.owner!==owner&&lease.until>now)return false;
       await request(store.put({namespace,key:config.lease,owner,until:now+duration}));return true;
      });
     },
     releaseLease(owner,policy=DEFAULT_POLICY){const config=policyConfig(policy);return transaction(['metadata'],'readwrite',async tx=>{const store=tx.objectStore('metadata'),lease=await request(store.get([namespace,config.lease]));if(lease?.owner===owner)await request(store.delete([namespace,config.lease]))})}
    };
    scopes.add(api);return api;
   }
   resolve({scope,close,version:VERSION,policies:Object.freeze([DEFAULT_POLICY,ACTIVITY_POLICY,PLAN_POLICY]),activityLifecycle:1,planLifecycle:1,trainingLifecycle:1});
  };
 });
}
const api={open,RepositoryError,VERSION};
if(typeof module!=='undefined')module.exports=api;else root.PickleUpLocalRepository=api;
})(typeof window!=='undefined'?window:globalThis);
