const {test,expect}=require('@playwright/test');
const A='user:11111111-1111-4111-8111-111111111111',B='user:22222222-2222-4222-8222-222222222222';
async function load(page){await page.goto('/Pickleball/');await page.addScriptTag({url:'/Pickleball/modules/data/local-repository.js'})}
test('real IndexedDB: offline persistence, replay and legacy preservation',async({page,context})=>{
 await load(page);const name='pr2-'+crypto.randomUUID();
 const before=await page.evaluate(async({name,A})=>{
  localStorage.setItem('pickleup_weekly_goal_v46','{"days":2}');
  const legacy=JSON.stringify(Object.entries(localStorage).sort());
  const db=await PickleUpLocalRepository.open({name}),a=db.scope(A);
  const input={kind:'user_preferences',id:'self',operationId:crypto.randomUUID(),value:{target_days:4}};
  await a.write(input);const replay=await a.write(input);db.close();return {legacy,replay:replay.status};
 },{name,A});expect(before.replay).toBe('replayed');
 await context.setOffline(true);
 const offline=await page.evaluate(async({name,A})=>{const db=await PickleUpLocalRepository.open({name});try{return {row:await db.scope(A).read('user_preferences','self'),queue:await db.scope(A).listOutbox(),legacy:JSON.stringify(Object.entries(localStorage).sort())}}finally{db.close()}},{name,A});
 expect(offline.row.overlay.target_days).toBe(4);expect(offline.queue).toHaveLength(1);expect(offline.legacy).toBe(before.legacy);
 await context.setOffline(false);await page.reload();await page.addScriptTag({url:'/Pickleball/modules/data/local-repository.js'});
 expect(await page.evaluate(async({name,A})=>{const db=await PickleUpLocalRepository.open({name});try{return (await db.scope(A).listOutbox()).length}finally{db.close()}},{name,A})).toBe(1);
});
test('real IndexedDB: two tabs serialize CAS and isolate A/B',async({page,context})=>{
 await load(page);const tab=await context.newPage();await load(tab);const name='pr2-'+crypto.randomUUID();
 const write=p=>p.evaluate(async({name,A})=>{const db=await PickleUpLocalRepository.open({name});try{await db.scope(A).write({kind:'user_preferences',id:'self',operationId:crypto.randomUUID(),value:{target_days:3}});return 'saved'}catch(e){return e.code}finally{db.close()}},{name,A});
 expect((await Promise.all([write(page),write(tab)])).sort()).toEqual(['local_conflict','saved']);
 const result=await tab.evaluate(async({name,A,B})=>{const db=await PickleUpLocalRepository.open({name});const a=db.scope(A);a.close();try{return {a:(await db.scope(A).listOutbox()).length,b:(await db.scope(B).listOutbox()).length}}finally{db.close()}},{name,A,B});expect(result).toEqual({a:1,b:0});
});
test('real IndexedDB: injected quota failure rolls back record and queue',async({page})=>{
 await load(page);const result=await page.evaluate(async A=>{
  const db=await PickleUpLocalRepository.open({name:'pr2-'+crypto.randomUUID()}),a=db.scope(A),put=IDBObjectStore.prototype.put;let error;
  try{IDBObjectStore.prototype.put=function(...args){if(this.name==='records')throw new DOMException('synthetic','QuotaExceededError');return put.apply(this,args)};await a.write({kind:'user_preferences',id:'self',operationId:crypto.randomUUID(),value:{target_days:4}})}catch(e){error=e.code}finally{IDBObjectStore.prototype.put=put}
  try{return {error,row:await a.read('user_preferences','self'),queue:await a.listOutbox()}}finally{db.close()}
 },A);expect(result.error).toBe('quota_exceeded');expect(result.row).toBeUndefined();expect(result.queue).toEqual([]);
});
test('real IndexedDB: interrupted upgrade preserves pending operations',async({page})=>{
 await load(page);const result=await page.evaluate(async A=>{
  const name='pr2-'+crypto.randomUUID(),db=await PickleUpLocalRepository.open({name}),a=db.scope(A);
  await a.write({kind:'user_preferences',id:'self',operationId:crypto.randomUUID(),value:{target_days:3}});
  await new Promise(resolve=>{const request=indexedDB.open(name,2);request.onupgradeneeded=()=>request.transaction.abort();request.onerror=event=>{event.preventDefault();resolve()}});
  let error;try{await a.listOutbox()}catch(e){error=e.code}
  const recovered=await PickleUpLocalRepository.open({name});try{return {error,count:(await recovered.scope(A).listOutbox()).length}}finally{recovered.close();db.close()}
 },A);expect(result).toEqual({error:'scope_closed',count:1});
});
