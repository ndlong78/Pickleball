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
const rescueStatus='#accountRescue [role=status]',planBtn='[data-account-plan]',planPanel='[data-restore-plan]',fileInput='#accountRescue input[type=file]';
// Build a rescue file in the page that additionally contains one unsent operation the device no longer has.
async function lostFile(page,{revision,target=5,kind='user_preferences',id='self',extra={}}){
 return page.evaluate(async({revision,target,kind,id,extra})=>{
  const owner=PICKLEUP_DATA.getState().owner,db=await PickleUpLocalRepository.open();
  try{
   const snap=await db.scope('user:'+owner).getAccountRescueSnapshot();
   snap.stores.outbox.push({namespace:'user:'+owner,operationId:crypto.randomUUID(),kind,id,action:'put',payload:{target_days:target,level_band:'1.0–2.0',session_minutes:45,gentle:false,goal_configured:true},baseSnapshot:null,expectedRevision:revision,dependsOn:null,state:'pending',protocol:1,...extra});
   return (await PickleUpAccountRescueCore.create(snap,{expectedOwner:owner})).text;
  }finally{db.close()}
 },{revision,target,kind,id,extra});
}
async function choose(page,text){await page.locator(fileInput).setInputFiles({name:'rescue.json',mimeType:'application/json',buffer:Buffer.from(text)});await expect(page.locator(rescueStatus)).toContainText('Chỉ xem trước')}
const goalDays=page=>page.evaluate(()=>PICKLEUP_DATA.getState().projection.goal.days);
for(const width of [390,820,1180,1440])test('restore queue/mock Auth: plan is read-only, one item re-queues locally, nothing is sent until the user syncs '+width,async({page,context})=>{
 await page.setViewportSize({width,height:900});const f=await fixture(context);await enable(page);
 await goal(page,4);await send(page);await expect(page.locator(status)).toContainText('Đã đồng bộ');
 const base=await page.evaluate(()=>PICKLEUP_DATA.getState().projection.prefRow.baseRevision);
 await page.goto('/Pickleball/?page=settings');await page.evaluate(async()=>{await PICKLEUP_PAGE_LOADER.ensure('settings');await PICKLEUP_DATA.ready});
 await expect(page.locator(planBtn)).toBeDisabled();
 await choose(page,await lostFile(page,{revision:base,target:5}));
 const applied=()=>f.calls.filter(c=>c.name==='apply_sync_operation').length,before=applied();
 await expect(page.locator(planBtn)).toBeEnabled();await page.locator(planBtn).click();await expect(page.locator(planPanel)).toBeVisible();
 await expect(page.locator('[data-restore-plan-summary]')).toContainText('1 thao tác chưa gửi');await expect(page.locator('[data-restore-plan-list] li')).toHaveCount(1);
 await expect(page.locator('[data-restore-plan-list] li')).toContainText('Mục tiêu và lịch tập');expect(applied()).toBe(before);expect(await goalDays(page)).toBe(4);
 const shown=await page.locator('#accountRescue').innerText();expect(shown).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/);
 await page.locator('[data-restore-plan-list] button').click();
 await expect(page.locator('[data-restore-plan-list] li [role=status]')).toContainText('Đã đưa vào hàng chờ');await expect(page.locator('[data-restore-plan-list] button')).toHaveCount(0);
 expect(applied()).toBe(before);expect(await goalDays(page)).toBe(5);expect(await page.evaluate(()=>PICKLEUP_DATA.pending('user_preferences','self'))).toBe(true);
 await page.locator('[data-sync-send]').click();await expect(page.locator(status)).toContainText('Đã đồng bộ');expect(applied()).toBe(before+1);
 expect(await page.evaluate(()=>PICKLEUP_DATA.pending('user_preferences','self'))).toBe(false);
 await expect(page.locator('#accountRescue')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
});
test('restore queue/mock Auth: a record that changed on the server, or a newer device change, blocks the write with a fixed message',async({page,context})=>{
 const f=await fixture(context);await enable(page);await goal(page,4);await send(page);await expect(page.locator(status)).toContainText('Đã đồng bộ');
 const base=await page.evaluate(()=>PICKLEUP_DATA.getState().projection.prefRow.baseRevision);
 remote(f.servers.get(A),2,base);                                                         // another device moved the server record on
 await page.goto('/Pickleball/?page=settings');await page.evaluate(async()=>{await PICKLEUP_PAGE_LOADER.ensure('settings');await PICKLEUP_DATA.ready});
 await choose(page,await lostFile(page,{revision:base,target:5}));await page.locator(planBtn).click();await expect(page.locator('[data-restore-plan-list] button')).toHaveCount(1);
 const before=f.calls.filter(c=>c.name==='apply_sync_operation').length;
 await page.locator('[data-restore-plan-list] button').click();
 await expect(page.locator('[data-restore-plan-list] li [role=status]')).toContainText('Dữ liệu trên máy chủ đã đổi');
 expect(await page.evaluate(()=>PICKLEUP_DATA.pending('user_preferences','self'))).toBe(false);expect(f.calls.filter(c=>c.name==='apply_sync_operation').length).toBe(before);
 await expect(page.locator('[data-restore-plan-list] button')).toHaveCount(0);
 // unsent device change for the same record is flagged up front and offers no button
 await goal(page,3);await page.goto('/Pickleball/?page=settings');await page.evaluate(async()=>{await PICKLEUP_PAGE_LOADER.ensure('settings');await PICKLEUP_DATA.ready});
 const fresh=await page.evaluate(()=>PICKLEUP_DATA.getState().projection.prefRow.baseRevision);
 await choose(page,await lostFile(page,{revision:fresh,target:5}));await page.locator(planBtn).click();
 await expect(page.locator('[data-restore-plan-list] li')).toContainText('thay đổi chưa gửi');await expect(page.locator('[data-restore-plan-list] button')).toHaveCount(0);
});
test('restore queue/mock Auth: kinds without a validator are listed with no button',async({page,context})=>{
 await fixture(context);await enable(page);await goal(page,4);await send(page);await expect(page.locator(status)).toContainText('Đã đồng bộ');
 const base=await page.evaluate(()=>PICKLEUP_DATA.getState().projection.prefRow.baseRevision);
 await page.goto('/Pickleball/?page=settings');await page.evaluate(async()=>{await PICKLEUP_PAGE_LOADER.ensure('settings');await PICKLEUP_DATA.ready});
 await choose(page,await lostFile(page,{revision:base,kind:'academy_attempts',id:'11111111-2222-4333-8444-555555555555'}));await page.locator(planBtn).click();
 await expect(page.locator('[data-restore-plan-list] li')).toContainText('Điểm Học viện');await expect(page.locator('[data-restore-plan-list] li')).toContainText('hỗ trợ khôi phục tự động');await expect(page.locator('[data-restore-plan-list] button')).toHaveCount(0);
});
