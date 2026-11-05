const {test}=require('node:test'),assert=require('node:assert/strict'),{IDBFactory,IDBObjectStore}=require('fake-indexeddb');
const {open}=require('../modules/data/local-repository.js'),plans=require('../modules/data/plan-controller.js'),core=require('../modules/data/plan-core.js'),pull=require('../modules/data/pull-controller.js'),sync=require('../modules/data/sync-controller.js');
const {model}=require('./helpers/sync-model.cjs'),{command}=require('./helpers/plan-fixtures.cjs');
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
async function fixture(){
 const indexedDB=new IDBFactory(),db=await open({indexedDB}),server=model({owner:A,planRows:true});
 const auth={subscribe(fn){fn({status:'authenticated',user:{id:A}});return ()=>{}},planRpc:async(owner,name,args)=>server.rpc(name,args)};
 const c=plans.create({auth,repository:db,core,pullFactory:pull,syncFactory:sync,enabled:()=>true,channelFactory:()=>null});await c.ready;await c.useAccount();const cmd=command();await c.createPlan(cmd);await c.select({operationId:crypto.randomUUID(),value:{selected_personal_plan_id:cmd.id}});await c.sync();
 const s=c.getState(),row=(kind,id)=>s.snapshot.records.find(r=>r.kind===kind&&r.id===id),binding={planId:cmd.id,epoch:s.snapshot.cursor.epoch,consentRevision:s.consent.localRevision,planRevision:row('personal_plans',cmd.id).localRevision,selectionRevision:row('user_selections','self').localRevision};
 const point={schemaVersion:1,planId:cmd.id,epoch:binding.epoch,index:1,remaining:610,ended:false};
 return {db,indexedDB,c,scope:db.scope('user:'+A),binding,point,close(){c.close();db.close()}};
}
test('paused checkpoint survives reopen, is owner scoped, and never creates a queue command',async()=>{
 const f=await fixture(),before=JSON.stringify(await f.scope.listOutbox());try{assert.equal((await f.scope.getCourtCheckpoint(f.binding)).value,null);const row=await f.scope.saveCourtCheckpoint(f.point,'0',f.binding);assert.equal(row.localRevision,'1');assert.deepEqual(row.value,f.point);assert.equal(JSON.stringify(await f.scope.listOutbox()),before);await assert.rejects(f.db.scope('user:'+B).getCourtCheckpoint(f.binding));f.c.close();f.db.close();const next=await open({indexedDB:f.indexedDB});try{assert.deepEqual((await next.scope('user:'+A).getCourtCheckpoint(f.binding)).value,f.point)}finally{next.close()}}finally{f.close()}
});
test('two connections CAS reject a stale overwrite while preserving the winning checkpoint',async()=>{
 const f=await fixture(),tab=await open({indexedDB:f.indexedDB});try{const results=await Promise.allSettled([f.scope.saveCourtCheckpoint(f.point,'0',f.binding),tab.scope('user:'+A).saveCourtCheckpoint({...f.point,index:2},'0',f.binding)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.code,'local_conflict');assert.equal((await f.scope.getCourtCheckpoint(f.binding)).localRevision,'1')}finally{tab.close();f.close()}
});
test('checkpoint fences plan/selection revisions, consent and epoch inside its transaction',async()=>{
 const f=await fixture();try{for(const bad of [{...f.binding,planRevision:'0'},{...f.binding,selectionRevision:'0'},{...f.binding,epoch:crypto.randomUUID()}])await assert.rejects(f.scope.saveCourtCheckpoint(f.point,'0',bad),{code:'plan_unavailable'});await f.scope.setPlanConsent(false,f.binding.consentRevision);await assert.rejects(f.scope.getCourtCheckpoint(f.binding),{code:'consent_changed'})}finally{f.close()}
});
test('quota abort retains prior checkpoint; retry uses the original CAS revision',async()=>{
 const f=await fixture(),put=IDBObjectStore.prototype.put;try{await f.scope.saveCourtCheckpoint(f.point,'0',f.binding);IDBObjectStore.prototype.put=function(...args){if(this.name==='device_state')throw new DOMException('synthetic','QuotaExceededError');return put.apply(this,args)};await assert.rejects(f.scope.saveCourtCheckpoint({...f.point,remaining:500},'1',f.binding),{code:'quota_exceeded'})}finally{IDBObjectStore.prototype.put=put}
 try{assert.equal((await f.scope.getCourtCheckpoint(f.binding)).value.remaining,610);assert.equal((await f.scope.saveCourtCheckpoint({...f.point,remaining:500},'1',f.binding)).value.remaining,500)}finally{f.close()}
});
test('typed checkpoint excludes running/deadline/credentials and rejects impossible stage state',async()=>{
 const f=await fixture();try{for(const value of [Object.assign([],{...f.point}),{...f.point,epoch:[f.point.epoch]},{...f.point,running:true},{...f.point,deadline:1000},{...f.point,otp:'synthetic'},{...f.point,remaining:721},{...f.point,index:6},{...f.point,ended:true},{...f.point,schemaVersion:2}])assert.throws(()=>f.scope.saveCourtCheckpoint(value,'0',f.binding));await f.scope.saveCourtCheckpoint({...f.point,index:6,remaining:0,ended:true},'0',f.binding)}finally{f.close()}
});
test('corrupt checkpoint remains untouched and scope closure aborts new writes',async()=>{
 const f=await fixture();try{const row=await f.scope.saveCourtCheckpoint(f.point,'0',f.binding);await new Promise((resolve,reject)=>{const r=f.indexedDB.open('pickleup-v6');r.onsuccess=()=>{const db=r.result,tx=db.transaction('device_state','readwrite');tx.objectStore('device_state').put({...row,value:null});tx.oncomplete=()=>{db.close();resolve()};tx.onabort=()=>reject(tx.error)}});await assert.rejects(f.scope.getCourtCheckpoint(f.binding),{code:'invalid_device_state'});await assert.rejects(f.scope.saveCourtCheckpoint(f.point,'1',f.binding),{code:'invalid_device_state'});f.scope.close();await assert.rejects(f.scope.getCourtCheckpoint(f.binding),{code:'scope_closed'})}finally{f.close()}
});
test('even an exact new local revision cannot bypass an unacknowledged selection',async()=>{
 const f=await fixture();try{await f.c.select({operationId:crypto.randomUUID(),expectedLocalRevision:f.binding.selectionRevision,value:{selected_academy_lesson_id:'PU-037'}});const selection=f.c.getState().snapshot.records.find(r=>r.kind==='user_selections');await assert.rejects(f.scope.getCourtCheckpoint({...f.binding,selectionRevision:selection.localRevision}),{code:'plan_unavailable'})}finally{f.close()}
});
