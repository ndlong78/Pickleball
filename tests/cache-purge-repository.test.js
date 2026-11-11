const {test}=require('node:test'),assert=require('node:assert/strict');
const {IDBFactory,IDBObjectStore}=require('fake-indexeddb');
const repo=require('../modules/data/local-repository.js'),rescue=require('../modules/data/account-rescue-core.js');
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',G='33333333-3333-4333-8333-333333333333',D='44444444-4444-4444-8444-444444444444',E='55555555-5555-4555-8555-555555555555',O='66666666-6666-4666-8666-666666666666';
const ns='user:'+A,marker='local-cache-generation-1';
const stores={records:['namespace','kind','id'],outbox:['namespace','operationId'],conflicts:['namespace','conflictId'],sync_cursor:['namespace','protocol'],import_receipts:['namespace','fingerprint','adapterVersion'],legacy_snapshots:['installationId','snapshotId'],device_state:['namespace','deviceId','key'],metadata:['namespace','key']};
const input=()=>({kind:'user_preferences',id:'self',operationId:crypto.randomUUID(),value:{target_days:4}});
async function native(factory,name='pickleup-v6',version){return new Promise((resolve,reject)=>{const r=version?factory.open(name,version):factory.open(name);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function mutate(factory,work){const db=await native(factory);try{await new Promise((resolve,reject)=>{const tx=db.transaction(Object.keys(stores),'readwrite');tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);work(tx)})}finally{db.close()}}
async function raw(factory){const db=await native(factory);try{return await new Promise((resolve,reject)=>{const tx=db.transaction(Object.keys(stores)),out={};for(const name of Object.keys(stores)){const r=tx.objectStore(name).getAll();r.onsuccess=()=>out[name]=r.result}tx.oncomplete=()=>resolve(out);tx.onabort=()=>reject(tx.error)})}finally{db.close()}}
function seed(tx){
 const put=(name,row)=>tx.objectStore(name).put(row);
 put('records',{namespace:ns,kind:'user_preferences',id:'self',base:{user_id:A,revision:'1',deleted_at:null,target_days:3},baseRevision:'1',baseEpoch:E,overlay:null,tailOperationId:null,reviewRequired:false,deleted:false,localRevision:'2'});
 put('outbox',{namespace:ns,operationId:O,kind:'user_preferences',id:'self',state:'acked',ackRevision:'1',ackEpoch:E});
 put('conflicts',{namespace:ns,conflictId:D,state:'resolved'});
 put('sync_cursor',{namespace:ns,protocol:1,epoch:E,afterRevision:'1',localVersion:'1'});
 put('import_receipts',{namespace:ns,fingerprint:'a'.repeat(64),adapterVersion:'legacy-1',localRevision:'1',value:{owner:A,phase:'complete',pending:null,signature:'synthetic original preserved'}});
 put('device_state',{namespace:ns,deviceId:D,key:'focus',value:{index:2}});
 for(const row of [{key:'activity-consent-1',enabled:true,localRevision:'9'},{key:'plans-selections-consent-1',enabled:true,localRevision:'2'},{key:'preferences-checkins-consent-1',enabled:true},{key:'checkin-timezone-1',value:'Asia/Ho_Chi_Minh'},{key:'academy-device-id-1',value:D},{key:'senderLease',owner:D,until:0},{key:'operation:'+O,signature:'{}',localRevision:'2'}])put('metadata',{namespace:ns,...row});
 for(const namespace of ['user:'+B,'guest:'+G])put('records',{namespace,kind:'user_preferences',id:'self',overlay:{target_days:6},localRevision:'1'});
 put('legacy_snapshots',{installationId:G,snapshotId:D,raw:'synthetic unscoped rescue'});
}
async function fixture(){const indexedDB=new IDBFactory(),db=await repo.open({indexedDB});await mutate(indexedDB,seed);return {indexedDB,db,a:db.scope(ns)}}
test('clean own cache purges all seven stores atomically, retaining B/guest/unscoped rescue and disabled consents',async()=>{
 const f=await fixture();try{
  const before=await raw(f.indexedDB),preview=await f.a.getAccountPurgePreview();assert.deepEqual(preview.blockers,[]);await rescue.create(preview.snapshot,{expectedOwner:A});
  const result=await f.a.purgeAccountCache({expectedSnapshot:preview.snapshot,operationId:O});assert.equal(result.status,'purged');assert.notEqual(result.generation,O);
  const after=await raw(f.indexedDB);for(const name of Object.keys(stores))assert.deepEqual(after[name].filter(row=>row.namespace!==ns),before[name].filter(row=>row.namespace!==ns));
  for(const name of Object.keys(rescue.STORES).filter(n=>n!=='metadata'))assert.equal(after[name].filter(row=>row.namespace===ns).length,0);
  const fresh=f.db.scope(ns);assert.equal(await fresh.getDomainConsent(),false);assert.deepEqual(await fresh.getActivityConsent(),{enabled:false,localRevision:'10'});assert.deepEqual(await fresh.getPlanConsent(),{enabled:false,localRevision:'3'});assert.equal(await fresh.getDomainTimezone(),null);
  assert.equal(after.metadata.filter(row=>row.namespace===ns).length,4);assert.equal(after.metadata.find(row=>row.key===marker).value,result.generation);
 }finally{f.db.close()}
});
test('all unresolved/unknown outbox states block deletion without trimming or rewriting frozen requests',async()=>{
 for(const state of ['pending','deferred','sending','blocked','conflict','future',null]){
  const f=await fixture();try{await mutate(f.indexedDB,tx=>tx.objectStore('outbox').put({namespace:ns,operationId:O,kind:'user_preferences',id:'self',state,request:{p_operation_id:O,p_epoch:E}}));const before=await raw(f.indexedDB),p=await f.a.getAccountPurgePreview();assert.ok(p.blockers.includes('unsettled_operation'));await assert.rejects(f.a.purgeAccountCache({expectedSnapshot:p.snapshot,operationId:D}),{code:'purge_blocked'});assert.deepEqual(await raw(f.indexedDB),before)}finally{f.db.close()}
 }
});
test('open/unknown conflicts, local overlays, incomplete imports, active senders and future metadata fail closed',async()=>{
 const cases=[['conflicts',{namespace:ns,conflictId:D,state:'open'},'unsettled_conflict'],['records',{namespace:ns,kind:'user_preferences',id:'self',overlay:{target_days:4}},'unsettled_record'],['import_receipts',{namespace:ns,fingerprint:'a'.repeat(64),adapterVersion:'legacy-1',localRevision:'2',value:{owner:A,phase:'committed_unverified',pending:null}},'unfinished_import'],['import_receipts',{namespace:ns,fingerprint:'a'.repeat(64),adapterVersion:'legacy-1',localRevision:'2',value:{owner:A,phase:'complete',pending:{operationId:O}}},'unfinished_import'],['metadata',{namespace:ns,key:'senderLease',owner:D,until:Date.now()+60000},'active_sender'],['metadata',{namespace:ns,key:'future-state',value:{}},'unknown_state'],['device_state',{namespace:ns,deviceId:D,key:'future-checkpoint',value:{}},'unknown_state'],['metadata',{namespace:ns,key:'activity-consent-1',enabled:true,localRevision:'9999999999999999999'},'unknown_state']];
 for(const [name,row,code] of cases){const f=await fixture();try{await mutate(f.indexedDB,tx=>tx.objectStore(name).put(row));const before=await raw(f.indexedDB),p=await f.a.getAccountPurgePreview();assert.ok(p.blockers.includes(code),code);await assert.rejects(f.a.purgeAccountCache({expectedSnapshot:p.snapshot,operationId:D}),{code:'purge_blocked'});assert.deepEqual(await raw(f.indexedDB),before)}finally{f.db.close()}}
});
test('same-count edits invalidate a preview; foreign owner/guest/future snapshots never authorize a purge',async()=>{
 const f=await fixture();try{const p=await f.a.getAccountPurgePreview();await f.a.setDeviceState(D,'focus',{index:3});const before=await raw(f.indexedDB);await assert.rejects(f.a.purgeAccountCache({expectedSnapshot:p.snapshot,operationId:D}),{code:'preview_changed'});for(const snapshot of [{...p.snapshot,owner:B},{...p.snapshot,repositoryVersion:99},null])await assert.rejects(f.a.purgeAccountCache({expectedSnapshot:snapshot,operationId:D}),{code:'invalid_preview'});await assert.rejects(f.db.scope('guest:'+G).purgeAccountCache({expectedSnapshot:p.snapshot,operationId:D}),{code:'auth_required'});assert.deepEqual(await raw(f.indexedDB),before)}finally{f.db.close()}
});
test('quota/abort after deletes rolls back rows and marker; the original scope and preview remain usable',async()=>{
 for(const exception of ['QuotaExceededError','AbortError']){const f=await fixture(),put=IDBObjectStore.prototype.put;try{const p=await f.a.getAccountPurgePreview(),before=await raw(f.indexedDB);try{IDBObjectStore.prototype.put=function(row){if(this.name==='metadata'&&row.key===marker)throw new DOMException('synthetic',exception);return put.call(this,row)};await assert.rejects(f.a.purgeAccountCache({expectedSnapshot:p.snapshot,operationId:D}),{code:exception==='QuotaExceededError'?'quota_exceeded':'storage_unavailable'})}finally{IDBObjectStore.prototype.put=put}assert.deepEqual(await raw(f.indexedDB),before);assert.deepEqual(await f.a.getAccountRescueSnapshot(),p.snapshot);assert.equal((await f.a.purgeAccountCache({expectedSnapshot:p.snapshot,operationId:D})).status,'purged')}finally{IDBObjectStore.prototype.put=put;f.db.close()}}
});
test('pinned scopes across connections reject late reads/writes/ACK/checkpoint/lease work after purge',async()=>{
 const f=await fixture(),second=await repo.open({indexedDB:f.indexedDB}),late=second.scope(ns),b=second.scope('user:'+B);try{
  await late.getAccountRescueSnapshot();const preview=await f.a.getAccountPurgePreview();await f.a.purgeAccountCache({expectedSnapshot:preview.snapshot,operationId:D});
  for(const work of [()=>late.read('user_preferences','self'),()=>late.write(input()),()=>late.setDeviceState(D,'focus',{index:5}),()=>late.saveImportCheckpoint('b'.repeat(64),'legacy-1',{phase:'prepared'}),()=>late.setDomainConsent(true),()=>late.acquireLease(D),()=>late.deferSync(O,{p_epoch:E},{code:'network_error',nextAttemptAt:0}),()=>late.completeSync(O,{p_epoch:E},{status:'applied'}),()=>late.applyCanonicalSnapshot({rows:[],afterRevision:'1',epoch:E,expectedLocalVersion:'1',reset:true})])await assert.rejects(work(),{code:'cache_changed'});
  assert.equal((await f.db.scope(ns).getAccountRescueSnapshot()).stores.records.length,0);assert.equal((await b.read('user_preferences','self')).overlay.target_days,6);
  await f.db.scope(ns).write(input());assert.equal((await f.db.scope(ns).listOutbox()).length,1);
 }finally{second.close();f.db.close()}
});
test('concurrent purges have one commit; caller operation IDs cannot resurrect old generations',async()=>{
 const f=await fixture(),second=await repo.open({indexedDB:f.indexedDB});try{const other=second.scope(ns),p=await f.a.getAccountPurgePreview();await other.getAccountRescueSnapshot();const results=await Promise.allSettled([f.a.purgeAccountCache({expectedSnapshot:p.snapshot,operationId:D}),other.purgeAccountCache({expectedSnapshot:p.snapshot,operationId:O})]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.code,'cache_changed');const first=results.find(r=>r.status==='fulfilled').value,fresh=f.db.scope(ns),p2=await fresh.getAccountPurgePreview(),again=await fresh.purgeAccountCache({expectedSnapshot:p2.snapshot,operationId:first.generation});assert.notEqual(again.generation,first.generation);await assert.rejects(other.setDomainConsent(true),{code:'cache_changed'});await assert.rejects(fresh.setDomainConsent(true),{code:'cache_changed'})}finally{second.close();f.db.close()}
});
test('closing a scope aborts an uncommitted purge and preserves all original data',async()=>{
 const f=await fixture();try{const p=await f.a.getAccountPurgePreview(),before=await raw(f.indexedDB),work=f.a.purgeAccountCache({expectedSnapshot:p.snapshot,operationId:D});f.a.close();await assert.rejects(work,{code:'scope_closed'});assert.deepEqual(await raw(f.indexedDB),before)}finally{f.db.close()}
});
test('resolved operations require their archive; resolution receipt revisions remain supported',async()=>{
 const f=await fixture();try{await mutate(f.indexedDB,tx=>{tx.objectStore('outbox').put({namespace:ns,operationId:O,kind:'user_preferences',id:'self',state:'resolved',resolutionId:D});tx.objectStore('metadata').put({namespace:ns,key:'operation:'+O,signature:'{}',result:{status:'resolved',localRevision:'3'}})});const p=await f.a.getAccountPurgePreview();assert.deepEqual(p.blockers,[]);await mutate(f.indexedDB,tx=>tx.objectStore('conflicts').delete([ns,D]));const p2=await f.a.getAccountPurgePreview();assert.ok(p2.blockers.includes('unsettled_operation'));await assert.rejects(f.a.purgeAccountCache({expectedSnapshot:p2.snapshot,operationId:D}),{code:'purge_blocked'})}finally{f.db.close()}
});
test('unknown generation remains exportable read-only but blocks every scoped write',async()=>{
 const f=await fixture();try{await mutate(f.indexedDB,tx=>tx.objectStore('metadata').put({namespace:ns,key:marker,value:{future:'preserved'}}));const a=f.db.scope(ns),snapshot=await a.getAccountRescueSnapshot();await rescue.create(snapshot,{expectedOwner:A});assert.ok(repo.getPurgeBlockers(snapshot).includes('unknown_state'));await assert.rejects(a.setDomainConsent(true),{code:'upgrade_required'});await assert.rejects(a.purgeAccountCache({expectedSnapshot:snapshot,operationId:D}),{code:'upgrade_required'})}finally{f.db.close()}
});
async function version1(indexedDB,{malformed=false,extraIndex=false}={}){return new Promise((resolve,reject)=>{const r=indexedDB.open('pickleup-v6',1);r.onupgradeneeded=()=>{for(const [name,keyPath]of Object.entries(stores)){const s=r.result.createObjectStore(name,{keyPath});if(name!=='legacy_snapshots'&&!(malformed&&name==='records'))s.createIndex('namespace','namespace');if(extraIndex&&name==='legacy_snapshots')s.createIndex('future','raw')}seed(r.transaction);r.transaction.objectStore('outbox').put({namespace:ns,operationId:O,kind:'user_preferences',id:'self',state:'sending',request:{p_operation_id:O,p_epoch:E}})};r.onerror=()=>reject(r.error);r.onsuccess=()=>resolve(r.result)})}
test('V1 to V2 upgrade preserves every row including frozen pending, provenance, device and unscoped data; V1 clients cannot reopen',async()=>{
 const indexedDB=new IDBFactory(),old=await version1(indexedDB);old.close();const before=await raw(indexedDB),db=await repo.open({indexedDB});try{assert.equal(db.version,2);assert.deepEqual(await raw(indexedDB),before);await assert.rejects(native(indexedDB,'pickleup-v6',1),{name:'VersionError'});const snapshot=await db.scope(ns).getAccountRescueSnapshot();assert.equal(snapshot.repositoryVersion,2);assert.ok(repo.getPurgeBlockers(snapshot).includes('unsettled_operation'));await rescue.create(snapshot,{expectedOwner:A})}finally{db.close()}
});
test('blocked upgrade abandons safely; malformed V1 layouts abort upgrade without changing a row',async()=>{
 const indexedDB=new IDBFactory(),old=await version1(indexedDB);try{const before=await raw(indexedDB);await assert.rejects(repo.open({indexedDB}),{code:'upgrade_blocked'});old.close();const reopened=await native(indexedDB,'pickleup-v6',1);assert.equal(reopened.version,1);reopened.close();assert.deepEqual(await raw(indexedDB),before)}finally{old.close()}
 for(const options of [{malformed:true},{extraIndex:true}]){const bad=new IDBFactory(),malformed=await version1(bad,options);malformed.close();const before=await raw(bad);await assert.rejects(repo.open({indexedDB:bad}),{code:'upgrade_required'});const check=await native(bad,'pickleup-v6',1);assert.equal(check.version,1);check.close();assert.deepEqual(await raw(bad),before)}
});
