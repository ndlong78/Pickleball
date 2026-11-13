/* Local differences only. A checksum or matching cache never authorizes restore. */
(function(root){
'use strict';
const rescue=typeof module!=='undefined'?require('./account-rescue-core.js'):root.PickleUpAccountRescueCore;
const canonical=v=>v===null||typeof v!=='object'?JSON.stringify(v):Array.isArray(v)?'['+v.map(canonical).join(',')+']':'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';
function compare(fileSnapshot,deviceSnapshot,{expectedOwner}={}){
 if(typeof expectedOwner!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(expectedOwner))throw new rescue.RescueError('auth_required');
 const file=rescue.validateSnapshot(fileSnapshot,{expectedOwner}),device=rescue.validateSnapshot(deviceSnapshot,{expectedOwner});
 function index(rows,keys,store){
  const values=new Map();let unreadable=0;
  for(const row of rows){const id=keys.map(k=>row[k]);if(!id.every((v,i)=>typeof v==='string'&&v.length>0||store==='sync_cursor'&&keys[i]==='protocol'&&Number.isSafeInteger(v)&&v>=0)){unreadable++;continue}values.set(JSON.stringify(id),row)}
  return {values,unreadable};
 }
 const totals={same:0,onlyFile:0,onlyDevice:0,different:0,unreadableFile:0,unreadableDevice:0},stores=[];
 for(const [store,keys]of Object.entries(rescue.STORES)){
  const a=index(file.stores[store],keys,store),b=index(device.stores[store],keys,store),row={store,same:0,onlyFile:0,onlyDevice:0,different:0,unreadableFile:a.unreadable,unreadableDevice:b.unreadable};
  for(const [key,value]of a.values){if(!b.values.has(key))row.onlyFile++;else if(canonical(value)===canonical(b.values.get(key)))row.same++;else row.different++}
  for(const key of b.values.keys())if(!a.values.has(key))row.onlyDevice++;
  for(const key of Object.keys(totals))totals[key]+=row[key];stores.push(row);
 }
 const s=file.stores,risks=[
  ['server_records',s.records.length],['request_reconciliation',s.outbox.length],
  ['unfinished_requests',s.outbox.filter(r=>!['acked','resolved'].includes(r.state)).length],['uncertain_requests',s.outbox.filter(r=>r.state==='sending').length],
  ['conflict_review',s.conflicts.length],['fresh_pull',s.sync_cursor.length],['import_provenance',s.import_receipts.length],
  ['device_binding',s.device_state.length],['settings_not_reused',s.metadata.length],['unreadable_keys',totals.unreadableFile+totals.unreadableDevice]
 ].filter(([,count])=>count>0).map(([code,count])=>({code,count}));
 return {version:1,fileRepositoryVersion:file.repositoryVersion,deviceRepositoryVersion:device.repositoryVersion,stores,totals,risks,canRestore:false,cloudVerified:false};
}
const api={compare};if(typeof module!=='undefined')module.exports=api;else root.PickleUpRestorePreviewCore=api;
})(typeof window==='undefined'?globalThis:window);
