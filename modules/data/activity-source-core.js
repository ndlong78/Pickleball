/* Account assessment/match views. Raw events stay intact; analysis needs a known, nonfuture date. */
(function(root){
'use strict';
const KEYS={self:'pickleup_assessment_v1',stage:'pickleup_stage_checks_v23',advanced:'pickleup_advanced_checks_v3',matches:'pickleup_match_journal_v3',training:'pickleup_training_log_v26'};
const SKILLS=['serve','return','dink','volley','position','strategy'],ADVANCED=['third','reset','movement','counter','doubles','decision'];
const FOCUS_LABELS={"third-drop":"Third-shot drop","transition-reset":"Reset và di chuyển","serve-return":"Giao – trả – bóng ba","kitchen-pressure":"Dinking tại kitchen","doubles-coverage":"Vị trí đánh đôi","third-choice":"Chọn cú thứ ba","advanced-reset":"Reset nâng cao","counter-volley":"Counter volley","doubles-switch":"Phối hợp đánh đôi","defense-attack":"Phòng thủ/phản công","tactical-choice":"Quyết định chiến thuật"};
const NAMES={serve:'Giao bóng',return:'Trả giao',dink:'Dink',volley:'Volley',position:'Vị trí',strategy:'Chiến thuật',third:'Bóng ba',reset:'Reset',movement:'Di chuyển',counter:'Counter',doubles:'Đánh đôi',decision:'Quyết định'};
const GATES={'1.0–2.0':[11,1],'2.0–2.5':[14,2],'2.5–3.0':[16,2],'3.0–3.5':[13,8],'3.5–4.0':[15,10]};
function instant(value){const fraction=value.match(/T\d{2}:\d{2}:\d{2}\.(\d+)/)?.[1]||'';return BigInt(Date.parse(value))*1000n+BigInt(fraction.slice(3,6).padEnd(3,'0')||'0')}
function order(a,b){return a.occurred_at===null?(b.occurred_at===null?a.id.localeCompare(b.id):1):b.occurred_at===null?-1:instant(a.occurred_at)>instant(b.occurred_at)?-1:instant(a.occurred_at)<instant(b.occurred_at)?1:a.id.localeCompare(b.id)}
function project(projection,{now=new Date()}={}){
 const cutoff=new Date(now).getTime();if(!Number.isFinite(cutoff))throw Error('invalid_date');
 const events={};for(const kind of ['skill_assessments','match_records','training_entries'])events[kind]=structuredClone(projection?.events?.[kind]||[]).sort(order);
 const eligible=rows=>rows.filter(x=>x.occurred_at!==null&&instant(x.occurred_at)<=BigInt(cutoff)*1000n);
 const checks={self:[],stage:[],advanced:[]};
 for(const [accountOrder,event]of eligible(events.skill_assessments).entries()){
  const shared={id:event.id,date:event.occurred_at,account:true,accountOrder,pending:event.pending===true};
  checks[event.assessment_type].push(event.assessment_type==='self'?{...shared,schemaVersion:1,answers:event.scores}:{...shared,level:event.level_band,values:event.scores,average:event.average,ready:event.ready});
 }
 const matches=eligible(events.match_records).map((x,accountOrder)=>({id:x.id,date:x.occurred_at,mode:x.mode,ours:x.ours,theirs:x.theirs,focus:x.focus,note:x.note,...(x.doubles_issue===null?{}:{doublesIssue:x.doubles_issue}),account:true,accountOrder,pending:x.pending===true}));
 const training=eligible(events.training_entries).map((x,accountOrder)=>({id:x.id,planId:x.plan_id,legacyPlanId:x.legacy_plan_id||null,exerciseId:x.exercise_id,skill:x.skill,level:x.level_band,kind:x.kind,hits:x.hits,attempts:x.attempts,note:x.note,date:x.occurred_at,...(x.conditions?{conditions:x.conditions}:{}),account:true,accountOrder,pending:x.pending===true}));
 return {events,checks,matches,training,raw:{[KEYS.self]:checks.self[0]||null,[KEYS.stage]:checks.stage,[KEYS.advanced]:checks.advanced,[KEYS.matches]:matches,[KEYS.training]:training}};
}
function assessment(type,scores,level,{eventId,occurredAt,activityCore=root.PickleUpActivityCore}){
 const required=type==='advanced'?ADVANCED:SKILLS,max=type==='self'?2:20;
 if(!scores||typeof scores!=='object'||Array.isArray(scores)||Object.keys(scores).length!==6||!required.every(key=>Object.hasOwn(scores,key)&&Number.isInteger(scores[key])&&scores[key]>=0&&scores[key]<=max))throw new activityCore.ActivityError('invalid_activity');
 const gate=GATES[level],sum=Object.values(scores).reduce((a,b)=>a+b,0),average=sum/6;
 if(!['self','stage','advanced'].includes(type)||type!=='self'&&!gate)throw new activityCore.ActivityError('invalid_activity');
 return activityCore.payload('skill_assessments',{client_event_id:eventId,occurred_at:occurredAt,assessment_type:type,scale:type==='self'?2:20,scores,level_band:type==='self'?null:level,average:type==='self'?null:Number(average.toFixed(2)),ready:type==='self'?null:average>=gate[0]&&Object.values(scores).every(x=>x>=gate[1])});
}
function match(value,{eventId,occurredAt,activityCore=root.PickleUpActivityCore}){return activityCore.payload('match_records',{...value,client_event_id:eventId,occurred_at:occurredAt})}
function training(plan,input,{eventId,occurredAt,activityCore=root.PickleUpActivityCore}){
 const exercise=plan?.exercises?.find(x=>x.id===input.exerciseId);
 if(!exercise||exercise.skill!==input.skill||input.level!==plan.level||input.planId!==plan.id)throw new activityCore.ActivityError('plan_unavailable');
 return activityCore.payload('training_entries',{client_event_id:eventId,plan_id:plan.id,exercise_id:exercise.id,skill:exercise.skill,level_band:plan.level,kind:input.kind,hits:input.hits,attempts:20,note:input.note,conditions:input.conditions,occurred_at:occurredAt});
}
const api={training,KEYS,FOCUS_LABELS,NAMES,SKILLS,ADVANCED,GATES,instant,order,project,assessment,match};if(typeof module!=='undefined')module.exports=api;else root.PickleUpActivitySourceCore=api;
})(typeof window==='undefined'?globalThis:window);
