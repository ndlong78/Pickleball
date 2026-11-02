const {expect}=require('@playwright/test'),{model}=require('./sync-model.cjs');
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',status='#activityPilot [role=status]';
async function setup(context){
 const servers=new Map([A,B].map(owner=>[owner,model({owner,activityRows:true})])),calls=[];let drop=false,hold=null;
 await context.route('**/modules/auth-config.js*',route=>route.fulfill({contentType:'text/javascript',body:'window.PICKLEUP_AUTH_CONFIG={enabled:true,url:"https://fixture.invalid",publishableKey:"sb_publishable_fixture"}'}));
 await context.route('**/modules/data/activity-config.js*',route=>route.fulfill({contentType:'text/javascript',body:'window.PICKLEUP_ACTIVITY_CONFIG={enabled:true}'}));
 await context.route('**/modules/auth-adapter.js*',route=>route.fulfill({contentType:'text/javascript',body:`(()=>{
 let owner=localStorage.getItem('fixture-owner')||'${A}';const listeners=new Set(),state=()=>({status:owner?'authenticated':'guest',user:owner?{id:owner,email:'fixture@example.invalid'}:null});
 const change=id=>{owner=id;for(const fn of [...listeners])fn(state())};
 const auth={ready:Promise.resolve(),subscribe(fn){listeners.add(fn);fn(state());return ()=>listeners.delete(fn)},eventRpc(owner,name,args){return ACADEMY_RPC({owner,name,args})},privateRead:async()=>({status:'ok'}),logout:async()=>{localStorage.setItem('fixture-owner','');change(null);return {}}};
 window.PickleUpAuth={getShared:async()=>auth};window.SWITCH_ACADEMY_OWNER=id=>{localStorage.setItem('fixture-owner',id||'');change(id)};addEventListener('storage',event=>{if(event.key==='fixture-owner')change(event.newValue||null)});
 })();`}));
 await context.addInitScript(()=>{if(!localStorage.getItem('fixture-academy-seeded')){localStorage.setItem('fixture-academy-seeded','1');localStorage.setItem('pickleup_academy_v2',JSON.stringify({'PU-001':{score:4,date:'2026-01-01T10:00:00Z'}}));localStorage.setItem('pickleup_academy_history_v44','[]');localStorage.setItem('pickleup_scores',JSON.stringify({'1':{score:20,date:'2026-01-01T10:00:00Z'}}))}});
 await context.exposeBinding('ACADEMY_RPC',async(_,{owner,name,args})=>{
  calls.push({owner,name,args:structuredClone(args)});const result=servers.get(owner).rpc(name,args);
  if(name===hold?.name&&hold&&!hold.claimed){hold.claimed=true;hold.reached();await hold.gate}
  if(name==='apply_event_operation'&&drop&&result.status==='applied'){drop=false;return {status:'network_error'}}return result;
 });
 return {servers,calls,drop(){drop=true},hold(name='pull_changes'){let reached,release;const seen=new Promise(r=>reached=r),gate=new Promise(r=>release=r);hold={gate,reached,claimed:false,name};return {seen,release(){release();hold=null}}}};
}
async function route(page,name){
 await page.evaluate(async name=>{await PICKLEUP_ROUTER.openPage(name);await PICKLEUP_PAGE_LOADER.ensure(name);await document.fonts.ready;await new Promise(requestAnimationFrame)},name);
}
async function enable(page){
 await page.goto('/Pickleball/?page=settings');await page.evaluate(async()=>{await PICKLEUP_PAGE_LOADER.ensure('settings');await document.fonts.ready;await new Promise(requestAnimationFrame)});
 await expect(page.locator('[data-activity-enable]')).toBeDisabled();await page.locator('[data-activity-consent]').check();await page.locator('[data-activity-enable]').click();await expect(page.locator(status)).toContainText('Đã đọc kho hoạt động');
}
async function save(page,value,conditions={feed:'partner',pace:'slow',target:'wide'}){
 await route(page,'academy');for(const [field,key]of [['academyFeed','feed'],['academyPace','pace'],['academyTarget','target']])await page.locator('#'+field).selectOption(conditions?.[key]||'');
 await page.locator('#academyScore').fill(String(value));await page.locator('#academySave').click();await expect(page.locator('#academyStatus')).toContainText('Đã lưu '+value+'/20 trong kho tài khoản');
}
async function send(page,force=false){await route(page,'settings');await page.locator(force?'[data-activity-retry]':'[data-activity-send]').click()}
const legacy=page=>page.evaluate(()=>JSON.stringify(Object.entries(localStorage).filter(([key])=>key.startsWith('pickleup_')&&key!=='pickleup_auth_v6').sort()));
module.exports={setup,enable,route,save,send,legacy,A,B,status};
