/* PR3c: versioned, conservative legacy mapper. No storage/network/DOM. */
(function(root){
'use strict';
const VERSION='legacy-1',LEVELS=['1.0–2.0','2.0–2.5','2.5–3.0','3.0–3.5','3.5–4.0'],SKILLS=['serve','return','dink','volley','position','strategy'],ADV=['third','reset','movement','counter','doubles','decision'];
const FOCI=['third-drop','transition-reset','serve-return','kitchen-pressure','doubles-coverage','third-choice','advanced-reset','counter-volley','doubles-switch','defense-attack','tactical-choice'];
const GROUPS=['scores','academy','academyHistory','assessment','stageChecks','advancedChecks','personalPlans','advancedPlans','weeklyGoal','weeklyPlan','weeklyCheckins','trainingLog','matchJournal','selectedPlan','lastLesson'];
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
class ImportError extends Error{constructor(code){super(code);this.name='ImportError';this.code=code}}
const fail=code=>{throw new ImportError(code)};
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const int=(v,a,b)=>Number.isInteger(v)&&v>=a&&v<=b;
const str=(v,max)=>typeof v==='string'&&v.length<=max&&!v.includes('\u0000');
const own=(v,key)=>Object.hasOwn(v,key);
function keys(v,allowed,required=[]){if(!object(v))fail('invalid_object');if(Object.keys(v).some(k=>!allowed.includes(k)))fail('unknown_fields');if(required.some(k=>!own(v,k)))fail('missing_fields')}
function date(v){if(!str(v,40)||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(v)||v.startsWith('0000-')||!Number.isFinite(Date.parse(v)))fail('unknown_timestamp');if(new Date(v.slice(0,10)+'T00:00:00Z').toISOString().slice(0,10)!==v.slice(0,10))fail('unknown_timestamp');return v}
function scoreMap(v,ks,max){keys(v,ks,ks);if(ks.some(k=>!int(v[k],0,max)))fail('invalid_scores')}
function conditions(v){if(v===undefined||v===null)return null;keys(v,['feed','pace','target'],['feed','pace','target']);if(!['partner','machine','rally'].includes(v.feed)||!['slow','moderate','match'].includes(v.pace)||!['wide','standard','narrow'].includes(v.target))fail('invalid_conditions');return v}
function canonical(v){if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';if(object(v))return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';return JSON.stringify(v)}
async function hash(v){const data=typeof v==='string'?v:canonical(v);return [...new Uint8Array(await root.crypto.subtle.digest('SHA-256',new TextEncoder().encode(data)))].map(n=>n.toString(16).padStart(2,'0')).join('')}
async function eventId(owner,fingerprint,path){const h=await hash([owner,fingerprint,path]);return h.slice(0,8)+'-'+h.slice(8,12)+'-8'+h.slice(13,16)+'-8'+h.slice(17,20)+'-'+h.slice(20,32)}
function plan(v,advanced){
 keys(v,['id','version','createdAt','level','scores','exercises','minutes','checkpoint','completedAt','checkScore',...(advanced?['matchFocus']:[])],['id','version','createdAt','level','scores','exercises','minutes','checkpoint']);
 if(!str(v.id,100)||!v.id||v.version!==(advanced?'3.1':'2.4')||!(advanced?LEVELS.slice(3):LEVELS.slice(0,3)).includes(v.level))fail('invalid_plan');
 date(v.createdAt);scoreMap(v.scores,advanced?ADV:SKILLS,20);
 if(!Array.isArray(v.exercises)||v.exercises.length!==3)fail('invalid_plan');
 v.exercises.forEach((e,i)=>{const extras=advanced?['week','advanced','focus','metric']:[];keys(e,['id','skill','name','setup','instructions','measure','mistake','minutes','baseline','target','skillName',...extras],['id','skill','name','setup','instructions','measure','mistake','minutes','baseline','target','skillName',...extras]);
  if(!SKILLS.includes(e.skill)||!str(e.name,200)||!e.name||!str(e.setup,1000)||!str(e.instructions,1800)||!str(e.measure,1800)||!str(e.mistake,1800)||!str(e.skillName,100)||!int(e.baseline,0,20)||!int(e.target,0,20)||e.minutes!==[12,12,15][i])fail('invalid_plan');
  if(advanced?(!/^ADV-PU-0(?:3[7-9]|[4-7][0-9]|80)$/.test(e.id)||!int(e.week,1,80)||e.advanced!==true||!FOCI.includes(e.focus)||!ADV.includes(e.metric)):!new RegExp('^'+e.skill+'-[1-4]$').test(e.id))fail('invalid_plan');
 });
 keys(v.checkpoint,['skill','baseline','target','attempts'],['skill','baseline','target','attempts']);if(!(advanced?ADV:SKILLS).includes(v.checkpoint.skill)||!int(v.checkpoint.baseline,0,20)||!int(v.checkpoint.target,0,20)||v.checkpoint.attempts!==20||canonical(v.minutes)!==canonical({warmup:10,drills:[12,12,15],assessment:6,cooldown:5}))fail('invalid_plan');
 if(own(v,'checkScore')&&v.checkScore!==null&&!int(v.checkScore,0,20))fail('invalid_scores');if(v.completedAt!=null)date(v.completedAt);if(v.matchFocus!=null&&!ADV.includes(v.matchFocus))fail('invalid_plan');
 if(new TextEncoder().encode(JSON.stringify(v)).length>65536)fail('payload_too_large');
 return {source:advanced?'advanced':'basic',legacy_id:v.id,schema_version:1,level_band:v.level,plan_snapshot:v,...(own(v,'checkScore')?{check_score:v.checkScore}:{}),...(own(v,'completedAt')?{completed_at:v.completedAt===null?null:date(v.completedAt)}:{})};
}
function uniqueKeys(text){
 const scanner=/\s*("(?:\\.|[^"\\])*"|[{}\[\],:]|true|false|null|-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)/gy;let token;const next=()=>token=scanner.exec(text)?.[1];next();
 function value(depth){if(depth>30)fail('source_limit');if(token==='{'){next();const seen=new Set();if(token==='}'){next();return}while(token!==undefined){const key=JSON.parse(token);if(seen.has(key))fail('duplicate_json_keys');seen.add(key);next();next();value(depth+1);if(token==='}'){next();return}next()}}
  else if(token==='['){next();if(token===']'){next();return}while(token!==undefined){value(depth+1);if(token===']'){next();return}next()}}else{if(/^-?[0-9]/.test(token)){const number=Number(token);if(!Number.isFinite(number)||Number.isInteger(number)&&!Number.isSafeInteger(number))fail('unsafe_number')}next()};
 }value(0);
}
async function decode(text,rescue){
 const info=await rescue.preview(text);uniqueKeys(text);const data=JSON.parse(text),fields={},extras=[];
 if(info.format==='raw-rescue-v1')for(const entry of data.entries){if(!entry.present)continue;const known=rescue.INVENTORY.find(x=>x.key===entry.key),field=known?.field||(entry.key==='pickleup_academy_last_lesson_v4'?'lastLesson':null);
  if(!field){extras.push({path:entry.key,group:entry.key,disposition:'local_only',reason:'device_or_unknown'});continue}
  try{if(entry.key!=='pickleup_academy_last_lesson_v4'){JSON.parse(entry.raw);uniqueKeys(entry.raw)}fields[field]=entry.key==='pickleup_academy_last_lesson_v4'?entry.raw:JSON.parse(entry.raw)}catch(error){extras.push({path:field,group:field,disposition:'invalid',reason:error.code||'malformed_json'})}
 }else if(info.format==='backup-v1'){for(const [key,value] of Object.entries(data)){if(GROUPS.includes(key))fields[key]=value;else if(!['app','schemaVersion','exportedAt'].includes(key))extras.push({path:key,group:key,disposition:'local_only',reason:'unknown_group'})}}
 else{fields.homeRecords=data.records;for(const key of Object.keys(data).filter(k=>!['app','records','exportedAt'].includes(k)))extras.push({path:key,group:key,disposition:'local_only',reason:'unknown_group'})}
 return {info,fields,extras};
}
async function prepare(text,{owner,selected=[],timezone='',remote=[],choices={},rescue}={}){
 if(!UUID.test(owner)||!rescue)fail('auth_required');
 if(!Array.isArray(remote)||remote.some(r=>!object(r.row)||r.row.user_id!==owner||typeof r.row.revision!=='string'||! /^(0|[1-9][0-9]*)$/.test(r.row.revision)))fail('invalid_remote');
 if(!Array.isArray(selected)||selected.some(g=>!GROUPS.includes(g)&&g!=='homeRecords'))fail('invalid_groups');
 const {info,fields,extras}=await decode(text,rescue),rows=[...extras],planRefs=new Map();
 const selectedSet=new Set(selected);
 function add(group,path,value,mapper){if(rows.length>=5000)fail('source_limit');const row={group,path,disposition:'local_only',reason:'not_selected'};if(value===null){rows.push({...row,reason:'empty_source'});return}
  if(selectedSet.has(group))try{Object.assign(row,mapper(value),{disposition:'ready',reason:null})}catch(error){row.disposition=error.code==='unknown_fields'||error.code==='ambiguous_plan'||error.code==='timezone_required'?'unresolved':'invalid';row.reason=error.code||'invalid_record'}rows.push(row);
 }
 function each(group,mapper){if(!own(fields,group))return;const list=fields[group];if(Array.isArray(list)&&rows.length+list.length>5000)fail('source_limit');if(!Array.isArray(list)){add(group,group,list,()=>fail('invalid_array'));return}list.forEach((v,i)=>{add(group,group+'['+i+']',v,x=>{if(object(x)&&own(x,'id')&&!str(x.id,100))fail('invalid_legacy_id');const result=mapper(x);if(['trainingLog','matchJournal','stageChecks','advancedChecks'].includes(group)&&x.id)result.legacyIdentity=x.id;return result})})}
 const fresh=(kind,payload,key=null,dependencies=[])=>({kind,key,payload,dependencies});
 for(const group of ['personalPlans','advancedPlans'])each(group,v=>{const payload=plan(v,group==='advancedPlans');const key=payload.source+':'+v.id,paths=planRefs.get(key)||[];const path=group+'['+fields[group].indexOf(v)+']';paths.push(path);planRefs.set(key,paths);return fresh('personal_plans',payload)});
 function ref(id,source){const paths=source?(planRefs.get(source+':'+id)||[]):[...(planRefs.get('basic:'+id)||[]),...(planRefs.get('advanced:'+id)||[])];if(paths.length!==1)fail(paths.length?'ambiguous_plan':'orphan_plan');return paths[0]}
 for(const group of ['scores','academy'])if(own(fields,group)){const entries=fields[group];if(!object(entries))add(group,group,entries,()=>fail('invalid_object'));else for(const [key,v]of Object.entries(entries))add(group,group+'.'+key,v,x=>{
  keys(x,['score','date','skill','level'],['score','date']);if(!int(x.score,0,20)||!(group==='scores'?/^[0-5]$/:/^PU-0(?:0[1-9]|[1-7][0-9]|80)$/).test(key))fail('invalid_scores');return fresh('legacy_score_snapshots',{source_namespace:group==='scores'?'weekly':'academy',source_key:key,score:x.score,source_date:date(x.date)})
 })}
 each('homeRecords',v=>{keys(v,['week','skill','score','total','date'],['week','score','total','date']);if(!int(v.week,1,6)||!int(v.score,0,20)||v.total!==20)fail('invalid_scores');return fresh('legacy_score_snapshots',{source_namespace:'weekly',source_key:String(v.week-1),score:v.score,source_date:date(v.date)})});
 each('academyHistory',v=>{keys(v,['id','skill','level','score','date','conditions'],['id','skill','level','score','date']);if(!/^PU-0(?:0[1-9]|[1-7][0-9]|80)$/.test(v.id)||!SKILLS.includes(v.skill)||!LEVELS.includes(v.level)||!int(v.score,0,20))fail('invalid_attempt');return fresh('academy_attempts',{lesson_id:v.id,skill:v.skill,level_band:v.level,score:v.score,occurred_at:date(v.date),conditions:conditions(v.conditions),content_version:'legacy-unknown',lesson_snapshot:{title:v.id+' (nội dung gốc không lưu)'}})});
 if(own(fields,'assessment'))add('assessment','assessment',fields.assessment,v=>{keys(v,['schemaVersion','answers','date'],['answers','date']);if(v.schemaVersion!==undefined&&v.schemaVersion!==1)fail('invalid_assessment');scoreMap(v.answers,SKILLS,2);return fresh('skill_assessments',{assessment_type:'self',scale:2,scores:v.answers,occurred_at:date(v.date)})});
 for(const group of ['stageChecks','advancedChecks'])each(group,v=>{keys(v,['id','level','values','average','ready','date'],['level','values','date']);const advanced=group==='advancedChecks';if(!(advanced?LEVELS.slice(3):LEVELS.slice(0,3)).includes(v.level))fail('unknown_level');scoreMap(v.values,advanced?ADV:SKILLS,20);if(v.average!==undefined&&(typeof v.average!=='number'||!Number.isFinite(v.average)||v.average<0||v.average>20)||v.ready!==undefined&&typeof v.ready!=='boolean')fail('invalid_assessment');return fresh('skill_assessments',{assessment_type:advanced?'advanced':'stage',scale:20,scores:v.values,level_band:v.level,occurred_at:date(v.date),...(own(v,'average')?{average:v.average}:{}),...(own(v,'ready')?{ready:v.ready}:{})})});
 if(own(fields,'weeklyGoal'))add('weeklyGoal','weeklyGoal',fields.weeklyGoal,v=>{keys(v,['days','level'],['days','level']);if(!int(v.days,1,5)||!LEVELS.includes(v.level))fail('invalid_preferences');return fresh('user_preferences',{target_days:v.days,level_band:v.level,goal_configured:true},'self')});
 if(own(fields,'weeklyPlan'))add('weeklyPlan','weeklyPlan',fields.weeklyPlan,v=>{keys(v,['minutes','gentle'],['minutes','gentle']);if(![20,30,45,60].includes(v.minutes)||typeof v.gentle!=='boolean')fail('invalid_preferences');return fresh('user_preferences',{session_minutes:v.minutes,gentle:v.gentle},'self')});
 if(own(fields,'weeklyCheckins')){const data=fields.weeklyCheckins;if(!object(data)||data.schemaVersion!==1||!object(data.entries)||Object.keys(data).some(k=>!['schemaVersion','entries'].includes(k)))add('weeklyCheckins','weeklyCheckins',data,()=>fail('invalid_checkins'));else for(const [day,value]of Object.entries(data.entries))add('weeklyCheckins','weeklyCheckins.'+day,value,v=>{
  keys(v,['status','minutes','lessonId','updatedAt'],['status','minutes','lessonId','updatedAt']);date(v.updatedAt);if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||day<'1900-01-01'||!Number.isFinite(Date.parse(day+'T00:00:00Z'))||new Date(day+'T00:00:00Z').toISOString().slice(0,10)!==day)fail('invalid_day');
  if(!timezone||! /^[A-Za-z][A-Za-z0-9_+\/-]*$/.test(timezone))fail('timezone_required');let today;try{const parts=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));today=p.year+'-'+p.month+'-'+p.day}catch(_){fail('timezone_required')}
  if(day>today)fail('future_day');if(!(v.status==='done'&&int(v.minutes,5,180)||v.status==='skipped'&&v.minutes===null)||v.lessonId!==null&&!/^PU-0(?:0[1-9]|[1-7][0-9]|80)$/.test(v.lessonId))fail('invalid_checkin');return fresh('practice_checkins',{status:v.status,minutes:v.minutes,lesson_id:v.lessonId,timezone_at_entry:timezone},day)
 })}
 each('matchJournal',v=>{keys(v,['id','date','mode','ours','theirs','focus','note','doublesIssue'],['date','mode','ours','theirs','focus','note']);if(!['singles','doubles'].includes(v.mode)||!int(v.ours,0,99)||!int(v.theirs,0,99)||!FOCI.includes(v.focus)||!str(v.note,280)||v.doublesIssue!==undefined&&!['middle','communication','transition','third','none'].includes(v.doublesIssue))fail('invalid_match');return fresh('match_records',{mode:v.mode,ours:v.ours,theirs:v.theirs,focus:v.focus,note:v.note,occurred_at:date(v.date),...(own(v,'doublesIssue')?{doubles_issue:v.doublesIssue}:{})})});
 each('trainingLog',v=>{keys(v,['id','planId','exerciseId','skill','level','kind','hits','attempts','date','note','conditions'],['planId','exerciseId','skill','level','kind','hits','attempts','date','note']);if(!SKILLS.includes(v.skill)||!LEVELS.includes(v.level)||!['drill','assessment'].includes(v.kind)||!int(v.hits,0,20)||v.attempts!==20||!str(v.note,240)||!new RegExp('^(?:'+v.skill+'-[1-4]|ADV-PU-0(?:3[7-9]|[4-7][0-9]|80))$').test(v.exerciseId))fail('invalid_training');const path=ref(v.planId);return fresh('training_entries',{plan_id:{$ref:path},exercise_id:v.exerciseId,skill:v.skill,level_band:v.level,kind:v.kind,hits:v.hits,attempts:v.attempts,note:v.note,occurred_at:date(v.date),conditions:conditions(v.conditions)},null,[path])});
 if(own(fields,'lastLesson'))add('lastLesson','lastLesson',fields.lastLesson,v=>{if(typeof v!=='string'||!/^PU-0(?:0[1-9]|[1-7][0-9]|80)$/.test(v))fail('invalid_lesson');return fresh('user_selections',{selected_academy_lesson_id:v},'self')});
 if(own(fields,'selectedPlan'))add('selectedPlan','selectedPlan',fields.selectedPlan,v=>{keys(v,['source','id'],['source','id']);if(!['basic','advanced'].includes(v.source)||!str(v.id,100))fail('invalid_selection');const path=ref(v.id,v.source);return fresh('user_selections',{selected_personal_plan_id:{$ref:path}},'self',[path])});
 if(rows.length>5000)fail('source_limit');
 const remoteByKey=new Map(remote.map(r=>[r.kind+':'+r.key,r.row]));const revisions=new Map();
 for(const row of rows){if(!selectedSet.has(row.group)&&row.disposition!=='local_only'){row.disposition='local_only';row.reason='not_selected'}if(row.disposition!=='local_only'&&choices[row.path]?.mode==='quarantine'){row.disposition='invalid';row.reason='user_quarantine';continue}if(row.disposition!=='ready')continue;
  if(row.legacyIdentity){row.path+='#id='+await hash(row.legacyIdentity);delete row.legacyIdentity}
  if(choices[row.path]?.mode==='quarantine'){row.disposition='invalid';row.reason='user_quarantine';continue}
  if(['academy_attempts','skill_assessments','training_entries','match_records'].includes(row.kind))row.payload.client_event_id=await eventId(owner,info.fingerprint,row.path);
  const existing=row.key!==null?remoteByKey.get(row.kind+':'+row.key):null;
  const tag=row.path.includes('#id=')?row.path.split('#id=')[1]:null;
  const mappedKeys=new Set(tag?remote.filter(r=>r.kind==='legacy_import_items'&&r.row.target_kind===row.kind&&r.row.source_path?.split('#id=')[1]===tag).map(r=>r.row.target_key):[]);
  const candidates=row.key===null?remote.filter(r=>{if(r.kind!==row.kind||r.row.deleted_at)return false;if(mappedKeys.has(r.key))return true;
   if(row.kind==='personal_plans')return r.row.source===row.payload.source&&(r.row.legacy_id===row.payload.legacy_id||r.row.plan_snapshot?.id===row.payload.legacy_id);
   if(row.payload.occurred_at)return Date.parse(r.row.occurred_at)===Date.parse(row.payload.occurred_at)&&(row.kind==='academy_attempts'?r.row.lesson_id===row.payload.lesson_id:row.kind==='skill_assessments'?r.row.assessment_type===row.payload.assessment_type:row.kind==='training_entries'?r.row.exercise_id===row.payload.exercise_id:true);
   return Object.entries(row.payload).every(([k,v])=>k==='source_date'?Date.parse(r.row[k])===Date.parse(v):canonical(r.row[k])===canonical(v));
  }):existing?[{kind:row.kind,key:row.key,row:existing}]:[];
  row.candidates=candidates.map(c=>({key:c.key,revision:c.row.revision,row:c.row}));const choice=choices[row.path];
  if(existing?.deleted_at){row.disposition='unresolved';row.reason='tombstone_requires_separate_restore';continue}
  if(candidates.length&&!choice){row.disposition='unresolved';row.reason=row.key===null?'overlap_decision_required':'conflict_decision_required';continue}
  if(choice?.mode==='reuse'){const candidate=candidates.find(c=>c.key===choice.key&&c.row.revision===choice.revision);if(!candidate)fail('stale_choice');row.mode='reuse';row.key=candidate.key;row.payload={};row.expectedRevision=choice.revision;row.dependencies=[];continue}
  if(candidates.length&&choice?.mode!==(row.key===null?'keep_both':'use_source'))fail('invalid_choice');
  row.mode='apply';row.expectedRevision=row.key===null?'0':existing?.revision||'0';
 }
 const prefs=rows.filter(r=>r.kind==='user_preferences'&&r.disposition==='ready');if(prefs.length&&!remoteByKey.has('user_preferences:self')){const supplied=Object.assign({},...prefs.map(r=>r.payload));if(!['target_days','level_band','session_minutes','gentle'].every(k=>own(supplied,k)))for(const row of prefs){row.disposition='unresolved';row.reason='missing_preferences_no_defaults'}else Object.assign(prefs[0].payload,supplied)}
 for(const row of rows.filter(r=>r.disposition==='ready'))if(row.dependencies.some(path=>!rows.some(r=>r.path===path&&r.disposition==='ready'))){row.disposition='unresolved';row.reason='dependency_not_ready'}
 for(const row of rows.filter(r=>r.disposition==='ready'&&r.key!==null)){
  const siblings=rows.filter(r=>r.disposition==='ready'&&r.kind===row.kind&&r.key===row.key);
  if(siblings.some(r=>r.mode!==row.mode)){for(const sibling of siblings){sibling.disposition='unresolved';sibling.reason='mixed_singleton_decisions'}continue}
  if(row.mode==='apply'){const id=row.kind+':'+row.key;row.expectedRevision=revisions.get(id)||row.expectedRevision;revisions.set(id,(BigInt(row.expectedRevision)+1n).toString())}
 }
 const counts={ready:rows.filter(r=>r.disposition==='ready').length,invalid:rows.filter(r=>r.disposition==='invalid').length,unresolved:rows.filter(r=>r.disposition==='unresolved').length,local_only:rows.filter(r=>r.disposition==='local_only').length};
 if(Object.values(counts).reduce((a,b)=>a+b,0)!==rows.length)fail('reconcile_error');
 const items=rows.filter(r=>r.disposition==='ready').map(r=>({source_path:r.path,kind:r.kind,entity_key:r.key,expected_revision:r.expectedRevision,payload:r.payload,mode:r.mode,dependencies:r.dependencies}));
 if(items.length>1000||new TextEncoder().encode(JSON.stringify(items)).length>2*1024*1024)fail('source_limit');
 const decisions=rows.map(row=>({path:row.path,disposition:row.disposition,reason:row.reason||null,mode:row.mode||null,expected_revision:row.expectedRevision||null,target:row.key??null}));
 const binding={owner,fingerprint:info.fingerprint,fileHash:info.fileHash,adapterVersion:VERSION,selected:[...selected].sort(),timezone,counts,items,decisions,sourceCount:rows.length,format:info.format};
 return {...binding,rows,manifestHash:await hash(binding)};
}
const api={VERSION,GROUPS,prepare,hash,ImportError};if(typeof module!=='undefined')module.exports=api;else root.PickleUpImportCore=api;
})(typeof window==='undefined'?globalThis:window);
