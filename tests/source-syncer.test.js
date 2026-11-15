const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../modules/data/staging-pilot.js'),'utf8');
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
// Deterministic clock and timers: run(ms) advances time and fires due timers in order.
function fixture({auto=true,online=true,results=[]}={}){
 let t=0,seq=0;const timers=new Map(),navigator={onLine:online};
 const window={location:{href:'https://pickleup-staging.home-309.workers.dev/'},PICKLEUP_AUTH_CONFIG:{enabled:true,url:'https://rfeoeagklmaqmkcdhprb.supabase.co',publishableKey:'sb_publishable_synthetic'},navigator};
 vm.runInContext(source,vm.createContext({window,URL,Promise,Math,Date}));
 const calls=[];let state={mode:'account',owner:A,busy:false,snapshot:{cursor:{epoch:'e'},outbox:[]}};
 const src={state:()=>state,async sync(){calls.push(t);const r=results.length?results.shift():'synced';if(r instanceof Error)throw r;if(r==='synced')state={...state,snapshot:{...state.snapshot,outbox:[]}};return {status:r}}};
 const s=window.PickleUpStagingPilot.syncer(src,()=>auto,{setTimer:(fn,ms)=>{const id=++seq;timers.set(id,{at:t+ms,fn});return id},clearTimer:id=>timers.delete(id),now:()=>t,debounce:1000,base:5000,max:300000});
 async function advance(ms){const end=t+ms;for(;;){const next=[...timers.entries()].filter(([,x])=>x.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;timers.delete(next[0]);t=next[1].at;next[1].fn();for(let i=0;i<5;i++)await new Promise(setImmediate)}t=end}
 const queue=(n=1,st='pending')=>{state={...state,snapshot:{...state.snapshot,outbox:Array.from({length:n},(_,i)=>({operationId:'op'+i,state:st}))}}};
 return {s,calls,advance,queue,set:v=>{state={...state,...v}},navigator,timers,get:()=>state};
}
test('a local change is sent once after the debounce, not immediately and not twice',async()=>{
 const f=fixture();f.queue(2);f.s.changed();f.s.changed();f.s.changed();assert.deepEqual(f.calls,[]);
 await f.advance(999);assert.deepEqual(f.calls,[]);await f.advance(1);assert.deepEqual(f.calls,[1000]);
 f.s.changed();await f.advance(60000);assert.deepEqual(f.calls,[1000]);assert.equal(f.timers.size,0);
});
test('nothing is sent when auto is off, signed out, device source, busy, offline, before the first read, or with an empty queue',async()=>{
 for(const [opts,patch] of [[{auto:false},{}],[{},{owner:null}],[{},{mode:'guest'}],[{},{busy:true}],[{online:false},{}],[{},{snapshot:{cursor:null,outbox:[{state:'pending'}]}}]]){
  const f=fixture(opts);f.queue(1);f.set(patch);f.s.changed();f.s.wake();await f.advance(600000);assert.deepEqual(f.calls,[],JSON.stringify([opts,patch]));assert.equal(await f.s.run(),'idle');
 }
 const f=fixture();f.s.changed();await f.advance(600000);assert.deepEqual(f.calls,[]);
});
test('only unsent operations count: uncertain, conflicted, blocked and settled ones never trigger a send',async()=>{
 for(const st of ['sending','conflict','blocked','acked','resolved']){const f=fixture();f.queue(3,st);f.s.changed();await f.advance(600000);assert.deepEqual(f.calls,[],st)}
 const f=fixture();f.queue(1,'deferred');f.s.changed();await f.advance(1000);assert.equal(f.calls.length,1);
});
test('failures back off exponentially up to the cap and stop hammering; success clears the backoff',async()=>{
 const f=fixture({results:['network_error','network_error','network_error','network_error','synced']});f.queue(1);f.s.changed();
 await f.advance(1000);assert.deepEqual(f.calls,[1000]);
 for(let i=0;i<20;i++)f.s.changed();await f.advance(4999);assert.deepEqual(f.calls,[1000]);
 await f.advance(1);assert.deepEqual(f.calls,[1000,6000]);
 await f.advance(10000);assert.deepEqual(f.calls,[1000,6000,16000]);
 await f.advance(20000);assert.deepEqual(f.calls,[1000,6000,16000,36000]);
 await f.advance(40000);assert.deepEqual(f.calls,[1000,6000,16000,36000,76000]);
 f.queue(1);f.s.changed();await f.advance(1000);assert.equal(f.calls.length,6);assert.equal(f.calls[5],77000);
 const g=fixture({results:Array(12).fill('unavailable')});g.queue(1);g.s.changed();await g.advance(3600000);
 const gaps=g.calls.slice(1).map((x,i)=>x-g.calls[i]);assert.equal(Math.max(...gaps),300000);assert.ok(g.calls.length<=18,'bounded number of attempts in an hour: '+g.calls.length);
});
test('needs_review, busy, auth and thrown errors are all backed off; pending continues promptly',async()=>{
 for(const r of ['needs_review','busy','auth_required','retry_wait',Object.assign(Error('x'),{code:'offline'}),Error('boom')]){
  const f=fixture({results:[r,r,r]});f.queue(1);f.s.changed();await f.advance(1000);for(let i=0;i<10;i++)f.s.changed();await f.advance(4000);assert.equal(f.calls.length,1,String(r));await f.advance(1000);assert.equal(f.calls.length,2);
 }
 const f=fixture({results:['pending','pending','synced']});f.queue(5);f.s.changed();await f.advance(3000);assert.deepEqual(f.calls,[1000,2000,3000]);
});
test('focus/online clears the backoff; an account switch resets it and never sends for a signed-out state',async()=>{
 const f=fixture({results:['network_error','synced']});f.queue(1);f.s.changed();await f.advance(1000);f.s.wake();await f.advance(1000);assert.deepEqual(f.calls,[1000,2000]);
 const g=fixture({results:['network_error','network_error','network_error','synced']});g.queue(1);g.s.changed();await g.advance(1000+5000+10000);assert.equal(g.calls.length,3);
 g.set({owner:B});g.queue(1);g.s.changed();await g.advance(1000);assert.equal(g.calls.length,4,'B is not held back by A failures');
 const h=fixture();h.queue(1);h.s.changed();h.set({owner:null,mode:'guest'});await h.advance(600000);assert.deepEqual(h.calls,[]);
});
test('a send in progress is not started twice and stop() cancels the pending timer',async()=>{
 const f=fixture();f.queue(1);let release;const slow=f.get();const s2=fixture();
 const src={state:()=>slow,sync:()=>new Promise(r=>{release=r})};const pilot=(()=>{const window={location:{href:'https://pickleup-staging.home-309.workers.dev/'},PICKLEUP_AUTH_CONFIG:{enabled:true,url:'https://rfeoeagklmaqmkcdhprb.supabase.co',publishableKey:'sb_publishable_synthetic'}};vm.runInContext(source,vm.createContext({window,URL,Promise,Math,Date}));return window.PickleUpStagingPilot})();
 const s=pilot.syncer(src,()=>true,{setTimer:()=>1,clearTimer:()=>{},now:()=>0});const first=s.run();assert.equal(await s.run(),'running');release({status:'synced'});assert.equal(await first,'synced');
 s2.queue(1);s2.s.changed();s2.s.stop();await s2.advance(600000);assert.deepEqual(s2.calls,[]);
});
