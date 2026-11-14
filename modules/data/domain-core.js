/* PR4c: validated preferences/check-in projection. Never reads legacy storage. */
(function(root){
'use strict';
const LEVELS=['1.0–2.0','2.0–2.5','2.5–3.0','3.0–3.5','3.5–4.0','4.0–4.5','4.5–5.0'];
const DEFAULT={target_days:3,level_band:LEVELS[0],session_minutes:45,gentle:false,goal_configured:false};
const KEYS={goal:'pickleup_weekly_goal_v46',plan:'pickleup_week_plan_v47',checkins:'pickleup_week_checkins_v48'};
class DomainError extends Error{constructor(code){super(code);this.code=code;this.name='DomainError'}}
const fail=code=>{throw new DomainError(code)};
const object=x=>x&&Object.getPrototypeOf(x)===Object.prototype;
const date=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const timestamp=s=>typeof s==='string'&&s.length<=40&&Number.isFinite(Date.parse(s));
const lesson=s=>s===null||typeof s==='string'&&/^PU-(?:0(?:0[1-9]|[1-9][0-9])|[1-9][0-9]{2,3})$/.test(s);
function timezone(s){try{return typeof s==='string'&&s.length>0&&s.length<=80&&!!new Intl.DateTimeFormat('en',{timeZone:s})}catch(_){return false}}
function preferences(value){
 if(!object(value)||!Number.isInteger(value.target_days)||value.target_days<1||value.target_days>5||!LEVELS.includes(value.level_band)||![20,30,45,60].includes(value.session_minutes)||typeof value.gentle!=='boolean'||!(value.goal_configured===null||typeof value.goal_configured==='boolean'))fail('invalid_domain');
 return Object.fromEntries(Object.keys(DEFAULT).map(key=>[key,value[key]]));
}
function checkin(value,{deleted=false}={}){
 if(!object(value)||!(value.timezone_at_entry===null||timezone(value.timezone_at_entry)))fail('invalid_domain');
 if(deleted){if(value.status!==null||value.minutes!==null||value.lesson_id!==null)fail('invalid_domain')}
 else if(!['done','skipped'].includes(value.status)||!lesson(value.lesson_id)||(value.status==='done'?!(Number.isInteger(value.minutes)&&value.minutes>=5&&value.minutes<=180):value.minutes!==null))fail('invalid_domain');
 return {status:value.status,minutes:value.minutes,lesson_id:value.lesson_id,timezone_at_entry:value.timezone_at_entry};
}
function project(snapshot,{owner,today}={}){
 if(!date(today)||!Array.isArray(snapshot.records)||!Array.isArray(snapshot.outbox)||!Array.isArray(snapshot.conflicts))fail('invalid_domain');
 const entries={},rows={},start=new Date(today+'T12:00:00Z');start.setUTCDate(start.getUTCDate()-(start.getUTCDay()+6)%7-49);const first=start.toISOString().slice(0,10);
 let prefs={...DEFAULT},prefRow=null;
 for(const record of snapshot.records){
  if(!['user_preferences','practice_checkins'].includes(record.kind)||record.namespace!=='user:'+owner)fail('invalid_domain');
  const base=record.base;
  if(base){
   if(base.user_id!==owner||!timestamp(base.updated_at)||!(base.deleted_at===null||timestamp(base.deleted_at)))fail('invalid_domain');
   if(record.kind==='user_preferences')preferences(base);else{if(base.local_date!==record.id||!date(record.id))fail('invalid_domain');checkin(base,{deleted:base.deleted_at!==null})}
  }
  const value=record.tailOperationId?record.overlay:base;
  rows[record.kind+':'+record.id]=record;
  if(record.kind==='user_preferences'){
   if(record.id!=='self')fail('invalid_domain');prefRow=record;
   if(!record.deleted&&value)prefs=preferences(record.tailOperationId?{...DEFAULT,...(base||{}),...value}:value);
  }else{
   if(!date(record.id))fail('invalid_domain');
   // Legacy views need a parseable update marker; for pre-PR4c pending rows
   // without one, use projection time, never as the occurrence date or export.
   if(!record.deleted&&value){const valid=checkin(value);if(record.id>=first&&record.id<=today)entries[record.id]={status:valid.status,minutes:valid.minutes,lessonId:valid.lesson_id,updatedAt:record.localUpdatedAt||base?.updated_at||new Date().toISOString()}}
  }
 }
 return {preferences:prefs,prefRow,rows,goal:{days:prefs.target_days,level:prefs.level_band},plan:{minutes:prefs.session_minutes,gentle:prefs.gentle},checkins:{schemaVersion:1,entries},goalConfigured:prefs.goal_configured===true};
}
function localDay(now=new Date()){return [now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-')}
function intent(view){
 const row=view.record;if(row.deleted)return null;
 const original=view.conflict.originalBase?.row||null;
 return row.kind==='user_preferences'?preferences({...DEFAULT,...(original||{}),...row.overlay}):checkin(row.overlay);
}
function resolution(view,mode){
 const row=view.record;
 if(mode!=='local')return {action:'put',value:{}};
 if(row.deleted){
  if(row.kind!=='practice_checkins')return {action:'delete',value:{}};
  const zone=view.operations.find(op=>op.operationId===row.tailOperationId)?.payload?.timezone_at_entry||row.base?.timezone_at_entry;
  if(!timezone(zone))fail('invalid_timezone');return {action:'delete',value:{timezone_at_entry:zone}};
 }
 return {action:row.base?.deleted_at?'restore':'put',value:intent(view)};
}
const api={KEYS,DEFAULT,DomainError,preferences,checkin,project,timezone,localDay,resolution,intent};
if(typeof module!=='undefined')module.exports=api;else root.PickleUpDomainCore=api;
})(typeof window==='undefined'?globalThis:window);
