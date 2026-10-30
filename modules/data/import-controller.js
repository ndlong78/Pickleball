/* Account-bound pilot importer. Persists the exact request BEFORE network I/O. */
(function(root){
'use strict';
class ImportError extends Error{constructor(code){super(code);this.name='ImportError';this.code=code}}
const fail=code=>{throw new ImportError(code)};
function create({auth,repository,owner,core=root.PickleUpImportCore,onProgress=()=>{},enabled=()=>true}){
 let active=true,busy=false,scope=repository.scope('user:'+owner),prepared=null,checkpoint=null,revision='0';
 const unsubscribe=auth.subscribe(state=>{if(state.user?.id!==owner){active=false;scope.close();prepared=null;checkpoint=null}});
 function guard(){if(!active)fail('account_changed');if(!enabled())fail('pilot_disabled')}
 async function rpc(name,args){guard();const result=await auth.importRpc(owner,name,args);guard();if(!result||['stale','network_error','auth_required','unavailable','limit_exceeded'].includes(result.status))fail(result?.status||'network_error');return result}
 async function remote(){
  const records=new Map();let after='0',high=null,epoch=null,bytes=0;
  for(let pages=0;pages<201;pages++){
   const page=await rpc('pull_changes',{p_after_revision:after,p_limit:50,p_high_water:high,p_epoch:epoch,p_protocol_version:1});
   if(page.status!=='ok'||!Array.isArray(page.changes))fail(page.status||'invalid_response');
   high=high??page.high_water;epoch=epoch??page.epoch;bytes+=JSON.stringify(page).length;if(bytes>16*1024*1024)fail('source_limit');
   for(const change of page.changes){if(change.row?.user_id!==owner||typeof change.row.revision!=='string'||!/^\d+$/.test(change.row.revision))fail('invalid_response');records.set(change.entity_kind+':'+change.entity_key,{kind:change.entity_kind,key:change.entity_key,row:change.row})}
   if(!page.has_more)return [...records.values()];
   if(page.next_revision===after)fail('invalid_response');after=page.next_revision;
  }fail('source_limit');
 }
 async function save(){guard();revision=await scope.saveImportCheckpoint(prepared.fingerprint,prepared.adapterVersion,checkpoint,revision);guard()}
 function checkResponse(result){
  if(result.status!=='applied')fail(result.status||'invalid_response');
  const manifest=result.import;if(!manifest||manifest.user_id!==owner||manifest.source_fingerprint!==prepared.fingerprint||manifest.manifest_hash!==prepared.manifestHash||typeof manifest.revision!=='string')fail('invalid_response');return manifest;
 }
 function materialize(item){const result=structuredClone(item);delete result.dependencies;for(const [key,value]of Object.entries(result.payload))if(value&&typeof value==='object'&&value.$ref){const target=checkpoint.mapping[value.$ref];if(!target)fail('dependency_not_ready');result.payload[key]=target}return result}
 function micros(value){const ms=Date.parse(value);if(!Number.isFinite(ms))return null;const fraction=typeof value==='string'?value.match(/\.(\d+)(?:Z|[+-]\d{2}:?\d{2})$/)?.[1]||'':'';return BigInt(ms)*1000n+BigInt((fraction+'000000').slice(3,6))}
 function same(a,b){if(a===b)return true;if(a===null||b===null||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;const keys=Object.keys(a);return keys.length===Object.keys(b).length&&keys.every(key=>Object.hasOwn(b,key)&&same(a[key],b[key]))}
 async function verifyCommitted(){
  const data=await remote(),byKey=new Map(data.map(r=>[r.kind+':'+r.key,r.row]));
  for(const item of prepared.items){const target=checkpoint.mapping[item.source_path],row=byKey.get(item.kind+':'+target);if(!row||row.deleted_at)fail('reconcile_error');
   if(item.mode==='reuse'){if(row.revision!==item.expected_revision)fail('reconcile_error');continue}
   const wanted=materialize(item).payload;for(const [key,value]of Object.entries(wanted)){const equal=['occurred_at','source_date','completed_at'].includes(key)&&typeof value==='string'?micros(row[key])===micros(value):same(row[key],value);if(!equal)fail('reconcile_error')}
  }checkpoint.phase='complete';await save();return structuredClone(checkpoint);
 }
 async function sendPending(){
  const pending=checkpoint.pending;if(!pending)return;
  const result=await rpc(pending.name,pending.args),manifest=checkResponse(result);
  checkpoint.importId=manifest.id;checkpoint.serverRevision=manifest.revision;
  if(pending.name==='import_batch'){
   if(!Array.isArray(result.items)||result.items.length!==pending.args.p_items.length)fail('invalid_response');
   const seen=new Set();for(const row of result.items){if(seen.has(row.source_path))fail('invalid_response');seen.add(row.source_path);if(!pending.args.p_items.some(item=>item.source_path===row.source_path)||!['applied','reused','replayed'].includes(row.status)||typeof row.target_key!=='string')fail('invalid_response');checkpoint.mapping[row.source_path]=row.target_key;checkpoint.completed[row.source_path]=true}
  }
  if(pending.name==='finish_import'){if(manifest.status!=='committed')fail('invalid_response');if(manifest.source_item_count!==prepared.sourceCount||manifest.counts?.applied+manifest.counts?.reused!==prepared.items.length||manifest.counts.invalid!==prepared.counts.invalid||manifest.counts.local_only!==prepared.counts.local_only||manifest.counts.unresolved!==0)fail('reconcile_error');checkpoint.phase='committed_unverified';checkpoint.counts=manifest.counts}
  checkpoint.pending=null;await save();onProgress({phase:checkpoint.phase,completed:Object.keys(checkpoint.completed).length,total:prepared.items.length});
 }
 return {
  remote,
  async restore(identity){guard();const prior=await scope.getImportCheckpoint(identity.fingerprint,identity.adapterVersion);guard();if(!prior)return null;
   if(prior.value.approved?.fileHash!==identity.fileHash||prior.value.owner!==owner)fail('checkpoint_changed');
   prepared=structuredClone(prior.value.approved);revision=prior.localRevision;checkpoint=prior.value;
   const {manifestHash,...binding}=prepared;if(await core.hash(binding)!==manifestHash)fail('checkpoint_changed');guard();return {plan:structuredClone(prepared),report:structuredClone(checkpoint.report),phase:checkpoint.phase,completed:Object.keys(checkpoint.completed).length};
  },
  async prepare(plan){guard();if(plan.owner!==owner||plan.counts.unresolved)fail('needs_review');const {rows,manifestHash,...binding}=structuredClone(plan);if(await core.hash(binding)!==manifestHash)fail('stale_plan');guard();prepared={...binding,manifestHash};const prior=await scope.getImportCheckpoint(plan.fingerprint,plan.adapterVersion);guard();
   if(prior){revision=prior.localRevision;checkpoint=prior.value;if(checkpoint.manifestHash!==plan.manifestHash)fail('checkpoint_changed')}
   else{revision='0';checkpoint={approved:prepared,report:rows?.map(({path,group,disposition,reason})=>({path,group,disposition,reason}))||[],manifestHash:plan.manifestHash,owner,phase:'prepared',mapping:{},completed:{},pending:null,importId:null,serverRevision:null}}
   return {phase:checkpoint.phase,completed:Object.keys(checkpoint.completed).length};
  },
  async run({manifestHash,rescueSaved,acceptQuarantine=false}={}){
   guard();if(busy)fail('busy');if(!prepared||prepared.manifestHash!==manifestHash||!rescueSaved||prepared.counts.invalid&&!acceptQuarantine)fail('consent_required');busy=true;
   try{
    if(checkpoint.phase==='complete')return structuredClone(checkpoint);
    await save();await sendPending();
    if(checkpoint.phase==='committed_unverified')return await verifyCommitted();
    if(!checkpoint.importId){checkpoint.phase='running';checkpoint.pending={name:'begin_import',args:{p_operation_id:root.crypto.randomUUID(),p_source_fingerprint:prepared.fingerprint,p_manifest_hash:prepared.manifestHash,p_adapter_version:prepared.adapterVersion,p_source_schema:prepared.format,p_source_item_count:prepared.sourceCount,p_excluded:{invalid:prepared.counts.invalid,unresolved:0,local_only:prepared.counts.local_only}}};await save();await sendPending()}
    while(Object.keys(checkpoint.completed).length<prepared.items.length){
     guard();const items=[];for(const item of prepared.items){if(checkpoint.completed[item.source_path]||!item.dependencies.every(path=>checkpoint.completed[path]))continue;const next=materialize(item);if(items.length&&new TextEncoder().encode(JSON.stringify([...items,next])).length>200*1024)break;items.push(next);if(items.length===25)break}if(!items.length)fail('dependency_not_ready');
     // Dependencies must already be acknowledged in an earlier batch. The
     // frozen batch is persisted before I/O and replayed unchanged after loss.
     checkpoint.pending={name:'import_batch',args:{p_operation_id:root.crypto.randomUUID(),p_import_id:checkpoint.importId,p_expected_revision:checkpoint.serverRevision,p_items:items}};await save();await sendPending();
    }
    checkpoint.pending={name:'finish_import',args:{p_operation_id:root.crypto.randomUUID(),p_import_id:checkpoint.importId,p_expected_revision:checkpoint.serverRevision,p_accept_quarantine:acceptQuarantine}};await save();await sendPending();
    return await verifyCommitted();
   }finally{busy=false}
  },
  close(){active=false;prepared=null;checkpoint=null;unsubscribe();scope.close()}
 };
}
const api={create,ImportError};if(typeof module!=='undefined')module.exports=api;else root.PickleUpImportController=api;
})(typeof window==='undefined'?globalThis:window);
