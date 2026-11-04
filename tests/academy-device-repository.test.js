const {test}=require('node:test'),assert=require('node:assert/strict');
const {IDBFactory,IDBObjectStore}=require('fake-indexeddb'),{open}=require('../modules/data/local-repository.js');
const A='user:11111111-1111-4111-8111-111111111111',B='user:22222222-2222-4222-8222-222222222222';
const fence={plan:{enabled:true,localRevision:'1'},activity:{enabled:false,localRevision:'0'}};
const check=(index=0,checked=true)=>({lessonId:'PU-037',action:'check',index,checked});
async function setup(){const indexedDB=new IDBFactory(),db=await open({indexedDB}),a=db.scope(A);await a.setPlanConsent(true,'0');return {indexedDB,db,a}}
test('Academy device state merges independent tab intents and survives reopen without queue or guest copy',async()=>{
 const {indexedDB,db,a}=await setup(),tab=await open({indexedDB});try{
  await Promise.all([a.changeAcademyPractice(check(),fence),tab.scope(A).changeAcademyPractice(check(1),fence),a.changeAcademyPractice({lessonId:'PU-038',action:'focus',index:4},fence)]);
  const row=await a.getAcademyPractice(fence);assert.equal(row.localRevision,'3');assert.deepEqual(row.value.lessons['PU-037'].checked,[0,1]);assert.equal(row.value.lessons['PU-038'].focus,4);assert.deepEqual(await a.listOutbox(),[]);
  const b=db.scope(B);await b.setPlanConsent(true,'0');assert.deepEqual((await b.getAcademyPractice(fence)).value.lessons,{});
  await a.changeAcademyPractice({lessonId:'PU-037',action:'focus',index:2},fence);await a.changeAcademyPractice({lessonId:'PU-037',action:'reset'},fence);assert.deepEqual((await a.getAcademyPractice(fence)).value.lessons['PU-037'],{checked:[],focus:2});
 }finally{tab.close();db.close()}
 const reopened=await open({indexedDB});try{assert.equal((await reopened.scope(A).getAcademyPractice(fence)).value.lessons['PU-038'].focus,4)}finally{reopened.close()}
});
test('Academy device transaction fences both consent revisions, including an opt-out source',async()=>{
 const {db,a}=await setup();try{
  await a.changeAcademyPractice(check(),fence);await a.setActivityConsent(true,'0');await assert.rejects(a.changeAcademyPractice(check(2),fence),{code:'consent_changed'});
  const both={...fence,activity:{enabled:true,localRevision:'1'}};await a.changeAcademyPractice(check(3),both);await a.setPlanConsent(false,'1');await assert.rejects(a.getAcademyPractice(both),{code:'consent_changed'});
  const onlyActivity={plan:{enabled:false,localRevision:'2'},activity:both.activity};assert.deepEqual((await a.getAcademyPractice(onlyActivity)).value.lessons['PU-037'].checked,[0,3]);
  await assert.rejects(a.getAcademyPractice({plan:null,activity:null}),{code:'source_unavailable'});
 }finally{db.close()}
});
test('Academy device quota abort keeps prior state and retry is an idempotent explicit value',async()=>{
 const {db,a}=await setup(),put=IDBObjectStore.prototype.put;try{
  await a.changeAcademyPractice(check(),fence);
  IDBObjectStore.prototype.put=function(...args){if(this.name==='device_state')throw new DOMException('synthetic','QuotaExceededError');return put.apply(this,args)};
  await assert.rejects(a.changeAcademyPractice(check(1),fence),{code:'quota_exceeded'});
 }finally{IDBObjectStore.prototype.put=put}
 try{assert.equal((await a.getAcademyPractice(fence)).localRevision,'1');await a.changeAcademyPractice(check(1),fence);await a.changeAcademyPractice(check(1),fence);assert.deepEqual((await a.getAcademyPractice(fence)).value.lessons['PU-037'].checked,[0,1])}finally{db.close()}
});
test('Academy device rejects malformed/credential payloads and never replaces corrupt saved data',async()=>{
 const {indexedDB,db,a}=await setup();try{
  for(const patch of [{...check(),index:6},{...check(),lessonId:'PU-081'},{...check(),checked:1},{...check(),extra:'x'},{...check(),otp:'synthetic'}])assert.throws(()=>a.changeAcademyPractice(patch,fence));
  const row=await a.changeAcademyPractice(check(),fence);
  await new Promise((resolve,reject)=>{const r=indexedDB.open('pickleup-v6');r.onsuccess=()=>{const conn=r.result,tx=conn.transaction('device_state','readwrite');tx.objectStore('device_state').put({...row,value:null});tx.oncomplete=()=>{conn.close();resolve()};tx.onabort=()=>reject(tx.error)}});
  await assert.rejects(a.getAcademyPractice(fence),{code:'invalid_device_state'});await assert.rejects(a.changeAcademyPractice(check(2),fence),{code:'invalid_device_state'});
  assert.deepEqual(await a.listOutbox(),[]);
 }finally{db.close()}
});
test('closing Academy device scope aborts in-flight mutation and preserves previous account state',async()=>{
 const {db,a}=await setup();try{await a.changeAcademyPractice(check(),fence);const pending=a.changeAcademyPractice(check(2),fence);a.close();await assert.rejects(pending);assert.deepEqual((await db.scope(A).getAcademyPractice(fence)).value.lessons['PU-037'].checked,[0])}finally{db.close()}
});
test('corrupt Academy device identity cannot silently create an empty replacement',async()=>{
 const {indexedDB,db,a}=await setup();try{await a.changeAcademyPractice(check(),fence);
  await new Promise((resolve,reject)=>{const r=indexedDB.open('pickleup-v6');r.onsuccess=()=>{const conn=r.result,tx=conn.transaction('metadata','readwrite');tx.objectStore('metadata').put({namespace:A,key:'academy-device-id-1',value:null});tx.oncomplete=()=>{conn.close();resolve()};tx.onabort=()=>reject(tx.error)}});
  await assert.rejects(a.getAcademyPractice(fence),{code:'invalid_device_state'});await assert.rejects(a.changeAcademyPractice(check(3),fence),{code:'invalid_device_state'});
 }finally{db.close()}
});
