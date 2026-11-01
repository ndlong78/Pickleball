const {test}=require('node:test'),assert=require('node:assert/strict');
const {IDBFactory,IDBObjectStore}=require('fake-indexeddb');
const repository=require('../modules/data/local-repository.js'),controller=require('../modules/data/pull-controller.js');
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',E='33333333-3333-4333-8333-333333333333',F='44444444-4444-4444-8444-444444444444';
const prefs=(revision='1',days=2)=>({user_id:A,revision,deleted_at:null,target_days:days,gentle:false});
const checkin=(revision='1',deleted_at=null)=>({user_id:A,revision,deleted_at,local_date:'2026-01-01',status:deleted_at?null:'done',minutes:deleted_at?null:30,lesson_id:null,timezone_at_entry:'UTC'});
const change=(n,kind='user_preferences',row=prefs(),key='self')=>({server_revision:String(n),entity_kind:kind,entity_key:key,record_revision:row.revision,row});
const page=(changes,high='1',epoch=E,next=changes.at(-1)?.server_revision||'0')=>({status:'ok',changes,high_water:high,epoch,next_revision:next,has_more:BigInt(next)<BigInt(high)});
async function fixture(handler,options={}){
 const indexedDB=new IDBFactory(),db=await repository.open({indexedDB}),calls=[];let listener;
 const auth={subscribe(fn){listener=fn;fn({user:{id:A}});return ()=>{}},async importRpc(owner,name,args){calls.push({owner,name,args});return handler(args,calls.length)}};
 const pull=controller.create({auth,repository:db,owner:A,enabled:()=>true,...options}),scope=db.scope('user:'+A);
 return {db,pull,scope,calls,auth,indexedDB,switchAccount:()=>listener({user:{id:B}}),close(){pull.close();db.close()}};
}
test('bounded bootstrap freezes H across pages and caches only preferences/checkins without inventing attendance',async()=>{
 const event={user_id:A,revision:'1',id:F,deleted_at:null,score:8};
 const f=await fixture((args)=>args.p_after_revision==='0'?page([change(1),change(2,'academy_attempts',event,F)],'3'):page([change(3,'practice_checkins',checkin(),'2026-01-01')],'3'),{pageSize:2});
 try{
  const result=await f.pull.pull();assert.equal(result.records,2);assert.equal(result.cursor.afterRevision,'3');
  assert.deepEqual(f.calls.map(c=>[c.args.p_after_revision,c.args.p_high_water,c.args.p_epoch]),[['0',null,null],['2','3',E]]);
  assert.equal((await f.scope.read('practice_checkins','2026-01-01')).base.minutes,30);assert.equal(await f.scope.read('academy_attempts',F),undefined);assert.deepEqual(await f.scope.listOutbox(),[]);
 }finally{f.close()}
});
test('delta keeps optimistic intent, frozen outbox and original conflict base; further offline edits retain review metadata',async()=>{
 let remote=page([change(1)]);const f=await fixture(()=>remote);
 try{
  await f.pull.pull();const before=await f.scope.read('user_preferences','self');
  await f.scope.write({kind:'user_preferences',id:'self',value:{target_days:4},operationId:F,expectedLocalRevision:before.localRevision});const queue=JSON.stringify(await f.scope.listOutbox());
  remote=page([change(2,'user_preferences',prefs('2',3))],'2');await f.pull.pull();
  const row=await f.scope.read('user_preferences','self');assert.equal(row.base.target_days,3);assert.deepEqual(row.overlay,{...before.base,target_days:4});assert.equal(row.reviewRequired,true);assert.equal(row.reviewBase.row.target_days,2);assert.equal(row.reviewReason,'remote_changed');assert.equal(JSON.stringify(await f.scope.listOutbox()),queue);
  await f.scope.write({kind:'user_preferences',id:'self',value:{gentle:true},operationId:E,expectedLocalRevision:row.localRevision});const edited=await f.scope.read('user_preferences','self');assert.equal(edited.reviewRequired,true);assert.deepEqual(edited.reviewBase,row.reviewBase);assert.equal((await f.scope.listOutbox()).find(o=>o.operationId===E).dependsOn,F);
 }finally{f.close()}
});
test('reset_required atomically replaces bases, preserves pending and device state, and distinguishes absence from tombstone',async()=>{
 let reset=false;const f=await fixture(args=>!reset?page([change(1),change(2,'practice_checkins',checkin(),'2026-01-01')],'2'):args.p_epoch?{status:'reset_required'}:page([],'0',null));
 try{
  await f.pull.pull();await f.scope.write({kind:'user_preferences',id:'self',value:{target_days:4},operationId:F,expectedLocalRevision:'1'});await f.scope.setDeviceState(F,'focus',{index:2});const queue=JSON.stringify(await f.scope.listOutbox());reset=true;
  const result=await f.pull.pull();assert.equal(result.reset,true);assert.equal(result.cursor.epoch,null);assert.equal(result.cursor.afterRevision,'0');
  const pending=await f.scope.read('user_preferences','self'),absent=await f.scope.read('practice_checkins','2026-01-01');assert.equal(pending.base,null);assert.equal(pending.reviewReason,'reset_required');assert.deepEqual(pending.overlay,{...prefs(),target_days:4});assert.equal(pending.baseMissing,true);assert.equal(absent.baseMissing,true);assert.equal(absent.deleted,false);assert.equal(JSON.stringify(await f.scope.listOutbox()),queue);assert.equal((await f.scope.getDeviceState(F,'focus')).value.index,2);
  await f.scope.write({kind:'practice_checkins',id:'2026-01-01',operationId:E,value:{status:'skipped',minutes:null},expectedLocalRevision:absent.localRevision});assert.equal((await f.scope.listOutbox()).find(o=>o.operationId===E).expectedRevision,'0');
 }finally{f.close()}
});
test('tombstone is cached with revision and cannot be revived by ordinary put',async()=>{
 const f=await fixture(()=>page([change(1,'practice_checkins',checkin('7','2026-01-02T00:00:00Z'),'2026-01-01')]));
 try{await f.pull.pull();const row=await f.scope.read('practice_checkins','2026-01-01');assert.equal(row.baseRevision,'7');assert.equal(row.deleted,true);await assert.rejects(f.scope.write({kind:'practice_checkins',id:'2026-01-01',value:{status:'done',minutes:30},operationId:F,expectedLocalRevision:row.localRevision}),{code:'explicit_restore_required'})}finally{f.close()}
});
test('network loss on a later page leaves cursor/base unchanged; explicit retry restarts complete cycle',async()=>{
 let broken=true;const f=await fixture(args=>args.p_after_revision==='0'?page([change(1)],'2'):broken?{status:'network_error'}:page([change(2,'user_preferences',prefs('2',3))],'2'),{pageSize:1});
 try{await assert.rejects(f.pull.pull(),{code:'network_error'});assert.equal(await f.scope.getSyncCursor(),undefined);assert.equal(await f.scope.read('user_preferences','self'),undefined);broken=false;await f.pull.pull();assert.equal(f.calls[2].args.p_after_revision,'0');assert.equal((await f.scope.read('user_preferences','self')).base.target_days,3)}finally{f.close()}
});
test('page/byte caps reject the whole cycle without truncating or advancing a cursor',async()=>{
 for(const options of [{pageSize:1,maxPages:1},{maxBytes:10}]){const f=await fixture(()=>page([change(1)],'2'),options);try{await assert.rejects(f.pull.pull(),{code:'pull_limit'});assert.equal(await f.scope.getSyncCursor(),undefined);assert.equal(await f.scope.read('user_preferences','self'),undefined)}finally{f.close()}}
});
test('invalid pagination, owner, bigint, kind or changing snapshot token never commits',async()=>{
 const cases=[page([change(2)],'2'),page([change(1,'user_preferences',{...prefs(),user_id:B})]),page([change(1,'user_preferences',{...prefs(),revision:1})]),page([change(1,'unknown')]),{...page([change(1)]),next_revision:'0'},{...page([change(1)]),has_more:true}];
 for(const response of cases){const f=await fixture(()=>response);try{await assert.rejects(f.pull.pull(),{code:'invalid_response'});assert.equal(await f.scope.getSyncCursor(),undefined)}finally{f.close()}}
 const f=await fixture(args=>args.p_after_revision==='0'?page([change(1)],'2'):page([change(2,'user_preferences',prefs('2'))],'3',F),{pageSize:1});try{await assert.rejects(f.pull.pull(),{code:'invalid_response'});assert.equal(await f.scope.getSyncCursor(),undefined)}finally{f.close()}
});
test('concurrent late pull cannot overwrite a newer canonical snapshot/cursor',async()=>{
 const releases=[];const f=await fixture(()=>new Promise(resolve=>releases.push(resolve)));const second=controller.create({auth:f.auth,repository:f.db,owner:A,enabled:()=>true});
 try{const old=f.pull.pull(),newer=second.pull();while(releases.length<2)await new Promise(r=>setTimeout(r,0));releases[1](page([change(1),change(2,'user_preferences',prefs('2',5))],'2'));await newer;releases[0](page([change(1)]));await assert.rejects(old,{code:'cursor_conflict'});assert.equal((await f.scope.read('user_preferences','self')).base.target_days,5);assert.equal((await f.scope.getSyncCursor()).afterRevision,'2')}finally{second.close();f.close()}
});
test('A→B invalidates delayed A response; disabled pull performs no network or cache writes',async()=>{
 let resolve;const f=await fixture(()=>new Promise(r=>resolve=r));
 try{const work=f.pull.pull();while(!resolve)await new Promise(r=>setTimeout(r,0));await assert.rejects(f.pull.pull(),{code:'busy'});f.switchAccount();resolve(page([change(1)]));await assert.rejects(work,{code:'account_changed'});assert.equal(await f.db.scope('user:'+A).getSyncCursor(),undefined);assert.equal(await f.db.scope('user:'+B).getSyncCursor(),undefined)}finally{f.close()}
 for(const value of [false,'false',Promise.resolve(true)]){const off=await fixture(()=>{throw Error('must not call')},{enabled:()=>value});try{await assert.rejects(off.pull.pull(),{code:'pilot_disabled'});assert.equal(off.calls.length,0);assert.throws(()=>controller.create({auth:off.auth,repository:off.db,owner:A,enabled:true}),{code:'invalid_options'})}finally{off.close()}}
});
test('quota failure on cursor put rolls back preceding base writes and preserves the exact pending queue',async()=>{
 const f=await fixture(()=>page([change(1)]));const original=IDBObjectStore.prototype.put;
 try{await f.scope.write({kind:'user_preferences',id:'self',operationId:F,value:{target_days:4}});const before=await f.scope.read('user_preferences','self'),queue=await f.scope.listOutbox();
  IDBObjectStore.prototype.put=function(...args){if(this.name==='sync_cursor')throw new DOMException('synthetic','QuotaExceededError');return original.apply(this,args)};
  await assert.rejects(f.pull.pull(),{code:'quota_exceeded'});IDBObjectStore.prototype.put=original;
  assert.deepEqual(await f.scope.read('user_preferences','self'),before);assert.deepEqual(await f.scope.listOutbox(),queue);assert.equal(await f.scope.getSyncCursor(),undefined);
 }finally{IDBObjectStore.prototype.put=original;f.close()}
});
test('bigint cursors stay decimal strings beyond 2^53 and guest snapshot apply is denied',async()=>{
 const n='9007199254740993',next='9007199254740994';const f=await fixture(()=>page([change(next,'user_preferences',prefs(next,4))],next));
 try{await f.scope.applyCanonicalSnapshot({rows:[],afterRevision:n,epoch:E});await f.pull.pull();assert.equal(f.calls[0].args.p_after_revision,n);assert.equal((await f.scope.getSyncCursor()).afterRevision,next);await assert.rejects(f.db.scope('guest:'+B).applyCanonicalSnapshot({rows:[],afterRevision:'0',epoch:null}),{code:'auth_required'})}finally{f.close()}
});
test('full reset retries only once and kill switch during read discards the complete response',async()=>{
 const f=await fixture(()=>({status:'reset_required'}));try{await assert.rejects(f.pull.pull(),{code:'reset_required'});assert.equal(f.calls.length,2);assert.equal(await f.scope.getSyncCursor(),undefined)}finally{f.close()}
 let allowed=true;const off=await fixture(()=>{allowed=false;return page([change(1)])},{enabled:()=>allowed});try{await assert.rejects(off.pull.pull(),{code:'pilot_disabled'});assert.equal(await off.scope.getSyncCursor(),undefined)}finally{off.close()}
});

test('changed cache coverage policy forces bootstrap instead of skipping prior domain history',async()=>{
 const f=await fixture(()=>page([change(1)]));
 try{
  await f.pull.pull();const cursor=await f.scope.getSyncCursor();
  const raw=await new Promise((resolve,reject)=>{const req=f.indexedDB.open('pickleup-v6');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
  try{await new Promise((resolve,reject)=>{const tx=raw.transaction('sync_cursor','readwrite');tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);tx.objectStore('sync_cursor').put({...cursor,policy:'previous-domain-coverage'})})}finally{raw.close()}
  const result=await f.pull.pull();assert.equal(result.reset,true);assert.equal(f.calls[1].args.p_after_revision,'0');assert.equal(f.calls[1].args.p_epoch,null);assert.equal(result.cursor.policy,'preferences-checkins-1');assert.equal(result.cursor.localVersion,'2');
 }finally{f.close()}
});
