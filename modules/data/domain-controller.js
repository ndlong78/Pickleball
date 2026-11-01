/* PR4c account source. Only explicit read/sync actions perform RPC. */
(function(root){
'use strict';
function create({auth,repository,core=root.PickleUpDomainCore,enabled=()=>false,pullFactory=root.PickleUpPullController,syncFactory=root.PickleUpSyncController,onChange=()=>{},notify=()=>{},now=()=>new Date(),uuid=()=>root.crypto.randomUUID()}){
 let generation=0,scope=null,reader=null,sender=null,closed=false,initial,owner=null;
 let state={mode:'loading',owner:null,busy:false,error:null,snapshot:null,projection:null};
 const fail=code=>{throw new core.DomainError(code)};
 function emit(){onChange({...state})}
 function stop(){scope?.close();reader?.close();sender?.close();scope=reader=sender=null}
 function guard(stamp=generation){if(closed||stamp!==generation)fail('account_changed');if(enabled()!==true)fail('pilot_disabled')}
 async function load(stamp=generation){
  const snapshot=await scope.getDomainSnapshot();guard(stamp);
  const timezone=await scope.getDomainTimezone();guard(stamp);
  const projection=core.project(snapshot,{owner,today:core.localDay(now())});
  state={...state,snapshot,projection,timezone:core.timezone(timezone)?timezone:null};emit();return state;
 }
 async function adopt(next){
  const stamp=++generation;stop();owner=next;
  state={mode:next?'loading':'guest',owner:next,busy:false,error:null,snapshot:null,projection:null};emit();
  if(!next||closed)return;
  try{
   scope=repository.scope('user:'+next);const consent=await scope.getDomainConsent();guard(stamp);
   if(!consent){state={...state,mode:'guest'};emit();return}
   const timezone=await scope.getDomainTimezone();guard(stamp);state={...state,mode:'account',timezone:core.timezone(timezone)?timezone:null};await load(stamp);
  }catch(error){if(stamp===generation&&!closed){state={...state,mode:'error',error:error.code||'storage_unavailable'};emit()}}
 }
 const unsubscribe=auth.subscribe(value=>{const next=value.status==='authenticated'?value.user?.id||null:null;if(next!==owner||state.mode==='loading'&&!scope)initial=adopt(next)});
 if(!initial)initial=adopt(null);
 function ensureAccount(){guard();if(state.mode!=='account'||!scope)fail('source_unavailable')}
 function writable(kind,id,expected){
  ensureAccount();if(state.busy)fail('busy');if(!state.snapshot?.cursor?.epoch)fail('bootstrap_required');
  const row=state.projection.rows[kind+':'+id];if((row?.localRevision||'0')!==expected)fail('local_conflict');
  if(row?.reviewRequired)fail('needs_review');return row;
 }
 async function task(work,{account=true}={}){
  if(account)ensureAccount();else guard();if(state.busy)fail('busy');
  const stamp=generation;state={...state,busy:true,error:null};emit();
  try{const result=await work(stamp);guard(stamp);return result}
  catch(error){if(stamp===generation&&!closed){state={...state,error:error.code||'storage_unavailable',...(error.code==='invalid_domain'?{mode:'error',snapshot:null,projection:null}:{})};emit()}throw error}
  finally{if(stamp===generation&&!closed){state={...state,busy:false};emit()}}
 }
 function factory(type){const options={auth,repository,owner,enabled};return type==='reader'?pullFactory.create(options):syncFactory.create({...options,pullFactory})}
 async function read(stamp,{forceReset=false}={}){
  if(root.navigator?.onLine===false)fail('offline');
  const head=await auth.syncRpc(owner,'prepare_sync',{p_protocol_version:1});guard(stamp);
  if(head?.status!=='ok')fail(['auth_required','network_error','upgrade_required','stale','unavailable'].includes(head?.status)?head.status:'invalid_response');
  reader||=factory('reader');await reader.pull({forceReset});guard(stamp);await load(stamp);notify(owner);return {status:'updated'};
 }
 return {
  ready:initial,
  getState(){return structuredClone(state)},
  async refreshLocal(){if(owner&&!state.busy){const stamp=generation;try{const consent=await scope.getDomainConsent();guard(stamp);if(consent!==(state.mode==='account'))await adopt(owner);else if(consent)await load(stamp)}catch(error){if(stamp===generation){state={...state,mode:'error',error:error.code||'storage_unavailable',projection:null,snapshot:null};emit()}}}},
  async useAccount(){
   return task(async stamp=>{if(!owner)fail('auth_required');await scope.setDomainConsent(true);guard(stamp);const timezone=await scope.getDomainTimezone();guard(stamp);state={...state,mode:'account',timezone:core.timezone(timezone)?timezone:null};await load(stamp);notify(owner);return read(stamp)},{account:false});
  },
  async useDevice(){guard();if(!owner)fail('auth_required');if(state.busy)fail('busy');const stamp=generation;await scope.setDomainConsent(false);guard(stamp);notify(owner);await adopt(owner)},
  async refresh(){return task(async stamp=>{if(!owner)fail('auth_required');const forceReset=state.mode==='error';state={...state,mode:'account'};return read(stamp,{forceReset})},{account:false})},
  async setTimezone(value){if(!core.timezone(value))fail('invalid_timezone');return task(async stamp=>{await scope.setDomainTimezone(value);guard(stamp);state={...state,timezone:value};emit();notify(owner)})},
  async sync({forceRetry=false}={}){
   return task(async stamp=>{sender||=factory('sender');try{return await sender.sync({forceRetry})}finally{guard(stamp);await load(stamp);notify(owner)}});
  },
  async savePreferences(patch,expectedLocalRevision,{restore=false}={}){
   writable('user_preferences','self',expectedLocalRevision);
   const value=core.preferences({...state.projection.preferences,...patch}),row=state.projection.prefRow;
   if(row?.deleted&&restore!==true)fail('explicit_restore_required');
   return task(async stamp=>{await scope.write({kind:'user_preferences',id:'self',value,action:row?.deleted?'restore':'put',operationId:uuid(),expectedLocalRevision});guard(stamp);await load(stamp);notify(owner)});
  },
  async saveCheckin({day,status,minutes=null,lessonId=null,timezone,expectedLocalRevision,restore=false}){
   const row=writable('practice_checkins',day,expectedLocalRevision);
   if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(Date.parse(day+'T00:00:00Z'))||new Date(day+'T00:00:00Z').toISOString().slice(0,10)!==day||day>core.localDay(now())||!['done','skipped','clear'].includes(status)||!core.timezone(timezone)||timezone!==state.timezone)fail('invalid_domain');
   if(row?.deleted&&status!=='clear'&&restore!==true)fail('explicit_restore_required');
   const action=status==='clear'?'delete':row?.deleted?'restore':'put',value=status==='clear'?{timezone_at_entry:timezone}:core.checkin({status,minutes:status==='done'?minutes:null,lesson_id:lessonId,timezone_at_entry:timezone});
   return task(async stamp=>{await scope.write({kind:'practice_checkins',id:day,value,action,operationId:uuid(),expectedLocalRevision});guard(stamp);await load(stamp);notify(owner)});
  },
  async previewConflict(id){ensureAccount();const stamp=generation,view=await scope.inspectSyncConflict(id);guard(stamp);return view},
  async resolveConflict(view,mode,{acknowledgeEpochChange=false,restore=false}={}){
   const decision=core.resolution(view,mode);if(mode==='local'&&decision.action==='restore'&&restore!==true)fail('explicit_restore_required');
   return task(async stamp=>{const result=await scope.resolveSyncConflict({conflictId:view.conflict.conflictId,expectedLocalRevision:view.record.localRevision,expectedRemoteRevision:view.record.baseRevision,epoch:view.cursor.epoch,mode,operationId:uuid(),...decision,acknowledgeEpochChange});guard(stamp);await load(stamp);notify(owner);return result});
  },
  exportCache(){ensureAccount();if(!state.snapshot)fail('source_unavailable');return {app:'PickleUp',format:'preferences-checkins-cache-v1',owner,exportedAt:now().toISOString(),scope:['user_preferences','practice_checkins'],...structuredClone(state.snapshot)}},
  close(){closed=true;generation++;stop();unsubscribe();state={mode:'guest',owner:null,busy:false,error:null,snapshot:null,projection:null}}
 };
}
const api={create};if(typeof module!=='undefined')module.exports=api;else root.PickleUpDomainController=api;
})(typeof window==='undefined'?globalThis:window);
