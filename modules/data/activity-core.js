/* PR5a1 typed activity events. No legacy reads, DOM, Auth or network. */
(function(root){
'use strict';
const KINDS=Object.freeze(['academy_attempts','skill_assessments','training_entries','match_records']);
const LEVELS=['1.0–2.0','2.0–2.5','2.5–3.0','3.0–3.5','3.5–4.0'],SKILLS=['serve','return','dink','volley','position','strategy'],ADVANCED=['third','reset','movement','counter','doubles','decision'];
const FOCUS=['third-drop','transition-reset','serve-return','kitchen-pressure','doubles-coverage','third-choice','advanced-reset','counter-volley','doubles-switch','defense-attack','tactical-choice'];
const FIELDS={academy_attempts:['client_event_id','lesson_id','skill','level_band','score','occurred_at','content_version','lesson_snapshot','conditions'],skill_assessments:['client_event_id','assessment_type','scale','scores','level_band','occurred_at','average','ready'],training_entries:['client_event_id','plan_id','exercise_id','skill','level_band','kind','hits','attempts','note','conditions','occurred_at'],match_records:['client_event_id','mode','ours','theirs','focus','note','doubles_issue','occurred_at']};
const DEFAULTS={academy_attempts:{conditions:null},skill_assessments:{level_band:null,average:null,ready:null},training_entries:{note:'',conditions:null},match_records:{note:'',doubles_issue:null}};
class ActivityError extends Error{constructor(code){super(code);this.name='ActivityError';this.code=code}}
const fail=code=>{throw new ActivityError(code)};
const object=x=>x&&Object.getPrototypeOf(x)===Object.prototype;
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
const timestamp=x=>typeof x==='string'&&x.length<=40&&/^\d{4}-\d{2}-\d{2}T/.test(x)&&Number.isFinite(Date.parse(x));
const text=(x,max,min=0)=>typeof x==='string'&&[...x].length>=min&&[...x].length<=max;
const int=(x,max,min=0)=>Number.isInteger(x)&&x>=min&&x<=max;
function keys(x,allowed,required=allowed){return object(x)&&Object.keys(x).every(k=>allowed.includes(k))&&required.every(k=>Object.hasOwn(x,k))}
function conditions(x){return x===null||keys(x,['feed','pace','target'])&&['partner','machine','rally'].includes(x.feed)&&['slow','moderate','match'].includes(x.pace)&&['wide','standard','narrow'].includes(x.target)}
function validate(kind,value,legacy=false){
 if(!KINDS.includes(kind)||!object(value)||!uuid(value.client_event_id)||!(timestamp(value.occurred_at)||legacy&&value.occurred_at===null))fail('invalid_activity');
 if(kind==='academy_attempts'){
  if(!/^PU-0(?:0[1-9]|[1-7][0-9]|80)$/.test(value.lesson_id)||!SKILLS.includes(value.skill)||!LEVELS.includes(value.level_band)||!int(value.score,20)||!text(value.content_version,40,1)||!keys(value.lesson_snapshot,['title','assessment'],['title'])||!text(value.lesson_snapshot.title,200,1)||Object.hasOwn(value.lesson_snapshot,'assessment')&&!text(value.lesson_snapshot.assessment,1800)||!conditions(value.conditions))fail('invalid_activity');
 }else if(kind==='skill_assessments'){
  const advanced=value.assessment_type==='advanced',scoreKeys=advanced?ADVANCED:SKILLS,max=value.assessment_type==='self'?2:20;
  if(!['self','stage','advanced'].includes(value.assessment_type)||value.scale!==max||!keys(value.scores,scoreKeys)||!scoreKeys.every(k=>int(value.scores[k],max))||!(value.assessment_type==='self'?(value.level_band===null||LEVELS.includes(value.level_band)):(advanced?LEVELS.slice(3):LEVELS.slice(0,3)).includes(value.level_band))||!(value.average===null||typeof value.average==='number'&&Number.isFinite(value.average)&&value.average>=0&&value.average<=20)||!(value.ready===null||typeof value.ready==='boolean'))fail('invalid_activity');
 }else if(kind==='training_entries'){
  if(!(uuid(value.plan_id)||legacy&&value.plan_id===null&&text(value.legacy_plan_id,100,1))||!SKILLS.includes(value.skill)||!LEVELS.includes(value.level_band)||!(new RegExp('^'+value.skill+'-[1-4]$').test(value.exercise_id)||/^ADV-PU-0(3[7-9]|[4-7][0-9]|80)$/.test(value.exercise_id))||!['drill','assessment'].includes(value.kind)||!int(value.hits,20)||value.attempts!==20||!text(value.note,240)||!conditions(value.conditions))fail('invalid_activity');
 }else if(!['singles','doubles'].includes(value.mode)||!int(value.ours,99)||!int(value.theirs,99)||!FOCUS.includes(value.focus)||!text(value.note,280)||!(value.doubles_issue===null||['middle','communication','transition','third','none'].includes(value.doubles_issue)))fail('invalid_activity');
}
function payload(kind,value){
 if(!KINDS.includes(kind)||!keys(value,FIELDS[kind],FIELDS[kind].filter(k=>!Object.hasOwn(DEFAULTS[kind],k))))fail('invalid_activity');
 const normalized={...DEFAULTS[kind],...structuredClone(value)};validate(kind,normalized);
 if(new TextEncoder().encode(JSON.stringify(normalized)).length>16384)fail('activity_limit');return normalized;
}
function row(kind,value,{owner,id}={}){
 if(!KINDS.includes(kind)||!object(value)||!uuid(value.id)||value.id!==id||value.user_id!==owner||!uuid(owner)||!['manual','legacy'].includes(value.source_kind)||typeof value.revision!=='string'||!/^[1-9][0-9]{0,18}$/.test(value.revision)||BigInt(value.revision)>9223372036854775807n||!timestamp(value.created_at)||!timestamp(value.updated_at)||!(value.deleted_at===null||timestamp(value.deleted_at)))fail('invalid_activity');
 validate(kind,value,value.source_kind==='legacy');return value;
}
function comparisonKey(kind,value){
 if(!['academy_attempts','training_entries'].includes(kind)||!value.conditions||!conditions(value.conditions)||value.occurred_at===null)return null;
 try{validate(kind,value,value.source_kind==='legacy')}catch(_){return null}
 if(kind==='training_entries'&&!uuid(value.plan_id))return null;
 return JSON.stringify([kind,kind==='academy_attempts'?value.lesson_id:value.exercise_id,value.skill,value.level_band,kind==='academy_attempts'?[value.content_version,value.lesson_snapshot?.title,value.lesson_snapshot?.assessment??null]:[value.plan_id,value.kind],value.conditions.feed,value.conditions.pace,value.conditions.target]);
}
function project(snapshot,{owner,now=new Date()}={}){
 if(!uuid(owner)||!Array.isArray(snapshot.records)||!Number.isFinite(new Date(now).getTime()))fail('invalid_activity');
 const events=Object.fromEntries(KINDS.map(kind=>[kind,[]])),latestAcademy={};
 for(const record of snapshot.records){
  if(!KINDS.includes(record.kind)||record.namespace!=='user:'+owner)fail('invalid_activity');
  if(record.base)row(record.kind,record.base,{owner,id:record.id});
  if(record.deleted)continue;
  let value=record.base;if(record.tailOperationId){const pending=payload(record.kind,record.overlay);value={...pending,id:record.id,user_id:owner,source_kind:'manual',revision:null,pending:true}}
  if(!value)continue;events[record.kind].push({...structuredClone(value),pending:!!record.tailOperationId});
 }
 for(const kind of KINDS)events[kind].sort((a,b)=>(a.occurred_at===null)-(b.occurred_at===null)||(a.occurred_at&&b.occurred_at?Date.parse(b.occurred_at)-Date.parse(a.occurred_at):0)||a.id.localeCompare(b.id));
 for(const attempt of events.academy_attempts){if(attempt.occurred_at!==null&&Date.parse(attempt.occurred_at)<=new Date(now).getTime()&&!latestAcademy[attempt.lesson_id])latestAcademy[attempt.lesson_id]=attempt}
 return {events,latestAcademy};
}
const api={KINDS,ActivityError,payload,row,project,comparisonKey,conditions};if(typeof module!=='undefined')module.exports=api;else root.PickleUpActivityCore=api;
})(typeof window==='undefined'?globalThis:window);
