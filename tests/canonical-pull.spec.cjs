const {test,expect}=require('@playwright/test');
test.use({trace:'off',screenshot:'off',video:'off',serviceWorkers:'block'});
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',E='33333333-3333-4333-8333-333333333333';
async function load(page){await page.goto('/Pickleball/');await page.addScriptTag({url:'/Pickleball/modules/data/local-repository.js'});await page.addScriptTag({url:'/Pickleball/modules/data/pull-controller.js'})}
test('mock RPC, native IDB: whole-cycle pull keeps pending across remote edits, reload and offline',async({page,context})=>{
 await page.goto('/Pickleball/');expect(await page.evaluate(()=>typeof PickleUpPullController)).toBe('undefined');await load(page);const name='pr4a-'+crypto.randomUUID();
 const before=await page.evaluate(async({A,E,name})=>{
  localStorage.setItem('pickleup_weekly_goal_v46','{"days":2}');const db=await PickleUpLocalRepository.open({name}),scope=db.scope('user:'+A);let revision=1;
  const auth={subscribe(fn){fn({user:{id:A}});return ()=>{}},async importRpc(owner,method,args){const row={user_id:A,revision:String(revision),deleted_at:null,target_days:revision+1};return {status:'ok',epoch:E,high_water:String(revision),next_revision:String(revision),has_more:false,changes:[{server_revision:String(revision),record_revision:String(revision),entity_kind:'user_preferences',entity_key:'self',row}]}}};
  const reader=PickleUpPullController.create({auth,repository:db,owner:A,enabled:()=>true});try{
   await reader.pull();await scope.write({kind:'user_preferences',id:'self',value:{target_days:5},operationId:crypto.randomUUID(),expectedLocalRevision:'1'});const queue=JSON.stringify(await scope.listOutbox());revision=2;await reader.pull();return {queue,row:await scope.read('user_preferences','self'),cursor:await scope.getSyncCursor()};
  }finally{reader.close();db.close()}
 },{A,E,name});
 expect(before.row.base.target_days).toBe(3);expect(before.row.overlay.target_days).toBe(5);expect(before.row.reviewBase.row.target_days).toBe(2);expect(before.row.reviewRequired).toBe(true);
 await page.reload();await page.addScriptTag({url:'/Pickleball/modules/data/local-repository.js'});await context.setOffline(true);
 const after=await page.evaluate(async({A,name})=>{const db=await PickleUpLocalRepository.open({name}),scope=db.scope('user:'+A);try{return {row:await scope.read('user_preferences','self'),queue:JSON.stringify(await scope.listOutbox()),cursor:await scope.getSyncCursor(),legacy:localStorage.getItem('pickleup_weekly_goal_v46')}}finally{db.close()}},{A,name});
 expect(after.row).toEqual(before.row);expect(after.cursor).toEqual(before.cursor);expect(after.queue).toBe(before.queue);expect(after.legacy).toBe('{"days":2}');await context.setOffline(false);
});
test('native IDB: cursor quota failure rolls back base and retains queue before full reset review',async({page})=>{
 await load(page);const result=await page.evaluate(async({A,E})=>{
  const db=await PickleUpLocalRepository.open({name:'pr4a-'+crypto.randomUUID()}),scope=db.scope('user:'+A),put=IDBObjectStore.prototype.put;
  try{
   await scope.write({kind:'practice_checkins',id:'2026-01-01',value:{status:'done',minutes:30},operationId:crypto.randomUUID()});const original=await scope.read('practice_checkins','2026-01-01'),queue=JSON.stringify(await scope.listOutbox());let code;
   const input={rows:[{kind:'practice_checkins',id:'2026-01-01',row:{user_id:A,local_date:'2026-01-01',revision:'1',deleted_at:null,status:'skipped',minutes:null}}],afterRevision:'1',epoch:E};
   try{IDBObjectStore.prototype.put=function(...args){if(this.name==='sync_cursor')throw new DOMException('synthetic','QuotaExceededError');return put.apply(this,args)};await scope.applyCanonicalSnapshot(input)}catch(error){code=error.code}finally{IDBObjectStore.prototype.put=put}
   const unchanged=JSON.stringify(await scope.read('practice_checkins','2026-01-01'))===JSON.stringify(original)&&await scope.getSyncCursor()===undefined;
   await scope.applyCanonicalSnapshot(input);await scope.applyCanonicalSnapshot({rows:[],afterRevision:'0',epoch:null,reset:true,expectedLocalVersion:'1'});
   return {code,unchanged,row:await scope.read('practice_checkins','2026-01-01'),sameQueue:JSON.stringify(await scope.listOutbox())===queue};
  }finally{IDBObjectStore.prototype.put=put;db.close()}
 },{A,E});
 expect(result.code).toBe('quota_exceeded');expect(result.unchanged).toBe(true);expect(result.row.overlay).toEqual({status:'done',minutes:30});expect(result.row.baseMissing).toBe(true);expect(result.row.reviewReason).toBe('reset_required');expect(result.sameQueue).toBe(true);
});
test('native IDB: cursor CAS across tabs rejects a late snapshot without regressing canonical data',async({page,context})=>{
 await load(page);const tab=await context.newPage();await load(tab);const name='pr4a-'+crypto.randomUUID();
 const apply=(target,days)=>target.evaluate(async({A,E,name,days})=>{const db=await PickleUpLocalRepository.open({name});try{await db.scope('user:'+A).applyCanonicalSnapshot({rows:[{kind:'user_preferences',id:'self',row:{user_id:A,revision:String(days),deleted_at:null,target_days:days}}],afterRevision:String(days),epoch:E});return 'saved'}catch(error){return error.code}finally{db.close()}},{A,E,name,days});
 expect(await apply(tab,5)).toBe('saved');expect(await apply(page,2)).toBe('cursor_conflict');
 const row=await page.evaluate(async({A,name})=>{const db=await PickleUpLocalRepository.open({name});try{return await db.scope('user:'+A).read('user_preferences','self')}finally{db.close()}},{A,name});expect(row.base.target_days).toBe(5);
});
test('mock Auth: A→B drops delayed pull; default-disabled controller performs no request',async({page})=>{
 await load(page);const result=await page.evaluate(async({A,B,E})=>{
  const db=await PickleUpLocalRepository.open({name:'pr4a-'+crypto.randomUUID()});let listener,finish,calls=0;
  const auth={subscribe(fn){listener=fn;fn({user:{id:A}});return ()=>{}},importRpc(){calls++;return new Promise(resolve=>finish=resolve)}};
  const off=PickleUpPullController.create({auth,repository:db,owner:A});let disabled;try{await off.pull()}catch(error){disabled=error.code}off.close();
  const reader=PickleUpPullController.create({auth,repository:db,owner:A,enabled:()=>true});try{
   const pending=reader.pull().then(()=>null,error=>error.code);while(!finish)await new Promise(resolve=>setTimeout(resolve,0));listener({user:{id:B}});finish({status:'ok',changes:[],epoch:E,high_water:'0',next_revision:'0',has_more:false});
   return {disabled,calls,code:await pending,a:await db.scope('user:'+A).getSyncCursor(),b:await db.scope('user:'+B).getSyncCursor()};
  }finally{reader.close();db.close()}
 },{A,B,E});expect(result).toEqual({disabled:'pilot_disabled',calls:1,code:'account_changed',a:undefined,b:undefined});
});
