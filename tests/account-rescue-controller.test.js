const {test}=require('node:test'),assert=require('node:assert/strict'),{create}=require('../modules/data/account-rescue-controller.js'),core=require('../modules/data/account-rescue-core.js');
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
function fixture(extra={}){let listener,owner=A,closed=0;const auth={subscribe(fn){listener=fn;fn({status:'authenticated',user:{id:owner}});return ()=>{}}},snapshot=()=>({owner,repositoryVersion:1,coverage:'local-cache-only',stores:Object.fromEntries(Object.keys(core.STORES).map(name=>[name,[]]))});const controller=create({auth,core,openRepository:async()=>({scope:()=>({getAccountRescueSnapshot:async()=>snapshot(),close(){closed++}}),close(){}}),...extra});return {controller,switch(){owner=B;listener({status:'authenticated',user:{id:B}})},logout(){listener({status:'guest',user:null})},closed:()=>closed}}
test('explicit capture and read-only file inspection never offer an imported file as a new device export',async()=>{
 const f=fixture();await f.controller.capture();const download=f.controller.download();assert.equal(download.owner,A);await f.controller.inspect(download.text);assert.equal(f.controller.getState().source,'file');assert.throws(()=>f.controller.download(),{code:'not_prepared'});f.controller.close();
});
test('account switch during hashing drops old prepared text and report, preserving B state',async()=>{
 let finish;const f=fixture({core:{...core,create:async s=>{await new Promise(r=>finish=r);return core.create(s)}}});const task=f.controller.capture();await new Promise(setImmediate);f.switch();finish();await assert.rejects(task,{code:'account_changed'});assert.equal(f.controller.getState().owner,B);assert.equal(f.controller.getState().report,null);assert.throws(()=>f.controller.download(),{code:'not_prepared'});assert.ok(f.closed()>0);f.controller.close();
});
test('file arriving after logout cannot publish its private inventory',async()=>{
 const f=fixture();let finish;const task=f.controller.inspect(()=>new Promise(resolve=>finish=resolve));f.logout();finish('{}');await assert.rejects(task,{code:'account_changed'});assert.equal(f.controller.getState().owner,null);assert.equal(f.controller.getState().report,null);f.controller.close();
});
test('a new failing file selection invalidates an earlier prepared device download',async()=>{
 const f=fixture();await f.controller.capture();await assert.rejects(f.controller.inspect('{bad'),{code:'invalid_json'});assert.throws(()=>f.controller.download(),{code:'not_prepared'});assert.equal(f.controller.getState().report,null);f.controller.close();
});

