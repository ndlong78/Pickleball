const {test}=require('node:test'),assert=require('node:assert/strict'),rescue=require('../modules/data/account-rescue-core.js'),{plan,EXCLUDED}=require('../modules/data/restore-plan-core.js');
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',ns='user:'+A;
const u=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const blank=(version=3)=>({owner:A,repositoryVersion:version,coverage:'local-cache-only',stores:Object.fromEntries(Object.keys(rescue.STORES).map(k=>[k,[]]))});
const op=(n,extra={})=>({namespace:ns,operationId:u(n),kind:'user_preferences',id:'pref-'+n,action:'put',payload:{secret_note:'private '+n},state:'pending',protocol:1,dependsOn:null,...extra});
const run=(file,device=blank())=>plan(file,device,{expectedOwner:A});
const ids=r=>r.items.map(i=>i.operationId);
test('offers only unfinished operations that are missing from the device',()=>{
 const f=blank();f.stores.outbox=[op(1),op(2,{state:'deferred'}),op(3,{state:'blocked'}),op(4,{state:'conflict'}),op(5,{state:'acked'}),op(6,{state:'resolved'}),op(7)];
 const d=blank();d.stores.outbox=[op(7,{state:'acked'})];
 const r=run(f,d);assert.deepEqual(ids(r),[u(1),u(2),u(3),u(4)]);
 assert.deepEqual(Object.fromEntries(r.summary.excluded.map(e=>[e.code,e.count])),{settled:2,already_on_device:1});
 assert.equal(r.canRestore,false);assert.equal(r.cloudVerified,false);assert.equal(r.summary.candidates,4);
});
test('same operationId on the device in any state is never offered again',()=>{
 for(const state of ['pending','sending','acked','resolved','blocked']){const f=blank(),d=blank();f.stores.outbox=[op(1)];d.stores.outbox=[op(1,{state})];assert.deepEqual(ids(run(f,d)),[],state)}
});
test('sending is offered but marked uncertain; device changes on the same record are flagged',()=>{
 const f=blank(),d=blank();f.stores.outbox=[op(1,{state:'sending'}),op(2,{id:'shared'}),op(3,{id:'shared2'})];
 d.stores.outbox=[op(90,{id:'shared',state:'pending'})];d.stores.conflicts=[{namespace:ns,conflictId:u(91),kind:'user_preferences',id:'shared2',state:'open'}];
 const r=run(f,d),by=Object.fromEntries(r.items.map(i=>[i.operationId,i.warnings]));
 assert.deepEqual(by[u(1)],['uncertain_send']);assert.deepEqual(by[u(2)],['device_has_unsent_change']);assert.deepEqual(by[u(3)],['device_has_open_conflict']);
 assert.equal(r.summary.withWarnings,3);assert.deepEqual(r.summary.warnings,{uncertain_send:1,device_has_unsent_change:1,device_has_open_conflict:1});
});
test('a settled device change on the same record is not a warning',()=>{
 const f=blank(),d=blank();f.stores.outbox=[op(1,{id:'x'})];d.stores.outbox=[op(2,{id:'x',state:'acked'})];assert.deepEqual(run(f,d).items[0].warnings,[]);
});
test('invalid, foreign-kind, unsupported-protocol and unknown-state operations are excluded with fixed codes',()=>{
 const f=blank();f.stores.outbox=[op(1,{operationId:'not-a-uuid'}),op(2,{kind:'secrets'}),op(3,{protocol:2}),op(4,{state:'future-state'}),op(5,{action:'nuke'}),op(6,{id:''}),op(7)];
 const r=run(f);assert.deepEqual(ids(r),[u(7)]);assert.deepEqual(Object.fromEntries(r.summary.excluded.map(e=>[e.code,e.count])),{invalid_operation:4,unknown_kind:1,unsupported_protocol:1});
});
test('dependencies: ordered, settled ones allowed, missing/excluded/cyclic ones dropped with their dependents',()=>{
 const f=blank();f.stores.outbox=[
  op(3,{dependsOn:u(2),state:'deferred'}),op(2,{dependsOn:u(1),state:'deferred'}),op(1),
  op(10,{dependsOn:u(11)}),op(11,{state:'acked'}),
  op(20,{dependsOn:u(99),state:'deferred'}),
  op(30,{dependsOn:u(31),state:'deferred'}),op(31,{dependsOn:u(30),state:'deferred'}),
  op(40,{dependsOn:u(41),state:'deferred'}),op(41,{kind:'secrets'}),
  op(50,{dependsOn:'garbage',state:'deferred'})];
 const r=run(f);assert.deepEqual(ids(r).sort(),[u(1),u(2),u(3),u(10)]);
 // every offered operation comes after the offered operation it depends on, and the order is deterministic
 const at=new Map(ids(r).map((id,i)=>[id,i]));for(const i of r.items)if(i.dependsOn)assert.ok(at.get(i.dependsOn)<at.get(i.operationId));
 assert.deepEqual(Object.fromEntries(r.items.map(i=>[i.operationId,i.dependsOn])),{[u(1)]:null,[u(2)]:u(1),[u(3)]:u(2),[u(10)]:null});
 assert.deepEqual(ids(run(f)),ids(r));
 assert.deepEqual(Object.fromEntries(r.summary.excluded.map(e=>[e.code,e.count])),{settled:1,unknown_kind:1,dependency_missing:2,dependency_excluded:1,dependency_cycle:2});
});
test('a dependency that is already on the device keeps the dependent offerable',()=>{
 const f=blank(),d=blank();f.stores.outbox=[op(1),op(2,{dependsOn:u(1),state:'deferred'})];d.stores.outbox=[op(1,{state:'pending'})];
 const r=run(f,d);assert.deepEqual(ids(r),[u(2)]);assert.equal(r.items[0].dependsOn,null);
});
test('plan never mutates its inputs and exposes no payloads, notes or private strings in its summary',()=>{
 const f=blank(),d=blank();f.stores.outbox=[op(1),op(2,{state:'sending'})];f.stores.metadata=[{namespace:ns,key:'private-key',value:'private note'}];
 const saved=JSON.stringify([f,d]),r=run(f,d);assert.equal(JSON.stringify([f,d]),saved);
 const s=JSON.stringify(r.summary);for(const bad of ['private','pref-','secret_note',A,u(1)])assert.equal(s.includes(bad),false,bad);
 for(const item of r.items)assert.deepEqual(Object.keys(item).sort(),['action','dependsOn','id','kind','operationId','state','warnings']);
});
test('other stores in the file are ignored: only outbox rows can become proposals',()=>{
 const f=blank();f.stores.records=[{namespace:ns,kind:'user_preferences',id:'x',tailOperationId:u(1)}];f.stores.sync_cursor=[{namespace:ns,protocol:1,epoch:u(5)}];
 f.stores.device_state=[{namespace:ns,deviceId:u(6),key:'timer'}];f.stores.metadata=[{namespace:ns,key:'activity-consent-1',enabled:true}];
 const r=run(f);assert.deepEqual(r.items,[]);assert.equal(r.summary.candidates,0);
});
test('repository versions 1, 2 and 3 are accepted and reported',()=>{
 for(const v of [1,2,3]){const f=blank(v);f.stores.outbox=[op(1)];const r=run(f);assert.equal(r.fileRepositoryVersion,v);assert.equal(r.items.length,1)}
});
test('rejects missing account, foreign owner, credentials, duplicate keys and oversized input',()=>{
 const f=blank();assert.throws(()=>plan(f,f),{code:'auth_required'});assert.throws(()=>plan(f,f,{expectedOwner:'nope'}),{code:'auth_required'});assert.throws(()=>plan(f,f,{expectedOwner:B}),{code:'foreign_account'});
 const c=blank();c.stores.outbox=[op(1,{payload:{refresh_token:'synthetic'}})];assert.throws(()=>run(c),{code:'credentials_detected'});
 const dup=blank();dup.stores.outbox=[op(1),op(1)];assert.throws(()=>run(dup),{code:'duplicate_key'});
 const foreign=blank();foreign.stores.outbox=[op(1,{namespace:'user:'+B})];assert.throws(()=>run(foreign),{code:'foreign_account'});
 assert.throws(()=>run(blank(),{...blank(),owner:B}),{code:'foreign_account'});
});
test('every exclusion code in the summary is from the fixed list',()=>{
 const f=blank();f.stores.outbox=[op(1,{state:'acked'}),op(2,{kind:'x'}),op(3,{dependsOn:u(9),state:'deferred'})];
 for(const e of run(f).summary.excluded)assert.ok(EXCLUDED.includes(e.code));
});
