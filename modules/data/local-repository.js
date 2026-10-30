/* PR2: dormant local persistence. No Auth, network, legacy storage or UI writes. */
(function(root){
'use strict';
const VERSION=1;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KINDS=new Set(['profiles','user_preferences','personal_plans','academy_attempts','skill_assessments','practice_checkins','training_entries','match_records','user_selections']);
const EVENTS=new Set(['academy_attempts','skill_assessments','training_entries','match_records']);
const SINGLETONS=new Set(['profiles','user_preferences','user_selections']);
const STORES={records:['namespace','kind','id'],outbox:['namespace','operationId'],conflicts:['namespace','conflictId'],sync_cursor:['namespace','protocol'],import_receipts:['namespace','fingerprint','adapterVersion'],legacy_snapshots:['installationId','snapshotId'],device_state:['namespace','deviceId','key'],metadata:['namespace','key']};
class RepositoryError extends Error{constructor(code){super(code);this.name='RepositoryError';this.code=code}}
const fail=code=>{throw new RepositoryError(code)};
const revision=v=>typeof v==='string'&&/^(0|[1-9][0-9]{0,18})$/.test(v);
const copy=v=>structuredClone(v);
function canonical(value,depth=0){
 if(depth>12)fail('invalid_payload');
 if(value===null||typeof value==='boolean'||typeof value==='string')return JSON.stringify(value);
 if(typeof value==='number'&&Number.isFinite(value))return JSON.stringify(value);
 if(Array.isArray(value))return '['+Array.from(value,v=>canonical(v,depth+1)).join(',')+']';
 if(value&&Object.getPrototypeOf(value)===Object.prototype){
  const keys=Object.keys(value).sort();
  if(keys.some(k=>/^(access_token|refresh_token|password|otp|service_role|publishableKey)$/i.test(k)))fail('credentials_forbidden');
  return '{'+keys.map(k=>JSON.stringify(k)+':'+canonical(value[k],depth+1)).join(',')+'}';
 }
 fail('invalid_payload');
}
const request=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
function storageError(error){return error instanceof RepositoryError?error:new RepositoryError(error?.name==='QuotaExceededError'?'quota_exceeded':error?.name==='VersionError'?'upgrade_required':'storage_unavailable')}
function open({name='pickleup-v6',indexedDB=root.indexedDB,onBlocked=()=>{},onVersionChange=()=>{}}={}){
 if(!indexedDB)return Promise.reject(new RepositoryError('storage_unavailable'));
 return new Promise((resolve,reject)=>{
  let abandoned=false,opening;
  try{opening=indexedDB.open(name,VERSION)}catch(error){reject(storageError(error));return}
  opening.onblocked=()=>{abandoned=true;reject(new RepositoryError('upgrade_blocked'));onBlocked()};
  opening.onerror=()=>reject(storageError(opening.error));
  opening.onupgradeneeded=()=>{
   if(abandoned){opening.transaction.abort();return}
   for(const [store,keyPath] of Object.entries(STORES)){
    const table=opening.result.createObjectStore(store,{keyPath});
    if(store!=='legacy_snapshots')table.createIndex('namespace','namespace');
   }
  };
  opening.onsuccess=()=>{
   const db=opening.result;
   if(abandoned){db.close();return}
   const scopes=new Set();let closed=false;
   function close(){closed=true;for(const scope of scopes)scope.close();db.close()}
   db.onversionchange=()=>{close();onVersionChange()};
   function scope(namespace){
    if(closed)fail('storage_closed');
    if(typeof namespace!=='string'||! /^(guest|user):/.test(namespace)||!UUID.test(namespace.slice(namespace.indexOf(':')+1)))fail('invalid_namespace');
    const guest=namespace.startsWith('guest:');let active=true;
    const transactions=new Set();
    async function transaction(stores,mode,work){
     if(!active||closed)fail('scope_closed');
     let tx;try{tx=db.transaction(stores,mode)}catch(error){throw storageError(error)}
     transactions.add(tx);
     const done=new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=()=>reject(storageError(tx.error));tx.onerror=()=>{}});
     // Attach a rejection handler before request callbacks can abort the transaction.
     done.catch(()=>{});
     try{
      const result=await work(tx);
      await done;
      if(!active||closed)fail('scope_closed');
      return result;
     }catch(error){try{tx.abort()}catch(_){}await done.catch(()=>{});throw storageError(error)}finally{transactions.delete(tx)}
    }
    function identity(kind,id){
     if(!KINDS.has(kind)||typeof id!=='string')fail('invalid_entity');
     if(SINGLETONS.has(kind)?id!=='self':kind==='practice_checkins'?!/^\d{4}-\d{2}-\d{2}$/.test(id)||!Number.isFinite(Date.parse(id+'T00:00:00Z'))||new Date(id+'T00:00:00Z').toISOString().slice(0,10)!==id:!UUID.test(id))fail('invalid_entity');
    }
    const api={
     close(){active=false;for(const tx of transactions){try{tx.abort()}catch(_){}}scopes.delete(api)},
     read(kind,id){identity(kind,id);return transaction(['records'],'readonly',tx=>request(tx.objectStore('records').get([namespace,kind,id])))},
     listOutbox(){return transaction(['outbox'],'readonly',tx=>request(tx.objectStore('outbox').index('namespace').getAll(namespace)))},
     async write({kind,id,value,operationId,expectedLocalRevision='0',action='put'}){
      identity(kind,id);
      if(!UUID.test(operationId)||!revision(expectedLocalRevision)||!['put','delete','restore'].includes(action))fail('invalid_operation');
      const snapshot=copy(value);
      if(!snapshot||Object.getPrototypeOf(snapshot)!==Object.prototype)fail('invalid_payload');
      const signature=canonical({kind,id,value:snapshot,operationId,expectedLocalRevision,action});
      if(new TextEncoder().encode(signature).length>256*1024)fail('payload_too_large');
      if(action==='restore'&&EVENTS.has(kind))fail('append_only');
      if(action==='delete'&&canonical(snapshot)!=='{}'&&!(kind==='practice_checkins'&&Object.keys(snapshot).length===1&&typeof snapshot.timezone_at_entry==='string'&&snapshot.timezone_at_entry.length<=80))fail('invalid_payload');
      return transaction(['records','outbox','metadata'],'readwrite',async tx=>{
       const records=tx.objectStore('records'),outbox=tx.objectStore('outbox'),metadata=tx.objectStore('metadata');
       const receiptKey=[namespace,'operation:'+operationId];
       const prior=await request(metadata.get(receiptKey));
       if(prior){if(prior.signature!==signature)fail('operation_mismatch');return {status:'replayed',localRevision:prior.localRevision}}
       const key=[namespace,kind,id],old=await request(records.get(key));
       if((old?.localRevision||'0')!==expectedLocalRevision)fail('local_conflict');
       if(old?.deleted&&action==='put')fail('explicit_restore_required');
       if(!old?.deleted&&action==='restore')fail('not_deleted');
       if(old&&EVENTS.has(kind)&&action==='put')fail('append_only');
       const localRevision=(BigInt(expectedLocalRevision)+1n).toString();
       const record={namespace,kind,id,base:old?.base||null,baseRevision:old?.baseRevision||'0',overlay:action==='delete'?null:snapshot,deleted:action==='delete',localRevision,tailOperationId:guest?null:operationId};
       if(!guest)await request(outbox.add({namespace,operationId,kind,id,action,payload:snapshot,expectedRevision:old?.tailOperationId?null:record.baseRevision,dependsOn:old?.tailOperationId||null,state:old?.tailOperationId?'deferred':'pending',protocol:1}));
       await request(records.put(record));
       await request(metadata.add({namespace,key:receiptKey[1],signature,localRevision}));
       return {status:'saved_locally',localRevision};
      });
     },
     getImportCheckpoint(fingerprint,adapterVersion){
      if(!/^[a-f0-9]{64}$/.test(fingerprint)||typeof adapterVersion!=='string'||adapterVersion.length>40)fail('invalid_checkpoint');
      return transaction(['import_receipts'],'readonly',tx=>request(tx.objectStore('import_receipts').get([namespace,fingerprint,adapterVersion])));
     },
     saveImportCheckpoint(fingerprint,adapterVersion,value,expectedLocalRevision='0'){
      if(guest||!/^[a-f0-9]{64}$/.test(fingerprint)||typeof adapterVersion!=='string'||adapterVersion.length<1||adapterVersion.length>40||!revision(expectedLocalRevision))fail('invalid_checkpoint');
      const snapshot=copy(value);if(new TextEncoder().encode(canonical(snapshot)).length>4*1024*1024)fail('payload_too_large');
      return transaction(['import_receipts'],'readwrite',async tx=>{
       const store=tx.objectStore('import_receipts'),old=await request(store.get([namespace,fingerprint,adapterVersion]));
       if((old?.localRevision||'0')!==expectedLocalRevision)fail('local_conflict');
       const localRevision=(BigInt(expectedLocalRevision)+1n).toString();
       await request(store.put({namespace,fingerprint,adapterVersion,localRevision,value:snapshot}));return localRevision;
      });
     },
     setDeviceState(deviceId,key,value){
      if(!UUID.test(deviceId)||!['timer','checklist','focus'].includes(key))fail('invalid_device_key');
      const snapshot=copy(value);if(new TextEncoder().encode(canonical(snapshot)).length>64*1024)fail('payload_too_large');
      return transaction(['device_state'],'readwrite',tx=>request(tx.objectStore('device_state').put({namespace,deviceId,key,value:snapshot})))
     },
     getDeviceState(deviceId,key){return transaction(['device_state'],'readonly',tx=>request(tx.objectStore('device_state').get([namespace,deviceId,key])))},
     // Advisory cross-tab lease only; a future sender must still use RPC receipts.
     acquireLease(owner,now=Date.now(),duration=15000){
      if(!UUID.test(owner)||!Number.isSafeInteger(now)||!Number.isInteger(duration)||duration<1||duration>60000)fail('invalid_lease');
      return transaction(['metadata'],'readwrite',async tx=>{
       const store=tx.objectStore('metadata'),key=[namespace,'senderLease'],lease=await request(store.get(key));
       if(lease&&lease.owner!==owner&&lease.until>now)return false;
       await request(store.put({namespace,key:'senderLease',owner,until:now+duration}));return true;
      });
     }
    };
    scopes.add(api);return api;
   }
   resolve({scope,close,version:VERSION});
  };
 });
}
const api={open,RepositoryError,VERSION};
if(typeof module!=='undefined')module.exports=api;else root.PickleUpLocalRepository=api;
})(typeof window!=='undefined'?window:globalThis);
