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
