const {test}=require('node:test'),assert=require('node:assert/strict');
const {IDBFactory,IDBObjectStore}=require('fake-indexeddb');
const repo=require('../modules/data/local-repository.js'),activity=require('../modules/data/activity-controller.js'),core=require('../modules/data/activity-core.js'),pull=require('../modules/data/pull-controller.js'),sync=require('../modules/data/sync-controller.js');
const {model}=require('./helpers/sync-model.cjs'),{payload}=require('./helpers/activity-fixtures.cjs');
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',uid=()=>crypto.randomUUID(),POLICY='activity-events-1';
async function fixture(){
 const db=await repo.open({indexedDB:new IDBFactory()}),servers=new Map([A,B].map(owner=>[owner,model({owner,activityRows:true})])),listeners=new Set(),calls=[],controllers=[];let actor=A,enabled=true,intercept,clock=1000;
 const auth={subscribe(fn){listeners.add(fn);fn({status:actor?'authenticated':'guest',user:actor?{id:actor}:null});return ()=>listeners.delete(fn)},async eventRpc(owner,name,args){calls.push({owner,name,args:structuredClone(args)});const run=()=>servers.get(owner).rpc(name,args);return intercept?intercept(owner,name,args,run):run()}};
 return {db,auth,calls,servers,scope:db.scope('user:'+A),make(extra={}){const c=activity.create({auth,repository:db,core,pullFactory:pull,syncFactory:{...sync,create:options=>sync.create({...options,now:()=>clock})},enabled:()=>enabled,channelFactory:()=>null,now:()=>new Date('2026-11-02T12:00:00Z'),...extra});controllers.push(c);return c},tick(){clock+=60001},switch(id){actor=id;for(const fn of [...listeners])fn({status:id?'authenticated':'guest',user:id?{id}:null})},disable(){enabled=false},intercept(fn){intercept=fn},close(){for(const c of controllers)c.close();db.close()}};
}
function command(kind='academy_attempts'){return {kind,id:uid(),operationId:uid(),value:payload(kind)}}
function remote(server,cmd,{action='put',revision='0',value=cmd.value}={}){return server.apply({p_operation_id:uid(),p_kind:cmd.kind,p_entity_key:cmd.id,p_action:action,p_expected_revision:revision,p_epoch:server.epoch,p_payload:value})}
async function settled(c){for(let i=0;i<100;i++){if(c.getState().mode!=='loading')return;await new Promise(setImmediate)}assert.fail('activity lifecycle did not settle')}
async function lost(f,c,cmd){let drop=true;f.intercept((who,name,args,run)=>{const result=run();if(name==='apply_event_operation'&&drop){drop=false;return {status:'network_error'}}return result});await c.createEvent(cmd);assert.equal((await c.sync()).status,'network_error');f.intercept(null);return (await f.scope.listOutbox()).find(op=>op.operationId===cmd.operationId).request}

