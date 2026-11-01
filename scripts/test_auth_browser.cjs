/* Real UI + SDK + GoTrue/Mailpit + RPC + native IDB. No traces or credentials
 * on disk/stdout. Errors deliberately report only a fixed phase and error type. */
'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {chromium,webkit}=require('@playwright/test');
const {start}=require('./lib/auth-browser-host.cjs');
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
async function runEngine(engine,name,host){
 let browser,context,page;
 try{
  phase=name+':launch';browser=await engine.launch();context=await browser.newContext({viewport:{width:390,height:900}});
  // No request mocking, storageState files, screenshots, tracing or videos.
  page=await context.newPage();const url=host.appOrigin+'/Pickleball/?page=settings',text=source();
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
  phase=name+':late_private_a_response';const held=host.holdNextPull();await chooseFile(page,source(6));
  await page.locator('[data-import-preview]').click();const delayed=await held.seen;
  assert.equal(delayed.status,'ok');assert.ok(delayed.changes.some(change=>change.row.user_id===dataA.owner));
  await tab.locator('[data-logout]').click();await hasText(page,authStatus,'Chế độ khách');
  phase=name+':real_account_b_login';const next=await context.newPage();await next.goto(url);await login(next,b);
  await hasText(page,'[data-import-account]',b);held.release();
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
  assert.equal(await legacy(next),before);
  phase=name+':pwa_private_cache_exclusion';await next.evaluate(()=>navigator.serviceWorker.ready);
  const cacheSafe=await next.evaluate(async api=>{for(const name of await caches.keys())for(const request of await(await caches.open(name)).keys()){const u=new URL(request.url);if(u.origin===api||/[?&#](?:access_token|refresh_token|token|code)=/i.test(u.href))return false}return true},host.apiOrigin);assert.ok(cacheSafe);
  assert.ok(new URL(next.url()).pathname.startsWith('/Pickleball/'));assert.equal(new URL(next.url()).hash,'');
  phase=name+':logout_tabs_and_reload';await next.locator('[data-logout]').click();
  for(const item of [page,tab,next]){await hasText(item,authStatus,'Chế độ khách');assert.equal((await item.locator('[data-import-summary]').textContent()).trim(),'')}
  await next.reload();await hasText(next,authStatus,'Chế độ khách');assert.equal(await legacy(next),before);
  process.stdout.write('PASS '+name+': real OTP UI, wrong code, session/checkpoint reload, commit-loss replay, 4 items, native tab logout, A/B isolation with delayed A response, paginated canonical cache/delta/full-resync keeps pending, fenced sender/conflict resolution/commit replay, PWA exclusion\n');
 }catch(error){
  const text=await page?.locator(importStatus).textContent({timeout:1000}).catch(()=>null);
  host.state.ui=['Tệp đã đọc','Preview sẵn sàng','Lỗi mạng','Không thực hiện được','Server từ chối','Có revision mới','Vượt giới hạn','Phiên nhập đã hoàn tất','Còn mục','Cần đăng nhập','Đã dừng','Checkpoint đã khôi phục'].findIndex(prefix=>text?.startsWith(prefix));
  throw error;
 }finally{host.state.held?.release();await context?.close();await browser?.close()}
}
async function main(){
 if(process.env.DEBUG)throw new Error('debug_output_forbidden');
 const config=JSON.parse(execFileSync('supabase',['status','-o','json'],{encoding:'utf8',timeout:15000,stdio:['ignore','pipe','pipe']}));
 assert.equal(config.API_URL,'http://127.0.0.1:54321');
 const host=await start({backendURL:config.API_URL,anonKey:config.ANON_KEY});diagnostics=host.state;
 const watchdog=setTimeout(()=>{process.stderr.write('FAIL real Auth browser: bounded runtime exceeded\n');process.exit(1)},240000);watchdog.unref();
 try{for(const [name,engine]of [['Chromium',chromium],['WebKit',webkit]]){host.state.rpc.length=0;host.state.dropCount=0;host.state.syncDropCount=0;await runEngine(engine,name,host)}}finally{clearTimeout(watchdog);await host.close()}
}
if(require.main===module)main().catch(error=>{const kind=['AssertionError','TimeoutError','Error'].includes(error.name)?error.name:'Error';process.stderr.write('FAIL real Auth browser: '+phase+' ['+kind+'] ui='+diagnostics?.ui+' dropped='+diagnostics?.dropCount+' HTTP '+JSON.stringify(diagnostics?.http.slice(-5)||[])+'\n');process.exitCode=1});
module.exports={until,source,verifyData};