test('file comparison is explicit, read-only, repeatable and never prepares an imported download',async()=>{
 const restoreCore=require('../modules/data/restore-preview-core.js');let reads=0;const f=fixture({restoreCore,openRepository:async()=>({scope:()=>({async getAccountRescueSnapshot(){reads++;return {owner:A,repositoryVersion:3,coverage:'local-cache-only',stores:Object.fromEntries(Object.keys(core.STORES).map(k=>[k,[]]))}},close(){}}),close(){}})});
 const saved=await core.create({owner:A,repositoryVersion:1,coverage:'local-cache-only',stores:Object.fromEntries(Object.keys(core.STORES).map(k=>[k,[]]))});await f.controller.inspect(saved.text);assert.equal(reads,0);assert.throws(()=>f.controller.download(),{code:'not_prepared'});await f.controller.compareFile();await f.controller.compareFile();assert.equal(reads,2);assert.equal(f.controller.getState().comparison.canRestore,false);assert.equal(f.controller.getState().comparison.fileRepositoryVersion,1);assert.throws(()=>f.controller.download(),{code:'not_prepared'});await assert.rejects(f.controller.inspect('{bad'),{code:'invalid_json'});assert.equal(f.controller.getState().comparison,null);assert.throws(()=>f.controller.compareFile(),{code:'not_prepared'});f.controller.close();
});
test('late comparison snapshot after account switch cannot expose A or overwrite a new B preview',async()=>{
 const restoreCore=require('../modules/data/restore-preview-core.js');let release;const snap=owner=>({owner,repositoryVersion:3,coverage:'local-cache-only',stores:Object.fromEntries(Object.keys(core.STORES).map(k=>[k,[]]))});const f=fixture({restoreCore,openRepository:async()=>({scope:()=>({async getAccountRescueSnapshot(){await new Promise(r=>release=r);return snap(A)},close(){}}),close(){}})});const fileA=await core.create(snap(A)),fileB=await core.create(snap(B));await f.controller.inspect(fileA.text);const task=f.controller.compareFile();while(!release)await new Promise(setImmediate);f.switch();await f.controller.inspect(fileB.text);release();await assert.rejects(task,{code:'account_changed'});assert.equal(f.controller.getState().owner,B);assert.equal(f.controller.getState().comparison,null);assert.equal(f.controller.getState().source,'file');f.controller.close();
});
test('comparison storage failure clears the selected file and report instead of reusing stale evidence',async()=>{
 const f=fixture({restoreCore:require('../modules/data/restore-preview-core.js'),openRepository:async()=>{throw Object.assign(Error(),{code:'storage_unavailable'})}});const saved=await core.create({owner:A,repositoryVersion:3,coverage:'local-cache-only',stores:Object.fromEntries(Object.keys(core.STORES).map(k=>[k,[]]))});await f.controller.inspect(saved.text);await assert.rejects(f.controller.compareFile(),{code:'storage_unavailable'});assert.equal(f.controller.getState().comparison,null);assert.equal(f.controller.getState().report,null);assert.throws(()=>f.controller.compareFile(),{code:'not_prepared'});f.controller.close();
});

