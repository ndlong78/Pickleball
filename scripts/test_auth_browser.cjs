/* Real UI + SDK + GoTrue/Mailpit + RPC + native IDB. No traces or credentials
 * on disk/stdout. Errors deliberately report only a fixed phase and error type. */
'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {chromium,webkit}=require('@playwright/test');
const {start}=require('./lib/auth-browser-host.cjs');
const {payload:activityPayload}=require('../tests/helpers/activity-fixtures.cjs');
let phase='setup',diagnostics=null;
async function until(work,timeout=20000){
 const deadline=Date.now()+timeout;
 while(Date.now()<deadline){try{const result=await work();if(result)return result}catch(_){}await new Promise(r=>setTimeout(r,100))}
 throw Object.assign(new Error('condition_timeout'),{code:'condition_timeout'});
}
const hasText=(page,selector,text)=>until(async()=> (await page.locator(selector).textContent({timeout:1000})).includes(text));
const authStatus='#accountPanel [role=status]',importStatus='#importPilot [role=status]';
async function capturedOtp(email){
 return until(async()=>{
  const response=await fetch('http://127.0.0.1:54324/api/v1/messages',{redirect:'error'});assert.equal(response.status,200);
  for(const message of (await response.json()).messages){
   if(!message.To.some(to=>to.Address===email))continue;
   const detail=await fetch('http://127.0.0.1:54324/api/v1/message/'+encodeURIComponent(message.ID),{redirect:'error'});
   assert.equal(detail.status,200);const body=await detail.json();
   return (body.Text||body.HTML).match(/\b([0-9]{6,10})\b/)?.[1];
  }
 },30000);
}
async function login(page,email,{wrong=false}={}){
 await hasText(page,authStatus,'Chế độ khách');
 await page.locator('#accountPanel input[name=email]').fill(email);
 await page.locator('#accountPanel input[name=signup]').check();
 await until(()=>page.locator('#accountPanel button[name=send]').isEnabled());
 await page.locator('#accountPanel button[name=send]').click();
 await hasText(page,authStatus,'mã đã được gửi');
 const code=await capturedOtp(email);
 if(wrong){
  const bad=(code[0]==='0'?'1':'0')+code.slice(1);
  await page.locator('#accountPanel input[name=otp]').fill(bad);
  await page.locator('#accountPanel button[name=verify]').click();
  await hasText(page,authStatus,'Mã sai hoặc đã hết hạn');
 }
 await page.locator('#accountPanel input[name=otp]').fill(code);
 await page.locator('#accountPanel button[name=verify]').click();
 await hasText(page,authStatus,'Đã đăng nhập: '+email);
 await hasText(page,'[data-import-account]',email);
}
async function canonical(page){
 return page.evaluate(async()=>{
  const auth=await PickleUpAuth.getShared(PICKLEUP_AUTH_CONFIG);let state;const unsubscribe=auth.subscribe(value=>state=value);unsubscribe();
  const result=await auth.importRpc(state.user.id,'pull_changes',{p_after_revision:'0',p_limit:100,p_protocol_version:1});
  return {owner:state.user.id,result};
 });
}
const date='2026-01-01T10:00:00Z';
function source(score=5){return JSON.stringify({app:'PickleUp',schemaVersion:1,scores:{0:{score,date}},academyHistory:[{id:'PU-001',skill:'serve',level:'1.0–2.0',score:7,date},{id:'PU-001',skill:'serve',level:'1.0–2.0',score:7,date}],weeklyCheckins:{schemaVersion:1,entries:{'2026-01-01':{status:'done',minutes:30,lessonId:null,updatedAt:date}}}})}
async function chooseFile(page,text){
 await until(()=>page.locator('#importPilot input[type=file]').isEnabled());
 await page.locator('#importPilot input[type=file]').setInputFiles({name:'synthetic.json',mimeType:'application/json',buffer:Buffer.from(text)});
 await hasText(page,importStatus,'Tệp đã đọc');
}
async function preview(page){
 for(const group of ['scores','academyHistory','weeklyCheckins'])await page.locator('[data-import-groups] input[value='+group+']').check();
 await page.locator('[data-import-timezone]').fill('UTC');
 await page.locator('[data-import-preview]').click();
 await hasText(page,importStatus,'Preview sẵn sàng');
 assert.ok(await page.locator('[data-import-start]').isDisabled());
}
async function consent(page){await page.locator('[data-import-rescue]').check();await page.locator('[data-import-consent]').check();await page.locator('[data-import-start]').click()}
function verifyData(snapshot){
 assert.equal(snapshot.result.status,'ok');assert.equal(snapshot.result.has_more,false);
 assert.ok(snapshot.result.changes.every(change=>change.row.user_id===snapshot.owner));
 for(const [kind,count]of [['legacy_score_snapshots',1],['academy_attempts',2],['practice_checkins',1]])assert.equal(snapshot.result.changes.filter(change=>change.entity_kind===kind).length,count);
 const checkin=snapshot.result.changes.find(change=>change.entity_kind==='practice_checkins').row;
 assert.equal(checkin.minutes,30);assert.equal(checkin.lesson_id,null);assert.equal(checkin.source_kind,'legacy');
}
async function legacy(page){return page.evaluate(()=>JSON.stringify(Object.entries(localStorage).filter(([key])=>key.startsWith('pickleup_')&&key!=='pickleup_auth_v6').sort()))}
async function freshAccountRead(browser,context,host,writer){
 // Reuse the verified SDK session in RAM only; do not copy IDB or guest data,
 // request another OTP, write storageState files, or emit credential values.
 const expected=await writer.evaluate(async()=>{
  const auth=await PickleUpAuth.getShared(PICKLEUP_AUTH_CONFIG),owner=PICKLEUP_DATA.getState().owner,latest=new Map();let after='0',high=null,epoch=null;
  for(let page=0;page<201;page++){
   const result=await auth.syncRpc(owner,'pull_changes',{p_after_revision:after,p_limit:200,p_high_water:high,p_epoch:epoch,p_protocol_version:1});if(result.status!=='ok')throw Error('read_failed');
   for(const change of result.changes)latest.set(change.entity_kind+':'+change.entity_key,change);
   if(!result.has_more){const count=kinds=>[...latest.values()].filter(c=>kinds.includes(c.entity_kind)).length;return {revision:result.high_water,preferences:count(['user_preferences','practice_checkins']),activity:count(['academy_attempts','skill_assessments','training_entries','match_records']),plans:count(['personal_plans','user_selections']),goal:latest.get('user_preferences:self').row.target_days}}
   after=result.next_revision;high=result.high_water;epoch=result.epoch;
  }throw Error('read_limit');
 });
 const memory=await context.storageState(),entry=memory.origins.find(o=>o.origin===host.appOrigin),login=entry.localStorage.filter(x=>x.name==='pickleup_auth_v6');assert.equal(login.length,1);
 const receiver=await browser.newContext({viewport:{width:390,height:900},serviceWorkers:'block',storageState:{cookies:[],origins:[{origin:host.appOrigin,localStorage:login}]}});
 try{
  const page=await receiver.newPage();await page.goto(host.appOrigin+'/Pickleball/?page=settings');await page.evaluate(()=>PICKLEUP_PAGE_LOADER.ensure('settings'));await hasText(page,authStatus,'Đã đăng nhập');await until(()=>page.locator('[data-sync-enable]').isEnabled());
  assert.deepEqual(await page.evaluate(()=>[PICKLEUP_DATA.getState().mode,PICKLEUP_ACTIVITY.getState().mode,PICKLEUP_PLANS.getState().mode]),['guest','guest','guest']);
  const writes=host.state.rpc.filter(r=>r.name.startsWith('apply_')).length;
  await page.locator('[data-sync-enable]').click();await hasText(page,'#syncPilot [role=status]','Đã đọc kho tài khoản');
  for(const kind of ['activity','plan']){await page.locator('[data-'+kind+'-consent]').check();await page.locator('[data-'+kind+'-enable]').click();await until(()=>page.evaluate(kind=>{const s=(kind==='activity'?PICKLEUP_ACTIVITY:PICKLEUP_PLANS).getState();return s.mode==='account'&&!s.busy&&!!s.snapshot},kind))}
  const actual=await page.evaluate(()=>{const sources=[PICKLEUP_DATA,PICKLEUP_ACTIVITY,PICKLEUP_PLANS].map(x=>x.getState());return {counts:sources.map(s=>s.snapshot.records.length),revisions:sources.map(s=>s.snapshot.cursor.afterRevision),pending:sources.reduce((n,s)=>n+s.snapshot.outbox.filter(o=>['pending','sending','deferred'].includes(o.state)).length,0)}});
  assert.deepEqual(actual.counts,[expected.preferences,expected.activity,expected.plans]);assert.ok(actual.counts.every(n=>n>0));assert.deepEqual(actual.revisions,[expected.revision,expected.revision,expected.revision]);assert.equal(actual.pending,0);assert.equal(host.state.rpc.filter(r=>r.name.startsWith('apply_')).length,writes);
  await page.evaluate(async()=>{PICKLEUP_ROUTER.openPage('progress');await PICKLEUP_PAGE_LOADER.ensure('progress')});await until(()=>page.locator('#wgDays').isEnabled());assert.equal(await page.locator('#wgDays').inputValue(),String(expected.goal));
 }finally{await receiver.close()}
}
async function runEngine(engine,name,host){
 let browser,context,page,currentPage;
 try{
  phase=name+':launch';browser=await engine.launch();context=await browser.newContext({viewport:{width:390,height:900}});
  // No request mocking, storageState files, screenshots, tracing or videos.
  page=await context.newPage();currentPage=page;const url=host.appOrigin+'/Pickleball/?page=settings',text=source();
  await page.goto(url);await hasText(page,authStatus,'Chế độ khách');
  await page.evaluate(()=>localStorage.setItem('pickleup_scores','{"0":{"score":11,"date":"2026-01-01T10:00:00Z"}}'));
  const before=await legacy(page),a='browser-a-'+crypto.randomUUID()+'@example.invalid',b='browser-b-'+crypto.randomUUID()+'@example.invalid';
  phase=name+':otp_ui_wrong_then_valid';await login(page,a,{wrong:true});
  const emptyA=await canonical(page);assert.equal(emptyA.result.status,'ok');assert.deepEqual(emptyA.result.changes,[]);
  assert.equal(host.state.rpc.filter(r=>r.name==='begin_import').length,0);
  phase=name+':choose_source';await chooseFile(page,text);phase=name+':preview_source';await preview(page);host.state.dropNextBatch=true;phase=name+':committed_response_loss';await consent(page);
  await hasText(page,importStatus,'Lỗi mạng');assert.equal(host.state.dropCount,1);
  const firstBatch=host.state.rpc.find(r=>r.name==='import_batch').body;
  phase=name+':reload_session_and_checkpoint';await page.reload();await hasText(page,authStatus,'Đã đăng nhập: '+a);await chooseFile(page,text);
  await page.locator('[data-import-preview]').click();await hasText(page,importStatus,'Checkpoint đã khôi phục');
  for(const group of ['scores','academyHistory','weeklyCheckins']){const checkbox=page.locator('[data-import-groups] input[value='+group+']');assert.ok(await checkbox.isChecked());assert.ok(await checkbox.isDisabled())}
  await consent(page);await hasText(page,importStatus,'Phiên nhập đã hoàn tất');
  const batches=host.state.rpc.filter(r=>r.name==='import_batch');assert.equal(batches.length,2);assert.equal(batches[1].body,firstBatch);
  const dataA=await canonical(page);verifyData(dataA);assert.equal(dataA.owner,emptyA.owner);
  const checkpoint=await page.evaluate(async({text,owner})=>{const info=await PickleUpRescue.preview(text),db=await PickleUpLocalRepository.open();try{return await db.scope('user:'+owner).getImportCheckpoint(info.fingerprint,PickleUpImportCore.VERSION)}finally{db.close()}},{text,owner:dataA.owner});
  assert.equal(checkpoint.value.phase,'complete');assert.equal(checkpoint.value.counts.applied,4);
  phase=name+':native_tab_restore';const tab=await context.newPage();await tab.goto(url);await hasText(tab,authStatus,'Đã đăng nhập: '+a);
  assert.equal(host.state.rpc.filter(r=>r.name==='import_batch').length,2);
  phase=name+':canonical_cache_bootstrap';
  await page.addScriptTag({url:host.appOrigin+'/Pickleball/modules/data/pull-controller.js'});
  const cache=await page.evaluate(async owner=>{
   const db=await PickleUpLocalRepository.open(),auth=await PickleUpAuth.getShared(PICKLEUP_AUTH_CONFIG),reader=PickleUpPullController.create({auth,repository:db,owner,enabled:()=>true,pageSize:2});
   window.PR4A_READER=reader;window.PR4A_DB=db;await reader.pull();const scope=db.scope('user:'+owner);
   try{const row=await scope.read('practice_checkins','2026-01-01');await scope.write({kind:'practice_checkins',id:'2026-01-01',value:{status:'skipped',minutes:null,lesson_id:null,timezone_at_entry:'UTC'},operationId:crypto.randomUUID(),expectedLocalRevision:row.localRevision});window.PR4A_QUEUE=JSON.stringify(await scope.listOutbox());return {minutes:row.base.minutes,cursor:await scope.getSyncCursor()}}finally{scope.close()}
  },dataA.owner);assert.equal(cache.minutes,30);assert.ok(BigInt(cache.cursor.afterRevision)>2n);
  phase=name+':same_account_remote_update';
  const updatedSource=JSON.stringify({app:'PickleUp',schemaVersion:1,scores:{},weeklyGoal:{days:2,level:'1.0–2.0'},weeklyPlan:{minutes:30,gentle:true},weeklyCheckins:{schemaVersion:1,entries:{'2026-01-01':{status:'done',minutes:45,lessonId:null,updatedAt:date}}}});
  await chooseFile(tab,updatedSource);for(const group of ['weeklyGoal','weeklyPlan','weeklyCheckins'])await tab.locator('[data-import-groups] input[value='+group+']').check();await tab.locator('[data-import-timezone]').fill('UTC');await tab.locator('[data-import-preview]').click();await hasText(tab,importStatus,'Còn mục');
  await tab.locator('[data-import-rows] select').selectOption('1');await tab.locator('[data-import-preview]').click();await hasText(tab,importStatus,'Preview sẵn sàng');await consent(tab);await hasText(tab,importStatus,'Phiên nhập đã hoàn tất');
  phase=name+':delta_and_full_resync_keep_pending';
  const preserved=await page.evaluate(async owner=>{
   await PR4A_READER.pull();const scope=PR4A_DB.scope('user:'+owner);try{
    const delta=await scope.read('practice_checkins','2026-01-01');await PR4A_READER.pull({forceReset:true});const full=await scope.read('practice_checkins','2026-01-01');
    return {delta,full,prefs:await scope.read('user_preferences','self'),sameQueue:JSON.stringify(await scope.listOutbox())===PR4A_QUEUE};
   }finally{scope.close()}
  },dataA.owner);assert.equal(preserved.delta.base.minutes,45);assert.equal(preserved.delta.overlay.status,'skipped');assert.equal(preserved.delta.reviewBase.row.minutes,30);assert.equal(preserved.full.base.minutes,45);assert.equal(preserved.full.reviewReason,'reset_required');assert.equal(preserved.sameQueue,true);assert.equal(preserved.prefs.base.target_days,2);assert.equal(preserved.prefs.base.gentle,true);
  phase=name+':fenced_conflict_resolution';
  await page.addScriptTag({url:host.appOrigin+'/Pickleball/modules/data/sync-controller.js'});
  const resolution=await page.evaluate(async owner=>{
   const db=await PickleUpLocalRepository.open(),auth=await PickleUpAuth.getShared(PICKLEUP_AUTH_CONFIG),sender=PickleUpSyncController.create({auth,repository:db,owner,pullFactory:PickleUpPullController,enabled:()=>true}),scope=db.scope('user:'+owner);
   window.PR4B_SENDER=sender;window.PR4B_DB=db;
   try{const result=await sender.sync();const old=JSON.parse(PR4A_QUEUE)[0],view=await scope.inspectSyncConflict(old.operationId),operationId=crypto.randomUUID();
    await scope.resolveSyncConflict({conflictId:old.operationId,operationId,mode:'local',epoch:view.cursor.epoch,expectedLocalRevision:view.record.localRevision,expectedRemoteRevision:view.record.baseRevision,acknowledgeEpochChange:true,value:{status:'skipped',minutes:null,lesson_id:null,timezone_at_entry:'UTC'}});return {status:result.status,operationId,revision:view.record.baseRevision};
   }finally{scope.close()}
  },dataA.owner);assert.equal(resolution.status,'needs_review');
  phase=name+':fenced_commit_loss_and_replay';host.state.dropNextSync=true;
  assert.equal(await page.evaluate(async()=>{const result=await PR4B_SENDER.sync();PR4B_SENDER.close();PR4B_DB.close();delete window.PR4B_SENDER;delete window.PR4B_DB;return result.status}),'network_error');
  const originalSync=host.state.rpc.filter(r=>r.name==='apply_sync_operation').at(-1).body;
  const synced=await page.evaluate(async owner=>{const db=await PickleUpLocalRepository.open(),auth=await PickleUpAuth.getShared(PICKLEUP_AUTH_CONFIG),sender=PickleUpSyncController.create({auth,repository:db,owner,pullFactory:PickleUpPullController,enabled:()=>true}),scope=db.scope('user:'+owner);try{const result=await sender.sync({forceRetry:true});return {status:result.status,row:await scope.read('practice_checkins','2026-01-01'),queue:await scope.listOutbox()}}finally{scope.close();sender.close();db.close()}},dataA.owner);
  assert.equal(synced.status,'synced');assert.equal(synced.row.base.status,'skipped');assert.equal(synced.row.base.minutes,null);assert.equal(synced.row.base.revision,(BigInt(resolution.revision)+1n).toString());assert.equal(host.state.rpc.filter(r=>r.name==='apply_sync_operation').at(-1).body,originalSync);assert.equal(host.state.syncDropCount,1);
  phase=name+':activity_bootstrap_account_a';await page.addScriptTag({url:host.appOrigin+'/Pickleball/modules/data/activity-core.js'});
  const activityA=await page.evaluate(async owner=>{const db=await PickleUpLocalRepository.open(),auth=await PickleUpAuth.getShared(PICKLEUP_AUTH_CONFIG),reader=PickleUpPullController.create({auth,repository:db,owner,policy:'activity-events-1',activityCore:PickleUpActivityCore,enabled:()=>true,pageSize:2});window.PR5A_DB=db;window.PR5A_READER=reader;await reader.pull();const snapshot=await db.scope('user:'+owner).getActivitySnapshot();return {count:snapshot.records.length,own:snapshot.records.every(r=>r.base.user_id===owner)}},dataA.owner);assert.equal(activityA.count,2);assert.equal(activityA.own,true);
  await page.addScriptTag({url:host.appOrigin+'/Pickleball/modules/data/activity-controller.js'});
  await page.evaluate(async()=>{const auth=await PickleUpAuth.getShared(PICKLEUP_AUTH_CONFIG);window.PR5A2_LIFE=PickleUpActivityController.create({auth,repository:PR5A_DB,enabled:()=>true});await PR5A2_LIFE.ready;await PR5A2_LIFE.useAccount()});
  phase=name+':plan_fenced_late_account_a';
  for(const file of ['plan-core','plan-controller'])await page.addScriptTag({url:host.appOrigin+'/Pickleball/modules/data/'+file+'.js'});
  const heldPlan=host.holdNextPlan();
  const aPlanId=await page.evaluate(async owner=>{
   const auth=await PickleUpAuth.getShared(PICKLEUP_AUTH_CONFIG),prepared=await auth.planRpc(owner,'prepare_sync',{}),id=crypto.randomUUID();
   await PICKLEUP_PAGE_LOADER.ensure('coach');
   const snapshot=PICKLEUP_PERSONAL_CORE.createPlan({serve:12,return:12,dink:12,volley:12,position:12,strategy:12},[],'1.0–2.0','2026-01-01T10:00:00Z');
   window.PR5B_A_DB=await PickleUpLocalRepository.open();window.PR5B_A_CLIENT=PickleUpPlanController.create({auth,repository:PR5B_A_DB,enabled:()=>true});await PR5B_A_CLIENT.ready;await PR5B_A_CLIENT.useAccount();
   await PR5B_A_CLIENT.createPlan({id:crypto.randomUUID(),operationId:crypto.randomUUID(),value:{source:'basic',schema_version:1,level_band:'1.0–2.0',plan_snapshot:snapshot}});
   window.PR5B_LATE=auth.planRpc(owner,'apply_plan_operation',{p_operation_id:crypto.randomUUID(),p_kind:'personal_plans',p_entity_key:id,p_action:'put',p_expected_revision:'0',p_epoch:prepared.epoch,p_payload:{source:'basic',schema_version:1,level_band:'1.0–2.0',plan_snapshot:snapshot},p_protocol_version:1});return id;
  },dataA.owner);
  assert.equal((await heldPlan.seen).status,'applied');
  phase=name+':opt_in_account_source_a';await page.locator('[data-sync-enable]').click();await hasText(page,'#syncPilot [role=status]','Đã đọc kho tài khoản');
  phase=name+':late_source_a_response';
  const changedA=await page.evaluate(async()=>{const state=PICKLEUP_DATA.getState(),auth=await PickleUpAuth.getShared(PICKLEUP_AUTH_CONFIG);return auth.syncRpc(state.owner,'apply_sync_operation',{p_operation_id:crypto.randomUUID(),p_kind:'user_preferences',p_entity_key:'self',p_action:'put',p_expected_revision:state.projection.prefRow.baseRevision,p_epoch:state.snapshot.cursor.epoch,p_payload:{target_days:5},p_protocol_version:1})});assert.equal(changedA.status,'applied');
  const held=host.holdNextPull();await chooseFile(page,source(6));
  await page.locator('[data-sync-read]').click();const delayed=await held.seen;
  assert.equal(delayed.status,'ok');assert.ok(delayed.changes.some(change=>change.row.user_id===dataA.owner));
  await tab.locator('[data-logout]').click();await hasText(page,authStatus,'Chế độ khách');
  phase=name+':real_account_b_login';const next=await context.newPage();currentPage=next;await next.goto(url);await login(next,b);
  await hasText(page,'[data-import-account]',b);held.release();heldPlan.release();assert.equal((await page.evaluate(()=>PR5B_LATE)).status,'stale');assert.equal(await page.evaluate(()=>PR5B_A_CLIENT.getState().snapshot),null);assert.equal(await page.evaluate(async owner=>(await PR5B_A_DB.scope('user:'+owner).listOutbox()).filter(o=>o.kind==='personal_plans'&&o.state==='pending').length,dataA.owner),1);await page.evaluate(()=>{PR5B_A_CLIENT.close();PR5B_A_DB.close()});
  assert.equal(await page.evaluate(()=>PR5A_READER.pull().then(()=>null,error=>error.code)),'account_changed');assert.equal(await page.evaluate(()=>PR5A2_LIFE.getState().snapshot),null);await page.evaluate(()=>{PR5A2_LIFE.close();PR5A_DB.close();delete window.PR5A2_LIFE;delete window.PR5A_DB;delete window.PR5A_READER});
  const emptyB=await canonical(next);assert.equal(emptyB.result.status,'ok');assert.deepEqual(emptyB.result.changes,[]);assert.notEqual(emptyB.owner,dataA.owner);
  assert.equal((await page.locator('[data-import-summary]').textContent()).trim(),'');assert.equal(await page.locator('#importPilot input[type=file]').inputValue(),'');
  phase=name+':same_file_distinct_owner';await chooseFile(next,text);await preview(next);await consent(next);await hasText(next,importStatus,'Phiên nhập đã hoàn tất');
  const dataB=await canonical(next);verifyData(dataB);
  const idsA=new Set(dataA.result.changes.filter(c=>c.entity_kind==='academy_attempts').map(c=>c.entity_key));assert.ok(dataB.result.changes.filter(c=>c.entity_kind==='academy_attempts').every(c=>!idsA.has(c.entity_key)));
  phase=name+':canonical_cache_account_b';
  assert.equal(await page.evaluate(()=>PR4A_READER.pull().then(()=>null,error=>error.code)),'account_changed');await page.evaluate(()=>{PR4A_DB.close();delete window.PR4A_DB;delete window.PR4A_READER;delete window.PR4A_QUEUE});
  await next.addScriptTag({url:host.appOrigin+'/Pickleball/modules/data/pull-controller.js'});
  const cacheB=await next.evaluate(async owner=>{const db=await PickleUpLocalRepository.open(),auth=await PickleUpAuth.getShared(PICKLEUP_AUTH_CONFIG),reader=PickleUpPullController.create({auth,repository:db,owner,enabled:()=>true,pageSize:2}),scope=db.scope('user:'+owner);try{await reader.pull();return {row:await scope.read('practice_checkins','2026-01-01'),queue:await scope.listOutbox()}}finally{scope.close();reader.close();db.close()}},dataB.owner);
  assert.equal(cacheB.row.base.user_id,dataB.owner);assert.equal(cacheB.row.base.minutes,30);assert.equal(cacheB.row.overlay,null);assert.deepEqual(cacheB.queue,[]);
  phase=name+':fenced_sender_account_b';
  await next.addScriptTag({url:host.appOrigin+'/Pickleball/modules/data/sync-controller.js'});
  const sentB=await next.evaluate(async owner=>{const db=await PickleUpLocalRepository.open(),auth=await PickleUpAuth.getShared(PICKLEUP_AUTH_CONFIG),sender=PickleUpSyncController.create({auth,repository:db,owner,pullFactory:PickleUpPullController,enabled:()=>true}),scope=db.scope('user:'+owner);try{await scope.write({kind:'user_preferences',id:'self',operationId:crypto.randomUUID(),value:{target_days:3,level_band:'1.0–2.0',session_minutes:30,gentle:false,goal_configured:true}});const result=await sender.sync();return {status:result.status,row:await scope.read('user_preferences','self'),queue:await scope.listOutbox()}}finally{scope.close();sender.close();db.close()}},dataB.owner);
  assert.equal(sentB.status,'synced');assert.equal(sentB.row.base.user_id,dataB.owner);assert.equal(sentB.row.base.target_days,3);assert.ok(sentB.queue.every(op=>op.state==='acked'&&op.request.p_epoch===cacheB.row.baseEpoch));
  phase=name+':source_b_requires_own_opt_in';await until(()=>next.locator('[data-sync-enable]').isEnabled());
  const writesBefore=host.state.rpc.filter(r=>r.name==='apply_sync_operation').length;
  await next.locator('[data-sync-enable]').click();await hasText(next,'#syncPilot [role=status]','Đã đọc kho tài khoản');
  assert.equal(host.state.rpc.filter(r=>r.name==='apply_sync_operation').length,writesBefore);
  await next.locator('[data-sync-timezone]').fill('UTC');await next.locator('[data-sync-zone-save]').click();await hasText(next,'#syncPilot [role=status]','Đã xác nhận múi giờ');
  phase=name+':real_preferences_and_checkin_ui';await next.evaluate(()=>PICKLEUP_ROUTER.openPage('progress'));await until(()=>next.locator('#wgDays').isEnabled());
  assert.equal(await next.locator('#wgDays').inputValue(),'3');await next.locator('#wgDays').selectOption('4');await next.locator('#wgSave').click();await hasText(next,'#wgStatus','chờ đồng bộ');
  await next.locator('#wpGentle').check();await next.locator('#wpSave').click();await hasText(next,'#wpStatus','chờ đồng bộ');
  await next.evaluate(()=>PICKLEUP_ROUTER.openPage('journey'));await until(()=>next.locator('#jDone').isEnabled());await next.locator('#jTodayMinutes').fill('35');await next.locator('#jDone').click();await hasText(next,'#jCheckStatus','chờ đồng bộ');
  assert.equal(host.state.rpc.filter(r=>r.name==='apply_sync_operation').length,writesBefore);
  await next.evaluate(()=>PICKLEUP_ROUTER.openPage('settings'));host.state.dropNextSync=true;await next.locator('[data-sync-send]').click();await hasText(next,'#syncPilot [role=status]','Lỗi mạng');
  const lostUI=host.state.rpc.filter(r=>r.name==='apply_sync_operation').at(-1).body,requestsBeforeReload=host.state.rpc.length;
  phase=name+':real_source_restore_and_ui_retry';await next.reload();await hasText(next,authStatus,'Đã đăng nhập');await until(()=>next.locator('[data-sync-retry]').isVisible());assert.equal(host.state.rpc.length,requestsBeforeReload);
  await next.locator('[data-sync-retry]').click();await hasText(next,'#syncPilot [role=status]','Đã đồng bộ');
  const uiRequests=host.state.rpc.filter(r=>r.name==='apply_sync_operation').slice(writesBefore);assert.equal(uiRequests.length,4);assert.equal(uiRequests[0].body,lostUI);assert.equal(uiRequests[1].body,lostUI);
  const uiB=await canonical(next),latestPrefs=uiB.result.changes.filter(change=>change.entity_kind==='user_preferences').at(-1).row;
  assert.equal(latestPrefs.target_days,4);assert.equal(latestPrefs.gentle,true);assert.equal(latestPrefs.revision,'3');
  const today=await next.evaluate(()=>PICKLEUP_WEEK_CHECKINS.today()),todayRow=uiB.result.changes.filter(change=>change.entity_kind==='practice_checkins'&&change.entity_key===today).at(-1).row;assert.equal(todayRow.minutes,35);assert.equal(todayRow.status,'done');assert.equal(todayRow.user_id,dataB.owner);
  phase=name+':real_conflict_preview_and_decision_ui';await next.evaluate(()=>PICKLEUP_ROUTER.openPage('progress'));await until(()=>next.locator('#wgDays').isEnabled());await next.locator('#wgDays').selectOption('5');await next.locator('#wgSave').click();await hasText(next,'#wgStatus','chờ đồng bộ');
  const changedB=await next.evaluate(async()=>{const state=PICKLEUP_DATA.getState(),auth=await PickleUpAuth.getShared(PICKLEUP_AUTH_CONFIG);return auth.syncRpc(state.owner,'apply_sync_operation',{p_operation_id:crypto.randomUUID(),p_kind:'user_preferences',p_entity_key:'self',p_action:'put',p_expected_revision:state.projection.prefRow.baseRevision,p_epoch:state.snapshot.cursor.epoch,p_payload:{target_days:2},p_protocol_version:1})});assert.equal(changedB.status,'applied');
  await next.evaluate(()=>PICKLEUP_ROUTER.openPage('settings'));await next.locator('[data-sync-send]').click();await hasText(next,'#syncPilot [role=status]','xem và xử lý');await next.locator('[data-sync-conflicts] button').click();await hasText(next,'.sync-comparison','5 ngày');await hasText(next,'.sync-comparison','2 ngày');
  await next.getByLabel('Bản muốn giữ').selectOption('local');await next.getByRole('button',{name:'Xác nhận lựa chọn',exact:true}).click();await hasText(next,'#syncPilot [role=status]','Bấm đồng bộ để gửi');await next.locator('[data-sync-send]').click();await hasText(next,'#syncPilot [role=status]','Đã đồng bộ');
  const archiveB=await next.evaluate(()=>PICKLEUP_DATA.controller().exportCache()),resolutionB=archiveB.conflicts.find(c=>c.state==='resolved').resolution;assert.equal(resolutionB.local.target_days,5);assert.equal(resolutionB.remote.target_days,2);assert.equal(resolutionB.operations[0].request.p_expected_revision,'3');assert.notEqual(resolutionB.operationId,resolutionB.operations[0].operationId);
  const decidedB=await canonical(next),finalPrefs=decidedB.result.changes.filter(c=>c.entity_kind==='user_preferences').at(-1).row;assert.equal(finalPrefs.target_days,5);assert.equal(finalPrefs.revision,'5');
  assert.equal(await legacy(next),before);
  phase=name+':activity_owned_plan_prerequisite';
  const plan=await next.evaluate(()=>PICKLEUP_PERSONAL_CORE.createPlan({serve:10,return:12,dink:14,volley:16,position:18,strategy:20},[],'1.0–2.0','2026-01-01T10:00:00Z'));
  await chooseFile(next,JSON.stringify({app:'PickleUp',schemaVersion:1,scores:{},personalPlans:[plan]}));for(const box of await next.locator('[data-import-groups] input').all())await box.uncheck();await next.locator('[data-import-groups] input[value=personalPlans]').check();await next.locator('[data-import-preview]').click();await hasText(next,importStatus,'Preview sẵn sàng');await consent(next);await hasText(next,importStatus,'Phiên nhập đã hoàn tất');
  const withPlan=await canonical(next),ownedPlan=withPlan.result.changes.find(c=>c.entity_kind==='personal_plans');assert.ok(ownedPlan);const checkinsBefore=withPlan.result.changes.filter(c=>c.entity_kind==='practice_checkins').length;
  phase=name+':activity_four_domains_real_commit_loss';await next.addScriptTag({url:host.appOrigin+'/Pickleball/modules/data/activity-core.js'});
  const eventValues=['academy_attempts','skill_assessments','training_entries','match_records'].map(kind=>({kind,id:crypto.randomUUID(),operationId:crypto.randomUUID(),value:activityPayload(kind,crypto.randomUUID(),ownedPlan.entity_key)}));host.state.dropNextEvent=true;
  const eventFirst=await next.evaluate(async({owner,values})=>{const db=await PickleUpLocalRepository.open(),auth=await PickleUpAuth.getShared(PICKLEUP_AUTH_CONFIG),sender=PickleUpSyncController.create({auth,repository:db,owner,policy:'activity-events-1',activityCore:PickleUpActivityCore,pullFactory:PickleUpPullController,enabled:()=>true}),scope=db.scope('user:'+owner);try{const mutableBefore=await scope.getSyncCursor();for(const value of values)await scope.write(value);const result=await sender.sync();return {status:result.status,mutableBefore}}finally{scope.close();sender.close();db.close()}},{owner:dataB.owner,values:eventValues});assert.equal(eventFirst.status,'network_error');assert.equal(host.state.eventDropCount,1);const frozenEvent=host.state.rpc.filter(r=>r.name==='apply_event_operation').at(-1).body;
  phase=name+':activity_native_reload_exact_replay';const requestsBeforeEventReload=host.state.rpc.length;await next.reload();await hasText(next,authStatus,'Đã đăng nhập');assert.equal(host.state.rpc.length,requestsBeforeEventReload);await next.addScriptTag({url:host.appOrigin+'/Pickleball/modules/data/activity-core.js'});
  const eventsRecovered=await next.evaluate(async owner=>{const db=await PickleUpLocalRepository.open(),auth=await PickleUpAuth.getShared(PICKLEUP_AUTH_CONFIG),sender=PickleUpSyncController.create({auth,repository:db,owner,policy:'activity-events-1',activityCore:PickleUpActivityCore,pullFactory:PickleUpPullController,enabled:()=>true}),scope=db.scope('user:'+owner);try{const result=await sender.sync({forceRetry:true}),snapshot=await scope.getActivitySnapshot();return {status:result.status,snapshot,mutable:await scope.getSyncCursor(),counts:Object.fromEntries(Object.entries(PickleUpActivityCore.project(snapshot,{owner}).events).map(([kind,rows])=>[kind,rows.length]))}}finally{scope.close();sender.close();db.close()}},dataB.owner);
  assert.equal(eventsRecovered.status,'synced');assert.deepEqual(eventsRecovered.mutable,eventFirst.mutableBefore);assert.deepEqual(eventsRecovered.counts,{academy_attempts:3,skill_assessments:1,training_entries:1,match_records:1});assert.ok(eventsRecovered.snapshot.records.every(row=>row.base.user_id===dataB.owner));assert.ok(eventsRecovered.snapshot.outbox.every(op=>op.state==='acked'));
  const eventRequests=host.state.rpc.filter(r=>r.name==='apply_event_operation');assert.equal(eventRequests.length,5);assert.equal(eventRequests[0].body,frozenEvent);assert.equal(eventRequests[1].body,frozenEvent);const activityServer=await canonical(next);assert.equal(activityServer.result.changes.filter(c=>c.entity_kind==='practice_checkins').length,checkinsBefore);assert.equal(await legacy(next),before);
  phase=name+':activity_lifecycle_independent_consent';await next.addScriptTag({url:host.appOrigin+'/Pickleball/modules/data/activity-controller.js'});
  const lifecycleB=await next.evaluate(async()=>{
   const db=await PickleUpLocalRepository.open(),auth=await PickleUpAuth.getShared(PICKLEUP_AUTH_CONFIG);window.PR5A2_DB=db;window.PR5A2_LIFE=PickleUpActivityController.create({auth,repository:db,enabled:()=>true});await PR5A2_LIFE.ready;const initial=PR5A2_LIFE.getState();await PR5A2_LIFE.useAccount();return {initial:initial.mode,consent:initial.consent,counts:Object.values(PR5A2_LIFE.getState().projection.events).map(rows=>rows.length)};
  });assert.equal(lifecycleB.initial,'guest');assert.equal(lifecycleB.consent.enabled,false);assert.deepEqual(lifecycleB.counts,[3,1,1,1]);
  phase=name+':activity_lifecycle_real_conflict_and_delete_repair';
  for(const deleting of [false,true]){
   const cmd={kind:'academy_attempts',id:crypto.randomUUID(),operationId:crypto.randomUUID(),value:activityPayload('academy_attempts')};
   const reviewed=await next.evaluate(async({cmd,deleting})=>{
    const c=PR5A2_LIFE;await c.createEvent(cmd);if(deleting)await c.deleteEvent({kind:cmd.kind,id:cmd.id,operationId:crypto.randomUUID(),expectedLocalRevision:'1'});
    const state=c.getState(),auth=await PickleUpAuth.getShared(PICKLEUP_AUTH_CONFIG),writer=await auth.eventRpc(state.owner,'apply_event_operation',{p_operation_id:crypto.randomUUID(),p_kind:cmd.kind,p_entity_key:cmd.id,p_action:'put',p_expected_revision:'0',p_epoch:state.snapshot.cursor.epoch,p_payload:{...cmd.value,client_event_id:crypto.randomUUID(),score:5},p_protocol_version:1});
    const sent=await c.sync(),view=await c.previewReview(cmd.kind,cmd.id);let denied;try{await c.resolveReview(view,'retry_create',{operationId:crypto.randomUUID()})}catch(error){denied=error.code}
    const operationId=crypto.randomUUID();await c.resolveReview(view,deleting?'retry_delete':'server',{operationId});const result=await c.sync(),artifact=await c.exportCache();return {writer:writer.status,sent:sent.status,denied,result:result.status,archive:artifact.conflicts.find(x=>x.conflictId===operationId),row:artifact.records.find(x=>x.id===cmd.id)};
   },{cmd,deleting});assert.equal(reviewed.writer,'applied');assert.equal(reviewed.sent,'needs_review');assert.equal(reviewed.denied,'append_only');assert.equal(reviewed.result,'synced');assert.equal(reviewed.archive.resolution.remote.score,5);assert.equal(reviewed.archive.resolution.operations.length,deleting?2:1);assert.equal(reviewed.row.deleted,deleting);
  }
  phase=name+':activity_lifecycle_real_unknown_commit_and_opt_out';host.state.dropNextEvent=true;
  const lifecycleLost=await next.evaluate(async value=>{
   const c=PR5A2_LIFE,cmd={kind:'match_records',id:crypto.randomUUID(),operationId:crypto.randomUUID(),value};await c.createEvent(cmd);const result=await c.sync();await c.useDevice();const optedOut=c.getState();await c.useAccount();const view=await c.previewReview(cmd.kind,cmd.id);let denied;try{await c.resolveReview(view,'server',{operationId:crypto.randomUUID()})}catch(error){denied=error.code}return {status:result.status,cleared:optedOut.snapshot===null,denied};
  },activityPayload('match_records'));assert.equal(lifecycleLost.status,'network_error');assert.equal(lifecycleLost.cleared,true);assert.equal(lifecycleLost.denied,'uncertain_operation');
  const lostLifecycleBody=host.state.rpc.filter(r=>r.name==='apply_event_operation').at(-1).body;
  assert.equal(await next.evaluate(async()=> (await PR5A2_LIFE.sync({forceRetry:true})).status),'synced');assert.equal(host.state.rpc.filter(r=>r.name==='apply_event_operation').at(-1).body,lostLifecycleBody);assert.equal(host.state.eventDropCount,2);
  const lifecycleMutable=await next.evaluate(async owner=>PR5A2_DB.scope('user:'+owner).getSyncCursor(),dataB.owner);assert.deepEqual(lifecycleMutable,eventFirst.mutableBefore);const lifecycleServer=await canonical(next);assert.equal(lifecycleServer.result.changes.filter(c=>c.entity_kind==='practice_checkins').length,checkinsBefore);assert.equal(await legacy(next),before);
  phase=name+':academy_ui_explicit_source_and_local_attempts';
  await until(()=>next.locator('[data-activity-device]').isEnabled());await next.locator('[data-activity-device]').click();await hasText(next,'#activityPilot [role=status]','Hoạt động đang dùng kho thiết bị');
  await next.locator('[data-activity-consent]').check();await next.locator('[data-activity-enable]').click();await hasText(next,'#activityPilot [role=status]','Đã đọc kho hoạt động');const academyWritesBefore=host.state.rpc.filter(r=>r.name==='apply_event_operation').length;
  await next.evaluate(async()=>{await PICKLEUP_ROUTER.openPage('academy');await PICKLEUP_PAGE_LOADER.ensure('academy')});
  for(const [id,value]of [['academyFeed','partner'],['academyPace','slow'],['academyTarget','wide']])await next.locator('#'+id).selectOption(value);
  for(const value of [14,17]){await next.locator('#academyScore').fill(String(value));await next.locator('#academySave').click();await hasText(next,'#academyStatus','Đã lưu '+value+'/20 trong kho tài khoản')}
  await hasText(next,'#academyTrendText','tăng 3');assert.equal(host.state.rpc.filter(r=>r.name==='apply_event_operation').length,academyWritesBefore);assert.equal(await legacy(next),before);
  await next.evaluate(async()=>{await PICKLEUP_ROUTER.openPage('progress');await PICKLEUP_PAGE_LOADER.ensure('progress')});await next.locator('#aiLevel').selectOption('1.0–2.0');await next.locator('#aiSkill').selectOption('serve');await next.locator('#aiLesson').selectOption('PU-001');await hasText(next,'#aiDelta','+3 điểm');assert.equal(await next.locator('#aiChart li').count(),2);
  phase=name+':academy_ui_real_commit_loss_reload_replay';await next.evaluate(()=>PICKLEUP_ROUTER.openPage('settings'));host.state.dropNextEvent=true;await next.locator('[data-activity-send]').click();await hasText(next,'#activityPilot [role=status]','Lỗi mạng');const lostAcademyBody=host.state.rpc.filter(r=>r.name==='apply_event_operation').at(-1).body,academyReloadBefore=host.state.rpc.length;
  await next.reload();await hasText(next,authStatus,'Đã đăng nhập');await until(()=>next.locator('[data-activity-retry]').isVisible());assert.equal(host.state.rpc.length,academyReloadBefore);await next.locator('[data-activity-retry]').click();await hasText(next,'#activityPilot [role=status]','Đã đồng bộ');
  const academyWrites=host.state.rpc.filter(r=>r.name==='apply_event_operation').slice(academyWritesBefore);assert.equal(academyWrites.length,3);assert.equal(academyWrites[0].body,lostAcademyBody);assert.equal(academyWrites[1].body,lostAcademyBody);assert.notEqual(JSON.parse(academyWrites[2].body).p_payload.client_event_id,JSON.parse(lostAcademyBody).p_payload.client_event_id);
  phase=name+':academy_ui_delete_local';await next.evaluate(async()=>{await PICKLEUP_ROUTER.openPage('academy');await PICKLEUP_PAGE_LOADER.ensure('academy')});assert.equal(await next.evaluate(()=>PICKLEUP_ACTIVITY.events()[0].score),17);next.once('dialog',dialog=>dialog.accept());await next.locator('#academyAttemptList button').first().click();await hasText(next,'#academyStatus','chờ đồng bộ');phase=name+':academy_ui_delete_sync';await next.evaluate(()=>PICKLEUP_ROUTER.openPage('settings'));await next.locator('[data-activity-send]').click();await hasText(next,'#activityPilot [role=status]','Đã đồng bộ');
  phase=name+':academy_ui_remote_tombstone';await next.evaluate(()=>PICKLEUP_ROUTER.openPage('academy'));const remainingAcademy=await next.evaluate(()=>PICKLEUP_ACTIVITY.events()[0]);assert.equal(remainingAcademy.score,14);
  const deletedElsewhere=await next.evaluate(async id=>{const auth=await PickleUpAuth.getShared(PICKLEUP_AUTH_CONFIG),state=PICKLEUP_ACTIVITY.getState();return auth.eventRpc(state.owner,'apply_event_operation',{p_operation_id:crypto.randomUUID(),p_kind:'academy_attempts',p_entity_key:id,p_action:'delete',p_expected_revision:'1',p_epoch:state.snapshot.cursor.epoch,p_payload:{},p_protocol_version:1})},remainingAcademy.id);assert.equal(deletedElsewhere.status,'applied');
  phase=name+':academy_ui_stale_delete_local';assert.equal(await next.evaluate(()=>PICKLEUP_ACTIVITY.events()[0].id),remainingAcademy.id);next.once('dialog',dialog=>dialog.accept());await next.locator('#academyAttemptList button').first().click();await hasText(next,'#academyStatus','chờ đồng bộ');assert.ok(await next.evaluate(id=>PICKLEUP_ACTIVITY.getState().snapshot.outbox.some(o=>o.id===id&&o.action==='delete'&&o.state==='pending'),remainingAcademy.id));phase=name+':academy_ui_stale_delete_sync';await next.evaluate(()=>PICKLEUP_ROUTER.openPage('settings'));await next.locator('[data-activity-send]').click();await hasText(next,'#activityPilot [role=status]','cần xem và xử lý');phase=name+':academy_ui_review_decision';await next.locator('[data-activity-reviews] button').first().click();await next.getByLabel('Cách xử lý hoạt động').selectOption('server');await next.getByRole('button',{name:'Xác nhận xử lý hoạt động',exact:true}).click();await hasText(next,'#activityPilot [role=status]','Đã dùng bản tài khoản');
  const academyArtifact=await next.evaluate(()=>PICKLEUP_ACTIVITY.controller().exportCache());assert.ok(academyArtifact.conflicts.some(c=>c.id===remainingAcademy.id&&c.resolution?.mode==='server'&&c.resolution.operations[0].request.p_action==='delete'));const academyServer=await canonical(next);assert.equal(academyServer.result.changes.filter(c=>c.entity_kind==='practice_checkins').length,checkinsBefore);assert.equal(await legacy(next),before);
  phase=name+':assessment_match_ui_local_events';
  const eventBaseline=await canonical(next),eventWritesBefore=host.state.rpc.filter(r=>r.name==='apply_event_operation').length;
  await next.evaluate(async()=>{await PICKLEUP_ROUTER.openPage('coach');await PICKLEUP_PAGE_LOADER.ensure('coach')});
  for(const key of ['serve','return','dink','volley','position','strategy'])await next.locator('#assess-'+key).selectOption('2');
  await next.locator('#assessBtn').click();await hasText(next,'#assessResult','12/12');await hasText(next,'#assessResult','chờ đồng bộ');
  await next.evaluate(async()=>{await PICKLEUP_ROUTER.openPage('journey');await PICKLEUP_PAGE_LOADER.ensure('journey')});await hasText(next,'#jAssessState','Đã có mốc đánh giá');
  await next.evaluate(async()=>{await PICKLEUP_ROUTER.openPage('progress');await PICKLEUP_PAGE_LOADER.ensure('progress')});
  for(const key of ['serve','return','dink','volley','position','strategy'])await next.locator('#stageChecklist input[data-skill="'+key+'"]').fill('14');
  await next.locator('#stageSubmit').click();await hasText(next,'#stageResult','chờ đồng bộ');
  await next.evaluate(async()=>{await PICKLEUP_ROUTER.openPage('coach');await PICKLEUP_PAGE_LOADER.ensure('coach')});
  for(const key of ['third','reset','movement','counter','doubles','decision'])await next.locator('#ac-'+key).fill('15');
  await next.locator('#advancedCheckSave').click();await hasText(next,'#advancedCheckResult','chờ đồng bộ');await next.locator('#acCoachImport').click();assert.equal(await next.locator('#acInput-third').inputValue(),'');
  await next.evaluate(async()=>{await PICKLEUP_ROUTER.openPage('matches');await PICKLEUP_PAGE_LOADER.ensure('matches')});
  await next.locator('#matchOurs').fill('11');await next.locator('#matchTheirs').fill('7');await next.locator('#matchDoublesIssue').selectOption('middle');await next.locator('#matchNotes').fill('Synthetic real UI match');await next.locator('#matchSave').click();await hasText(next,'#matchStatus','chờ đồng bộ');
  const pendingUi=await next.evaluate(()=>PICKLEUP_ACTIVITY.getState().snapshot.outbox.filter(o=>o.state==='pending').map(o=>({id:o.id,kind:o.kind,payload:o.payload})));
  assert.equal(pendingUi.length,4);assert.deepEqual(pendingUi.filter(x=>x.kind==='skill_assessments').map(x=>[x.payload.assessment_type,x.payload.scale]).sort(),[['advanced',20],['self',2],['stage',20]]);assert.equal(host.state.rpc.filter(r=>r.name==='apply_event_operation').length,eventWritesBefore);assert.equal(await legacy(next),before);
  phase=name+':assessment_match_ui_real_sync_and_restore';await next.evaluate(()=>PICKLEUP_ROUTER.openPage('settings'));await next.locator('[data-activity-send]').click();await hasText(next,'#activityPilot [role=status]','Đã đồng bộ');
  const eventSynced=await canonical(next);for(const [kind,count]of [['skill_assessments',3],['match_records',1]])assert.equal(eventSynced.result.changes.filter(c=>c.entity_kind===kind).length-eventBaseline.result.changes.filter(c=>c.entity_kind===kind).length,count);
  for(const item of pendingUi)assert.ok(eventSynced.result.changes.some(c=>c.entity_kind===item.kind&&c.entity_key===item.id&&c.row.user_id===dataB.owner));
  const beforeUiRestore=host.state.rpc.length;await next.reload();await hasText(next,authStatus,'Đã đăng nhập');assert.equal(host.state.rpc.length,beforeUiRestore);await next.evaluate(async()=>{await PICKLEUP_ROUTER.openPage('coach');await PICKLEUP_PAGE_LOADER.ensure('coach')});assert.equal(await next.locator('#assess-serve').inputValue(),'2');
  phase=name+':match_ui_real_delete_conflict_review';const matchId=pendingUi.find(x=>x.kind==='match_records').id;
  const remoteMatchDelete=await next.evaluate(async id=>{const auth=await PickleUpAuth.getShared(PICKLEUP_AUTH_CONFIG),state=PICKLEUP_ACTIVITY.getState();return auth.eventRpc(state.owner,'apply_event_operation',{p_operation_id:crypto.randomUUID(),p_kind:'match_records',p_entity_key:id,p_action:'delete',p_expected_revision:'1',p_epoch:state.snapshot.cursor.epoch,p_payload:{},p_protocol_version:1})},matchId);assert.equal(remoteMatchDelete.status,'applied');
  await next.evaluate(async()=>{await PICKLEUP_ROUTER.openPage('matches');await PICKLEUP_PAGE_LOADER.ensure('matches')});next.once('dialog',dialog=>dialog.accept());await next.locator('[data-activity-history="match_records"] button[data-event-id="'+matchId+'"]').click();await hasText(next,'[data-activity-history="match_records"] [role=status]','Đã lưu thao tác xóa');
  await next.evaluate(()=>PICKLEUP_ROUTER.openPage('settings'));await next.locator('[data-activity-send]').click();await hasText(next,'#activityPilot [role=status]','cần xem và xử lý');await next.locator('[data-activity-reviews] button').first().click();await hasText(next,'[data-activity-detail]','Synthetic real UI match');await next.getByLabel('Cách xử lý hoạt động').selectOption('server');await next.getByRole('button',{name:'Xác nhận xử lý hoạt động',exact:true}).click();await hasText(next,'#activityPilot [role=status]','Đã dùng bản tài khoản');
  const reviewedMatch=await next.evaluate(()=>PICKLEUP_ACTIVITY.controller().exportCache());assert.ok(reviewedMatch.conflicts.some(c=>c.id===matchId&&c.resolution?.mode==='server'));assert.equal((await canonical(next)).result.changes.filter(c=>c.entity_kind==='practice_checkins').length,checkinsBefore);assert.equal(await legacy(next),before);
  phase=name+':plan_fenced_real_commit_loss_replay';host.state.dropNextPlan=true;
  const planCommand=await next.evaluate(async owner=>{
   const auth=await PickleUpAuth.getShared(PICKLEUP_AUTH_CONFIG),prepared=await auth.planRpc(owner,'prepare_sync',{});
   const snapshot=PICKLEUP_PERSONAL_CORE.createPlan({serve:12,return:12,dink:12,volley:12,position:12,strategy:12},[],'1.0–2.0','2026-01-01T10:00:00Z');
   return {p_operation_id:crypto.randomUUID(),p_kind:'personal_plans',p_entity_key:crypto.randomUUID(),p_action:'put',p_expected_revision:'0',p_epoch:prepared.epoch,p_payload:{source:'basic',schema_version:1,level_band:'1.0–2.0',plan_snapshot:snapshot},p_protocol_version:1};
  },dataB.owner);
  const callPlan=(body,owner=dataB.owner)=>next.evaluate(async({owner,body})=>(await PickleUpAuth.getShared(PICKLEUP_AUTH_CONFIG)).planRpc(owner,'apply_plan_operation',body),{owner,body});
  assert.equal((await callPlan(planCommand)).status,'network_error');assert.equal(host.state.planDropCount,1);
  const replayPlan=await callPlan(planCommand);assert.equal(replayPlan.status,'applied');assert.equal(replayPlan.replayed,true);assert.equal(replayPlan.row.revision,'1');
  phase=name+':plan_fenced_real_cas_dependency';
  const patch=(payload,revision,action='put',kind='personal_plans')=>({...planCommand,p_operation_id:crypto.randomUUID(),p_kind:kind,p_entity_key:kind==='user_selections'?'self':planCommand.p_entity_key,p_expected_revision:revision,p_action:action,p_payload:payload});
  const races=await Promise.all([callPlan(patch({check_score:15},'1')),callPlan(patch({check_score:16},'1'))]);assert.deepEqual(races.map(r=>r.status).sort(),['applied','conflict']);
  const resultPlan=races.find(r=>r.status==='applied');assert.deepEqual(resultPlan.row.plan_snapshot,planCommand.p_payload.plan_snapshot);
  assert.equal((await callPlan(patch({plan_snapshot:planCommand.p_payload.plan_snapshot},'2'))).code,'immutable_plan_fields');
  assert.equal((await callPlan(patch({selected_personal_plan_id:planCommand.p_entity_key},'0','put','user_selections'))).status,'applied');
  assert.equal((await callPlan(patch({},'2','delete'))).status,'invalid');
  assert.equal((await callPlan(patch({},'1','delete','user_selections'))).status,'applied');
  assert.equal((await callPlan(patch({},'2','delete'))).status,'applied');
  assert.equal((await callPlan(patch({selected_personal_plan_id:planCommand.p_entity_key},'2','restore','user_selections'))).status,'invalid');
  assert.equal((await callPlan(patch({},'3','restore'))).status,'applied');
  assert.equal((await callPlan(patch({selected_personal_plan_id:planCommand.p_entity_key},'2','restore','user_selections'))).status,'applied');
  phase=name+':plan_fenced_real_account_isolation';
  assert.equal((await callPlan(patch({},'4','delete'),dataA.owner)).status,'auth_required');
  const foreign=await callPlan({...patch({check_score:1},'1'),p_entity_key:aPlanId});assert.equal(foreign.status,'conflict');assert.equal(foreign.row,null);
  const afterPlans=await canonical(next);assert.ok(!afterPlans.result.changes.some(c=>c.entity_key===aPlanId));assert.equal(afterPlans.result.changes.filter(c=>c.entity_kind==='practice_checkins').length,checkinsBefore);assert.equal(await legacy(next),before);
  phase=name+':plan_client_real_consent_dependency_and_commit_loss';
  for(const file of ['plan-core','plan-controller'])await next.addScriptTag({url:host.appOrigin+'/Pickleball/modules/data/'+file+'.js'});
  const queuedPlan=await next.evaluate(async({owner,value})=>{
   const auth=await PickleUpAuth.getShared(PICKLEUP_AUTH_CONFIG);window.PR5B_DB=await PickleUpLocalRepository.open();window.PR5B_CLIENT=PickleUpPlanController.create({auth,repository:PR5B_DB,enabled:()=>true});await PR5B_CLIENT.ready;const before=PR5B_CLIENT.getState().mode;await PR5B_CLIENT.useAccount();
   const id=crypto.randomUUID(),operationId=crypto.randomUUID();await PR5B_CLIENT.createPlan({id,operationId,value});const selection=PR5B_CLIENT.getState().snapshot.records.find(r=>r.kind==='user_selections');await PR5B_CLIENT.select({operationId:crypto.randomUUID(),expectedLocalRevision:selection?.localRevision||'0',value:{selected_personal_plan_id:id}});return {id,operationId,before,status:PR5B_CLIENT.getState().projection.selectionStatus};
  },{owner:dataB.owner,value:planCommand.p_payload});assert.equal(queuedPlan.before,'guest');assert.equal(queuedPlan.status,'pending_plan');host.state.dropNextPlan=true;
  assert.equal((await next.evaluate(()=>PR5B_CLIENT.sync())).status,'network_error');const queuedFrozen=host.state.rpc.filter(r=>r.name==='apply_plan_operation').at(-1).body,planReloadBefore=host.state.rpc.length;await next.evaluate(()=>{PR5B_CLIENT.close();PR5B_DB.close()});
  phase=name+':plan_client_real_reload_replay';await next.reload();await hasText(next,authStatus,'Đã đăng nhập');assert.equal(host.state.rpc.length,planReloadBefore);
  for(const file of ['plan-core','plan-controller'])await next.addScriptTag({url:host.appOrigin+'/Pickleball/modules/data/'+file+'.js'});
  await next.evaluate(async()=>{const auth=await PickleUpAuth.getShared(PICKLEUP_AUTH_CONFIG);window.PR5B_DB=await PickleUpLocalRepository.open();window.PR5B_CLIENT=PickleUpPlanController.create({auth,repository:PR5B_DB,enabled:()=>true});await PR5B_CLIENT.ready});assert.equal(host.state.rpc.length,planReloadBefore);
  assert.equal((await next.evaluate(()=>PR5B_CLIENT.sync({forceRetry:true}))).status,'synced');const queuedRequests=host.state.rpc.filter(r=>r.name==='apply_plan_operation').slice(-3);assert.equal(queuedRequests[0].body,queuedFrozen);assert.equal(queuedRequests[1].body,queuedFrozen);assert.equal(JSON.parse(queuedRequests[2].body).p_kind,'user_selections');assert.equal(await next.evaluate(()=>PR5B_CLIENT.getState().projection.selectedPlan.id),queuedPlan.id);
  phase=name+':plan_client_real_result_conflict_review';
  const resultConflict=await next.evaluate(async({id,owner})=>{const c=PR5B_CLIENT,record=c.getState().snapshot.records.find(r=>r.kind==='personal_plans'&&r.id===id),auth=await PickleUpAuth.getShared(PICKLEUP_AUTH_CONFIG);await c.updateResult({id,operationId:crypto.randomUUID(),expectedLocalRevision:record.localRevision,value:{check_score:14}});return auth.planRpc(owner,'apply_plan_operation',{p_operation_id:crypto.randomUUID(),p_kind:'personal_plans',p_entity_key:id,p_action:'put',p_expected_revision:'1',p_epoch:c.getState().snapshot.cursor.epoch,p_payload:{check_score:19},p_protocol_version:1})},{id:queuedPlan.id,owner:dataB.owner});assert.equal(resultConflict.status,'applied');assert.equal((await next.evaluate(()=>PR5B_CLIENT.sync())).status,'needs_review');
  const planDecision=await next.evaluate(async id=>{const c=PR5B_CLIENT,view=await c.previewReview('personal_plans',id),operationId=crypto.randomUUID();await c.resolveReview(view,'local',{operationId,value:{check_score:14}});const artifact=await c.exportCache(),archive=artifact.conflicts.find(x=>x.conflictId===operationId);return {local:archive.resolution.local.check_score,remote:archive.resolution.remote.check_score,requests:archive.resolution.operations.length}},queuedPlan.id);assert.deepEqual(planDecision,{local:14,remote:19,requests:1});assert.equal((await next.evaluate(()=>PR5B_CLIENT.sync())).status,'synced');
  phase=name+':plan_client_real_clear_delete_restore_dependencies';
  await next.evaluate(async id=>{const c=PR5B_CLIENT,record=(kind,key)=>c.getState().snapshot.records.find(r=>r.kind===kind&&r.id===key);await c.select({operationId:crypto.randomUUID(),expectedLocalRevision:record('user_selections','self').localRevision,value:{selected_personal_plan_id:null}});await c.deleteEntity({kind:'personal_plans',id,operationId:crypto.randomUUID(),expectedLocalRevision:record('personal_plans',id).localRevision})},queuedPlan.id);assert.equal((await next.evaluate(()=>PR5B_CLIENT.sync())).status,'synced');const deletedPlanRequests=host.state.rpc.filter(r=>r.name==='apply_plan_operation').slice(-2).map(r=>JSON.parse(r.body));assert.equal(deletedPlanRequests[0].p_kind,'user_selections');assert.equal(deletedPlanRequests[1].p_action,'delete');
  await next.evaluate(async id=>{const c=PR5B_CLIENT,record=(kind,key)=>c.getState().snapshot.records.find(r=>r.kind===kind&&r.id===key);await c.restoreEntity({kind:'personal_plans',id,operationId:crypto.randomUUID(),expectedLocalRevision:record('personal_plans',id).localRevision});await c.select({operationId:crypto.randomUUID(),expectedLocalRevision:record('user_selections','self').localRevision,value:{selected_personal_plan_id:id}})},queuedPlan.id);assert.equal((await next.evaluate(()=>PR5B_CLIENT.sync())).status,'synced');assert.equal(await next.evaluate(()=>PR5B_CLIENT.getState().projection.selectedPlan.id),queuedPlan.id);assert.equal((await canonical(next)).result.changes.filter(c=>c.entity_kind==='practice_checkins').length,checkinsBefore);assert.equal(await legacy(next),before);await next.evaluate(()=>{PR5B_CLIENT.close();PR5B_DB.close()});
  phase=name+':plan_ui_explicit_consent_basic_selection_and_court';
  await next.locator('[data-plan-device]').click();await hasText(next,'#planPilot [role=status]','đang dùng kho thiết bị');await next.locator('[data-plan-consent]').check();await next.locator('[data-plan-enable]').click();await hasText(next,'#planPilot [role=status]','Đã đọc kho giáo án');
  await next.evaluate(async()=>{await PICKLEUP_ROUTER.openPage('coach');await PICKLEUP_PAGE_LOADER.ensure('coach')});for(const key of ['serve','return','dink','volley','position','strategy'])await next.locator('#pc-'+key).fill('12');await next.locator('#pcGenerate').click();await hasText(next,'#pcStatus','Đã tạo giáo án trong kho tài khoản');const basicUiId=await next.locator('#pcPlan').getAttribute('data-plan-id');await next.locator('#pcHistory [data-plan-id="'+basicUiId+'"]').click();await hasText(next,'#pcStatus','Đã chọn trên thiết bị');assert.equal(await next.evaluate(()=>PICKLEUP_PLANS.selected()),null);
  await next.evaluate(()=>PICKLEUP_ROUTER.openPage('settings'));await next.locator('[data-plan-send]').click();await hasText(next,'#planPilot [role=status]','Đã đồng bộ');await next.evaluate(async()=>{await PICKLEUP_ROUTER.openPage('court');await PICKLEUP_PAGE_LOADER.ensure('court')});assert.equal(await next.locator('#pcRunPlayer').isVisible(),true);await next.locator('#pcRunNext').click();assert.equal(await next.locator('#pcAttemptSave').isEnabled(),true);await next.locator('#pcRunStart').click();
  await next.evaluate(()=>PICKLEUP_ROUTER.openPage('journey'));await hasText(next,'#jRunState','Có giáo án cá nhân');await next.evaluate(()=>PICKLEUP_ROUTER.openPage('coach'));await next.locator('#pcPostScore').fill('15');await next.locator('#pcComplete').click();await hasText(next,'#pcStatus','Không tự tạo nhật ký');
  phase=name+':plan_ui_real_advanced_create_and_result';for(const key of ['third','reset','movement','counter','doubles','decision'])await next.locator('#acInput-'+key).fill('12');await next.locator('#acCoachCreate').click();await hasText(next,'#acCoachStatus','Đã tạo giáo án trong kho tài khoản');await next.locator('#acCoachHistory [data-plan-id]').first().click();await hasText(next,'#acCoachStatus','Đã chọn trên thiết bị');await next.evaluate(()=>PICKLEUP_ROUTER.openPage('settings'));await next.locator('[data-plan-send]').click();await hasText(next,'#planPilot [role=status]','Đã đồng bộ');const advancedUiId=await next.evaluate(()=>PICKLEUP_PLANS.selected().id);
  await next.evaluate(()=>PICKLEUP_ROUTER.openPage('court'));assert.equal(await next.locator('#pcRunPlayer').isVisible(),true);await next.evaluate(()=>PICKLEUP_ROUTER.openPage('coach'));await next.locator('#acCoachResult').fill('16');await next.locator('#acCoachSave').click();await hasText(next,'#acCoachStatus','Đã lưu kết quả trên thiết bị');
  phase=name+':plan_ui_real_dependency_delete_restore';await next.evaluate(()=>PICKLEUP_ROUTER.openPage('settings'));await next.locator('[data-plan-clear]').click();await hasText(next,'#planPilot [role=status]','Đã bỏ chọn');next.once('dialog',d=>d.accept());await next.locator('[data-plan-manage] [data-plan-id="'+advancedUiId+'"] button').click();await hasText(next,'#planPilot [role=status]','Đã lưu quyết định');await next.locator('[data-plan-send]').click();await hasText(next,'#planPilot [role=status]','Đã đồng bộ');next.once('dialog',d=>d.accept());await next.locator('[data-plan-manage] [data-plan-id="'+advancedUiId+'"] button').click();await hasText(next,'#planPilot [role=status]','Đã lưu quyết định');await next.locator('[data-plan-send]').click();await hasText(next,'#planPilot [role=status]','Đã đồng bộ');
  phase=name+':plan_ui_real_result_conflict_preview_decision';await next.evaluate(()=>PICKLEUP_ROUTER.openPage('coach'));await next.locator('#pcHistory [data-plan-id="'+basicUiId+'"]').click();await hasText(next,'#pcStatus','Đã chọn trên thiết bị');phase=name+':plan_ui_conflict_selection_ack';await next.evaluate(()=>PICKLEUP_ROUTER.openPage('settings'));await next.locator('[data-plan-send]').click();await hasText(next,'#planPilot [role=status]','Đã đồng bộ');await next.evaluate(()=>PICKLEUP_ROUTER.openPage('coach'));phase=name+':plan_ui_conflict_local_save';await next.locator('#pcPostScore').fill('17');await next.locator('#pcComplete').click();await hasText(next,'#pcStatus','Đã lưu kết quả');
  phase=name+':plan_ui_conflict_remote_write';const uiRemoteResult=await next.evaluate(async({id,owner})=>{const auth=await PickleUpAuth.getShared(PICKLEUP_AUTH_CONFIG),s=PICKLEUP_PLANS.getState(),row=s.snapshot.records.find(r=>r.kind==='personal_plans'&&r.id===id);return auth.planRpc(owner,'apply_plan_operation',{p_operation_id:crypto.randomUUID(),p_kind:'personal_plans',p_entity_key:id,p_action:'put',p_expected_revision:row.baseRevision,p_epoch:s.snapshot.cursor.epoch,p_payload:{check_score:19},p_protocol_version:1})},{id:basicUiId,owner:dataB.owner});assert.equal(uiRemoteResult.status,'applied');phase=name+':plan_ui_conflict_sync';await next.evaluate(()=>PICKLEUP_ROUTER.openPage('settings'));await next.locator('[data-plan-send]').click();await hasText(next,'#planPilot [role=status]','cần xem và xử lý');phase=name+':plan_ui_conflict_preview';await next.locator('[data-plan-reviews] button').first().click();await hasText(next,'[data-plan-detail]','17/20');await hasText(next,'[data-plan-detail]','19/20');phase=name+':plan_ui_conflict_decision';await next.evaluate(()=>{const c=PICKLEUP_PLANS.controller(),resolve=c.resolveReview;c.resolveReview=async(...args)=>{window.PLAN_DECISION_STEP=1;try{const result=await resolve.apply(c,args);window.PLAN_DECISION_STEP=2;return result}catch(error){window.PLAN_DECISION_STEP=3;window.PLAN_DECISION_ERROR=['local_conflict','needs_review','immutable_plan_fields','invalid_plan','invalid_payload','operation_mismatch','invalid_resolution','review_not_required','epoch_review_required','consent_changed','busy','uncertain_operation','quota_exceeded','account_changed','plan_unavailable','dependency_unavailable'].indexOf(error.code);throw error}}});await next.getByLabel('Cách xử lý giáo án').selectOption('local');await next.getByRole('button',{name:'Xác nhận xử lý giáo án',exact:true}).click();await hasText(next,'#planPilot [role=status]','Đã lưu quyết định');phase=name+':plan_ui_conflict_decision_send';await next.locator('[data-plan-send]').click();await hasText(next,'#planPilot [role=status]','Đã đồng bộ');assert.equal((await canonical(next)).result.changes.filter(c=>c.entity_kind==='practice_checkins').length,checkinsBefore);assert.equal(await legacy(next),before);
  phase=name+':training_ui_real_plan_bound_local_save';
  await next.evaluate(()=>PICKLEUP_ROUTER.openPage('court'));await next.locator('#pcRunNext').click();await until(()=>next.locator('#pcAttemptSave').isEnabled());
  const trainingSave=async hits=>{await next.locator('#pcAttemptHits').fill(String(hits));await next.locator('#pcAttemptNote').fill('Synthetic private training note');for(const [field,value]of [['Feed','partner'],['Pace','slow'],['Target','wide']])await next.locator('#pcAttempt'+field).selectOption(value);await next.locator('#pcAttemptSave').click();await hasText(next,'#pcRunMessage','Đã lưu trong kho tài khoản')};
  const trainingRpcBefore=host.state.rpc.length;await trainingSave(12);await trainingSave(16);assert.equal(host.state.rpc.length,trainingRpcBefore);assert.equal(await legacy(next),before);
  await next.evaluate(async()=>{await PICKLEUP_ROUTER.openPage('progress');await PICKLEUP_PAGE_LOADER.ensure('progress')});await hasText(next,'#thComparison','Tăng 4');await hasText(next,'[data-activity-history="training_entries"]','Synthetic private training note');
  phase=name+':training_ui_real_commit_loss_reload_replay';await next.evaluate(()=>PICKLEUP_ROUTER.openPage('settings'));host.state.dropNextEvent=true;await next.locator('[data-activity-send]').click();await hasText(next,'#activityPilot [role=status]','Lỗi mạng');const trainingFrozen=host.state.rpc.filter(x=>x.name==='apply_event_operation').at(-1).body,trainingReloadCount=host.state.rpc.length;await next.reload();await hasText(next,authStatus,'Đã đăng nhập');assert.equal(host.state.rpc.length,trainingReloadCount);await next.locator('[data-activity-retry]').click();await hasText(next,'#activityPilot [role=status]','Đã đồng bộ');const trainingRequests=host.state.rpc.filter(x=>x.name==='apply_event_operation').slice(-3).map(x=>x.body);assert.equal(trainingRequests[0],trainingFrozen);assert.equal(trainingRequests[1],trainingFrozen);
  const trainingRows=await next.evaluate(id=>PICKLEUP_ACTIVITY.events('training_entries').filter(x=>x.plan_id===id).map(x=>({id:x.id,hits:x.hits})),basicUiId);assert.deepEqual(trainingRows.map(x=>x.hits).sort((a,b)=>a-b),[12,16]);
  phase=name+':training_ui_real_delete_http200_conflict_and_review';await next.evaluate(async()=>{await PICKLEUP_ROUTER.openPage('progress');await PICKLEUP_PAGE_LOADER.ensure('progress')});const trainingId=trainingRows.find(x=>x.hits===12).id;next.once('dialog',d=>d.accept());await next.locator('[data-activity-history="training_entries"] button[data-event-id="'+trainingId+'"]').click();await hasText(next,'[data-activity-history="training_entries"] [role=status]','Đã lưu thao tác xóa');
  const trainingRemoteDelete=await next.evaluate(async({id,owner})=>{const auth=await PickleUpAuth.getShared(PICKLEUP_AUTH_CONFIG),s=PICKLEUP_ACTIVITY.getState(),row=s.snapshot.records.find(x=>x.kind==='training_entries'&&x.id===id);return auth.eventRpc(owner,'apply_event_operation',{p_operation_id:crypto.randomUUID(),p_kind:'training_entries',p_entity_key:id,p_action:'delete',p_expected_revision:row.baseRevision,p_epoch:s.snapshot.cursor.epoch,p_payload:{},p_protocol_version:1})},{id:trainingId,owner:dataB.owner});assert.equal(trainingRemoteDelete.status,'applied');await next.evaluate(()=>PICKLEUP_ROUTER.openPage('settings'));await next.locator('[data-activity-send]').click();await hasText(next,'#activityPilot [role=status]','cần xem và xử lý');await next.locator('[data-activity-reviews] button').click();await hasText(next,'[data-activity-detail]','12/20');await next.getByLabel('Cách xử lý hoạt động').selectOption('server');await next.getByRole('button',{name:'Xác nhận xử lý hoạt động',exact:true}).click();await hasText(next,'#activityPilot [role=status]','Đã dùng bản tài khoản');assert.equal((await canonical(next)).result.changes.filter(c=>c.entity_kind==='practice_checkins').length,checkinsBefore);assert.equal(await legacy(next),before);
  phase=name+':academy_selection_ui_sparse_local_choice';await next.evaluate(async()=>{await PICKLEUP_ROUTER.openPage('academy');await PICKLEUP_PAGE_LOADER.ensure('academy')});const lessonWritesBefore=host.state.rpc.length;await next.locator('#academyWeek').selectOption('PU-037');await hasText(next,'#academy [data-lesson-selection-status]','chờ đồng bộ');assert.equal(host.state.rpc.length,lessonWritesBefore);await next.locator('#academyStepList input').first().check();await next.locator('#academyFocusToggle').click();await next.locator('#academyFocusNext').click();assert.equal(await legacy(next),before);
  phase=name+':academy_selection_ui_commit_loss_reload_replay';await next.evaluate(()=>PICKLEUP_ROUTER.openPage('settings'));host.state.dropNextPlan=true;await next.locator('[data-plan-send]').click();await hasText(next,'#planPilot [role=status]','Lỗi mạng');const lessonFrozen=host.state.rpc.filter(x=>x.name==='apply_plan_operation').at(-1).body,lessonReloadCount=host.state.rpc.length;await next.reload();await hasText(next,authStatus,'Đã đăng nhập');assert.equal(host.state.rpc.length,lessonReloadCount);await next.locator('[data-plan-retry]').click();await hasText(next,'#planPilot [role=status]','Đã đồng bộ');assert.deepEqual(host.state.rpc.filter(x=>x.name==='apply_plan_operation').slice(-2).map(x=>x.body),[lessonFrozen,lessonFrozen]);assert.equal(await next.evaluate(()=>PICKLEUP_PLANS.selected().id),basicUiId);
  await next.evaluate(async()=>{await PICKLEUP_ROUTER.openPage('academy');await PICKLEUP_PAGE_LOADER.ensure('academy')});assert.equal(await next.locator('#academyWeek').inputValue(),'PU-037');await hasText(next,'#academyPracticeStatus','đã lưu theo tài khoản');assert.equal(await next.locator('#academyStepList input').first().isChecked(),true);await next.locator('#academyFocusToggle').click();await hasText(next,'#academyFocusPosition','Bước 2/6');await hasText(next,'#academyTimerStatus','Đồng hồ đang dừng.');assert.equal(await legacy(next),before);
  phase=name+':academy_selection_ui_http200_conflict_and_review';await next.locator('#academyWeek').selectOption('PU-038');await hasText(next,'#academy [data-lesson-selection-status]','chờ đồng bộ');const lessonRemote=await next.evaluate(async owner=>{const auth=await PickleUpAuth.getShared(PICKLEUP_AUTH_CONFIG),s=PICKLEUP_PLANS.getState(),row=s.snapshot.records.find(r=>r.kind==='user_selections');return auth.planRpc(owner,'apply_plan_operation',{p_operation_id:crypto.randomUUID(),p_kind:'user_selections',p_entity_key:'self',p_action:'put',p_expected_revision:row.baseRevision,p_epoch:s.snapshot.cursor.epoch,p_payload:{selected_academy_lesson_id:'PU-039'},p_protocol_version:1})},dataB.owner);assert.equal(lessonRemote.status,'applied');await next.evaluate(()=>PICKLEUP_ROUTER.openPage('settings'));await next.locator('[data-plan-send]').click();await hasText(next,'#planPilot [role=status]','cần xem và xử lý');await next.locator('[data-plan-reviews] button').click();await hasText(next,'[data-plan-detail]','PU-038');await hasText(next,'[data-plan-detail]','PU-039');await next.getByLabel('Cách xử lý giáo án').selectOption('local');await next.getByRole('button',{name:'Xác nhận xử lý giáo án',exact:true}).click();await hasText(next,'#planPilot [role=status]','Đã lưu quyết định');await next.locator('[data-plan-send]').click();await hasText(next,'#planPilot [role=status]','Đã đồng bộ');assert.equal(await next.evaluate(()=>PICKLEUP_PLANS.academySelection().id),'PU-038');assert.equal(await next.evaluate(()=>PICKLEUP_PLANS.selected().id),basicUiId);await next.locator('[data-plan-clear-lesson]').click();await hasText(next,'#planPilot [role=status]','Đã bỏ chọn bài Học viện');await next.locator('[data-plan-send]').click();await hasText(next,'#planPilot [role=status]','Đã đồng bộ');assert.equal(await next.evaluate(()=>PICKLEUP_PLANS.academySelection().id),null);assert.equal(await next.evaluate(()=>PICKLEUP_PLANS.selected().id),basicUiId);assert.equal((await canonical(next)).result.changes.filter(c=>c.entity_kind==='practice_checkins').length,checkinsBefore);assert.equal(await legacy(next),before);
  phase=name+':court_checkpoint_local_pause_reload_and_explicit_restore';
  await next.evaluate(async()=>{await PICKLEUP_ROUTER.openPage('court');await PICKLEUP_PAGE_LOADER.ensure('court')});await until(()=>next.locator('#pcCheckpointSave').isEnabled());next.once('dialog',d=>d.accept());await next.locator('#pcRunReset').click();await next.locator('#pcRunNext').click();await next.locator('#pcRunStart').click();const checkpointCalls=host.state.rpc.length;await next.locator('#pcCheckpointSave').click();await hasText(next,'#pcCheckpointStatus','Điểm dừng đã lưu');assert.equal(await next.locator('#pcRunStart').textContent(),'Bắt đầu');const checkpointClock=await next.locator('#pcRunClock').textContent();assert.equal(host.state.rpc.length,checkpointCalls);assert.equal(await legacy(next),before);
  await next.reload();await until(()=>next.locator('#pcCheckpointRestore').isEnabled());await hasText(next,'#pcRunStep','Phần 1/6');assert.equal(await next.locator('#pcRunClock').textContent(),'10:00');assert.equal(host.state.rpc.length,checkpointCalls);next.once('dialog',d=>d.accept());await next.locator('#pcCheckpointRestore').click();await hasText(next,'#pcRunMessage','Đã khôi phục điểm dừng');await hasText(next,'#pcRunStep','Phần 2/6');assert.equal(await next.locator('#pcRunClock').textContent(),checkpointClock);assert.equal(await next.locator('#pcRunStart').textContent(),'Bắt đầu');assert.equal(host.state.rpc.length,checkpointCalls);assert.equal(await legacy(next),before);
  await next.evaluate(async()=>{await PICKLEUP_ROUTER.openPage('academy');await PICKLEUP_PAGE_LOADER.ensure('academy')});
  phase=name+':account_cache_rescue_read_only_round_trip';
  await next.evaluate(async()=>{await PICKLEUP_ROUTER.openPage('settings');await PICKLEUP_PAGE_LOADER.ensure('settings')});const rescueCalls=host.state.rpc.length;
  await until(()=>next.locator('[data-account-capture]').isEnabled());
  const rescueBefore=await next.evaluate(async owner=>{const db=await PickleUpLocalRepository.open();try{return JSON.stringify(await db.scope('user:'+owner).getAccountRescueSnapshot())}finally{db.close()}},dataB.owner);
  await next.locator('[data-account-capture]').click();await until(()=>next.locator('[data-account-download]').isVisible());
  // Keep this private artifact in memory only: no disk download, traces or payload logs.
  const rescueText=await next.locator('[data-account-download]').evaluate(async a=>(await fetch(a.href)).text()),rescue=JSON.parse(rescueText);
  assert.equal(rescue.payload.snapshot.owner,dataB.owner);assert.equal(Object.keys(rescue.payload.snapshot.stores).length,7);assert.ok(rescue.payload.snapshot.stores.device_state.some(row=>row.key.startsWith('court-checkpoint-1:')));assert.ok(rescue.payload.snapshot.stores.device_state.some(row=>row.key.startsWith('academy-')));assert.ok(rescue.payload.snapshot.stores.import_receipts.length>0);assert.ok(rescue.payload.snapshot.stores.conflicts.length>0);assert.equal(rescueText.includes('pickleup_auth_v6'),false);
  await next.locator('#accountRescue input[type=file]').setInputFiles({name:'own-cache.json',mimeType:'application/json',buffer:Buffer.from(rescueText)});await hasText(next,'#accountRescue [role=status]','Chỉ xem trước');assert.equal(await next.locator('[data-account-download]').isVisible(),false);
  const rescueAfter=await next.evaluate(async owner=>{const db=await PickleUpLocalRepository.open();try{return JSON.stringify(await db.scope('user:'+owner).getAccountRescueSnapshot())}finally{db.close()}},dataB.owner);assert.equal(rescueAfter,rescueBefore);assert.equal(host.state.rpc.length,rescueCalls);assert.equal(await legacy(next),before);
  await next.locator('[data-account-capture]').click();await until(()=>next.locator('[data-account-download]').isVisible());
  // The checkpoint reload creates a fresh lazy DOM. Mount each private
  // form and seed drafts before asserting that logout clears them.
  phase=name+':fresh_browser_same_session_reads_all_account_sources';await freshAccountRead(browser,context,host,next);
  // Repository-only maintenance on a separate local DB populated by real RPC.
  // Product DB/forms remain untouched: Auth/export/confirmation UI is a later PR.
  phase=name+':cache_purge_repository_real_auth';
  const serverBeforePurge=JSON.stringify((await canonical(next)).result);
  const maintenance=await next.evaluate(async owner=>{
   const auth=await PickleUpAuth.getShared(PICKLEUP_AUTH_CONFIG),db=await PickleUpLocalRepository.open({name:'auth-maintenance-'+crypto.randomUUID()}),scope=db.scope('user:'+owner);
   let currentOwner=null;const off=auth.subscribe(s=>currentOwner=s.user?.id||null);const readers=[];
   try{
    const reader=PickleUpPullController.create({auth,repository:db,owner,enabled:()=>true});readers.push(reader);await reader.pull();
    await scope.setDomainConsent(true);await scope.setActivityConsent(true,'0');await scope.setPlanConsent(true,'0');await scope.setDeviceState(crypto.randomUUID(),'focus',{index:2});
    const preview=await scope.getAccountPurgePreview(),artifact=await PickleUpAccountRescueCore.create(preview.snapshot,{expectedOwner:owner});await PickleUpAccountRescueCore.preview(artifact.text,{expectedOwner:owner});
    const oldRows=preview.snapshot.stores.records.length,result=await scope.purgeAccountCache({expectedSnapshot:preview.snapshot,operationId:crypto.randomUUID()}),fresh=db.scope('user:'+owner),after=await fresh.getAccountRescueSnapshot();
    let late;try{await scope.setDomainConsent(true)}catch(error){late=error.code}
    const cleared=after.stores.records.length===0&&after.stores.device_state.length===0&&after.stores.metadata.length===4;
    const disabled=!(await fresh.getDomainConsent())&&!(await fresh.getActivityConsent()).enabled&&!(await fresh.getPlanConsent()).enabled;
    await fresh.setDomainConsent(true);const reread=PickleUpPullController.create({auth,repository:db,owner,enabled:()=>true});readers.push(reread);await reread.pull();
    return {blockers:preview.blockers,status:result.status,hadPrivateRows:oldRows>0,cleared,disabled,late,authenticated:currentOwner===owner,cloudReadableAgain:(await fresh.getAccountRescueSnapshot()).stores.records.length===oldRows};
   }finally{readers.forEach(r=>r.close());off();db.close()}
  },dataB.owner);
  assert.deepEqual(maintenance,{blockers:[],status:'purged',hadPrivateRows:true,cleared:true,disabled:true,late:'cache_changed',authenticated:true,cloudReadableAgain:true});
  assert.equal(JSON.stringify((await canonical(next)).result),serverBeforePurge);assert.equal(await legacy(next),before);
  phase=name+':logout_draft_after_training_reload';
  await next.evaluate(async()=>{await PICKLEUP_ROUTER.openPage('court');await PICKLEUP_PAGE_LOADER.ensure('court')});await next.locator('#pcRunNext').click();await next.locator('#pcAttemptNote').fill('Synthetic private Court logout draft');
  await next.evaluate(async()=>{await PICKLEUP_ROUTER.openPage('coach');await PICKLEUP_PAGE_LOADER.ensure('coach')});await next.locator('#pcPostScore').fill('15');
  await next.evaluate(async()=>{await PICKLEUP_ROUTER.openPage('matches');await PICKLEUP_PAGE_LOADER.ensure('matches')});await next.locator('#matchNotes').fill('Synthetic private logout draft');await next.evaluate(()=>PICKLEUP_ROUTER.openPage('settings'));
  phase=name+':pwa_private_cache_exclusion';await next.evaluate(()=>navigator.serviceWorker.ready);
  const cacheSafe=await next.evaluate(async api=>{for(const name of await caches.keys())for(const request of await(await caches.open(name)).keys()){const u=new URL(request.url);if(u.origin===api||/[?&#](?:access_token|refresh_token|token|code)=/i.test(u.href))return false}return true},host.apiOrigin);assert.ok(cacheSafe);
  assert.ok(new URL(next.url()).pathname.startsWith('/Pickleball/'));assert.equal(new URL(next.url()).hash,'');
  phase=name+':logout_tabs_and_reload';await next.locator('[data-logout]').click();await until(async()=>!(await next.locator('[data-account-download]').isVisible()));assert.equal(await next.locator('#accountRescue tbody tr').count(),0);
  for(const item of [page,tab,next]){await hasText(item,authStatus,'Chế độ khách');assert.equal((await item.locator('[data-import-summary]').textContent()).trim(),'')}
  assert.equal(await next.evaluate(()=>PICKLEUP_ACTIVITY.getState().snapshot),null);assert.equal(await next.evaluate(()=>PICKLEUP_ACADEMY_PRACTICE.getState().row),null);assert.equal(await next.evaluate(()=>PICKLEUP_COURT_CHECKPOINT.getState().row),null);assert.equal(await next.locator('#matchNotes').inputValue(),'');assert.equal(await next.locator('#pcAttemptNote').inputValue(),'');assert.equal(await next.locator('#pcPostScore').inputValue(),'');assert.equal(await next.evaluate(()=>PICKLEUP_ACTIVITY.events('skill_assessments').length),0);await next.evaluate(()=>{window.PR5A2_LIFE?.close();window.PR5A2_DB?.close()});
  await next.reload();await hasText(next,authStatus,'Chế độ khách');assert.equal(await legacy(next),before);
  process.stdout.write('PASS '+name+': repository-only cache purge with real Auth/private pull leaves server/session unchanged and rereads cloud, fresh browser reads all account sources with verified session in RAM and no IDB/guest copy or writes, real OTP UI, wrong code, session/checkpoint reload, commit-loss replay, 4 items, native tab logout, A/B isolation with delayed A response, paginated canonical cache/delta/full-resync keeps pending, fenced sender/conflict resolution/commit replay, account source opt-in and actual preferences/check-in UI with queued reload/retry and real-server conflict preview/decision, four activity event kinds via fenced API with native reload/exact replay and independent cursor, independent event consent and archive/delete repair with real RPC conflicts and opt-out/replay, Academy product UI source/save/comparability/reload replay/delete and real conflict decision, self/stage/advanced and match product UI save/sync/restore with distinct scales, no legacy mirror or attendance, real match HTTP200 delete conflict and reviewed archive, API-only fenced plans/selections with real commit-loss replay/CAS/dependency/restore and late A response ignored after B, standalone plan client independent consent/queue/reload replay/selection dependency/result conflict review/delete restore and pending A isolation, real basic/advanced plan product UI consent/create/choose/ACK/Court/result/delete/restore and HTTP200 conflict preview/decision without legacy mirror or attendance, training product UI own ACK plan/local save/comparable results/commit-loss reload replay/delete HTTP200 conflict and reviewed archive, Academy selection product UI sparse choice/local save/real commit-loss reload replay/persisted device checklist/focus isolation/HTTP200 conflict review/clear without personal choice loss, Court paused checkpoint local save/noRPC/reload/explicit restore/logout isolation, seven-store own cache rescue export and read-only file preview without writes/RPC and logout clears link, PWA exclusion\n');
 }catch(error){
  const text=await currentPage?.locator(importStatus).textContent({timeout:1000}).catch(()=>null);
  // Only fixed classifications leave memory; never log UI text, identities or payloads.
  host.state.activityDiagnostic=await currentPage?.evaluate(()=>{const s=window.PICKLEUP_ACTIVITY?.getState(),status=document.querySelector('#activityPilot [role=status]')?.textContent||'',academy=document.querySelector('#academyStatus')?.textContent||'';return {mode:['guest','loading','account','error'].indexOf(s?.mode),busy:s?.busy===true,message:['Đã đồng bộ','Có hoạt động cần xem','Lỗi mạng','Chưa thực hiện được','Đã dùng bản tài khoản','Học viện:'].findIndex(x=>status.startsWith(x)),deleted:academy.startsWith('Đã lưu thao tác xóa'),pending:s?.snapshot?.outbox.filter(o=>['pending','sending','deferred'].includes(o.state)).length||0,review:s?.snapshot?.records.filter(r=>r.reviewRequired).length||0}}).catch(()=>null);
  host.state.planDiagnostic=await currentPage?.evaluate(()=>{const s=window.PICKLEUP_PLANS?.getState(),status=document.querySelector('#planPilot [role=status]')?.textContent||'',pc=document.querySelector('#pcStatus')?.textContent||'';return {decision:Number(window.PLAN_DECISION_STEP??0),error:Number(window.PLAN_DECISION_ERROR??-1),sourceError:['local_conflict','needs_review','invalid_plan','storage_unavailable','consent_changed','quota_exceeded'].indexOf(s?.error),mode:['guest','loading','account','error'].indexOf(s?.mode),busy:s?.busy===true,message:['Đã đồng bộ','Có giáo án cần xem','Lỗi mạng','Chưa thực hiện được','Đã dùng bản tài khoản','Đã lưu quyết định'].findIndex(x=>status.startsWith(x)),pc:['Đã tạo giáo án','Đã chọn trên thiết bị','Đã lưu kết quả','Chưa lưu được'].findIndex(x=>pc.startsWith(x)),pending:s?.snapshot?.outbox.filter(o=>['pending','sending','deferred'].includes(o.state)).length||0,review:s?.snapshot?.records.filter(r=>r.reviewRequired).length||0}}).catch(()=>null);
  host.state.ui=['Tệp đã đọc','Preview sẵn sàng','Lỗi mạng','Không thực hiện được','Server từ chối','Có revision mới','Vượt giới hạn','Phiên nhập đã hoàn tất','Còn mục','Cần đăng nhập','Đã dừng','Checkpoint đã khôi phục'].findIndex(prefix=>text?.startsWith(prefix));
  throw error;
 }finally{host.state.held?.release();host.state.heldPlan?.release();await context?.close();await browser?.close()}
}
async function main(){
 if(process.env.DEBUG)throw new Error('debug_output_forbidden');
 const config=JSON.parse(execFileSync('supabase',['status','-o','json'],{encoding:'utf8',timeout:15000,stdio:['ignore','pipe','pipe']}));
 assert.equal(config.API_URL,'http://127.0.0.1:54321');
 const host=await start({backendURL:config.API_URL,anonKey:config.ANON_KEY});diagnostics=host.state;
 const watchdog=setTimeout(()=>{process.stderr.write('FAIL real Auth browser: bounded runtime exceeded\n');process.exit(1)},240000);watchdog.unref();
 try{for(const [name,engine]of [['Chromium',chromium],['WebKit',webkit]]){host.state.rpc.length=0;host.state.dropCount=0;host.state.syncDropCount=0;host.state.eventDropCount=0;host.state.planDropCount=0;await runEngine(engine,name,host)}}finally{clearTimeout(watchdog);await host.close()}
}
if(require.main===module)main().catch(error=>{const kind=['AssertionError','TimeoutError','Error'].includes(error.name)?error.name:'Error';process.stderr.write('FAIL real Auth browser: '+phase+' ['+kind+'] ui='+diagnostics?.ui+' dropped='+diagnostics?.dropCount+' activity='+JSON.stringify(diagnostics?.activityDiagnostic||null)+' plan='+JSON.stringify(diagnostics?.planDiagnostic||null)+' HTTP '+JSON.stringify(diagnostics?.http.slice(-5)||[])+'\n');process.exitCode=1});
module.exports={until,source,verifyData};
