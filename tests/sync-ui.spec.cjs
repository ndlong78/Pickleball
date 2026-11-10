const {test,expect}=require('@playwright/test'),{model}=require('./helpers/sync-model.cjs');
test.use({trace:'off',screenshot:'off',video:'off',serviceWorkers:'block'});
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
const status='#syncPilot [role=status]';
async function fixture(context,servers=new Map([A,B].map(owner=>[owner,model({owner,domainRows:true})])),{staging=false}={}){
 const calls=[];let drop=false,held=null;
 await context.route('**/modules/auth-config.js*',r=>r.fulfill({contentType:'text/javascript',body:'window.PICKLEUP_AUTH_CONFIG={enabled:true,url:'+JSON.stringify(staging?'https://rfeoeagklmaqmkcdhprb.supabase.co':'http://127.0.0.1:54321')+',publishableKey:"sb_publishable_fixture"}'}));
 if(!staging)await context.route('**/modules/data/sync-config.js*',r=>r.fulfill({contentType:'text/javascript',body:'window.PICKLEUP_SYNC_CONFIG={enabled:true}'}));
 await context.route('**/modules/auth-adapter.js*',r=>r.fulfill({contentType:'text/javascript',body:`(()=>{
 let owner=localStorage.getItem('fixture-owner')||'${A}';const listeners=new Set(),state=()=>({status:owner?'authenticated':'guest',user:owner?{id:owner,email:'fixture@example.invalid'}:null});
 function change(id){owner=id;for(const fn of [...listeners])fn(state())}
 const auth={ready:Promise.resolve(),subscribe(fn){listeners.add(fn);fn(state());return ()=>listeners.delete(fn)},syncRpc(id,name,args){return SYNC_UI_RPC({owner:id,name,args})},importRpc(...args){return this.syncRpc(...args)},logout(){localStorage.setItem('fixture-owner','');change(null);return Promise.resolve({})}};
 window.PickleUpAuth={getShared:async()=>auth};window.SWITCH_FIXTURE_OWNER=id=>{localStorage.setItem('fixture-owner',id||'');change(id)};addEventListener('storage',e=>{if(e.key==='fixture-owner')change(e.newValue||null)});
 })();`}));
 await context.exposeBinding('SYNC_UI_RPC',async(_,{owner,name,args})=>{calls.push({owner,name,args:structuredClone(args)});const result=servers.get(owner).rpc(name,args);if(name==='pull_changes'&&held&&!held.claimed){held.claimed=true;held.seen();await held.gate}if(name==='apply_sync_operation'&&drop){drop=false;return {status:'network_error'}}return result});
 return {servers,calls,drop(){drop=true},hold(){let seen,release;const reached=new Promise(r=>seen=r),gate=new Promise(r=>release=r);held={seen,gate,claimed:false};return {reached,release:()=>{release();held=null}}}};
}
async function route(page,name){await page.evaluate(async name=>{PICKLEUP_ROUTER.openPage(name);await PICKLEUP_PAGE_LOADER.ensure(name);await new Promise(requestAnimationFrame)},name);await expect(page.locator('[data-domain-notice]').filter({hasText:'Dữ liệu tài khoản'}).first()).toBeAttached()}
async function enable(page){await page.goto('/Pickleball/?page=settings');await page.locator('[data-sync-enable]').click();await expect(page.locator(status)).toContainText('Đã đọc kho tài khoản');await page.locator('[data-sync-timezone]').fill('UTC');await page.locator('[data-sync-zone-save]').click();await expect(page.locator(status)).toContainText('Đã xác nhận múi giờ')}
function remote(server,days,revision='0'){return server.apply({p_operation_id:crypto.randomUUID(),p_kind:'user_preferences',p_entity_key:'self',p_action:'put',p_expected_revision:revision,p_epoch:server.epoch,p_payload:{target_days:days,level_band:'1.0–2.0',session_minutes:45,gentle:false,goal_configured:true}})}
async function goal(page,value){await route(page,'progress');await page.locator('#wgDays').selectOption(String(value));await page.locator('#wgSave').click();await expect(page.locator('#wgStatus')).toContainText('chờ đồng bộ')}
async function send(page){await route(page,'settings');await page.locator('[data-sync-send]').click()}
test('mock Auth/RPC, independent browser stores: fresh same-account reader receives sent goals and check-ins',async({page,context,browser})=>{
 const f=await fixture(context);await enable(page);await goal(page,4);await route(page,'journey');await page.locator('#jTodayMinutes').fill('35');await page.locator('#jDone').click();await expect(page.locator('#jCheckStatus')).toContainText('chờ đồng bộ');await send(page);await expect(page.locator(status)).toContainText('Đã đồng bộ');await expect(page.locator('[data-sync-count]')).toContainText('0 thay đổi');
 const other=await browser.newContext({serviceWorkers:'block'});
 try{
  const reader=await fixture(other,f.servers),tab=await other.newPage();await enable(tab);await route(tab,'progress');await expect(tab.locator('#wgDays')).toHaveValue('4');await expect(tab.locator('#wcMinutes')).toHaveText('35 phút');expect(reader.calls.filter(c=>c.name==='apply_sync_operation')).toHaveLength(0);
  await goal(page,2);await send(page);await expect(page.locator(status)).toContainText('Đã đồng bộ');const calls=reader.calls.length;await tab.reload();await expect(tab.locator('#wgDays')).toHaveValue('4');expect(reader.calls).toHaveLength(calls);
  await route(tab,'settings');await tab.locator('[data-sync-read]').click();await expect(tab.locator(status)).toContainText('Đã đọc dữ liệu tài khoản');await route(tab,'progress');await expect(tab.locator('#wgDays')).toHaveValue('2');await expect(tab.locator('#wcMinutes')).toHaveText('35 phút');expect(reader.calls.filter(c=>c.name==='apply_sync_operation')).toHaveLength(0);
 }finally{await other.close()}
});
test('mock Auth/RPC, native IDB: later queued edits replace the previous successful sync notice',async({page,context})=>{
 const f=await fixture(context);await enable(page);await goal(page,3);await send(page);await expect(page.locator(status)).toContainText('Đã đồng bộ');await expect(page.locator('[data-sync-count]')).toContainText('0 thay đổi');
 for(const [index,value] of [4,5,2].entries()){
  await goal(page,value);await expect.poll(()=>page.evaluate(()=>PICKLEUP_DATA.getState().snapshot.outbox.filter(o=>['pending','deferred','sending'].includes(o.state)).length)).toBe(index+1);
 }
 await route(page,'settings');await expect(page.locator('[data-sync-count]')).toContainText('3 thay đổi');await expect(page.locator(status)).toContainText('Còn thay đổi chờ gửi');expect(f.calls.filter(c=>c.name==='apply_sync_operation')).toHaveLength(1);
 await page.locator('[data-sync-send]').click();await expect(page.locator(status)).toContainText('Đã đồng bộ');await expect(page.locator('[data-sync-count]')).toContainText('0 thay đổi');expect(f.servers.get(A).rows.get('user_preferences:self').target_days).toBe(2);
});
test('mock Auth/RPC, native IDB: another tab invalidates the previous successful sync notice without sending',async({page,context})=>{
 const f=await fixture(context);await enable(page);await goal(page,3);await send(page);await expect(page.locator(status)).toContainText('Đã đồng bộ');
 const tab=await context.newPage();await tab.goto('/Pickleball/?page=progress');await expect(tab.locator('#wgDays')).toBeEnabled();await goal(tab,5);await page.bringToFront();
 await expect(page.locator('[data-sync-count]')).toContainText('1 thay đổi');await expect(page.locator(status)).toContainText('Còn thay đổi chờ gửi');expect(f.calls.filter(c=>c.name==='apply_sync_operation')).toHaveLength(1);
 await page.locator('[data-sync-send]').click();await expect(page.locator(status)).toContainText('Đã đồng bộ');await expect(page.locator('[data-sync-count]')).toContainText('0 thay đổi');await tab.close();
});
for(const [prefix,width] of [['/',390],['/',820],['/Pickleball/',1180],['/Pickleball/',1440]])test('real staging flag, mock RPC: explicit trial, manual send and safe exit at '+prefix+' '+width,async({page,context})=>{
 await page.setViewportSize({width,height:900});
 const origin='https://pickleup-staging.home-309.workers.dev';
 // Virtual origin only: serve all app bytes from loopback, never contact Managed/Cloudflare.
 await context.route(origin+'/**',async request=>{
  const url=new URL(request.request().url());
  const response=await request.fetch({url:'http://127.0.0.1:4173'+url.pathname+url.search});await request.fulfill({response});
 });
 const f=await fixture(context,undefined,{staging:true});
 await context.route('https://rfeoeagklmaqmkcdhprb.supabase.co/**',request=>request.abort());
 await page.addInitScript(()=>localStorage.setItem('pickleup_weekly_goal_v46',JSON.stringify({days:5,level:'2.0–2.5'})));
 const normal=origin+prefix+'?page=settings',trial=normal+'&pilot=preferences-checkins';
 const visit=async url=>{await page.goto(url);await page.evaluate(async()=>{await PICKLEUP_PAGE_LOADER.ensure('settings');await PICKLEUP_DATA.ready})};
 await visit(normal);await expect(page.locator('#syncPilot [data-sync-body]')).toBeHidden();expect(f.calls).toHaveLength(0);
 await visit(trial);await expect(page.locator('[data-sync-staging]')).toBeVisible();await expect(page.locator('[data-sync-enable]')).toBeEnabled();expect(f.calls).toHaveLength(0);
 const guest=await page.evaluate(()=>localStorage.getItem('pickleup_weekly_goal_v46'));
 await page.locator('[data-sync-enable]').click();await expect.poll(()=>page.evaluate(()=>{const s=PICKLEUP_DATA.getState();return s.mode==='account'&&!s.busy&&!!s.snapshot})).toBe(true);
 await page.locator('[data-sync-timezone]').fill('UTC');await page.locator('[data-sync-zone-save]').click();
 await goal(page,3);expect(new URL(page.url()).searchParams.get('pilot')).toBe('preferences-checkins');
 expect(f.calls.filter(c=>c.name==='apply_sync_operation')).toHaveLength(0);
 const pending=await page.evaluate(async owner=>{const db=await PickleUpLocalRepository.open();try{return JSON.stringify(await db.scope('user:'+owner).listOutbox())}finally{db.close()}},A),calls=f.calls.length;
 await visit(normal);await expect(page.locator('#syncPilot [data-sync-body]')).toBeHidden();expect(f.calls).toHaveLength(calls);
 expect(await page.evaluate(async owner=>{const db=await PickleUpLocalRepository.open();try{return JSON.stringify(await db.scope('user:'+owner).listOutbox())}finally{db.close()}},A)).toBe(pending);
 await visit(trial);await expect(page.locator('[data-sync-count]')).toContainText('1 thay đổi');expect(f.calls).toHaveLength(calls);
 await page.locator('[data-sync-send]').click();await expect(page.locator('[data-sync-count]')).toContainText('0 thay đổi');
 expect(f.servers.get(A).rows.get('user_preferences:self').target_days).toBe(3);
 expect(f.calls.filter(c=>c.name==='apply_sync_operation')).toHaveLength(1);
 expect(await page.evaluate(()=>localStorage.getItem('pickleup_weekly_goal_v46'))).toBe(guest);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
for(const width of [390,820,1180,1440])test('mock Auth/RPC, native IDB: account source and manual check-in at '+width,async({page,context})=>{
 await page.setViewportSize({width,height:900});const f=await fixture(context);remote(f.servers.get(A),2);
 await page.addInitScript(()=>localStorage.setItem('pickleup_weekly_goal_v46',JSON.stringify({days:5,level:'2.0–2.5'})));
 await page.goto('/Pickleball/?page=journey');await expect(page.locator('#jGoalState')).toContainText('5 ngày');expect(f.calls).toHaveLength(0);
 const before=await page.evaluate(()=>localStorage.getItem('pickleup_weekly_goal_v46'));await enable(page);await route(page,'journey');await expect(page.locator('#jGoalState')).toContainText('2 ngày');
 await page.locator('#jTodayMinutes').fill('35');await page.locator('#jDone').click();await expect(page.locator('#jCheckStatus')).toContainText('chờ đồng bộ');await route(page,'progress');await expect(page.locator('#wcMinutes')).toHaveText('35 phút');
 await send(page);await expect(page.locator(status)).toContainText('Đã đồng bộ');expect(await page.evaluate(()=>localStorage.getItem('pickleup_weekly_goal_v46'))).toBe(before);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.reload();await expect(page.locator('[data-sync-count]')).toContainText('0 thay đổi');await route(page,'journey');await expect(page.locator('#jPostMinutes')).toContainText('35 phút');
});
test('mock Auth/RPC, native IDB: offline edit, reload and lost-ack replay never duplicate or change legacy',async({page,context})=>{
 const f=await fixture(context);await enable(page);await goal(page,4);await route(page,'journey');await context.setOffline(true);await page.locator('#jSkipped').click();await expect(page.locator('#jCheckStatus')).toContainText('chờ đồng bộ');await context.setOffline(false);await page.reload();await expect(page.locator('#jCheckinState')).toContainText('bỏ qua');
 f.drop();await send(page);await expect(page.locator(status)).toContainText('Lỗi mạng');const original=f.calls.find(c=>c.name==='apply_sync_operation').args;const count=f.calls.length;await page.reload();await expect(page.locator('[data-sync-retry]')).toBeVisible();expect(f.calls.length).toBe(count);await page.locator('[data-sync-retry]').click();await expect(page.locator(status)).toContainText('Đã đồng bộ');expect(f.calls.filter(c=>c.name==='apply_sync_operation')[1].args).toEqual(original);expect(f.servers.get(A).changes).toHaveLength(2);
});
test('mock Auth/RPC, native IDB: two devices show both conflict versions and archive the user decision',async({page,context,browser})=>{
 const f=await fixture(context);remote(f.servers.get(A),2);await enable(page);const other=await browser.newContext({serviceWorkers:'block'});
 try{await fixture(other,f.servers);const tab=await other.newPage();await enable(tab);await goal(page,4);await goal(tab,5);await send(page);await expect(page.locator(status)).toContainText('Đã đồng bộ');await send(tab);await expect(tab.locator(status)).toContainText('xem và xử lý');await tab.locator('[data-sync-conflicts] button').click();await expect(tab.locator('.sync-comparison')).toContainText('5 ngày');await expect(tab.locator('.sync-comparison')).toContainText('4 ngày');await tab.getByLabel('Bản muốn giữ').selectOption('local');await tab.getByRole('button',{name:'Xác nhận lựa chọn',exact:true}).click();await expect(tab.locator(status)).toContainText('Bấm đồng bộ để gửi');await tab.locator('[data-sync-send]').click();await expect(tab.locator(status)).toContainText('Đã đồng bộ');const artifact=await tab.evaluate(()=>PICKLEUP_DATA.controller().exportCache());expect(artifact.conflicts[0].resolution.local.target_days).toBe(5);expect(artifact.conflicts[0].resolution.remote.target_days).toBe(4);expect(artifact.outbox.filter(o=>o.state==='resolved')).toHaveLength(1);const download=tab.waitForEvent('download');await tab.locator('[data-sync-export]').click();expect((await download).suggestedFilename()).toBe('pickleup-account-cache.json')}
 finally{await other.close()}
});
test('mock Auth/RPC, native IDB: reset requires review, keeping server preserves rejected local intent',async({page,context})=>{
 const f=await fixture(context);remote(f.servers.get(A),2);await enable(page);await goal(page,4);f.servers.get(A).restore();await send(page);await expect(page.locator(status)).toContainText('xem và xử lý');await page.locator('[data-sync-conflicts] button').click();await page.getByLabel('Bản muốn giữ').selectOption('server');const confirm=page.getByRole('button',{name:'Xác nhận lựa chọn',exact:true});await expect(confirm).toBeDisabled();await page.locator('[data-sync-detail] input[type=checkbox]').first().check();await confirm.click();await expect(page.locator(status)).toContainText('Đã chọn bản tài khoản');const artifact=await page.evaluate(()=>PICKLEUP_DATA.controller().exportCache());expect(artifact.conflicts[0].resolution.local.target_days).toBe(4);await route(page,'progress');await expect(page.locator('#wgDays')).toHaveValue('2');
});
test('mock Auth/RPC, native IDB: late A read clears private UI immediately when switching to B',async({page,context})=>{
 const f=await fixture(context);remote(f.servers.get(A),5);await enable(page);const held=f.hold();await page.locator('[data-sync-read]').click();await held.reached;await page.evaluate(B=>SWITCH_FIXTURE_OWNER(B),B);await expect(page.locator('[data-sync-enable]')).toBeEnabled();held.release();await page.locator('[data-sync-enable]').click();await expect(page.locator(status)).toContainText('Đã đọc kho tài khoản');await route(page,'progress');await expect(page.locator('#wgDays')).toHaveValue('3');const artifact=await page.evaluate(()=>PICKLEUP_DATA.controller().exportCache());expect(artifact.owner).toBe(B);expect(JSON.stringify(artifact)).not.toContain(A);
});
test('mock Auth/RPC, native IDB: quota error keeps the form choice and creates no pending write',async({page,context})=>{
 await fixture(context);await enable(page);await route(page,'progress');await page.locator('#wgDays').selectOption('4');await page.evaluate(()=>{window.ORIGINAL_PUT=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){if(this.name==='records')throw new DOMException('synthetic','QuotaExceededError');return ORIGINAL_PUT.apply(this,args)}});try{await page.locator('#wgSave').click();await expect(page.locator('#wgStatus')).toContainText('Không lưu được');await expect(page.locator('#wgDays')).toHaveValue('4')}finally{await page.evaluate(()=>IDBObjectStore.prototype.put=ORIGINAL_PUT)}expect((await page.evaluate(()=>PICKLEUP_DATA.controller().exportCache())).outbox).toHaveLength(0);
});
test('mock Auth/RPC, native IDB: stale form keeps its draft and explicit reread adopts the other tab revision',async({page,context})=>{
 await fixture(context);await enable(page);await route(page,'progress');const tab=await context.newPage();await tab.goto('/Pickleball/?page=progress');await expect(tab.locator('#wgDays')).toBeEnabled();await tab.locator('#wgDays').selectOption('5');await page.locator('#wgDays').selectOption('4');await page.locator('#wgSave').click();await expect(page.locator('#wgStatus')).toContainText('chờ đồng bộ');await tab.bringToFront();await expect.poll(()=>tab.evaluate(()=>PICKLEUP_DATA.revision('user_preferences','self'))).toBe('1');await expect(tab.locator('#wgDays')).toHaveValue('5');await tab.locator('#wgSave').click();await expect(tab.locator('#wgStatus')).toContainText('Không lưu được');expect((await tab.evaluate(()=>PICKLEUP_DATA.controller().exportCache())).outbox).toHaveLength(1);await tab.locator('#wgRefresh').click();await expect(tab.locator('#wgDays')).toHaveValue('4');await tab.locator('#wgDays').selectOption('5');await tab.locator('#wgSave').click();await expect(tab.locator('#wgStatus')).toContainText('chờ đồng bộ');expect((await tab.evaluate(()=>PICKLEUP_DATA.controller().exportCache())).outbox).toHaveLength(2);
});
test('mock native IDB: offline navigation waits for the delayed Journey fragment before cutting the network',async({page,context})=>{
 await fixture(context);await enable(page);await goal(page,4);let release,reached;const seen=new Promise(r=>reached=r);await context.route('**/pages/journey.html*',async request=>{reached();await new Promise(r=>release=r);await request.continue()});let complete=false;const opening=route(page,'journey').then(()=>complete=true);await seen;await page.evaluate(()=>new Promise(requestAnimationFrame));const completedBeforeRelease=complete;release();await opening;expect(completedBeforeRelease).toBe(false);await context.setOffline(true);await page.locator('#jSkipped').click();await expect(page.locator('#jCheckStatus')).toContainText('chờ đồng bộ');await context.setOffline(false);
});