// ---- 2b/2c: restore plan and one-by-one re-queueing ----
const planCore=require('../modules/data/restore-plan-core.js'),U=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const blankSnap=(owner=A,version=3)=>({owner,repositoryVersion:version,coverage:'local-cache-only',stores:Object.fromEntries(Object.keys(core.STORES).map(k=>[k,[]]))});
const ns='user:'+A,prefOp=(n,extra={})=>({namespace:ns,operationId:U(n),kind:'user_preferences',id:'self',action:'put',payload:{target_days:4,level_band:'3.0–3.5',session_minutes:45,gentle:false,goal_configured:true},state:'pending',protocol:1,dependsOn:null,expectedRevision:'0',...extra});
async function planFixture({fileOps=[],deviceOps=[],restorer}={}){
 const file=blankSnap();file.stores.outbox=fileOps;const device=blankSnap();device.stores.outbox=deviceOps;let reads=0;
 const f=fixture({planCore,restorer,openRepository:async()=>({scope:()=>({async getAccountRescueSnapshot(){reads++;return structuredClone(device)},close(){}}),close(){}})});
 const saved=await core.create(file);await f.controller.inspect(saved.text);return {...f,reads:()=>reads};
}
test('planRestore is explicit and read-only, exposes no ids or payloads, and keeps the chosen file for later items',async()=>{
 const f=await planFixture({fileOps:[prefOp(1),prefOp(2,{state:'acked'}),{...prefOp(3),kind:'academy_attempts',id:'abc'}]});
 assert.equal(f.controller.getState().plan,null);assert.equal(f.reads(),0);
 await f.controller.planRestore();const plan=f.controller.getState().plan;assert.equal(f.reads(),1);
 assert.deepEqual(plan.items.map(i=>[i.kind,i.restorable,i.status]),[['user_preferences',true,null],['academy_attempts',false,null]]);
 assert.deepEqual(plan.summary.excluded,[{code:'settled',count:1}]);
 const shown=JSON.stringify(f.controller.getState().plan);for(const bad of [U(1),'abc','target_days',ns,A,'self'])assert.equal(shown.includes(bad),false,bad);
 assert.throws(()=>f.controller.download(),{code:'not_prepared'});
 await f.controller.planRestore();assert.equal(f.reads(),2);f.controller.close();
});
test('planRestore needs a prepared file and marks items with unsent device changes as not restorable',async()=>{
 const f0=fixture();await assert.rejects(async()=>f0.controller.planRestore(),{code:'not_prepared'});f0.controller.close();
 const f=await planFixture({fileOps:[prefOp(1)],deviceOps:[prefOp(9,{state:'pending'})]});await f.controller.planRestore();
 const [item]=f.controller.getState().plan.items;assert.deepEqual([item.restorable,item.warnings],[false,['device_has_unsent_change']]);
 await assert.rejects(()=>f.controller.restoreItem(0),{code:'not_prepared'});f.controller.close();
});
test('restoreItem hands one exact operation to the restorer, records the outcome and refuses a second try',async()=>{
 const calls=[];const restorer={async restoreIntent(arg){calls.push(arg);return {status:'queued',action:'put'}}};
 const f=await planFixture({fileOps:[prefOp(1),prefOp(2,{id:'self',payload:{target_days:5,level_band:'3.0–3.5',session_minutes:45,gentle:false,goal_configured:true}})],restorer});
 await f.controller.planRestore();
 assert.deepEqual(await f.controller.restoreItem(0),{status:'queued'});
 assert.equal(calls.length,1);assert.equal(calls[0].kind,'user_preferences');assert.equal(calls[0].id,'self');assert.equal(calls[0].op.operationId,U(1));assert.equal(calls[0].op.payload.target_days,4);
 const st=f.controller.getState();assert.equal(st.busy,false);assert.deepEqual(st.plan.items.map(i=>i.status),['queued',null]);
 await assert.rejects(()=>f.controller.restoreItem(0),{code:'not_prepared'});await assert.rejects(()=>f.controller.restoreItem(7),{code:'not_prepared'});await assert.rejects(()=>f.controller.restoreItem('0'),{code:'not_prepared'});
 assert.equal(calls.length,1);assert.equal(JSON.stringify(st.plan).includes(U(1)),false);f.controller.close();
});
test('restoreItem records fixed outcome codes for refusals and failures, never raw messages, and keeps going afterwards',async()=>{
 const outcomes=[{code:'restore_record_changed'},{code:'offline'},{code:'something_private_424242'}];let i=0;
 const restorer={async restoreIntent(){const e=new Error('secret detail');e.code=outcomes[i++].code;throw e}};
 const f=await planFixture({fileOps:[prefOp(1),prefOp(2),prefOp(3)],restorer});await f.controller.planRestore();
 for(const n of [0,1,2])await assert.rejects(()=>f.controller.restoreItem(n));
 assert.deepEqual(f.controller.getState().plan.items.map(x=>x.status),['blocked:record_changed','failed:offline','failed:unknown']);assert.equal(f.controller.getState().busy,false);
 assert.equal(JSON.stringify(f.controller.getState().plan).includes('secret'),false);f.controller.close();
});
test('restoreItem cannot run twice at once, without a restorer, or after the account changed',async()=>{
 let release;const restorer={restoreIntent(){return new Promise(r=>release=r)}};
 const f=await planFixture({fileOps:[prefOp(1),prefOp(2)],restorer});await f.controller.planRestore();
 const first=f.controller.restoreItem(0);await assert.rejects(()=>f.controller.restoreItem(1),{code:'not_prepared'});f.switch();release({status:'queued'});await assert.rejects(first,{code:'account_changed'});
 assert.equal(f.controller.getState().owner,B);assert.equal(f.controller.getState().plan,null);await assert.rejects(()=>f.controller.restoreItem(0),{code:'not_prepared'});f.controller.close();
 const g=await planFixture({fileOps:[prefOp(1)],restorer:null});await g.controller.planRestore();await assert.rejects(()=>g.controller.restoreItem(0),{code:'unavailable'});g.controller.close();
});
