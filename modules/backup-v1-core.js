(function(root){
'use strict';
const MAX_BYTES=1000000,skills=['serve','return','dink','volley','position','strategy'];
const basic=['1.0–2.0','2.0–2.5','2.5–3.0'];
const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
class BackupError extends Error{constructor(code,field){super(code);this.code=code;this.field=field}}
const fail=field=>{throw new BackupError('invalid_data',field)};
function safeContent(text){if(/(?:access_token|refresh_token|service_role|client_secret|password|otp)[\\"'\s]*[:=]|sb_secret_/i.test(text))throw new BackupError('credentials_detected')}
function dateOK(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value))return false;
 const day=value.slice(0,10),date=new Date(day+'T00:00:00Z');
 return Number.isFinite(Date.parse(value))&&Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===day;
}
const optionalDate=x=>x.date===undefined||dateOK(x.date);
const points=x=>object(x)&&skills.every(k=>Number.isInteger(x[k])&&x[k]>=0&&x[k]<=20);
function validate(data,env){
 if(!object(data)||data.app!=='PickleUp'||data.schemaVersion!==1)fail('format');
 if(!object(data.scores)||Object.entries(data.scores).some(([key,row])=>!(/^[0-5]$/.test(key))||!object(row)||!Number.isInteger(row.score)||row.score<0||row.score>20||!dateOK(row.date)))fail('scores');
 if(Object.hasOwn(data,'assessment')&&data.assessment!==null){
  const row=data.assessment;
  if(!object(row)||!object(row.answers)||skills.some(key=>![0,1,2].includes(row.answers[key]))||!optionalDate(row))fail('assessment');
 }
 if(Object.hasOwn(data,'academy')&&(!object(data.academy)||Object.entries(data.academy).some(([key,row])=>!/^PU-0(?:0[1-9]|[1-7][0-9]|80)$/.test(key)||!object(row)||!Number.isInteger(row.score)||row.score<0||row.score>20||!optionalDate(row))))fail('academy');
 if(Object.hasOwn(data,'stageChecks')&&(!Array.isArray(data.stageChecks)||data.stageChecks.length>300||data.stageChecks.some(row=>!object(row)||!basic.includes(row.level)||!points(row.values)||!optionalDate(row))))fail('stageChecks');
 if(Object.hasOwn(data,'personalPlans')){
  if(!Array.isArray(data.personalPlans)||data.personalPlans.length>100||data.personalPlans.some(plan=>
   !object(plan)||plan.version!=='2.4'||typeof plan.id!=='string'||!plan.id||plan.id.length>100
   ||!basic.includes(plan.level)||!points(plan.scores)||!optionalDate(plan)
   ||!Array.isArray(plan.exercises)||plan.exercises.length!==3
   ||plan.exercises.some(x=>!object(x)||!skills.includes(x.skill)||typeof x.name!=='string'||x.name.length>200||typeof x.id!=='string'||x.id.length>50)
   ||plan.checkScore!==null&&plan.checkScore!==undefined&&(!Number.isInteger(plan.checkScore)||plan.checkScore<0||plan.checkScore>20)))fail('personalPlans');
 }
 if(Object.hasOwn(data,'selectedPlan')&&data.selectedPlan!==null){
  const choice=data.selectedPlan;
  if(!object(choice)||!['basic','advanced'].includes(choice.source)||typeof choice.id!=='string'||!choice.id||choice.id.length>100)fail('selectedPlan');
 }
 const checks={
  academyHistory:env.PICKLEUP_ACADEMY_TRENDS?.validateHistory,
  trainingLog:env.PICKLEUP_TRAINING_LOG?.validateList,
  advancedChecks:env.PICKLEUP_VALIDATE_ADVANCED_CHECKS,
  matchJournal:env.PICKLEUP_VALIDATE_MATCHES,
  advancedPlans:env.PICKLEUP_VALIDATE_ADVANCED_PLANS,
  weeklyGoal:env.PICKLEUP_WEEKLY_GOALS?.validSettings,
  weeklyPlan:env.PICKLEUP_WEEKLY_PLANNER?.validSettings,
  weeklyCheckins:env.PICKLEUP_WEEK_CHECKINS?.valid
 };
 for(const [field,check]of Object.entries(checks))if(Object.hasOwn(data,field)&&(!check||!check(data[field])))fail(field);
 return data;
}
function parse(text,env){
 if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_BYTES)throw new BackupError('too_large');
 safeContent(text);
 let data;try{data=JSON.parse(text)}catch(_){throw new BackupError('invalid_json')}
 return validate(data,env);
}
function capture(storage,env,fields){
 const defaults={scores:{},assessment:null,academy:{},academyHistory:[],stageChecks:[],personalPlans:[],trainingLog:[],advancedChecks:[],matchJournal:[],advancedPlans:[],selectedPlan:null,
  weeklyGoal:env.PICKLEUP_WEEKLY_GOALS.readSettings(null),weeklyPlan:env.PICKLEUP_WEEKLY_PLANNER.readSettings(null),weeklyCheckins:env.PICKLEUP_WEEK_CHECKINS.read(null)};
 const data={app:'PickleUp',schemaVersion:1,exportedAt:new Date().toISOString()},observed=new Map();
 for(const [field,key]of Object.entries(fields)){
  let raw;try{raw=storage.getItem(key)}catch(_){throw new BackupError('storage_unavailable')}
  observed.set(key,raw);
  if(raw===null)data[field]=defaults[field];
  else{try{data[field]=JSON.parse(raw)}catch(_){throw new BackupError('invalid_data',field)}}
 }
 validate(data,env);
 const text=JSON.stringify(data);if(new TextEncoder().encode(text).length>MAX_BYTES)throw new BackupError('too_large');
 safeContent(text);
 for(const [key,raw]of observed){let current;try{current=storage.getItem(key)}catch(_){throw new BackupError('storage_unavailable')}if(current!==raw)throw new BackupError('source_changed')}
 return data;
}
function patch(data,fields){
 return Object.entries(fields).filter(([field])=>Object.hasOwn(data,field)).map(([field,key])=>({key,value:data[field]===null?null:JSON.stringify(data[field])}));
}
const api={MAX_BYTES,validate,parse,capture,patch,BackupError};
if(typeof module!=='undefined')module.exports=api;else root.PickleUpBackupV1=api;
})(typeof window==='undefined'?globalThis:window);