test('independent activity consent and default-off lifecycle never inherit mutable opt-in or auto RPC',async()=>{
 const f=await fixture();try{
  await f.scope.setDomainConsent(true);const off=f.make({enabled:()=>false});await off.ready;assert.equal(off.getState().mode,'guest');await assert.rejects(off.useAccount(),{code:'pilot_disabled'});assert.equal(f.calls.length,0);
  const c=f.make();await c.ready;assert.equal(c.getState().mode,'guest');assert.deepEqual(await f.scope.getActivityConsent(),{enabled:false,localRevision:'0'});await assert.rejects(c.refresh(),{code:'source_unavailable'});await c.useAccount();assert.equal(f.calls.length,2);assert.equal(c.getState().snapshot.cursor.epoch,f.servers.get(A).epoch);assert.equal((await f.scope.getDomainConsent()),true);
  const count=f.calls.length;c.close();const restored=f.make();await restored.ready;assert.equal(restored.getState().mode,'account');assert.equal(f.calls.length,count);
 }finally{f.close()}
});
test('typed four-event writes stay local until manual sync and never add attendance',async()=>{
 const f=await fixture(),c=f.make();try{
  await c.ready;await c.useAccount();const count=f.calls.length;
  for(const kind of core.KINDS)await c.createEvent(command(kind));assert.equal(f.calls.length,count);assert.equal((await c.sync()).status,'synced');
  assert.deepEqual(Object.values(c.getState().projection.events).map(x=>x.length),[1,1,1,1]);assert.equal((await f.scope.getDomainSnapshot()).records.length,0);
  const cmd=command();await assert.rejects(c.createEvent({...cmd,value:{...cmd.value,score:21}}),{code:'invalid_activity'});
  const current=c.getState().snapshot.records.find(r=>r.kind==='academy_attempts');await c.deleteEvent({kind:current.kind,id:current.id,operationId:uid(),expectedLocalRevision:current.localRevision});await c.sync();assert.equal(c.getState().projection.events.academy_attempts.length,0);
  assert.equal(f.servers.get(A).changes.some(row=>row.entity_kind==='practice_checkins'),false);
 }finally{f.close()}
});
test('unknown commit cannot be resolved even when a pull has marked the row for review; replay wins first',async()=>{
 const f=await fixture(),c=f.make(),cmd=command();try{
  await c.ready;await c.useAccount();const frozen=await lost(f,c,cmd);await c.refresh();const view=await c.previewReview(cmd.kind,cmd.id);assert.equal(view.record.reviewRequired,true);
  await assert.rejects(c.resolveReview(view,'server',{operationId:uid()}),{code:'uncertain_operation'});
  assert.equal((await c.sync({forceRetry:true})).status,'synced');assert.deepEqual(f.calls.filter(x=>x.name==='apply_event_operation').map(x=>x.args),[frozen,frozen]);assert.equal(f.servers.get(A).changes.length,1);
 }finally{f.close()}
});
test('epoch repair of a missing event archives the old request and preserves event/entity identity',async()=>{
 const f=await fixture(),c=f.make(),cmd=command();try{
  await c.ready;await c.useAccount();const frozen=await lost(f,c,cmd),server=f.servers.get(A);server.restore();server.rows.clear();server.changes.length=0;server.receipts.clear();
  await f.scope.applyCanonicalSnapshot({rows:[],afterRevision:'0',epoch:server.epoch});const mutable=await f.scope.getSyncCursor();
  assert.equal((await c.sync({forceRetry:true})).status,'needs_review');const view=await c.previewReview(cmd.kind,cmd.id),operationId=uid();
  await assert.rejects(c.resolveReview(view,'retry_create',{operationId}),{code:'epoch_review_required'});
  const decision=await c.resolveReview(view,'retry_create',{operationId,acknowledgeEpochChange:true});assert.equal(decision.queued,true);
  assert.equal((await c.resolveReview(view,'retry_create',{operationId,acknowledgeEpochChange:true})).status,'replayed');
  const before=(await c.exportCache()),archive=before.conflicts.find(x=>x.conflictId===operationId);assert.deepEqual(archive.resolution.operations[0].request,frozen);assert.equal(archive.resolution.local.client_event_id,cmd.value.client_event_id);assert.equal(before.outbox.find(op=>op.operationId===cmd.operationId).state,'resolved');
  assert.equal((await c.sync()).status,'synced');const next=f.calls.filter(x=>x.name==='apply_event_operation').at(-1).args;
  assert.notEqual(next.p_operation_id,frozen.p_operation_id);assert.equal(next.p_entity_key,frozen.p_entity_key);assert.deepEqual(next.p_payload,frozen.p_payload);assert.notEqual(next.p_epoch,frozen.p_epoch);assert.equal(server.rows.size,1);assert.deepEqual(await f.scope.getSyncCursor(),mutable);
 }finally{f.close()}
});
test('an existing or tombstoned event cannot be recreated; keeping server archives the whole local chain',async()=>{
 const f=await fixture(),c=f.make(),cmd=command();try{
  await c.ready;await c.useAccount();await c.createEvent(cmd);remote(f.servers.get(A),{...cmd,value:{...cmd.value,score:4}});assert.equal((await c.sync()).status,'needs_review');let view=await c.previewReview(cmd.kind,cmd.id);
  await assert.rejects(c.resolveReview(view,'retry_create',{operationId:uid()}),{code:'append_only'});const decision=uid();await c.resolveReview(view,'server',{operationId:decision});assert.equal(c.getState().projection.events.academy_attempts[0].score,4);
  const archive=(await c.exportCache()).conflicts.find(x=>x.conflictId===decision);assert.equal(archive.resolution.local.score,12);assert.equal(archive.resolution.remote.score,4);assert.equal(archive.resolution.operations[0].state,'conflict');
  const other=command();await c.createEvent(other);remote(f.servers.get(A),other);remote(f.servers.get(A),other,{action:'delete',revision:'1',value:{}});await c.sync();view=await c.previewReview(other.kind,other.id);await assert.rejects(c.resolveReview(view,'retry_create',{operationId:uid()}),{code:'append_only'});await c.resolveReview(view,'server',{operationId:uid()});assert.equal(c.getState().snapshot.records.find(x=>x.id===other.id).deleted,true);
 }finally{f.close()}
});
test('delete repair uses previewed canonical revision and a new operation, never content replacement',async()=>{
 const f=await fixture(),c=f.make(),cmd=command();try{
  remote(f.servers.get(A),cmd);await c.ready;await c.useAccount();let row=c.getState().snapshot.records[0];await c.deleteEvent({kind:cmd.kind,id:cmd.id,operationId:uid(),expectedLocalRevision:row.localRevision});
  // Another device deleted the event before this writer sent its old CAS.
  remote(f.servers.get(A),cmd,{action:'delete',revision:'1',value:{}});await c.sync();const view=await c.previewReview(cmd.kind,cmd.id);await assert.rejects(c.resolveReview(view,'retry_delete',{operationId:uid()}),{code:'invalid_resolution'});await c.resolveReview(view,'server',{operationId:uid()});assert.equal(c.getState().snapshot.records[0].deleted,true);
 }finally{f.close()}
});
test('delete repair archives a conflicting create and its deferred delete as one reviewed chain',async()=>{
 const f=await fixture(),c=f.make(),cmd=command();try{
  await c.ready;await c.useAccount();await c.createEvent(cmd);await c.deleteEvent({kind:cmd.kind,id:cmd.id,operationId:uid(),expectedLocalRevision:'1'});remote(f.servers.get(A),{...cmd,value:{...cmd.value,score:5}});await c.sync();
  const view=await c.previewReview(cmd.kind,cmd.id);assert.equal(view.operations.length,2);assert.equal(view.record.base.score,5);const operationId=uid();await c.resolveReview(view,'retry_delete',{operationId});assert.equal((await c.sync()).status,'synced');
  const request=f.calls.filter(x=>x.name==='apply_event_operation').at(-1).args;assert.equal(request.p_action,'delete');assert.equal(request.p_expected_revision,'1');assert.deepEqual(request.p_payload,{});const archive=(await c.exportCache()).conflicts.find(x=>x.conflictId===operationId);assert.equal(archive.resolution.operations.length,2);assert.equal(archive.resolution.remote.score,5);
 }finally{f.close()}
});
test('stable local create/delete commands replay receipts without duplicating intents',async()=>{
 const f=await fixture(),c=f.make(),cmd=command();try{
  await c.ready;await c.useAccount();await c.createEvent(cmd);assert.equal((await c.createEvent(cmd)).status,'replayed');await assert.rejects(c.createEvent({...cmd,value:{...cmd.value,score:6}}),{code:'operation_mismatch'});await c.sync();assert.equal((await c.createEvent(cmd)).status,'replayed');
  const row=c.getState().snapshot.records.find(r=>r.id===cmd.id),del={kind:cmd.kind,id:cmd.id,operationId:uid(),expectedLocalRevision:row.localRevision};await c.deleteEvent(del);assert.equal((await c.deleteEvent(del)).status,'replayed');await c.sync();assert.equal((await c.deleteEvent(del)).status,'replayed');assert.equal(f.servers.get(A).changes.length,2);
 }finally{f.close()}
});
test('stale previews reject local, canonical, cursor, consent and outbox-state races',async()=>{
 const f=await fixture(),c=f.make(),cmd=command();try{
  await c.ready;await c.useAccount();await c.createEvent(cmd);remote(f.servers.get(A),cmd);await c.refresh();const view=await c.previewReview(cmd.kind,cmd.id);const other=f.make();await other.ready;
  await other.sync();await assert.rejects(c.resolveReview(view,'server',{operationId:uid()}),{code:'local_conflict'});
  const fresh=await c.previewReview(cmd.kind,cmd.id);await other.useDevice();await assert.rejects(c.resolveReview(fresh,'server',{operationId:uid()}),{code:'consent_changed'});assert.equal(c.getState().snapshot,null);
 }finally{f.close()}
});
test('atomic consent checks reject a stale local writer and consent ABA across tabs',async()=>{
 const f=await fixture(),a=f.make(),b=f.make();try{
  await Promise.all([a.ready,b.ready]);await a.useAccount();await b.refreshLocal();const consent=b.getState().consent;await a.useDevice();await a.useAccount();const before=f.calls.length;
  await assert.rejects(b.createEvent(command()),{code:'consent_changed'});assert.equal(f.calls.length,before);assert.equal((await f.scope.listOutbox()).length,0);
  await assert.rejects(f.scope.setActivityConsent(false,consent.localRevision),{code:'local_conflict'});assert.equal((await f.scope.getActivityConsent()).enabled,true);
 }finally{f.close()}
});
test('revocation during a committed request clears source and preserves frozen intent for re-opt-in',async()=>{
 const f=await fixture(),a=f.make(),b=f.make(),cmd=command();let release,reached;const seen=new Promise(r=>reached=r);try{
  await Promise.all([a.ready,b.ready]);await a.useAccount();await b.refreshLocal();await a.createEvent(cmd);
  f.intercept(async(who,name,args,run)=>{const result=run();if(name==='apply_event_operation'){reached();await new Promise(r=>release=r)}return result});const pending=a.sync();await seen;await b.useDevice();await a.refreshLocal();assert.equal(a.getState().mode,'guest');assert.equal(a.getState().snapshot,null);release();await assert.rejects(pending,{code:'account_changed'});assert.equal((await f.scope.listOutbox())[0].state,'sending');
  f.intercept(null);await a.useAccount();assert.equal((await a.sync({forceRetry:true})).status,'busy');f.tick();assert.equal((await a.sync({forceRetry:true})).status,'synced');assert.equal(f.servers.get(A).changes.length,1);
 }finally{release?.();f.close()}
});
test('late account A replies and reentrant state callbacks cannot write or expose A under B',async()=>{
 const f=await fixture(),c=f.make();let release,reached;const seen=new Promise(r=>reached=r);try{
  await c.ready;f.intercept(async(who,name,args,run)=>{const result=run();if(who===A&&name==='pull_changes'){reached();await new Promise(r=>release=r)}return result});const pending=c.useAccount();await seen;f.switch(B);assert.equal(c.getState().snapshot,null);await settled(c);release();await assert.rejects(pending,{code:'account_changed'});await c.useAccount();assert.equal((await c.exportCache()).owner,B);
  let armed=false;const reentrant=f.make({onChange:s=>{if(armed&&s.busy){armed=false;f.switch(null)}}});await reentrant.ready;armed=true;const before=f.calls.length;await assert.rejects(reentrant.sync(),{code:'account_changed'});assert.equal(f.calls.length,before);
 }finally{release?.();f.close()}
});
test('quota failure rolls back the complete archive/decision transaction and preserves evidence',async()=>{
 const f=await fixture(),c=f.make(),cmd=command(),add=IDBObjectStore.prototype.add;try{
  await c.ready;await c.useAccount();await c.createEvent(cmd);remote(f.servers.get(A),cmd);await c.sync();const before=await c.exportCache(),view=await c.previewReview(cmd.kind,cmd.id),operationId=uid();
  IDBObjectStore.prototype.add=function(...args){if(this.name==='metadata')throw new DOMException('synthetic','QuotaExceededError');return add.apply(this,args)};
  await assert.rejects(c.resolveReview(view,'server',{operationId}),{code:'quota_exceeded'});IDBObjectStore.prototype.add=add;const after=await c.exportCache();delete before.exportedAt;delete after.exportedAt;assert.deepEqual(after,before);await c.resolveReview(view,'server',{operationId});
 }finally{IDBObjectStore.prototype.add=add;f.close()}
});
test('activity export remains available after opting out and omits mutable data, tokens and legacy storage',async()=>{
 const f=await fixture(),c=f.make();try{
  await c.ready;await c.useAccount();await c.createEvent(command('match_records'));await c.useDevice();const artifact=await c.exportCache();assert.equal(artifact.format,'activity-events-cache-v1');assert.equal(artifact.consent.enabled,false);assert.deepEqual(artifact.scope,core.KINDS);assert.equal(artifact.outbox[0].state,'pending');assert.equal(/access_token|refresh_token|password|publishableKey|localStorage/.test(JSON.stringify(artifact)),false);
  const mixed={...f.db,activityLifecycle:undefined};assert.throws(()=>f.make({repository:mixed}),{code:'upgrade_required'});
 }finally{f.close()}
});
test('IDB consent revision fences claim, acknowledgement and canonical commit independently of transport',async()=>{
 const f=await fixture(),c=f.make(),cmd=command();try{
  await c.ready;await c.useAccount();await c.createEvent(cmd);const consent=await f.scope.getActivityConsent(),epoch=f.servers.get(A).epoch,leaseOwner=uid();await f.scope.acquireLease(leaseOwner,1000,15000,POLICY);
  const claim=await f.scope.claimSync({leaseOwner,epoch,now:1000,policy:POLICY,activityConsentRevision:consent.localRevision}),response=f.servers.get(A).rpc('apply_event_operation',claim.operation.request),before=await f.scope.getSyncCursor(POLICY);await f.scope.setActivityConsent(false,consent.localRevision);
  await assert.rejects(f.scope.completeSync(cmd.operationId,claim.operation.request,response,{policy:POLICY,activityConsentRevision:consent.localRevision}),{code:'consent_changed'});
  await assert.rejects(f.scope.claimSync({leaseOwner,epoch,now:1000,policy:POLICY,activityConsentRevision:consent.localRevision}),{code:'consent_changed'});
  await assert.rejects(f.scope.applyCanonicalSnapshot({rows:[],epoch,afterRevision:'0',expectedLocalVersion:before.localVersion,policy:POLICY,activityConsentRevision:consent.localRevision}),{code:'consent_changed'});
  assert.deepEqual(await f.scope.getSyncCursor(POLICY),before);assert.equal((await f.scope.listOutbox())[0].state,'sending');
 }finally{f.close()}
});
test('malformed activity cache blocks the source and explicit full refresh recovers without legacy fallback',async()=>{
 const f=await fixture(),c=f.make(),cmd=command();try{
  await c.ready;await c.useAccount();const epoch=f.servers.get(A).epoch,cursor=await f.scope.getSyncCursor(POLICY),row={...core.payload(cmd.kind,cmd.value),id:cmd.id,user_id:A,source_kind:'manual',revision:'1',created_at:'2026-01-01T10:00:00Z',updated_at:'2026-01-01T10:00:00Z',deleted_at:null,score:21};
  await f.scope.applyCanonicalSnapshot({rows:[{kind:cmd.kind,id:cmd.id,row}],afterRevision:'1',epoch,policy:POLICY,expectedLocalVersion:cursor.localVersion});await c.refreshLocal();assert.equal(c.getState().mode,'error');assert.equal(c.getState().projection,null);const rescue=await c.exportCache();assert.equal(rescue.records[0].base.score,21);assert.equal(rescue.consent.enabled,true);await c.refresh();assert.equal(c.getState().mode,'account');assert.equal(c.getState().projection.events.academy_attempts.length,0);
 }finally{f.close()}
});
test('export refuses credential-shaped fields in corrupted cache instead of serializing them',async()=>{
 const f=await fixture();try{
  const repository={...f.db,scope(namespace){const own=f.db.scope(namespace),read=own.getActivitySnapshot;own.getActivitySnapshot=async()=>({...await read(),access_token:'synthetic-forbidden-field'});return own}},c=f.make({repository});await c.ready;await assert.rejects(c.exportCache(),{code:'credentials_forbidden'});
 }finally{f.close()}
});
test('cache corruption discovered after a local save blocks edits while retaining the committed valid intent',async()=>{
 const f=await fixture(),c=f.make(),bad=command(),good=command('match_records');try{
  await c.ready;await c.useAccount();const cursor=await f.scope.getSyncCursor(POLICY),row={...core.payload(bad.kind,bad.value),id:bad.id,user_id:A,source_kind:'manual',revision:'1',created_at:'2026-01-01T10:00:00Z',updated_at:'2026-01-01T10:00:00Z',deleted_at:null,score:21};
  await f.scope.applyCanonicalSnapshot({rows:[{kind:bad.kind,id:bad.id,row}],afterRevision:'1',epoch:cursor.epoch,policy:POLICY,expectedLocalVersion:cursor.localVersion});
  await assert.rejects(c.createEvent(good),{code:'invalid_activity'});assert.equal(c.getState().mode,'error');assert.equal(c.getState().snapshot,null);await assert.rejects(c.createEvent(command()),{code:'source_unavailable'});
  const cache=await c.exportCache();assert.equal(cache.records.length,2);assert.equal(cache.outbox.length,1);assert.equal(cache.outbox[0].operationId,good.operationId);assert.equal(cache.outbox[0].state,'pending');assert.equal(cache.outbox[0].payload.client_event_id,good.value.client_event_id);
 }finally{f.close()}
});
