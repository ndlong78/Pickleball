/* Dry-run only: which unsent operations in a rescue file are worth offering for review.
   Never writes, never grants restore authority, never reports payloads or row ids. */
(function(root){
'use strict';
const rescue=typeof module!=='undefined'?require('./account-rescue-core.js'):root.PickleUpAccountRescueCore;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KINDS=new Set(['profiles','user_preferences','personal_plans','academy_attempts','skill_assessments','practice_checkins','training_entries','match_records','user_selections']);
const ACTIONS=new Set(['put','delete']);
const UNFINISHED=new Set(['pending','deferred','sending','blocked','conflict']);
const SETTLED=new Set(['acked','resolved']);
const EXCLUDED=['already_on_device','settled','invalid_operation','unknown_kind','unsupported_protocol','dependency_missing','dependency_excluded','dependency_cycle'];
const text=v=>typeof v==='string'&&v.length>0;
function plan(fileSnapshot,deviceSnapshot,{expectedOwner}={}){
 if(typeof expectedOwner!=='string'||!UUID.test(expectedOwner))throw new rescue.RescueError('auth_required');
 const file=rescue.validateSnapshot(fileSnapshot,{expectedOwner}),device=rescue.validateSnapshot(deviceSnapshot,{expectedOwner});
 const deviceOps=new Map(),devicePending=new Set(),deviceConflicts=new Set();
 for(const op of device.stores.outbox){
  if(text(op.operationId))deviceOps.set(op.operationId,op);
  if(UNFINISHED.has(op.state)&&text(op.kind)&&text(op.id))devicePending.add(op.kind+'\u0000'+op.id);
 }
 for(const c of device.stores.conflicts)if(c.state==='open'&&text(c.kind)&&text(c.id))deviceConflicts.add(c.kind+'\u0000'+c.id);
 const fileOps=new Map();for(const op of file.stores.outbox)if(text(op.operationId))fileOps.set(op.operationId,op);
 const excluded=Object.fromEntries(EXCLUDED.map(code=>[code,0])),verdict=new Map();
 const exclude=(op,code)=>{verdict.set(op,code);excluded[code]++};
 // Pass 1: each operation on its own merits.
 const accepted=[];
 for(const op of file.stores.outbox){
  if(SETTLED.has(op.state)){exclude(op,'settled');continue}
  if(!UNFINISHED.has(op.state)||!text(op.operationId)||!UUID.test(op.operationId)||!text(op.id)||!ACTIONS.has(op.action)){exclude(op,'invalid_operation');continue}
  if(op.protocol!==1){exclude(op,'unsupported_protocol');continue}
  if(!KINDS.has(op.kind)){exclude(op,'unknown_kind');continue}
  if(deviceOps.has(op.operationId)){exclude(op,'already_on_device');continue}
  accepted.push(op);
 }
 // Pass 2: dependencies. A settled dependency is fine (the server handled it); an unfinished one must itself be offered.
 let changed=true;const acceptedSet=new Set(accepted);
 while(changed){
  changed=false;
  for(const op of [...acceptedSet]){
   const dep=op.dependsOn;if(dep===null||dep===undefined)continue;
   if(!text(dep)||!UUID.test(dep)){acceptedSet.delete(op);exclude(op,'dependency_missing');changed=true;continue}
   if(deviceOps.has(dep))continue;
   const target=fileOps.get(dep);
   if(!target){acceptedSet.delete(op);exclude(op,'dependency_missing');changed=true;continue}
   if(SETTLED.has(target.state))continue;
   if(!acceptedSet.has(target)){acceptedSet.delete(op);exclude(op,'dependency_excluded');changed=true}
  }
 }
 // Order by dependency; whatever cannot be ordered is a cycle and is excluded.
 const ordered=[],placed=new Set(),remaining=accepted.filter(op=>acceptedSet.has(op));
 for(let progress=true;progress&&remaining.length;){
  progress=false;
  for(let i=0;i<remaining.length;i++){
   const op=remaining[i],dep=op.dependsOn&&fileOps.get(op.dependsOn);
   if(!dep||!acceptedSet.has(dep)||placed.has(dep)){ordered.push(op);placed.add(op);remaining.splice(i,1);i--;progress=true}
  }
 }
 for(const op of remaining)exclude(op,'dependency_cycle');
 const items=ordered.map(op=>{
  const warnings=[],key=op.kind+'\u0000'+op.id;
  if(op.state==='sending')warnings.push('uncertain_send');
  if(devicePending.has(key))warnings.push('device_has_unsent_change');
  if(deviceConflicts.has(key))warnings.push('device_has_open_conflict');
  return {operationId:op.operationId,kind:op.kind,id:op.id,action:op.action,state:op.state,dependsOn:text(op.dependsOn)&&acceptedSet.has(fileOps.get(op.dependsOn))?op.dependsOn:null,warnings};
 });
 const warningCounts={};for(const item of items)for(const w of item.warnings)warningCounts[w]=(warningCounts[w]||0)+1;
 return {
  version:1,fileRepositoryVersion:file.repositoryVersion,deviceRepositoryVersion:device.repositoryVersion,
  items,
  summary:{candidates:items.length,withWarnings:items.filter(i=>i.warnings.length).length,warnings:warningCounts,excluded:Object.entries(excluded).filter(([,n])=>n>0).map(([code,count])=>({code,count}))},
  canRestore:false,cloudVerified:false
 };
}
const api={KINDS,UNFINISHED,EXCLUDED,plan};if(typeof module!=='undefined')module.exports=api;else root.PickleUpRestorePlanCore=api;
})(typeof window==='undefined'?globalThis:window);
