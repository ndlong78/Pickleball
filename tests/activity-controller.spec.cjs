const {test,expect}=require('@playwright/test'),{model}=require('./helpers/sync-model.cjs'),{payload}=require('./helpers/activity-fixtures.cjs');
test.use({serviceWorkers:'block',trace:'off',screenshot:'off',video:'off'});
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',uid=()=>crypto.randomUUID();
function command(){return {kind:'academy_attempts',id:uid(),operationId:uid(),value:payload('academy_attempts')}}
async function host(context,{drop=false,delay=false}={}){
 const servers=new Map([A,B].map(owner=>[owner,model({owner,activityRows:true})])),calls=[];let once=true,release;
 await context.exposeBinding('LIFECYCLE_RPC',async(_,{owner,name,args})=>{
  calls.push({owner,name,args:structuredClone(args)});const result=servers.get(owner).rpc(name,args);
  if(name==='apply_event_operation'&&once){once=false;if(delay)await new Promise(r=>release=r);if(drop)return {status:'network_error'}}return result;
 });
 return {servers,calls,get release(){return release}};
}
async function load(page,name){
 await page.goto('/Pickleball/');for(const file of ['activity-core','local-repository','pull-controller','sync-controller','activity-controller'])await page.addScriptTag({url:'/Pickleball/modules/data/'+file+'.js'});
 await page.evaluate(async({A,name})=>{
  const db=await PickleUpLocalRepository.open({name}),listeners=new Set();let actor=A;
  const auth={subscribe(fn){listeners.add(fn);fn({status:'authenticated',user:{id:actor}});return ()=>listeners.delete(fn)},eventRpc(owner,name,args){return LIFECYCLE_RPC({owner,name,args})}};
  const controller=PickleUpActivityController.create({auth,repository:db,enabled:()=>true});await controller.ready;
  window.LIFE={db,controller,scope:db.scope('user:'+A),switch(id){actor=id;for(const fn of [...listeners])fn({status:id?'authenticated':'guest',user:id?{id}:null})}};
 },{A,name});
}
test('mock RPC/native IDB and BroadcastChannel: consent is separate and revocation clears another tab',async({page,context})=>{
 const f=await host(context),name='lifecycle-'+uid();await load(page,name);const tab=await context.newPage();await load(tab,name);expect(f.calls).toHaveLength(0);
 await page.evaluate(()=>LIFE.controller.useAccount());await expect.poll(()=>tab.evaluate(()=>LIFE.controller.getState().mode)).toBe('account');expect(f.calls).toHaveLength(2);
 await page.evaluate(cmd=>LIFE.controller.createEvent(cmd),command());await expect.poll(()=>tab.evaluate(()=>LIFE.controller.getState().snapshot?.outbox.length)).toBe(1);expect(f.calls).toHaveLength(2);
 await tab.evaluate(()=>LIFE.controller.useDevice());await expect.poll(()=>page.evaluate(()=>LIFE.controller.getState().mode)).toBe('guest');
 const exported=await page.evaluate(async()=>({state:LIFE.controller.getState(),artifact:await LIFE.controller.exportCache(),mutable:await LIFE.scope.getDomainConsent()}));expect(exported.state.snapshot).toBeNull();expect(exported.artifact.outbox[0].state).toBe('pending');expect(exported.mutable).toBe(false);expect(exported.artifact.consent.enabled).toBe(false);
});
test('mock RPC/native IDB: unknown commit survives reload and must replay before review can discard it',async({page,context})=>{
 const f=await host(context,{drop:true}),name='lifecycle-'+uid(),cmd=command();await load(page,name);await page.evaluate(()=>LIFE.controller.useAccount());await page.evaluate(cmd=>LIFE.controller.createEvent(cmd),cmd);expect((await page.evaluate(()=>LIFE.controller.sync())).status).toBe('network_error');const count=f.calls.length;
 await load(page,name);expect(f.calls).toHaveLength(count);await page.evaluate(()=>LIFE.controller.refresh());
 expect(await page.evaluate(async cmd=>{const view=await LIFE.controller.previewReview(cmd.kind,cmd.id);try{await LIFE.controller.resolveReview(view,'server',{operationId:crypto.randomUUID()});return null}catch(error){return error.code}},cmd)).toBe('uncertain_operation');
 expect((await page.evaluate(()=>LIFE.controller.sync({forceRetry:true}))).status).toBe('synced');const writes=f.calls.filter(x=>x.name==='apply_event_operation');expect(writes).toHaveLength(2);expect(writes[0].args).toEqual(writes[1].args);expect(f.servers.get(A).changes).toHaveLength(1);
});
test('mock RPC/native IDB: explicit epoch repair persists across reload without changing event identity or mutable cursor',async({page,context})=>{
 const f=await host(context,{drop:true}),name='lifecycle-'+uid(),cmd=command();await load(page,name);await page.evaluate(()=>LIFE.controller.useAccount());await page.evaluate(cmd=>LIFE.controller.createEvent(cmd),cmd);await page.evaluate(()=>LIFE.controller.sync());
 const frozen=f.calls.find(x=>x.name==='apply_event_operation').args,server=f.servers.get(A);server.restore();server.rows.clear();server.receipts.clear();server.changes.length=0;
 const result=await page.evaluate(async cmd=>{
  await LIFE.scope.applyCanonicalSnapshot({rows:[],afterRevision:'0',epoch:'33333333-3333-4333-8333-333333333333'});const mutable=await LIFE.scope.getSyncCursor();await LIFE.controller.sync({forceRetry:true});
  const view=await LIFE.controller.previewReview(cmd.kind,cmd.id),operationId=crypto.randomUUID();let code;try{await LIFE.controller.resolveReview(view,'retry_create',{operationId})}catch(error){code=error.code}
  await LIFE.controller.resolveReview(view,'retry_create',{operationId,acknowledgeEpochChange:true});return {code,operationId,mutable};
 },cmd);expect(result.code).toBe('epoch_review_required');const count=f.calls.length;await load(page,name);expect(f.calls).toHaveLength(count);expect((await page.evaluate(()=>LIFE.controller.sync())).status).toBe('synced');
 const last=f.calls.filter(x=>x.name==='apply_event_operation').at(-1).args;expect(last.p_entity_key).toBe(frozen.p_entity_key);expect(last.p_payload).toEqual(frozen.p_payload);expect(last.p_operation_id).not.toBe(frozen.p_operation_id);expect(last.p_epoch).not.toBe(frozen.p_epoch);
 const cache=await page.evaluate(async()=>({artifact:await LIFE.controller.exportCache(),mutable:await LIFE.scope.getSyncCursor()}));expect(cache.mutable).toEqual(result.mutable);expect(cache.artifact.conflicts.find(x=>x.conflictId===result.operationId).resolution.operations[0].request).toEqual(frozen);expect(server.rows.size).toBe(1);
});
test('mock RPC/native IDB: quota rollback preserves a conflicting create/delete chain before explicit delete repair',async({page,context})=>{
 const f=await host(context),name='lifecycle-'+uid(),cmd=command();await load(page,name);await page.evaluate(()=>LIFE.controller.useAccount());await page.evaluate(async cmd=>{await LIFE.controller.createEvent(cmd);await LIFE.controller.deleteEvent({kind:cmd.kind,id:cmd.id,operationId:crypto.randomUUID(),expectedLocalRevision:'1'})},cmd);
 const server=f.servers.get(A);server.apply({p_operation_id:uid(),p_kind:cmd.kind,p_entity_key:cmd.id,p_action:'put',p_expected_revision:'0',p_epoch:server.epoch,p_payload:{...cmd.value,score:5}});await page.evaluate(()=>LIFE.controller.sync());
 const result=await page.evaluate(async cmd=>{
  const view=await LIFE.controller.previewReview(cmd.kind,cmd.id),operationId=crypto.randomUUID(),before=await LIFE.controller.exportCache(),add=IDBObjectStore.prototype.add;let code;
  IDBObjectStore.prototype.add=function(...args){if(this.name==='metadata')throw new DOMException('synthetic','QuotaExceededError');return add.apply(this,args)};
  try{await LIFE.controller.resolveReview(view,'retry_delete',{operationId})}catch(error){code=error.code}finally{IDBObjectStore.prototype.add=add}
  const after=await LIFE.controller.exportCache();delete before.exportedAt;delete after.exportedAt;
  await LIFE.controller.resolveReview(view,'retry_delete',{operationId});const sent=await LIFE.controller.sync(),artifact=await LIFE.controller.exportCache();return {code,before,after,sent,archive:artifact.conflicts.find(x=>x.conflictId===operationId),count:LIFE.controller.getState().projection.events.academy_attempts.length};
 },cmd);expect(result.code).toBe('quota_exceeded');expect(result.after).toEqual(result.before);expect(result.sent.status).toBe('synced');expect(result.archive.resolution.operations).toHaveLength(2);expect(result.count).toBe(0);expect(server.rows.get(cmd.kind+':'+cmd.id).deleted_at).not.toBeNull();
});
test('mock RPC/native channels: revoking during commit and changing A to B never acknowledges or exposes A data',async({page,context})=>{
 const f=await host(context,{delay:true}),name='lifecycle-'+uid(),cmd=command();await load(page,name);await page.evaluate(()=>LIFE.controller.useAccount());const tab=await context.newPage();await load(tab,name);await page.evaluate(cmd=>LIFE.controller.createEvent(cmd),cmd);
 const pending=page.evaluate(()=>LIFE.controller.sync().then(result=>result.status,error=>error.code));await expect.poll(()=>typeof f.release).toBe('function');
 try{
  await tab.evaluate(()=>LIFE.controller.useDevice());await expect.poll(()=>page.evaluate(()=>LIFE.controller.getState().snapshot)).toBeNull();await page.evaluate(B=>LIFE.switch(B),B);await expect.poll(()=>page.evaluate(()=>LIFE.controller.getState().mode)).toBe('guest');
 }finally{f.release?.()}
 expect(await pending).toBe('account_changed');const result=await page.evaluate(async()=>({owner:LIFE.controller.getState().owner,artifact:await LIFE.controller.exportCache(),old:await LIFE.scope.listOutbox()}));expect(result.owner).toBe(B);expect(result.artifact.records).toEqual([]);expect(result.artifact.outbox).toEqual([]);expect(result.old[0].state).toBe('sending');
});
