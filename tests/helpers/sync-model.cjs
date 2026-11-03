const assert=require('node:assert/strict');
const A='11111111-1111-4111-8111-111111111111',E='33333333-3333-4333-8333-333333333333',F='44444444-4444-4444-8444-444444444444';
function model({owner=A,domainRows=false,activityRows=false,planRows=false}={}){
 const rows=new Map(),receipts=new Map(),changes=[];let epoch=E;
 function apply(body){
  if(body.p_epoch!==epoch)return {status:'reset_required'};
  if(receipts.has(body.p_operation_id)){const old=receipts.get(body.p_operation_id);assert.deepEqual(body,old.body);return {...structuredClone(old.result),replayed:true}}
  const key=body.p_kind+':'+body.p_entity_key,old=rows.get(key);let result;
  if(body.p_payload.bad)result={status:'invalid',epoch};
  else if(planRows&&body.p_kind==='personal_plans'&&old&&body.p_action!=='delete'&&Object.keys(body.p_payload).some(k=>!['check_score','completed_at'].includes(k)))result={status:'invalid',epoch};
  else if(planRows&&body.p_kind==='personal_plans'&&body.p_action==='delete'&&rows.get('user_selections:self')?.selected_personal_plan_id===body.p_entity_key&&!rows.get('user_selections:self')?.deleted_at)result={status:'invalid',epoch};
  else if(planRows&&body.p_kind==='user_selections'&&body.p_action!=='delete'&&body.p_payload.selected_personal_plan_id&&(!rows.get('personal_plans:'+body.p_payload.selected_personal_plan_id)||rows.get('personal_plans:'+body.p_payload.selected_personal_plan_id).deleted_at))result={status:'invalid',epoch};
  else if(activityRows&&old&&body.p_action==='put'&&old.revision===body.p_expected_revision)result={status:'invalid',epoch};
  else if(activityRows&&body.p_action==='restore')result={status:'invalid',epoch};
  else if((old?.revision||'0')!==body.p_expected_revision||old?.deleted_at&&body.p_action==='put')result={status:'conflict',row:old||null,epoch};
  else{const row={...(planRows?(body.p_kind==='personal_plans'?{check_score:null,completed_at:null}:{selected_personal_plan_id:null,selected_academy_lesson_id:null}):{}),...(domainRows&&body.p_kind==='user_preferences'?{target_days:3,level_band:'1.0–2.0',session_minutes:45,gentle:false,goal_configured:false}:{}),...old,...body.p_payload,...(domainRows?{updated_at:'2026-01-02T00:00:00Z'}:{}),...(planRows?{...(body.p_kind==='personal_plans'?{id:body.p_entity_key}:{}),source_kind:'manual',created_at:old?.created_at||'2026-01-02T00:00:00Z',updated_at:'2026-01-02T00:00:00Z'}:{}),...(activityRows?{id:body.p_entity_key,source_kind:'manual',created_at:old?.created_at||'2026-01-02T00:00:00Z',updated_at:'2026-01-02T00:00:00Z'}:{}),user_id:owner,revision:(BigInt(body.p_expected_revision)+1n).toString(),deleted_at:body.p_action==='delete'?'2026-01-02T00:00:00Z':null};if(activityRows&&body.p_kind==='academy_attempts')row.conditions??=null;if(activityRows&&body.p_kind==='skill_assessments')for(const key of ['average','ready','level_band'])row[key]??=null;if(activityRows&&body.p_kind==='training_entries'){row.conditions??=null;row.note??=''}if(activityRows&&body.p_kind==='match_records'){row.note??='';row.doubles_issue??=null}if(body.p_kind==='practice_checkins'){row.local_date=body.p_entity_key;if(body.p_action==='delete')Object.assign(row,{status:null,minutes:null,lesson_id:null})}rows.set(key,row);changes.push({server_revision:String(changes.length+1),entity_kind:body.p_kind,entity_key:body.p_entity_key,record_revision:row.revision,row:structuredClone(row)});result={status:'applied',row,epoch,server_revision:String(changes.length)}}
  receipts.set(body.p_operation_id,{body:structuredClone(body),result:structuredClone(result)});return structuredClone(result);
 }
 return {rows,receipts,changes,apply,get epoch(){return epoch},restore(){epoch=F},rpc(name,args){
  if(name==='prepare_sync')return {status:'ok',epoch,server_revision:String(changes.length)};
  if(name==='apply_sync_operation'||name==='apply_event_operation'||name==='apply_plan_operation')return apply(args);
  if(args.p_epoch&&args.p_epoch!==epoch)return {status:'reset_required'};
  const high=args.p_high_water||String(changes.length),after=BigInt(args.p_after_revision),page=changes.filter(c=>BigInt(c.server_revision)>after&&BigInt(c.server_revision)<=BigInt(high)).slice(0,args.p_limit),next=page.at(-1)?.server_revision||args.p_after_revision;
  return {status:'ok',epoch,high_water:high,next_revision:next,has_more:BigInt(next)<BigInt(high),changes:structuredClone(page)};
 }};
}
module.exports={model};
