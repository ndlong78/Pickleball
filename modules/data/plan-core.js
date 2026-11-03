/* Standalone plan/selection contract. No DOM, storage, timers or network. */
(function(root){
'use strict';
const POLICY='plans-selections-1',KINDS=Object.freeze(['personal_plans','user_selections']);
const LEVELS=['1.0–2.0','2.0–2.5','2.5–3.0','3.0–3.5','3.5–4.0'],SKILLS=['serve','return','dink','volley','position','strategy'],ADV=['third','reset','movement','counter','doubles','decision'];
const FOCI=['third-drop','transition-reset','serve-return','kitchen-pressure','doubles-coverage','third-choice','advanced-reset','counter-volley','doubles-switch','defense-attack','tactical-choice'];
const CONTENT=['source','schema_version','level_band','plan_snapshot'],RESULTS=['check_score','completed_at'],SELECTION=['selected_personal_plan_id','selected_academy_lesson_id'];
class PlanError extends Error{constructor(code){super(code);this.name='PlanError';this.code=code}}
const fail=code=>{throw new PlanError(code)},clone=x=>structuredClone(x),object=x=>x&&Object.getPrototypeOf(x)===Object.prototype;
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(x);
const int=(x,max,min=0)=>Number.isInteger(x)&&x>=min&&x<=max;
const text=(x,max,min=0)=>typeof x==='string'&&!x.includes('\u0000')&&[...x].length>=min&&[...x].length<=max;
const decimal=x=>typeof x==='string'&&/^(0|[1-9][0-9]{0,18})$/.test(x)&&BigInt(x)<=9223372036854775807n;
function timestamp(x){return text(x,40)&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(x)&&!x.startsWith('0000-')&&Number.isFinite(Date.parse(x))&&new Date(x.slice(0,10)+'T00:00:00Z').toISOString().slice(0,10)===x.slice(0,10)}
function keys(x,allowed,required=[]){if(!object(x)||Object.keys(x).some(k=>!allowed.includes(k))||required.some(k=>!Object.hasOwn(x,k)))fail('invalid_plan')}
function canonical(x){if(Array.isArray(x))return '['+x.map(canonical).join(',')+']';if(object(x))return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';return JSON.stringify(x)}
function safe(x,max=262144){const encoded=JSON.stringify(x,(key,value)=>{if(/^(access_token|refresh_token|password|otp|service_role|publishableKey|authorization|secret|db_password|api_key)$/i.test(key))fail('credentials_forbidden');return value});if(!encoded||new TextEncoder().encode(encoded).length>max)fail('plan_limit')}
function snapshot(value,source,band){
 const v=clone(value),advanced=source==='advanced',metrics=advanced?ADV:SKILLS;
 keys(v,['id','version','createdAt','level','scores','exercises','minutes','checkpoint','completedAt','checkScore',...(advanced?['matchFocus']:[])],['id','version','createdAt','level','scores','exercises','minutes','checkpoint']);
 if(!['basic','advanced'].includes(source)||!(advanced?LEVELS.slice(3):LEVELS.slice(0,3)).includes(band)||v.level!==band||v.version!==(advanced?'3.1':'2.4')||!text(v.id,100,1)||!timestamp(v.createdAt))fail('invalid_plan');
 keys(v.scores,metrics,metrics);if(metrics.some(k=>!int(v.scores[k],20)))fail('invalid_plan');
 if(!Array.isArray(v.exercises)||v.exercises.length!==3)fail('invalid_plan');
 v.exercises.forEach((e,i)=>{
  const fields=['id','skill','name','setup','instructions','measure','mistake','skillName','minutes','baseline','target',...(advanced?['week','advanced','focus','metric']:[])];keys(e,fields,fields);
  if(!SKILLS.includes(e.skill)||!text(e.name,200,1)||!text(e.setup,1000)||!text(e.instructions,1800)||!text(e.measure,1800)||!text(e.mistake,1800)||!text(e.skillName,100)||!int(e.baseline,20)||!int(e.target,20)||e.minutes!==[12,12,15][i])fail('invalid_plan');
  if(advanced?(!/^ADV-PU-0(?:3[7-9]|[4-7][0-9]|80)$/.test(e.id)||e.advanced!==true||!int(e.week,80,1)||!FOCI.includes(e.focus)||!ADV.includes(e.metric)):!new RegExp('^'+e.skill+'-[1-4]$').test(e.id))fail('invalid_plan');
 });
 keys(v.checkpoint,['skill','baseline','target','attempts'],['skill','baseline','target','attempts']);
 if(!metrics.includes(v.checkpoint.skill)||!int(v.checkpoint.baseline,20)||!int(v.checkpoint.target,20)||v.checkpoint.attempts!==20||canonical(v.minutes)!==canonical({warmup:10,drills:[12,12,15],assessment:6,cooldown:5})||v.checkScore!=null&&!int(v.checkScore,20)||v.completedAt!=null&&!timestamp(v.completedAt)||v.matchFocus!=null&&!ADV.includes(v.matchFocus))fail('invalid_plan');
 safe(v,65536);return v;
}
function payload(kind,value,{action='put',revision='0'}={}){
 if(!KINDS.includes(kind)||!['put','delete','restore'].includes(action)||!decimal(revision))fail('invalid_plan');
 const v=clone(value);safe(v);keys(v,action==='delete'?[]:kind==='user_selections'?SELECTION:action==='restore'||revision!=='0'?RESULTS:[...CONTENT,...RESULTS],action!=='delete'&&kind==='personal_plans'&&action==='put'&&revision==='0'?CONTENT:[]);
 if(kind==='user_selections'){
  if(v.selected_personal_plan_id!=null&&!uuid(v.selected_personal_plan_id)||v.selected_academy_lesson_id!=null&&!/^PU-0(?:0[1-9]|[1-7][0-9]|80)$/.test(v.selected_academy_lesson_id))fail('invalid_selection');
 }else{
  if(Object.hasOwn(v,'plan_snapshot')){if(v.schema_version!==1)fail('invalid_plan');snapshot(v.plan_snapshot,v.source,v.level_band)}
  if(v.check_score!=null&&!int(v.check_score,20)||v.completed_at!=null&&!timestamp(v.completed_at))fail('invalid_plan');
 }return v;
}
function row(kind,v,{owner,id}={}){
 if(!KINDS.includes(kind)||!object(v)||!uuid(owner)||v.user_id!==owner||kind==='personal_plans'&&(!uuid(id)||v.id!==id)||kind==='user_selections'&&id!=='self'||!decimal(v.revision)||v.revision==='0'||!timestamp(v.created_at)||!timestamp(v.updated_at)||!(v.deleted_at===null||timestamp(v.deleted_at))||!['manual','legacy'].includes(v.source_kind))fail('invalid_plan');
 const fields=kind==='personal_plans'?[...CONTENT,...RESULTS]:SELECTION;
 if(fields.some(k=>!Object.hasOwn(v,k)||v[k]===undefined))fail('invalid_plan');
 payload(kind,Object.fromEntries(fields.map(k=>[k,v[k]])));safe(v);return v;
}
function project(data,{owner}={}){
 if(!uuid(owner)||!Array.isArray(data?.records))fail('invalid_plan');safe(data,16*1024*1024);
 const plans=[],byId=new Map();let selection=null,selectionRecord=null;
 for(const record of data.records){
  if(!KINDS.includes(record.kind)||record.namespace!=='user:'+owner)fail('invalid_plan');if(record.base)row(record.kind,record.base,{owner,id:record.id});
  if(record.kind==='user_selections'){selectionRecord=record;if(!record.deleted)selection={selected_personal_plan_id:null,selected_academy_lesson_id:null,...record.base,...record.overlay};continue}
  if(record.deleted)continue;
  const value={...record.base,...record.overlay};if(!value.plan_snapshot)continue;
  payload(record.kind,Object.fromEntries([...CONTENT,...RESULTS].filter(k=>Object.hasOwn(value,k)).map(k=>[k,value[k]])));
  const plan={...clone(value),id:record.id,pending:!!record.tailOperationId,reviewRequired:!!record.reviewRequired,acknowledged:!!record.base&&!record.base.deleted_at&&!record.deleted&&!record.reviewRequired,localRevision:record.localRevision};
  // Derived presentation gets current results; immutable content remains in plan_snapshot.
  plan.plan={...clone(value.plan_snapshot),checkScore:value.check_score??null,completedAt:value.completed_at??null};plans.push(plan);byId.set(record.id,plan);
 }
 plans.sort((a,b)=>Date.parse(b.plan_snapshot.createdAt)-Date.parse(a.plan_snapshot.createdAt)||a.id.localeCompare(b.id));
 if(selection)payload('user_selections',Object.fromEntries(SELECTION.map(k=>[k,selection[k]])));
 const selected=selection?.selected_personal_plan_id?byId.get(selection.selected_personal_plan_id):null;
 const selectionStatus=selectionRecord?.reviewRequired?'needs_review':!selection?.selected_personal_plan_id?'none':!selected?'unavailable':!selected.acknowledged?'pending_plan':selectionRecord?.tailOperationId?'pending_selection':'ready';
 return {plans,selection:selection?Object.fromEntries(SELECTION.map(k=>[k,selection[k]])):null,selectionStatus,selectedPlan:selectionStatus==='ready'?clone(selected):null};
}
const api={POLICY,KINDS,PlanError,payload,row,snapshot,project,canonical,uuid,timestamp};if(typeof module!=='undefined')module.exports=api;else root.PickleUpPlanCore=api;
})(typeof window==='undefined'?globalThis:window);
