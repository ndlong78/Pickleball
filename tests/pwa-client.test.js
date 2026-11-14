// pwa-client must re-ask a worker that the browser left in "waiting", a bounded number of times.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','modules/pwa-client.js'),'utf8');
function boot(registration){
 const timers=[],listeners={},element=()=>({style:{},setAttribute(){},addEventListener(){},remove(){}});
 const context={location:{protocol:'https:'},console:{warn(){}},
  setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length},
  navigator:{serviceWorker:{register:async url=>{context.registered=url;return registration}}},
  document:{createElement:element,body:{appendChild(){}}},
  window:{addEventListener:(type,fn)=>{listeners[type]=fn}}};
 vm.runInNewContext(source,context);
 const run=async()=>{while(timers.length){const t=timers.shift();t.fn()}await null};
 return {context,listeners,timers,run};
}
function fakeRegistration(){const events={};return {waiting:null,installing:null,events,addEventListener:(type,fn)=>{events[type]=fn}}}
function worker(){const w={messages:[],state:'installing',postMessage:m=>w.messages.push(m),addEventListener:(type,fn)=>{w.onstate=fn}};return w}
test('a worker already waiting at load is asked to skip waiting, at most five times with backoff',async()=>{
 const registration=fakeRegistration(),waiting=worker();registration.waiting=waiting;
 const app=boot(registration);await app.listeners.load();await null;
 assert.equal(app.context.registered,'./sw.js');
 const delays=[];
 for(let i=0;i<10&&app.timers.length;i++){const t=app.timers.shift();delays.push(t.ms);t.fn()}
 assert.deepEqual(delays,[1000,1000,2000,4000,8000]);
 assert.equal(waiting.messages.length,5);
 assert.deepEqual(JSON.parse(JSON.stringify(waiting.messages[0])),{type:'PICKLEUP_SKIP_WAITING'});
});
test('a newly installed worker is asked once it is waiting, and asking stops when it has activated',async()=>{
 const registration=fakeRegistration(),app=boot(registration);await app.listeners.load();await null;
 assert.equal(app.timers.length,0,'nothing to do without a waiting worker');
 const next=worker();registration.installing=next;registration.events.updatefound();
 next.state='installed';registration.waiting=next;registration.installing=null;next.onstate();
 assert.equal(app.timers.length,1);
 app.timers.shift().fn();assert.equal(next.messages.length,1);
 registration.waiting=null;                      // the browser activated it
 app.timers.shift().fn();assert.equal(next.messages.length,1);
 assert.equal(app.timers.length,0);
});
test('no service worker support or a non-http page does nothing',()=>{
 const context={location:{protocol:'file:'},navigator:{serviceWorker:{}},window:{addEventListener(){throw Error('must not listen')}}};
 vm.runInNewContext(source,context);
 vm.runInNewContext(source,{location:{protocol:'https:'},navigator:{},window:{addEventListener(){throw Error('must not listen')}}});
});
