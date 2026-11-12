const {test}=require('node:test'),assert=require('node:assert/strict'),{create}=require('../modules/data/cache-maintenance-host.js');
const cache='pickleup-shell-v5-18-0-stable',location={href:'https://fixture.invalid/Pickleball/?page=settings'};
function fixture(options={}){const calls=[],statuses={},worker={scriptURL:'https://fixture.invalid/Pickleball/sw.js',postMessage(data,ports){calls.push(data.action);if(options.drop)return;setImmediate(()=>ports[0].postMessage({protocol:1,nonce:data.nonce,cache:options.replyCache||cache,status:statuses[data.action]||'ok'}))}},reg={active:worker},navigator={serviceWorker:{controller:worker,getRegistration:async()=>reg}};return {worker,reg,navigator,calls,statuses,host:create({navigator,location,cache,interval:60000,...options})}}
test('normal Auth works without a worker; maintenance requires current controlled worker',async()=>{
 const host=create({navigator:{},location,cache});await host.authGate();await assert.rejects(host.acquire(),{code:'worker_required'});const f=fixture();f.navigator.serviceWorker.controller=null;await f.host.authGate();await assert.rejects(f.host.acquire(),{code:'upgrade_required'});f.worker.scriptURL='https://fixture.invalid/sw.js';await f.host.authGate();await assert.rejects(f.host.acquire(),{code:'upgrade_required'});f.worker.scriptURL='https://fixture.invalid/other/sw.js';await assert.rejects(f.host.authGate(),{code:'upgrade_required'});
});
test('lease verifies ownership and always releases its heartbeat/channel resources',async()=>{
 const f=fixture();const lease=await f.host.acquire();await lease.verify();await lease.release();await assert.rejects(lease.verify(),{code:'lease_lost'});assert.deepEqual(f.calls,['begin','renew','end']);
});
test('busy, old, silent and rejected worker replies fail closed',async()=>{
 const f=fixture();f.statuses.status='maintenance_busy';await assert.rejects(f.host.authGate(),{code:'maintenance_busy'});f.statuses.begin='multiple_tabs';await assert.rejects(f.host.acquire(),{code:'multiple_tabs'});const old=fixture({replyCache:'old'});await assert.rejects(old.host.authGate(),{code:'upgrade_required'});const silent=fixture({drop:true,timeout:20});await assert.rejects(silent.host.authGate(),{code:'worker_unavailable'});
});
test('Auth retries only after observing an actual worker replacement during update',async()=>{
 const f=fixture(),next={...f.worker,postMessage(data,ports){f.calls.push('next');setImmediate(()=>ports[0].postMessage({protocol:1,nonce:data.nonce,cache,status:'ok'}))}};f.worker.postMessage=(data,ports)=>{f.reg.active=next;setImmediate(()=>ports[0].postMessage({protocol:1,nonce:data.nonce,cache:'old',status:'upgrade_required'}))};await f.host.authGate();assert.deepEqual(f.calls,['next']);
});
test('Auth connect checks the maintenance gate before importing or initializing the SDK',async()=>{
 const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');let calls=0;const window={location,PickleUpAuthOrigin:{allowed:()=>true},PickleUpCacheMaintenanceHost:{async authGate(){calls++;const e=Error('maintenance_busy');e.code='maintenance_busy';throw e}}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../modules/auth-adapter.js'),'utf8'),{window,URL});await assert.rejects(window.PickleUpAuth.connect({enabled:true,url:'https://fixture.supabase.co',publishableKey:'sb_publishable_synthetic'}),{code:'maintenance_busy'});assert.equal(calls,1);
});
