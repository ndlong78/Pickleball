const {expect}=require('@playwright/test'),{model}=require('./sync-model.cjs');
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',status='#planPilot [role=status]';
async function setup(context,{training=false}={}){
 const servers=new Map([A,B].map(owner=>[owner,model({owner,planRows:true,activityRows:training})])),calls=[];let drop=false,hold=null;
 await context.route('**/modules/auth-config.js*',route=>route.fulfill({contentType:'text/javascript',body:'window.PICKLEUP_AUTH_CONFIG={enabled:true,url:"https://fixture.invalid",publishableKey:"sb_publishable_fixture"}'}));
 await context.route('**/modules/data/plan-config.js*',route=>route.fulfill({contentType:'text/javascript',body:'window.PICKLEUP_PLAN_CONFIG={enabled:true}'}));
 if(training)await context.route('**/modules/data/activity-config.js*',route=>route.fulfill({contentType:'text/javascript',body:'window.PICKLEUP_ACTIVITY_CONFIG={enabled:true}'}));
 await context.route('**/modules/auth-adapter.js*',route=>route.fulfill({contentType:'text/javascript',body:`(()=>{
 let owner=localStorage.getItem('fixture-owner')||'${A}';const listeners=new Set(),state=()=>({status:owner?'authenticated':'guest',user:owner?{id:owner,email:'fixture@example.invalid'}:null});
 const change=id=>{owner=id;for(const fn of [...listeners])fn(state())};
 const auth={ready:Promise.resolve(),subscribe(fn){listeners.add(fn);fn(state());return ()=>listeners.delete(fn)},eventRpc(owner,name,args){return PLANS_RPC({owner,name,args})},planRpc(owner,name,args){return PLANS_RPC({owner,name,args})},privateRead:async()=>({status:'ok'}),logout:async()=>{localStorage.setItem('fixture-owner','');change(null);return {}}};
 window.PickleUpAuth={getShared:async()=>auth};window.SWITCH_PLAN_OWNER=id=>{localStorage.setItem('fixture-owner',id||'');change(id)};addEventListener('storage',event=>{if(event.key==='fixture-owner')change(event.newValue||null)});
 })();`}));
 await context.addInitScript(snapshot=>{if(!localStorage.getItem('fixture-plan-seeded')){localStorage.setItem('fixture-plan-seeded','1');localStorage.setItem('pickleup_plans_v24',JSON.stringify([snapshot]));localStorage.setItem('pickleup_advanced_plans_v31','[]');localStorage.setItem('pickleup_selected_plan_v31',JSON.stringify({source:'basic',id:snapshot.id}));localStorage.setItem('pickleup_training_log_v26','[]');localStorage.setItem('pickleup_practice_state_v25',JSON.stringify({planId:snapshot.id,index:1,remaining:720,running:false,deadline:null,ended:false}))}},require('./plan-fixtures.cjs').payload().plan_snapshot);
 await context.exposeBinding('PLANS_RPC',async(_,{owner,name,args})=>{
  calls.push({owner,name,args:structuredClone(args)});const result=servers.get(owner).rpc(name,args);
  if(name===hold?.name&&hold&&!hold.claimed){hold.claimed=true;hold.reached();await hold.gate}
  if(['apply_plan_operation','apply_event_operation'].includes(name)&&drop&&result.status==='applied'){drop=false;return {status:'network_error'}}return result;
 });
 return {servers,calls,drop(){drop=true},hold(name='pull_changes'){let reached,release;const seen=new Promise(r=>reached=r),gate=new Promise(r=>release=r);hold={gate,reached,claimed:false,name};return {seen,release(){release();hold=null}}}};
}
async function route(page,name){
 await page.evaluate(async name=>{await PICKLEUP_ROUTER.openPage(name);await PICKLEUP_PAGE_LOADER.ensure(name);await document.fonts.ready;await new Promise(requestAnimationFrame)},name);
}
async function enable(page){
 await page.goto('/Pickleball/?page=settings');await page.evaluate(async()=>{await PICKLEUP_PAGE_LOADER.ensure('settings');await document.fonts.ready;await new Promise(requestAnimationFrame)});
 await expect(page.locator('[data-plan-enable]')).toBeDisabled();await page.locator('[data-plan-consent]').check();await page.locator('[data-plan-enable]').click();await expect.poll(()=>page.evaluate(()=>{const s=PICKLEUP_PLANS.getState();return s.mode==='account'&&!s.busy&&!!s.snapshot})).toBe(true);await expect(page.locator('[data-plan-send]')).toBeEnabled();
}
async function send(page,force=false){await route(page,'settings');await page.locator(force?'[data-plan-retry]':'[data-plan-send]').click()}
const legacy=page=>page.evaluate(()=>JSON.stringify(Object.entries(localStorage).filter(([key])=>key.startsWith('pickleup_')&&key!=='pickleup_auth_v6').sort()));
module.exports={setup,enable,route,send,legacy,A,B,status};
