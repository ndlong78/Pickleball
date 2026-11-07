const {test}=require('node:test'),assert=require('node:assert/strict');
const {createAuthAdapter,createGuardedFetch}=require('../modules/auth-adapter.js');
test('deployment Auth config uses a complete project URL and public publishable key',()=>{
 const sandbox={window:{}};
 require('node:vm').runInNewContext(require('node:fs').readFileSync(require('node:path').join(__dirname,'../modules/auth-config.js'),'utf8'),sandbox,{timeout:1000});
 const config=sandbox.window.PICKLEUP_AUTH_CONFIG;
 assert.ok(config&&typeof config.enabled==='boolean','Auth enabled must be a boolean');
 assert.ok(typeof config.url==='string'&&typeof config.publishableKey==='string','Auth public fields must be strings');
 if(!config.enabled&&!config.url&&!config.publishableKey)return;
 let url;try{url=new URL(config.url)}catch(_){assert.fail('Enabled Auth URL must include https:// and a project hostname')}
 const allowed=url.protocol==='https:'||url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname);
 assert.ok(allowed&&!url.username&&!url.password&&!url.search&&!url.hash&&url.pathname==='/','Auth URL must be a clean HTTPS project origin or local loopback');
 assert.ok(typeof config.publishableKey==='string'&&/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.publishableKey),'Frontend requires a publishable key; never a secret or legacy JWT');
});
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
test('fenced sync transport pins A token and has an independent method allowlist',async()=>{
 let event,finish,received;const client={auth:{onAuthStateChange(fn){event=fn;return {data:{subscription:{unsubscribe(){}}}}},getSession:async()=>({data:{session:null}})}};
 const a=createAuthAdapter(client,{rpcTransport:(method,args,token,signal)=>{received={method,token,signal};return new Promise(resolve=>finish=resolve)}});
 try{await a.ready;event('SIGNED_IN',{user:{id:'A'},access_token:'fixture-A'});const response=a.syncRpc('A','prepare_sync',{});event('SIGNED_IN',{user:{id:'B'},access_token:'fixture-B'});finish({status:'ok'});assert.equal((await response).status,'stale');assert.equal(received.token,'fixture-A');assert.equal(received.signal.aborted,true);assert.equal((await a.importRpc('B','apply_sync_operation',{})).status,'invalid');assert.equal((await a.syncRpc('B','begin_import',{})).status,'invalid')}finally{a.destroy()}
});
test('event transport has its own capability and ignores late A data after switching to B',async()=>{
 let event,finish,received;const client={auth:{onAuthStateChange(fn){event=fn;return {data:{subscription:{unsubscribe(){}}}}},getSession:async()=>({data:{session:null}})}};
 const adapter=createAuthAdapter(client,{rpcTransport:(method,args,token,signal)=>{received={method,token,signal,args};return new Promise(resolve=>finish=resolve)}});
 try{await adapter.ready;event('SIGNED_IN',{user:{id:'A'},access_token:'fixture-A'});const body={fixed:'request-A'},pending=adapter.eventRpc('A','apply_event_operation',body);body.fixed='changed';event('SIGNED_IN',{user:{id:'B'},access_token:'fixture-B'});finish({status:'applied'});assert.equal((await pending).status,'stale');assert.equal(received.token,'fixture-A');assert.equal(received.args.fixed,'request-A');assert.equal(received.signal.aborted,true);assert.equal((await adapter.syncRpc('B','apply_event_operation',{})).status,'invalid');assert.equal((await adapter.importRpc('B','apply_event_operation',{})).status,'invalid');assert.equal((await adapter.eventRpc('B','apply_sync_operation',{})).status,'invalid');assert.equal((await adapter.eventRpc('A','prepare_sync',{})).status,'auth_required')}finally{adapter.destroy()}
});
test('plan capability clones the request, aborts late A replies and rejects other capability methods',async()=>{
 let event,finish,received;const client={auth:{onAuthStateChange(fn){event=fn;return {data:{subscription:{unsubscribe(){}}}}},getSession:async()=>({data:{session:null}})}};
 const adapter=createAuthAdapter(client,{rpcTransport:(method,args,token,signal)=>{received={method,args,token,signal};return new Promise(resolve=>finish=resolve)}});
 try{await adapter.ready;event('SIGNED_IN',{user:{id:'A'},access_token:'fixture-A'});const request={p_payload:{check_score:14}},pending=adapter.planRpc('A','apply_plan_operation',request);request.p_payload.check_score=1;event('SIGNED_IN',{user:{id:'B'},access_token:'fixture-B'});finish({status:'applied'});assert.equal((await pending).status,'stale');assert.equal(received.args.p_payload.check_score,14);assert.equal(received.token,'fixture-A');assert.equal(received.signal.aborted,true);
 for(const method of ['begin_import','apply_operation','apply_sync_operation','apply_event_operation'])assert.equal((await adapter.planRpc('B',method,{})).status,'invalid');
 for(const api of ['syncRpc','eventRpc','importRpc'])assert.equal((await adapter[api]('B','apply_plan_operation',{})).status,'invalid');assert.equal((await adapter.planRpc('A','prepare_sync',{})).status,'auth_required');await adapter.logout();assert.equal((await adapter.planRpc('B','pull_changes',{})).status,'auth_required');
 }finally{adapter.destroy()}
});
test('plan transport preserves HTTP200 domain outcomes instead of promoting them to acknowledgements',async()=>{
 let event,result;const client={auth:{onAuthStateChange(fn){event=fn;return {data:{subscription:{unsubscribe(){}}}}},getSession:async()=>({data:{session:null}})}};
 const adapter=createAuthAdapter(client,{rpcTransport:async()=>result});try{await adapter.ready;event('SIGNED_IN',{user:{id:'A'},access_token:'fixture-A'});for(const status of ['applied','conflict','invalid','reset_required','upgrade_required','network_error']){result={status,epoch:'fixture-epoch'};assert.deepEqual(await adapter.planRpc('A','apply_plan_operation',{}),result)}}finally{adapter.destroy()}
});
