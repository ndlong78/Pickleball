const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'allow',trace:'off',screenshot:'off',video:'off'});
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',E='33333333-3333-4333-8333-333333333333',D='44444444-4444-4444-8444-444444444444';
const panel='#accountPurge',status=panel+' [role=status]',capture='[data-purge-capture]',download='[data-purge-download]',ack='[data-purge-ack]',purge='[data-purge-run]';
async function fixture(context){
 await context.route('https://fonts.googleapis.com/**',r=>r.abort());await context.route('https://fonts.gstatic.com/**',r=>r.abort());
 // In-memory Auth fixture; real resources/worker/native IDB, no intercepted SW requests.
 await context.addInitScript(({A})=>{
  const config={enabled:true,allowSignup:false,url:'http://127.0.0.1:54321',publishableKey:'sb_publishable_fixture'};
  Object.defineProperty(window,'PICKLEUP_AUTH_CONFIG',{get:()=>config,set(){}});
  for(const name of ['SYNC','ACTIVITY','PLAN','IMPORT','PURGE']){const value={enabled:name==='PURGE'};Object.defineProperty(window,'PICKLEUP_'+name+'_CONFIG',{get:()=>value,set(){}})}
  const initial=localStorage.getItem('maintenance-fixture-owner');let owner=initial===null?A:initial||null;const listeners=new Set(),state=()=>({status:owner?'authenticated':'guest',user:owner?{id:owner,email:'fixture@example.invalid'}:null}),emit=()=>listeners.forEach(fn=>fn(state()));
  window.SWITCH_PURGE_OWNER=id=>{owner=id;localStorage.setItem('maintenance-fixture-owner',id||'');emit()};addEventListener('storage',event=>{if(event.key==='maintenance-fixture-owner'){owner=event.newValue||null;emit()}});
  const auth={ready:Promise.resolve(),subscribe(fn){listeners.add(fn);fn(state());return()=>listeners.delete(fn)},privateRead:async()=>({status:'ok'}),async logout(){window.PURGE_LOGOUT_CALLS=(window.PURGE_LOGOUT_CALLS||0)+1;SWITCH_PURGE_OWNER(null);if(window.HOLD_PURGE_LOGOUT)await new Promise(r=>window.RELEASE_PURGE_LOGOUT=r);return window.PURGE_LOGOUT_ERROR?{error:'synthetic'}:{}}};
  if(!new URL(location.href).searchParams.has('probe-real-auth'))Object.defineProperty(window,'PickleUpAuth',{get:()=>({getShared:async()=>auth}),set(){}});
  let core;Object.defineProperty(window,'PickleUpAccountRescueCore',{get:()=>core,set:value=>{core={...value,async create(...args){const result=await value.create(...args);if(window.HOLD_PURGE_HASH){window.HOLD_PURGE_HASH=false;await new Promise(r=>window.RELEASE_PURGE_HASH=r)}return result}}}});
 },{A});
}
async function load(page){await page.goto('/Pickleball/?page=settings&maintenance=account-cache');await page.evaluate(()=>PICKLEUP_PAGE_LOADER.ensure('settings'));await expect(page.locator(capture)).toBeEnabled();await expect.poll(()=>page.evaluate(async()=>{await navigator.serviceWorker.ready;return !!navigator.serviceWorker.controller})).toBe(true)}
async function seed(page){await page.evaluate(async({A,B,E,D})=>{const db=await PickleUpLocalRepository.open();try{const scope=db.scope('user:'+A);await scope.applyCanonicalSnapshot({rows:[{kind:'user_preferences',id:'self',row:{user_id:A,revision:'1',deleted_at:null,target_days:3}}],afterRevision:'1',epoch:E,reset:true});await scope.setDomainConsent(true);await scope.setActivityConsent(true,'0');await scope.setPlanConsent(true,'0');await scope.setDeviceState(D,'focus',{index:2});await db.scope('user:'+B).write({kind:'user_preferences',id:'self',operationId:D,value:{target_days:6}});localStorage.setItem('pickleup_weekly_goal_v46','synthetic guest bytes')}finally{db.close()}},{A,B,E,D})}
// Hold script insertion, not network traffic: the native SW may serve cached
// bytes, but the repository must still execute before the test reads native IDB.
async function holdReloadRepository(page){
 await page.addInitScript(()=>{
  const append=Node.prototype.appendChild;
  Node.prototype.appendChild=function(node){
   if(this===document.body&&node.tagName==='SCRIPT'&&new URL(node.src,location.href).pathname==='/Pickleball/modules/data/local-repository.js'){
    const parent=this;Node.prototype.appendChild=append;
    window.RELEASE_PURGE_REPOSITORY=()=>{delete window.RELEASE_PURGE_REPOSITORY;return append.call(parent,node)};
    return node;
   }
   return append.call(this,node);
  };
 });
}
async function snapshot(page,who=A){return page.evaluate(async who=>{const db=await PickleUpLocalRepository.open();try{return JSON.stringify(await db.scope('user:'+who).getAccountRescueSnapshot())}finally{db.close()}},who)}
async function preview(page){await page.locator(capture).click();await expect(page.locator(download)).toBeVisible();return page.locator(download).evaluate(async a=>(await fetch(a.href)).text())}
async function keepAndAcknowledge(page,actual=false){if(actual){const [file]=await Promise.all([page.waitForEvent('download'),page.locator(download).click()]);const stream=await file.createReadStream(),chunks=[];for await(const chunk of stream)chunks.push(chunk);expect(JSON.parse(Buffer.concat(chunks).toString()).payload.snapshot.owner).toBe(A);await file.delete()}else{await page.locator(download).evaluate(a=>a.addEventListener('click',e=>e.preventDefault(),{once:true}));await page.locator(download).click()}await expect(page.locator(ack)).toBeEnabled();await page.locator(ack).check()}
for(const width of [390,820,1180,1440])test('mock Auth / native worker: export, explicit confirm, logout and own clean-cache purge '+width,async({page,context})=>{
 await fixture(context);await page.setViewportSize({width,height:900});await load(page);await seed(page);const b=await snapshot(page,B),guest=await page.evaluate(()=>localStorage.getItem('pickleup_weekly_goal_v46'));await expect(page.locator(purge)).toBeDisabled();const file=JSON.parse(await preview(page));expect(file.payload.snapshot.owner).toBe(A);expect(file.payload.snapshot.repositoryVersion).toBe(3);expect(JSON.stringify(file)).not.toContain('sb_publishable_');await expect(page.locator(purge)).toBeDisabled();await keepAndAcknowledge(page,width===390);page.once('dialog',d=>d.accept());await page.locator(purge).click();await expect(page.locator(status)).toContainText('Đã dọn cache');await expect(page.locator('#accountPanel [role=status]')).toContainText('Chế độ khách');await expect(page.locator(download)).toBeHidden();await expect(page.locator(panel+' tbody tr')).toHaveCount(0);const a=JSON.parse(await snapshot(page));expect(a.stores.records).toHaveLength(0);expect(a.stores.device_state).toHaveLength(0);expect(a.stores.metadata).toHaveLength(4);expect(await snapshot(page,B)).toBe(b);expect(await page.evaluate(()=>localStorage.getItem('pickleup_weekly_goal_v46'))).toBe(guest);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);if(width===820)await holdReloadRepository(page);
 await page.reload();
 if(width===820){
  await expect.poll(()=>page.evaluate(()=>typeof RELEASE_PURGE_REPOSITORY)).toBe('function');
  // These markup defaults can pass before any feature module has executed.
  await expect(page.locator(capture)).toBeDisabled();await expect(page.locator(download)).toBeHidden();
  expect(await page.evaluate(()=>typeof PickleUpLocalRepository)).toBe('undefined');
  expect(await page.evaluate(()=>PICKLEUP_PAGE_LOADER.isLoaded('modules/data/local-repository.js'))).toBe(false);
  await page.evaluate(()=>RELEASE_PURGE_REPOSITORY());
 }
 await page.evaluate(()=>PICKLEUP_PAGE_LOADER.ensure('settings'));
 await expect(page.locator('#accountPanel [role=status]')).toHaveText('Chế độ khách');
 await expect(page.locator(status)).toContainText('Đăng nhập tài khoản cần dọn cache');
 await expect(page.locator(capture)).toBeDisabled();await expect(page.locator(download)).toBeHidden();
 // Check every own store after reload as well as retained B and guest data.
 expect(await snapshot(page)).toBe(JSON.stringify(a));expect(await snapshot(page,B)).toBe(b);
 expect(await page.evaluate(()=>localStorage.getItem('pickleup_weekly_goal_v46'))).toBe(guest);
});
test('mock Auth / native worker: pending cache remains exportable but cannot logout/purge',async({page,context})=>{
 await fixture(context);await load(page);await seed(page);await page.evaluate(async A=>{const db=await PickleUpLocalRepository.open();await db.scope('user:'+A).write({kind:'user_preferences',id:'self',operationId:crypto.randomUUID(),value:{target_days:4},expectedLocalRevision:'1'});db.close()},A);const before=await snapshot(page);await preview(page);await expect(page.locator(status)).toContainText('Có phần chưa xử lý');await expect(page.locator(purge)).toBeDisabled();await expect(page.locator(ack)).toBeDisabled();expect(await snapshot(page)).toBe(before);expect(await page.evaluate(()=>window.PURGE_LOGOUT_CALLS||0)).toBe(0);
});
test('mock Auth / native worker: offline and a cancelled confirmation preserve the complete cache',async({page,context})=>{
 await fixture(context);await load(page);await seed(page);const before=await snapshot(page);await preview(page);await keepAndAcknowledge(page);await context.setOffline(true);await page.locator(purge).click();await expect(page.locator(status)).toContainText('Cần kết nối mạng');expect(await snapshot(page)).toBe(before);expect(await page.evaluate(()=>window.PURGE_LOGOUT_CALLS||0)).toBe(0);await context.setOffline(false);page.once('dialog',d=>d.dismiss());await page.locator(purge).click();await expect(page.locator(download)).toBeHidden();expect(await snapshot(page)).toBe(before);expect(await page.evaluate(()=>window.PURGE_LOGOUT_CALLS||0)).toBe(0);
});
test('mock Auth / native worker: other tabs block begin; a new tab cannot initialize the real SDK during the lease',async({page,context})=>{
 await fixture(context);await load(page);await seed(page);const before=await snapshot(page);const other=await context.newPage();await other.goto('/Pickleball/');await preview(page);await keepAndAcknowledge(page);await page.locator(purge).click();await expect(page.locator(status)).toContainText('đóng các tab');expect(await snapshot(page)).toBe(before);expect(await page.evaluate(()=>window.PURGE_LOGOUT_CALLS||0)).toBe(0);await other.close();
 await preview(page);await keepAndAcknowledge(page);await page.evaluate(()=>window.HOLD_PURGE_LOGOUT=true);page.once('dialog',d=>d.accept());await page.locator(purge).click();await expect.poll(()=>page.evaluate(()=>typeof RELEASE_PURGE_LOGOUT)).toBe('function');await expect(page.locator('#accountPanel input[name=email]')).toBeDisabled();let vendor=0;context.on('request',r=>{if(r.url().includes('/vendor/supabase.js'))vendor++});const probe=await context.newPage();await probe.goto('/Pickleball/?page=settings&probe-real-auth=1');await probe.evaluate(()=>PICKLEUP_PAGE_LOADER.ensure('settings'));expect(await probe.evaluate(async()=>{try{await PickleUpAuth.getShared(PICKLEUP_AUTH_CONFIG);return 'unexpected'}catch(e){return e.code}})).toBe('maintenance_busy');expect(vendor).toBe(0);await expect(page.locator(status)).toContainText('đóng các tab',{timeout:10000});await probe.close();await page.evaluate(()=>RELEASE_PURGE_LOGOUT());await expect(page.locator('#accountPanel input[name=email]')).toBeEnabled();expect(await snapshot(page)).toBe(before);
});
test('mock Auth / native worker: A to B while hashing drops A file and feedback; route changes revoke the prepared URL',async({page,context})=>{
 await fixture(context);await load(page);await seed(page);await page.evaluate(()=>window.HOLD_PURGE_HASH=true);await page.locator(capture).click();await expect.poll(()=>page.evaluate(()=>typeof RELEASE_PURGE_HASH)).toBe('function');await page.evaluate(B=>SWITCH_PURGE_OWNER(B),B);await page.evaluate(()=>RELEASE_PURGE_HASH());await expect(page.locator(download)).toBeHidden();await expect(page.locator(panel+' tbody tr')).toHaveCount(0);const file=JSON.parse(await preview(page));expect(file.payload.snapshot.owner).toBe(B);await page.evaluate(()=>PICKLEUP_ROUTER.openPage('home'));await expect(page.locator(download)).toBeHidden();await page.evaluate(()=>PICKLEUP_ROUTER.openPage('settings'));await expect(page.locator(download)).toBeHidden();
});
test('purge stays disabled without configured staging/Auth and guest rescue remains available',async({page})=>{await page.goto('/Pickleball/?page=settings&maintenance=account-cache');await page.evaluate(()=>PICKLEUP_PAGE_LOADER.ensure('settings'));await expect(page.locator(capture)).toBeDisabled();await expect(page.locator('[data-purge-entry]')).toBeHidden();await expect(page.locator('#rescuePanel [data-refresh]')).toBeEnabled()});
