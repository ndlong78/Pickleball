const {test}=require('node:test'),assert=require('node:assert/strict');
const {IDBFactory,IDBObjectStore}=require('fake-indexeddb');
const {open}=require('../modules/data/local-repository.js');
const A='user:11111111-1111-4111-8111-111111111111',B='user:22222222-2222-4222-8222-222222222222',G='guest:33333333-3333-4333-8333-333333333333';
const op=(name,value=1,revision='0')=>({kind:'user_preferences',id:'self',value:{target_days:value},operationId:name,expectedLocalRevision:revision});
const id1='44444444-4444-4444-8444-444444444444',id2='55555555-5555-4555-8555-555555555555';
async function fixture(){const indexedDB=new IDBFactory();const db=await open({indexedDB});return {indexedDB,db,a:db.scope(A),b:db.scope(B),g:db.scope(G)}}
test('atomic queue, exact replay and account/guest isolation survive reopen',async()=>{
 const {indexedDB,db,a,b,g}=await fixture();
 await a.write(op(id1));assert.equal((await a.listOutbox()).length,1);assert.equal(await b.read('user_preferences','self'),undefined);
 assert.equal((await a.write(op(id1))).status,'replayed');await assert.rejects(a.write(op(id1,2)),{code:'operation_mismatch'});
 await g.write(op(id1,3));assert.equal((await g.listOutbox()).length,0);db.close();
 const reopened=await open({indexedDB});try{assert.equal((await reopened.scope(A).read('user_preferences','self')).overlay.target_days,1);assert.equal((await reopened.scope(G).read('user_preferences','self')).overlay.target_days,3)}finally{reopened.close()}
});
test('concurrent tab CAS allows one write; next edit defers immutable operation behind predecessor',async()=>{
 const {indexedDB,db,a}=await fixture();const second=await open({indexedDB});try{
  const results=await Promise.allSettled([a.write(op(id1)),second.scope(A).write(op(id2,2))]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.code,'local_conflict');
  const row=await a.read('user_preferences','self'),next=row.tailOperationId===id1?id2:id1;
  await a.write(op(next,4,'1'));const operations=await a.listOutbox();assert.equal(operations.length,2);assert.equal(operations.find(o=>o.operationId===next).dependsOn,row.tailOperationId);assert.equal(operations.find(o=>o.operationId===next).expectedRevision,null);
 }finally{second.close();db.close()}
});
test('quota failure after record/outbox puts rolls back all stores; retry same ID succeeds',async()=>{
 const {db,a}=await fixture();const add=IDBObjectStore.prototype.add;
 try{IDBObjectStore.prototype.add=function(value){if(this.name==='metadata')throw new DOMException('synthetic','QuotaExceededError');return add.call(this,value)};await assert.rejects(a.write(op(id1)),{code:'quota_exceeded'})}finally{IDBObjectStore.prototype.add=add}
 try{assert.equal(await a.read('user_preferences','self'),undefined);assert.deepEqual(await a.listOutbox(),[]);await a.write(op(id1));assert.equal((await a.listOutbox()).length,1)}finally{db.close()}
});
test('scope closure drops stale work; changing account preserves pending A',async()=>{
 const {db,a,b}=await fixture();try{await a.write(op(id1));a.close();await assert.rejects(a.read('user_preferences','self'),{code:'scope_closed'});assert.deepEqual(await b.listOutbox(),[]);assert.equal((await db.scope(A).listOutbox()).length,1)}finally{db.close()}
});
test('lease is serialized across connections, expires safely and is namespaced',async()=>{
 const {indexedDB,db,a,b}=await fixture();const second=await open({indexedDB});try{const result=await Promise.all([a.acquireLease(id1,100),second.scope(A).acquireLease(id2,100)]);assert.equal(result.filter(Boolean).length,1);assert.equal(await b.acquireLease(id2,100),true);assert.equal(await second.scope(A).acquireLease(id2,20000),true)}finally{second.close();db.close()}
});
test('tombstone needs explicit restore and validation rejects credentials and invalid identities',async()=>{
 const {db,a}=await fixture();try{await a.write(op(id1));await a.write({...op(id2,1,'1'),action:'delete',value:{}});await assert.rejects(a.write({...op(crypto.randomUUID(),2,'2')}),{code:'explicit_restore_required'});await a.write({...op(crypto.randomUUID(),2,'2'),action:'restore'});
 await assert.rejects(a.write({...op(crypto.randomUUID()),value:{refresh_token:'fixture'}}),{code:'credentials_forbidden'});assert.throws(()=>db.scope('user:someone'),{code:'invalid_namespace'});assert.throws(()=>a.read('practice_checkins','2026-02-31'),{code:'invalid_entity'});
 }finally{db.close()}
});
test('versionchange closes readers and interrupted upgrade preserves committed rows',async()=>{
 const {indexedDB,db,a}=await fixture();await a.write(op(id1));
 await new Promise((resolve,reject)=>{const r=indexedDB.open('pickleup-v6',2);r.onupgradeneeded=()=>r.transaction.abort();r.onerror=()=>resolve();r.onsuccess=()=>reject(Error('upgrade unexpectedly committed'))});
 await assert.rejects(a.read('user_preferences','self'),{code:'scope_closed'});const recovered=await open({indexedDB});try{assert.equal((await recovered.scope(A).listOutbox()).length,1)}finally{recovered.close();db.close()}
});
test('closing scope while a write is in flight aborts new mutation and preserves earlier pending work',async()=>{
 const {db,a}=await fixture();try{await a.write(op(id1));const pending=a.write(op(id2,2,'1'));a.close();await assert.rejects(pending);const recovered=db.scope(A);assert.equal((await recovered.read('user_preferences','self')).overlay.target_days,1);assert.equal((await recovered.listOutbox()).length,1)}finally{db.close()}
});
test('protocol1 refuses event restore; checkin tombstone retains explicitly supplied timezone',async()=>{
 const {db,a}=await fixture();try{await assert.rejects(a.write({kind:'academy_attempts',id:id1,operationId:id2,value:{},action:'restore'}),{code:'append_only'});await a.write({kind:'practice_checkins',id:'2026-10-29',operationId:id1,value:{timezone_at_entry:'Asia/Ho_Chi_Minh'},action:'delete'});assert.deepEqual((await a.listOutbox())[0].payload,{timezone_at_entry:'Asia/Ho_Chi_Minh'})}finally{db.close()}
});
