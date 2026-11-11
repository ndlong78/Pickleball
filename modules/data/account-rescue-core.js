/* Lossless JSON container for an own-account cache. Inspection only, no restore. */
(function(root){
'use strict';
const FORMAT='account-cache-rescue-v1',MAX_BYTES=32*1024*1024,MAX_ROWS=100000;
const STORES=Object.freeze({records:['namespace','kind','id'],outbox:['namespace','operationId'],conflicts:['namespace','conflictId'],sync_cursor:['namespace','protocol'],import_receipts:['namespace','fingerprint','adapterVersion'],device_state:['namespace','deviceId','key'],metadata:['namespace','key']});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
class RescueError extends Error{constructor(code){super(code);this.name='RescueError';this.code=code}}
const fail=code=>{throw new RescueError(code)},plain=v=>v!==null&&typeof v==='object'&&Object.getPrototypeOf(v)===Object.prototype;
const exact=(v,keys)=>plain(v)&&Object.keys(v).sort().join(',')===[...keys].sort().join(',');
const credentialKey=key=>/^(?:p)?(?:accesstoken|refreshtoken|idtoken|token|authorization|password|passwd|otp|service(?:role|rolekey|key)|supabaseservicekey|publishablekey|dbpassword|databasepassword|smtppassword|apikey|secret|clientsecret)$/.test(key.replace(/[^a-z0-9]/gi,'').toLowerCase());
function sensitive(text){return /(?:\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b|\bsb_(?:secret|publishable)_[A-Za-z0-9_-]+|\bBearer\s+\S+|\bpostgres(?:ql)?:\/\/[^\s]+|\bsmtps?:\/\/[^\s]+|\b(?:access[_-]?token|refresh[_-]?token|id[_-]?token|token|authorization|password|passwd|otp|service[_-]?(?:role(?:[_-]?key)?|key)|supabase[_-]?service[_-]?key|publishable[_-]?key|(?:db|database|smtp)[_-]?password|api[_-]?key|client[_-]?secret|secret)["']?\s*[:=]\s*["']?[^\s"',}]+)/i.test(text)}
function decoded(text){
 for(let i=0;i<40;i++){let next;try{next=decodeURIComponent(text)}catch(_){return text}if(next===text)return text;text=next}fail('too_complex');
}
function inspectJSON(value,owner,{maxDepth=40,maxNodes=1000000}={}){
 let nodes=0;
 function walk(v,depth){
  if(++nodes>maxNodes||depth>maxDepth)fail('too_complex');
  if(v===null||typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v))return;
  if(typeof v==='string'){
   if(sensitive(v))fail('credentials_detected');
   if(/%[0-9a-f]{2}/i.test(v)){const unwrapped=decoded(v);if(unwrapped!==v)walk(unwrapped,depth+1)}
   if(/^\s*[\[{]/.test(v)){let parsed;try{parsed=JSON.parse(v)}catch(_){}if(parsed!==undefined)walk(parsed,depth+1)}
   return;
  }
  if(Array.isArray(v)){
   if(Object.keys(v).length!==v.length)fail('unsupported_value');
   for(let i=0;i<v.length;i++){if(!Object.hasOwn(v,i))fail('unsupported_value');walk(v[i],depth+1)}return;
  }
  if(!plain(v))fail('unsupported_value');
  for(const [key,child] of Object.entries(v)){
   if(credentialKey(decoded(key)))fail('credentials_detected');
   if((key==='user_id'&&child!==owner)||(key==='namespace'&&child!=='user:'+owner))fail('foreign_account');
   walk(child,depth+1);
  }
 }
 walk(value,0);
}
function canonical(v){
 if(v===null||typeof v!=='object')return JSON.stringify(v);
 if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';
 return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';
}
async function digest(value,cryptoImpl=root.crypto){const bytes=new TextEncoder().encode(canonical(value));if(bytes.length>MAX_BYTES)fail('too_large');return [...new Uint8Array(await cryptoImpl.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('')}
function validate(snapshot,expectedOwner){
 if(!exact(snapshot,['owner','repositoryVersion','coverage','stores'])||(typeof snapshot.owner!=='string'||!UUID.test(snapshot.owner))||![1,2].includes(snapshot.repositoryVersion)||snapshot.coverage!=='local-cache-only'||!exact(snapshot.stores,Object.keys(STORES)))fail('invalid_format');
 if(expectedOwner!==undefined&&snapshot.owner!==expectedOwner)fail('foreign_account');
 inspectJSON(snapshot,snapshot.owner);let total=0;
 for(const [name,keys] of Object.entries(STORES)){
  const rows=snapshot.stores[name];if(!Array.isArray(rows))fail('invalid_format');total+=rows.length;if(total>MAX_ROWS)fail('too_large');
  const seen=new Set();
  for(const row of rows){
   if(!plain(row)||row.namespace!=='user:'+snapshot.owner||keys.some(k=>!Object.hasOwn(row,k)))fail('foreign_account');
   const identity=JSON.stringify(keys.map(k=>row[k]));if(seen.has(identity))fail('duplicate_key');seen.add(identity);
  }
 }
 return snapshot;
}
function report(snapshot){
 const stores=snapshot.stores,counts=Object.fromEntries(Object.entries(stores).map(([name,rows])=>[name,rows.length]));
 const states=new Map();for(const row of stores.outbox){const state=typeof row.state==='string'?row.state:'unknown';states.set(state,(states.get(state)||0)+1)}
 return {owner:snapshot.owner,counts,total:Object.values(counts).reduce((a,b)=>a+b,0),pending:stores.outbox.filter(r=>!['acked','resolved'].includes(r.state)).length,uncertain:stores.outbox.filter(r=>r.state==='sending').length,openConflicts:stores.conflicts.filter(r=>r.state==='open').length,deviceStates:stores.device_state.length,cursors:stores.sync_cursor.map(row=>({protocol:row.protocol,epoch:typeof row.epoch==='string'?row.epoch:null,afterRevision:typeof row.afterRevision==='string'?row.afterRevision:null})),outboxStates:[...states]};
}
async function create(snapshot,{expectedOwner,now=()=>new Date(),cryptoImpl=root.crypto}={}){
 const captured=structuredClone(snapshot);validate(captured,expectedOwner);
 const payload={exportedAt:now().toISOString(),snapshot:captured},sha256=await digest(payload,cryptoImpl),artifact={app:'PickleUp',format:FORMAT,version:1,payload,sha256};
 const text=JSON.stringify(artifact);if(new TextEncoder().encode(text).length>MAX_BYTES)fail('too_large');return {artifact,text,report:report(captured)};
}
async function preview(text,{expectedOwner,cryptoImpl=root.crypto}={}){
 if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_BYTES)fail('too_large');let artifact;try{artifact=JSON.parse(text)}catch(_){fail('invalid_json')}
 if(!exact(artifact,['app','format','version','payload','sha256'])||artifact.app!=='PickleUp'||artifact.format!==FORMAT||artifact.version!==1||!exact(artifact.payload,['exportedAt','snapshot'])||typeof artifact.payload.exportedAt!=='string'||!Number.isFinite(Date.parse(artifact.payload.exportedAt))||typeof artifact.sha256!=='string'||!/^[a-f0-9]{64}$/.test(artifact.sha256))fail('invalid_format');
 const snapshot=validate(artifact.payload.snapshot,expectedOwner);if(await digest(artifact.payload,cryptoImpl)!==artifact.sha256)fail('checksum_mismatch');return {artifact,report:report(snapshot)};
}
const api={FORMAT,MAX_BYTES,MAX_ROWS,STORES,RescueError,create,preview};if(typeof module!=='undefined')module.exports=api;else root.PickleUpAccountRescueCore=api;
})(typeof window==='undefined'?globalThis:window);
