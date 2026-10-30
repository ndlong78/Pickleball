const {test}=require('node:test'),assert=require('node:assert/strict');
const {createAuthAdapter,createGuardedFetch}=require('../modules/auth-adapter.js');
function fixture(){let event,resolve;const client={auth:{onAuthStateChange(fn){event=fn;return {data:{subscription:{unsubscribe(){}}}}},getSession:async()=>({data:{session:null}}),signOut:async()=>({}),signInWithOtp:async()=>({error:{status:429}}),verifyOtp:async()=>({error:{code:'otp_expired'}})},rpc(){return {abortSignal:()=>new Promise(r=>resolve=r)}}};return {adapter:createAuthAdapter(client),event:(s)=>event('SIGNED_IN',s),finish:()=>resolve({data:{status:'ok',changes:[{private:'A'}]}})}}
test('guarded Auth transport preserves bodyless logout and other null-body responses',async()=>{
 for(const status of [204,205,304]){
  const transport=createGuardedFetch(()=>1,async()=>new Response(null,{status,headers:{'x-fixture':'kept'}}));
  const response=await transport('http://fixture.invalid/auth/v1/logout');
  assert.equal(response.status,status);assert.equal(response.body,null);assert.equal(response.headers.get('x-fixture'),'kept');assert.equal(await response.text(),'');
 }
});
test('guarded Auth transport keeps ordinary error JSON/status for SDK handling',async()=>{
 const transport=createGuardedFetch(()=>1,async()=>new Response('{"code":"otp_expired"}',{status:403}));
 const response=await transport('http://fixture.invalid/auth/v1/verify');assert.equal(response.status,403);assert.deepEqual(await response.json(),{code:'otp_expired'});
});
test('account generation still rejects a stale bodyless response',async()=>{
 let generation=1,finish;const transport=createGuardedFetch(()=>generation,()=>new Promise(resolve=>finish=resolve));
 const pending=transport('http://fixture.invalid/auth/v1/logout');generation=2;finish(new Response(null,{status:204}));await assert.rejects(pending,/Session changed/);
});
test('late private response from A is ignored after B signs in; logout blocks private read',async()=>{const f=fixture(),a=f.adapter;try{await a.ready;f.event({user:{id:'A'}});const pending=a.privateRead();f.event({user:{id:'B'}});f.finish();assert.equal((await pending).status,'stale');await a.logout();assert.equal((await a.privateRead()).status,'auth_required')}finally{a.destroy()}});
test('rate limit and expired OTP produce safe messages',async()=>{const {adapter:a}=fixture();try{await a.ready;assert.match((await a.requestOtp('x',true)).error,/quá nhiều/);assert.match((await a.verify('x','x')).error,/hết hạn/)}finally{a.destroy()}});
test('expired session hides account while refresh is unavailable',async()=>{const f=fixture(),a=f.adapter;let state;const unsubscribe=a.subscribe(s=>state=s);try{await a.ready;f.event({user:{id:'A'},expires_at:Math.floor(Date.now()/1000)-1});await new Promise(resolve=>setTimeout(resolve,1100));assert.equal(state.status,'guest');assert.equal(state.user,null);assert.equal((await a.privateRead()).status,'auth_required')}finally{unsubscribe();a.destroy()}});
test('duplicate INITIAL_SESSION guest event does not invalidate pending OTP',async()=>{const f=fixture(),a=f.adapter;try{await a.ready;const generation=a.getGeneration();f.event(null);assert.equal(a.getGeneration(),generation)}finally{a.destroy()}});
test('import transport pins A token and aborts/ignores delayed response after switching B',async()=>{
 let event,finish,received;const client={auth:{onAuthStateChange(fn){event=fn;return {data:{subscription:{unsubscribe(){}}}}},getSession:async()=>({data:{session:null}})}};
 const a=createAuthAdapter(client,{rpcTransport:(method,args,token,signal)=>{received={token,signal};return new Promise(resolve=>finish=resolve)}});try{await a.ready;event('SIGNED_IN',{user:{id:'A'},access_token:'fixture-A'});const pending=a.importRpc('A','begin_import',{fixed:'source-A'});event('SIGNED_IN',{user:{id:'B'},access_token:'fixture-B'});assert.equal(received.token,'fixture-A');assert.equal(received.signal.aborted,true);finish({status:'applied',private:'A'});assert.equal((await pending).status,'stale');assert.equal((await a.importRpc('A','begin_import',{})).status,'auth_required')}finally{a.destroy()}
});
