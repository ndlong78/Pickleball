const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'block',trace:'off',screenshot:'off',video:'off'});
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',E='33333333-3333-4333-8333-333333333333',D='44444444-4444-4444-8444-444444444444';
async function load(page){await page.goto('/Pickleball/');await page.addScriptTag({url:'/Pickleball/modules/data/local-repository.js'});await page.addScriptTag({url:'/Pickleball/modules/data/account-rescue-core.js'})}
test('native IDB transaction only: offline purge fences a late page from another realm and preserves B, guest and Auth storage',async({page,context})=>{
 await load(page);const tab=await context.newPage();await load(tab);const name='purge-'+crypto.randomUUID();
 const before=await page.evaluate(async({name,A,B,E,D})=>{
  localStorage.setItem('pickleup_weekly_goal_v46','synthetic guest goal');localStorage.setItem('pickleup_auth_v6','synthetic session placeholder');
  window.TEST_DB=await PickleUpLocalRepository.open({name});window.TEST_A=TEST_DB.scope('user:'+A);
  await TEST_A.applyCanonicalSnapshot({rows:[{kind:'user_preferences',id:'self',row:{user_id:A,revision:'1',deleted_at:null,target_days:3}}],afterRevision:'1',epoch:E,reset:true});
  await TEST_A.setDomainConsent(true);await TEST_A.setActivityConsent(true,'0');await TEST_A.setPlanConsent(true,'0');await TEST_A.setDeviceState(D,'focus',{index:2});
  await TEST_DB.scope('user:'+B).write({kind:'user_preferences',id:'self',operationId:crypto.randomUUID(),value:{target_days:6}});
  window.TEST_BEFORE=await TEST_A.getAccountRescueSnapshot();const file=await PickleUpAccountRescueCore.create(TEST_BEFORE,{expectedOwner:A});await PickleUpAccountRescueCore.preview(file.text,{expectedOwner:A});
  return JSON.stringify(Object.entries(localStorage).sort());
 },{name,A,B,E,D});
 await tab.evaluate(async({name,A,E})=>{
  window.LATE_DB=await PickleUpLocalRepository.open({name});window.LATE_SCOPE=LATE_DB.scope('user:'+A);await LATE_SCOPE.getAccountRescueSnapshot();
  window.LATE_RESULT=new Promise(resolve=>window.RELEASE_LATE=resolve).then(()=>LATE_SCOPE.applyCanonicalSnapshot({rows:[{kind:'user_preferences',id:'self',row:{user_id:A,revision:'2',deleted_at:null,target_days:5}}],afterRevision:'2',epoch:E,expectedLocalVersion:'1',reset:true})).then(()=>({status:'unexpected_write'}),error=>({status:error.code}));
 },{name,A,E});
 await context.setOffline(true);
 const result=await page.evaluate(async({A,B,D})=>{
  const p=await TEST_A.getAccountPurgePreview();if(p.blockers.length)return {blockers:p.blockers};
  const result=await TEST_A.purgeAccountCache({expectedSnapshot:p.snapshot,operationId:D}),fresh=TEST_DB.scope('user:'+A),snapshot=await fresh.getAccountRescueSnapshot();
  return {status:result.status,records:snapshot.stores.records.length,device:snapshot.stores.device_state.length,metadata:snapshot.stores.metadata.length,domain:await fresh.getDomainConsent(),activity:(await fresh.getActivityConsent()).enabled,plans:(await fresh.getPlanConsent()).enabled,b:(await TEST_DB.scope('user:'+B).read('user_preferences','self')).overlay.target_days,storage:JSON.stringify(Object.entries(localStorage).sort())};
 },{A,B,D});
 expect(result).toEqual({status:'purged',records:0,device:0,metadata:4,domain:false,activity:false,plans:false,b:6,storage:before});
 expect(await tab.evaluate(async()=>{RELEASE_LATE();return LATE_RESULT})).toEqual({status:'cache_changed'});
 expect(await page.evaluate(async A=>(await TEST_DB.scope('user:'+A).getAccountRescueSnapshot()).stores.records.length,A)).toBe(0);
 await page.evaluate(()=>TEST_DB.close());await tab.evaluate(()=>LATE_DB.close());
});
test('native IDB transaction only: pending and quota failures retain complete snapshot, and reload preserves committed generation',async({page})=>{
 await load(page);const name='purge-'+crypto.randomUUID();
 const result=await page.evaluate(async({name,A,D})=>{
  const db=await PickleUpLocalRepository.open({name}),scope=db.scope('user:'+A);await scope.write({kind:'user_preferences',id:'self',operationId:D,value:{target_days:3}});
  const p=await scope.getAccountPurgePreview(),before=JSON.stringify(p.snapshot);let error;
  try{await scope.purgeAccountCache({expectedSnapshot:p.snapshot,operationId:crypto.randomUUID()})}catch(e){error=e.code}
  const preserved=JSON.stringify(await scope.getAccountRescueSnapshot())===before;
  const clean=db.scope('user:'+D);await clean.setDeviceState(D,'focus',{index:2});const cleanP=await clean.getAccountPurgePreview(),put=IDBObjectStore.prototype.put;let quota;
  try{IDBObjectStore.prototype.put=function(value){if(this.name==='metadata'&&value.key==='local-cache-generation-1')throw new DOMException('synthetic','QuotaExceededError');return put.call(this,value)};await clean.purgeAccountCache({expectedSnapshot:cleanP.snapshot,operationId:crypto.randomUUID()})}catch(e){quota=e.code}finally{IDBObjectStore.prototype.put=put}
  const rollback=JSON.stringify(await clean.getAccountRescueSnapshot())===JSON.stringify(cleanP.snapshot),remove=IDBCursor.prototype.delete,advance=IDBCursor.prototype.continue;let deleting=false,cursorError;
  try{IDBCursor.prototype.delete=function(...args){deleting=true;return remove.apply(this,args)};IDBCursor.prototype.continue=function(...args){if(deleting)throw new DOMException('synthetic','QuotaExceededError');return advance.apply(this,args)};await clean.purgeAccountCache({expectedSnapshot:cleanP.snapshot,operationId:crypto.randomUUID()})}catch(e){cursorError=e.code}finally{IDBCursor.prototype.delete=remove;IDBCursor.prototype.continue=advance}
  const cursorRollback=JSON.stringify(await clean.getAccountRescueSnapshot())===JSON.stringify(cleanP.snapshot),purged=await clean.purgeAccountCache({expectedSnapshot:cleanP.snapshot,operationId:crypto.randomUUID()});db.close();return {error,preserved,quota,rollback,cursorError,cursorRollback,generation:purged.generation};
 },{name,A,D});expect(result.error).toBe('purge_blocked');expect(result.preserved).toBe(true);expect(result.quota).toBe('quota_exceeded');expect(result.rollback).toBe(true);expect(result.cursorError).toBe('quota_exceeded');expect(result.cursorRollback).toBe(true);
 await page.reload();await page.addScriptTag({url:'/Pickleball/modules/data/local-repository.js'});
 const restored=await page.evaluate(async({name,A,D})=>{const db=await PickleUpLocalRepository.open({name});try{return {pending:(await db.scope('user:'+A).listOutbox()).length,marker:(await db.scope('user:'+D).getAccountRescueSnapshot()).stores.metadata.find(row=>row.key==='local-cache-generation-1').value}}finally{db.close()}},{name,A,D});expect(restored).toEqual({pending:1,marker:result.generation});
});
test('native V1 upgrade: close old connections, retain frozen request/device/provenance/unscoped rows, reject old reopen',async({page})=>{
 await load(page);const result=await page.evaluate(async({A,D})=>{
  const name='upgrade-'+crypto.randomUUID(),schema={records:['namespace','kind','id'],outbox:['namespace','operationId'],conflicts:['namespace','conflictId'],sync_cursor:['namespace','protocol'],import_receipts:['namespace','fingerprint','adapterVersion'],legacy_snapshots:['installationId','snapshotId'],device_state:['namespace','deviceId','key'],metadata:['namespace','key']};
  const old=await new Promise((resolve,reject)=>{const r=indexedDB.open(name,1);r.onupgradeneeded=()=>{for(const [n,keyPath]of Object.entries(schema)){const s=r.result.createObjectStore(n,{keyPath});if(n!=='legacy_snapshots')s.createIndex('namespace','namespace')}const tx=r.transaction;tx.objectStore('outbox').put({namespace:'user:'+A,operationId:D,state:'sending',request:{p_operation_id:D}});tx.objectStore('device_state').put({namespace:'user:'+A,deviceId:D,key:'focus',value:{index:2}});tx.objectStore('import_receipts').put({namespace:'user:'+A,fingerprint:'a'.repeat(64),adapterVersion:'legacy-1',value:{phase:'prepared',signature:'synthetic original'}});tx.objectStore('legacy_snapshots').put({installationId:D,snapshotId:D,raw:'synthetic rescue'})};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
  let closed=false;old.onversionchange=()=>{closed=true;old.close()};const db=await PickleUpLocalRepository.open({name});let oldError;
  await new Promise(resolve=>{const r=indexedDB.open(name,1);r.onerror=()=>{oldError=r.error.name;resolve()};r.onsuccess=()=>{r.result.close();resolve()}});
  const snapshot=await db.scope('user:'+A).getAccountRescueSnapshot(),file=await PickleUpAccountRescueCore.create(snapshot,{expectedOwner:A});await PickleUpAccountRescueCore.preview(file.text,{expectedOwner:A});db.close();
  const legacy=await new Promise((resolve,reject)=>{const r=indexedDB.open(name);r.onerror=()=>reject(r.error);r.onsuccess=()=>{const conn=r.result,t=conn.transaction('legacy_snapshots'),q=t.objectStore('legacy_snapshots').count();q.onsuccess=()=>{resolve(q.result);conn.close()};q.onerror=()=>reject(q.error)}});
  return {closed,oldError,legacy,version:snapshot.repositoryVersion,pending:snapshot.stores.outbox[0].state,original:snapshot.stores.import_receipts[0].value.signature,device:snapshot.stores.device_state[0].value.index};
 },{A,D});expect(result).toEqual({closed:true,oldError:'VersionError',legacy:1,version:3,pending:'sending',original:'synthetic original',device:2});
});
