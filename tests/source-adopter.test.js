const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../modules/data/staging-pilot.js'),'utf8');
function load(navigator){const window={location:{href:'https://pickleup-staging.home-309.workers.dev/'},PICKLEUP_AUTH_CONFIG:{enabled:true,url:'https://rfeoeagklmaqmkcdhprb.supabase.co',publishableKey:'sb_publishable_synthetic'}};if(navigator)window.navigator=navigator;vm.runInContext(source,vm.createContext({window,URL,Promise}));return window.PickleUpStagingPilot}
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
function fixture({auto=true,navigator,settle}={}){
 const calls=[];let state={mode:'guest',owner:A,busy:false,snapshot:null},fail=null;
 const src={state:()=>state,async useAccount(){calls.push('adopt');if(fail)throw Error(fail);state={...state,mode:'account',snapshot:{cursor:{epoch:'e1'}}}},async refresh(){calls.push('read');if(fail)throw Error(fail);state={...state,snapshot:{cursor:{epoch:'e1'}}}}};
 if(settle){src.settle=s=>!s.zone;src.applySettle=async()=>{calls.push('settle');state={...state,zone:'UTC'}}}
 const a=load(navigator).adopter(src,()=>auto);
 return {a,calls,set:v=>{state={...state,...v}},get:()=>state,fail:v=>{fail=v}};
}
test('signed-in guest source is adopted once; a completed account source needs nothing',async()=>{
 const f=fixture();assert.equal(await f.a.run(),true);assert.deepEqual(f.calls,['adopt']);assert.equal(f.get().mode,'account');
 assert.equal(await f.a.run(),false);assert.equal(await f.a.run(true),false);assert.deepEqual(f.calls,['adopt']);
});
test('never acts when auto is off, signed out, busy, offline or in an error state',async()=>{
 assert.equal(await fixture({auto:false}).a.run(true),false);
 let f=fixture();f.set({owner:null});assert.equal(await f.a.run(true),false);
 f=fixture();f.set({busy:true});assert.equal(await f.a.run(true),false);
 f=fixture({navigator:{onLine:false}});assert.equal(await f.a.run(true),false);
 f=fixture();f.set({mode:'error'});assert.equal(await f.a.run(true),false);
 for(const x of [fixture({auto:false}),f])assert.deepEqual(x.calls,[]);
});
test('a failed attempt is not repeated until focus/online forces it; no retry loop',async()=>{
 const f=fixture();f.fail('offline');assert.equal(await f.a.run(),false);assert.equal(await f.a.run(),false);assert.equal(await f.a.run(),false);assert.deepEqual(f.calls,['adopt']);
 f.fail(null);assert.equal(await f.a.run(true),true);assert.deepEqual(f.calls,['adopt','adopt']);assert.equal(f.get().mode,'account');
});
test('an account source whose first read never completed is read again, then settled',async()=>{
 const f=fixture({settle:true});f.set({mode:'account',snapshot:{cursor:null}});
 assert.equal(await f.a.run(),true);assert.equal(f.calls[0],'read');
 await new Promise(setImmediate);assert.deepEqual(f.calls,['read','settle']);assert.equal(f.get().zone,'UTC');
 await new Promise(setImmediate);assert.equal(await f.a.run(true),false);assert.deepEqual(f.calls,['read','settle']);
});
test('account switch and sign-out reset the once-only memory; concurrent runs collapse',async()=>{
 const f=fixture();f.fail('x');await f.a.run();f.set({owner:B});f.fail(null);assert.equal(await f.a.run(),true);assert.deepEqual(f.calls,['adopt','adopt']);
 const g=fixture();g.fail('x');await g.a.run();g.set({owner:null});await g.a.run();g.set({owner:A});g.fail(null);assert.equal(await g.a.run(),true);
 const h=fixture(),both=await Promise.all([h.a.run(),h.a.run()]);assert.deepEqual(both.sort(),[false,true]);assert.deepEqual(h.calls,['adopt']);
});
test('schedule never throws synchronously and runs after the current task',async()=>{
 const f=fixture();f.a.schedule(false);assert.deepEqual(f.calls,[]);await new Promise(setImmediate);assert.deepEqual(f.calls,['adopt']);
});
test('adoption chains to the following needs on its own and then stops',async()=>{
 const f=fixture({settle:true});assert.equal(await f.a.run(),true);for(let i=0;i<5;i++)await new Promise(setImmediate);
 assert.deepEqual(f.calls,['adopt','settle']);assert.equal(f.get().mode,'account');
});
