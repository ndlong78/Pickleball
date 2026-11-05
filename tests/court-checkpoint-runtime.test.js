const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',P='33333333-3333-4333-8333-333333333333',E='44444444-4444-4444-8444-444444444444';
const value={schemaVersion:1,planId:P,epoch:E,index:1,remaining:610,ended:false};
async function fixture(){
 const document=new EventTarget(),events=new EventTarget();let owner=A,token=1,read=async()=>({localRevision:'1',value:structuredClone(value)}),save=async point=>({localRevision:'2',value:point}),channel;
 const source=()=>({mode:'account',owner,consent:{localRevision:'1'},projection:{selectedPlan:{id:P,acknowledged:true}},snapshot:{cursor:{epoch:E},records:[{kind:'personal_plans',id:P,localRevision:'1'},{kind:'user_selections',id:'self',localRevision:'1'}]}});
 const root={addEventListener:events.addEventListener.bind(events),PICKLEUP_PRACTICE_CLOCK:{fmt:String},PICKLEUP_PLANS:{token:()=>token,getState:source},PickleUpLocalRepository:{open:async()=>({scope:()=>({close(){},getCourtCheckpoint:(...args)=>read(...args),saveCourtCheckpoint:(...args)=>save(...args)})})},BroadcastChannel:class extends EventTarget{constructor(){super();channel=this}postMessage(){}}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../modules/data/court-checkpoint-runtime.js'),'utf8'),{window:root,document,Event,structuredClone});await new Promise(setImmediate);
 return {api:root.PICKLEUP_COURT_CHECKPOINT,read(fn){read=fn},save(fn){save=fn},change(){owner=B;token++;document.dispatchEvent(new Event('pickleup:plan-data'))},focus(){events.dispatchEvent(new Event('focus'))},notify(){channel.dispatchEvent(new MessageEvent('message',{data:{owner,planId:P}}))}};
}
test('older failed Court read cannot erase a newer acknowledged checkpoint save',async()=>{
 const f=await fixture();let reject;f.read(()=>new Promise((_,r)=>reject=r));const old=f.api.refresh();await new Promise(setImmediate);await f.api.save({planId:P,index:2,remaining:700,ended:false,running:false,deadline:null});reject(Object.assign(Error('synthetic'),{code:'storage_unavailable'}));await old;assert.equal(f.api.getState().mode,'account');assert.equal(f.api.getState().row.value.index,2);assert.equal(f.api.getState().error,null);
});
test('external checkpoint change arriving during restore cannot apply an outdated preview',async()=>{
 const f=await fixture();let finish;f.read(()=>new Promise(resolve=>finish=()=>resolve({localRevision:'1',value:structuredClone(value)})));const restoring=f.api.restore();await new Promise(setImmediate);f.notify();finish();assert.equal(await restoring,null);assert.equal(f.api.getState().stale,true);assert.equal(f.api.canRestore(),false);
});
test('completed A checkpoint save arriving after B cannot replace B memory',async()=>{
 const f=await fixture();let finish;f.save(point=>new Promise(resolve=>finish=()=>resolve({localRevision:'2',value:point})));const saving=f.api.save({planId:P,index:2,remaining:700,ended:false,running:false,deadline:null});f.read(async()=>({localRevision:'0',value:null}));f.change();await new Promise(setImmediate);finish();await saving;assert.equal(f.api.getState().owner,B);assert.equal(f.api.getState().row.value,null);
});
test('external checkpoint notification during an acknowledged local save still requires review',async()=>{
 const f=await fixture();let finish;f.save(point=>new Promise(resolve=>finish=()=>resolve({localRevision:'2',value:point})));const saving=f.api.save({planId:P,index:2,remaining:700,ended:false,running:false,deadline:null});f.notify();finish();await saving;assert.equal(f.api.getState().stale,true);assert.equal(f.api.canSave(),false);
});
test('incidental focus read preserves a quota-failed frozen checkpoint for explicit retry',async()=>{
 const f=await fixture();f.save(async()=>{throw Object.assign(Error('synthetic'),{code:'quota_exceeded'})});await f.api.save({planId:P,index:2,remaining:700,ended:false,running:false,deadline:null});f.focus();await new Promise(setImmediate);assert.equal(f.api.getState().error,'quota_exceeded');f.save(async point=>({localRevision:'2',value:point}));await f.api.retry();assert.equal(f.api.getState().row.value.index,2);
});
