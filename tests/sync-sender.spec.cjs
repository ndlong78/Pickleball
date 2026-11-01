const {test,expect}=require('@playwright/test'),{model}=require('./helpers/sync-model.cjs');
test.use({serviceWorkers:'block',trace:'off',screenshot:'off',video:'off'});
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',E='33333333-3333-4333-8333-333333333333';
async function host(context,{drop=false,restore=false,delay=false}={}){
 const server=model(),requests=[];let once=true,release;
 await context.exposeBinding('SYNC_RPC_FIXTURE',async(_,{name,args})=>{if(name==='apply_sync_operation'&&restore&&once){once=false;server.restore()}const result=server.rpc(name,args);if(name==='apply_sync_operation'&&delay&&once){once=false;await new Promise(resolve=>release=resolve)}if(name==='apply_sync_operation'){requests.push(structuredClone(args));if(drop&&once){once=false;return {status:'network_error'}}}return result});return {server,requests,get release(){return release}};
}
async function load(page,name){
 await page.goto('/Pickleball/');for(const file of ['local-repository','pull-controller','sync-controller'])await page.addScriptTag({url:'/Pickleball/modules/data/'+file+'.js'});
 await page.evaluate(async({A,name})=>{
  const db=await PickleUpLocalRepository.open({name}),listeners=new Set();const auth={subscribe(fn){listeners.add(fn);fn({user:{id:A}});return ()=>listeners.delete(fn)},syncRpc(owner,method,args){return SYNC_RPC_FIXTURE({name:method,args})},importRpc(owner,method,args){return this.syncRpc(owner,method,args)}};
  window.SYNC_TEST={db,auth,scope:db.scope('user:'+A),sender:PickleUpSyncController.create({auth,repository:db,owner:A,pullFactory:PickleUpPullController,enabled:()=>true}),switch(id){for(const fn of [...listeners])fn({user:{id}})}};
 },{A,name});
}
test('mock RPC/native IDB: reload recovers exact sending request and deferred edit follows predecessor ack',async({page,context})=>{
 const fixture=await host(context,{drop:true}),name='pr4b-'+crypto.randomUUID();await load(page,name);
 const initial=await page.evaluate(async()=>{const {scope,sender}=SYNC_TEST;await scope.write({kind:'user_preferences',id:'self',operationId:crypto.randomUUID(),value:{target_days:3}});await scope.write({kind:'user_preferences',id:'self',operationId:crypto.randomUUID(),value:{gentle:true},expectedLocalRevision:'1'});const result=await sender.sync();return {status:result.status,operation:(await scope.listOutbox()).find(o=>o.state==='sending').request}});
 expect(initial.status).toBe('network_error');await page.reload();await load(page,name);
 const resumed=await page.evaluate(async()=>{const {sender,scope}=SYNC_TEST;const result=await sender.sync({forceRetry:true});return {status:result.status,row:await scope.read('user_preferences','self'),operations:await scope.listOutbox()}});
 expect(resumed.status).toBe('synced');expect(resumed.row.base.target_days).toBe(3);expect(resumed.row.base.gentle).toBe(true);expect(resumed.row.overlay).toBeNull();expect(resumed.operations.every(o=>o.state==='acked')).toBe(true);expect(fixture.requests[0]).toEqual(initial.operation);expect(fixture.requests[1]).toEqual(initial.operation);expect(fixture.server.changes).toHaveLength(2);
});
test('native IDB: conflict decision archives local intent and remote revision, no silent overwrite',async({page,context})=>{
 const {server}=await host(context),name='pr4b-'+crypto.randomUUID();server.apply({p_operation_id:crypto.randomUUID(),p_kind:'user_preferences',p_entity_key:'self',p_action:'put',p_expected_revision:'0',p_epoch:E,p_payload:{target_days:2}});await load(page,name);
 const operation=await page.evaluate(async()=>{const {db,auth,scope}=SYNC_TEST,reader=PickleUpPullController.create({auth,repository:db,owner:'11111111-1111-4111-8111-111111111111',enabled:()=>true});try{await reader.pull()}finally{reader.close()}const id=crypto.randomUUID();await scope.write({kind:'user_preferences',id:'self',operationId:id,value:{target_days:4},expectedLocalRevision:'1'});return id});
 server.apply({p_operation_id:crypto.randomUUID(),p_kind:'user_preferences',p_entity_key:'self',p_action:'put',p_expected_revision:'1',p_epoch:E,p_payload:{target_days:5}});
 const result=await page.evaluate(async id=>{const {sender,scope}=SYNC_TEST;const blocked=await sender.sync(),view=await scope.inspectSyncConflict(id);await scope.resolveSyncConflict({conflictId:id,mode:'server',operationId:crypto.randomUUID(),expectedLocalRevision:view.record.localRevision,expectedRemoteRevision:view.record.baseRevision,epoch:view.cursor.epoch});const done=await sender.sync();return {blocked:blocked.status,done:done.status,row:await scope.read('user_preferences','self'),archive:(await scope.inspectSyncConflict(id)).conflict.resolution}},operation);
 expect(result.blocked).toBe('needs_review');expect(result.done).toBe('synced');expect(result.row.base.target_days).toBe(5);expect(result.archive.local.target_days).toBe(4);expect(result.archive.remote.target_days).toBe(5);expect(server.changes).toHaveLength(2);
});
test('native IDB: epoch change blocks old request; default-off and A to B preserve isolation',async({page,context})=>{
 const {server}=await host(context,{restore:true});await load(page,'pr4b-'+crypto.randomUUID());
 const result=await page.evaluate(async({A,B})=>{const {scope,sender,db,auth}=SYNC_TEST;const off=PickleUpSyncController.create({auth,repository:db,owner:A,pullFactory:PickleUpPullController});let disabled;try{await off.sync()}catch(e){disabled=e.code}finally{off.close()}await scope.write({kind:'user_preferences',id:'self',operationId:crypto.randomUUID(),value:{target_days:4}});const result=await sender.sync();SYNC_TEST.switch(B);let switched;try{await sender.sync()}catch(e){switched=e.code}return {disabled,status:result.status,switched,a:await scope.listOutbox(),b:await db.scope('user:'+B).listOutbox()}},{A,B});
 expect(result.disabled).toBe('pilot_disabled');expect(result.status).toBe('needs_review');expect(result.switched).toBe('account_changed');expect(result.a[0].request.p_epoch).toBe(E);expect(result.a[0].state).toBe('blocked');expect(result.b).toEqual([]);expect(server.changes).toHaveLength(0);
});
test('native IDB: ack quota exception cannot produce false success; same request replays after rollback',async({page,context})=>{
 const {server}=await host(context);await load(page,'pr4b-'+crypto.randomUUID());
 const result=await page.evaluate(async()=>{const {scope,sender,auth}=SYNC_TEST,put=IDBObjectStore.prototype.put,original=auth.syncRpc;let code;
  auth.syncRpc=async(...args)=>{const response=await original.apply(auth,args);if(args[1]==='apply_sync_operation')IDBObjectStore.prototype.put=function(...values){if(this.name==='records')throw new DOMException('synthetic','QuotaExceededError');return put.apply(this,values)};return response};
  try{await scope.write({kind:'user_preferences',id:'self',operationId:crypto.randomUUID(),value:{target_days:3}});await sender.sync()}catch(e){code=e.code}finally{IDBObjectStore.prototype.put=put;auth.syncRpc=original}
  const pending=(await scope.listOutbox())[0],done=await sender.sync({forceRetry:true});return {code,pending:pending.state,status:done.status,row:await scope.read('user_preferences','self')};
 });expect(result.code).toBe('quota_exceeded');expect(result.pending).toBe('sending');expect(result.status).toBe('synced');expect(result.row.base.target_days).toBe(3);expect(server.changes).toHaveLength(1);
});

test('native IDB: two tabs honor the same sender lease while an ack is delayed',async({page,context})=>{
 const fixture=await host(context,{delay:true}),name='pr4b-'+crypto.randomUUID();await load(page,name);const tab=await context.newPage();await load(tab,name);
 const pending=page.evaluate(async()=>{await SYNC_TEST.scope.write({kind:'user_preferences',id:'self',operationId:crypto.randomUUID(),value:{target_days:3}});return SYNC_TEST.sender.sync()});
 try{await expect.poll(()=>typeof fixture.release).toBe('function');expect((await tab.evaluate(()=>SYNC_TEST.sender.sync())).status).toBe('busy')}finally{fixture.release?.()}
 expect((await pending).status).toBe('synced');expect(fixture.server.changes).toHaveLength(1);
 const operations=await tab.evaluate(()=>SYNC_TEST.scope.listOutbox());expect(operations).toHaveLength(1);expect(operations[0].state).toBe('acked');
});
