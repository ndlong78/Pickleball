// The advanced coach, advanced readiness check, tactical insights and training log reach 4.0–5.0.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
global.window=globalThis;
require('../curriculum.js');require('../advanced-curriculum.js');require('../practice-conditions.js');
require('../advanced-coach-core.js');require('../training-log-core.js');require('../training-evaluation-core.js');require('../tactical-insights-core.js');
const coach=PICKLEUP_ADVANCED_COACH,insights=PICKLEUP_TACTICAL_INSIGHTS,log=PICKLEUP_TRAINING_LOG;
const root=path.resolve(__dirname,'..');
const ADV='ADV-PU-(?:0(?:3[7-9]|[4-9][0-9])|[1-9][0-9]{2,3})';
const NEW_LEVELS=['4.0–4.5','4.5–5.0'],ALL=['3.0–3.5','3.5–4.0',...NEW_LEVELS];
const six=v=>Object.fromEntries(['third','reset','movement','counter','doubles','decision'].map(k=>[k,v]));
const uid=()=>crypto.randomUUID(),WHEN='2026-11-15T10:00:00Z';
function sources(){
 const out=[];
 (function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){
  if(['node_modules','dist','tests','.git','test-results','playwright-report','docs','supabase'].includes(e.name))continue;
  const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(/\.(js|cjs|html)$/.test(e.name)&&e.name!=='curriculum.js')out.push(p);
 }})(root);
 return out;
}
test('every advanced exercise id check uses one pattern (ADV-PU-037…9999); the 037…080 limit is gone',()=>{
 let canonical=0;
 for(const file of sources()){
  const text=fs.readFileSync(file,'utf8');
  assert.equal(/ADV-PU-0\(\??:?3\[7-9\]\|\[4-7\]\[0-9\]\|80\)/.test(text),false,path.relative(root,file)+' still stops at ADV-PU-080');
  canonical+=text.split(ADV).length-1;
 }
 assert.ok(canonical>=7,'expected the canonical advanced id pattern in every validator, found '+canonical);
});
test('the advanced exercise id pattern accepts each lesson once and rejects ambiguous ids',()=>{
 const re=new RegExp('^'+ADV+'$');
 for(const id of ['ADV-PU-037','ADV-PU-080','ADV-PU-081','ADV-PU-099','ADV-PU-100','ADV-PU-104','ADV-PU-1000','ADV-PU-9999'])assert.equal(re.test(id),true,id);
 for(const id of ['ADV-PU-036','ADV-PU-001','ADV-PU-0081','ADV-PU-10000','ADV-PU-81','PU-081','adv-pu-081','ADV-PU-081 ',''])assert.equal(re.test(id),false,id);
});
test('coach levels, readiness gates and account gates agree for 3.0–5.0',()=>{
 assert.deepEqual(coach.levels,ALL);
 const source=require('../modules/data/activity-source-core.js');
 const text=fs.readFileSync(path.join(root,'advanced-readiness.js'),'utf8');
 const gates=Object.fromEntries([...text.match(/levels=\{[^}]*(?:\{[^}]*\}[^}]*)*\};/)[0].matchAll(/"([^"]+)":\{average:(\d+),min:(\d+)\}/g)].map(m=>[m[1],[Number(m[2]),Number(m[3])]]));
 assert.deepEqual(Object.keys(gates),ALL);
 for(const level of ALL)assert.deepEqual(source.GATES[level],gates[level],level);
 for(let i=1;i<ALL.length;i++){assert.ok(gates[ALL[i]][0]>gates[ALL[i-1]][0]&&gates[ALL[i]][1]>gates[ALL[i-1]][1],'gates rise with the level '+ALL[i]);}
});
for(const level of NEW_LEVELS){
 test('a '+level+' plan uses only lessons of that level (ids 081+), validates and is accepted by the data layer',()=>{
  const plan=coach.createPlan({third:12,reset:10,movement:15,counter:14,doubles:13,decision:11},[],level,WHEN);
  assert.equal(plan.level,level);assert.equal(plan.version,'3.1');assert.equal(coach.validPlan(plan),true);
  for(const e of plan.exercises){
   const lesson=PICKLEUP_ADVANCED_CURRICULUM.find(l=>'ADV-'+l.id===e.id);
   assert.equal(lesson.level,level);assert.ok(e.week>=81,e.id);assert.match(e.id,new RegExp('^'+ADV+'$'));
  }
  const plans=require('../modules/data/plan-core.js');
  assert.deepEqual(plans.snapshot(plan,'advanced',level),plan);
  assert.throws(()=>plans.snapshot(plan,'basic',level));
  assert.throws(()=>plans.snapshot({...plan,level:'3.5–4.0'},'advanced',level));
 });
 test('activity payloads accept '+level+' for advanced checks and advanced exercises only',()=>{
  const activity=require('../modules/data/activity-core.js'),source=require('../modules/data/activity-source-core.js');
  const options=()=>({eventId:uid(),occurredAt:WHEN,activityCore:activity});
  const check=source.assessment('advanced',six(17),level,options());
  assert.equal(check.level_band,level);assert.equal(check.ready,true);
  assert.equal(source.assessment('advanced',six(11),level,options()).ready,false);
  assert.throws(()=>source.assessment('stage',Object.fromEntries(source.SKILLS.map(k=>[k,15])),level,options()),{code:'invalid_activity'});
  const plan={...coach.createPlan(six(12),[],level,WHEN),id:uid()},exercise=plan.exercises[0];
  const entry=source.training(plan,{exerciseId:exercise.id,skill:exercise.skill,level,planId:plan.id,kind:'drill',hits:13,note:'',conditions:{feed:'partner',pace:'slow',target:'wide'}},options());
  assert.equal(entry.exercise_id,exercise.id);assert.equal(entry.level_band,level);
  const base={client_event_id:uid(),plan_id:uid(),skill:'serve',level_band:level,kind:'drill',hits:12,attempts:20,note:'',conditions:{feed:'partner',pace:'slow',target:'wide'},occurred_at:WHEN};
  assert.throws(()=>activity.payload('training_entries',{...base,exercise_id:'serve-1'}),{code:'invalid_activity'},'a basic exercise cannot sit at 4.0+');
  assert.throws(()=>activity.payload('training_entries',{...base,skill:'strategy',exercise_id:'ADV-PU-036'}),{code:'invalid_activity'});
  assert.ok(activity.payload('training_entries',{...base,skill:'strategy',exercise_id:'ADV-PU-081'}));
 });
 test('guest records at '+level+' pass the local validators, insights and evaluation',()=>{
  const attempt=(hits,day)=>({id:'T'+day,planId:'PU31-1',exerciseId:'ADV-PU-090',skill:'strategy',level,kind:'assessment',hits,attempts:20,date:'2026-11-'+day+'T10:00:00Z',note:''});
  assert.equal(log.isEntry(attempt(12,'10')),true);
  assert.equal(log.isEntry({...attempt(12,'10'),exerciseId:'serve-1',skill:'serve'}),true,'basic exercise ids stay valid for the log itself');
  assert.equal(insights.isAttempt(attempt(12,'10')),true);
  assert.equal(insights.isAttempt({...attempt(12,'10'),level:'5.0–5.5'}),false);
  const result=insights.analyze([],[attempt(10,'10'),attempt(14,'12')],level);
  assert.equal(result.attemptCount,2);assert.equal(result.comparable[0].delta,4);
  assert.equal(insights.analyze([],[attempt(10,'10'),attempt(14,'12')],level==='4.0–4.5'?'4.5–5.0':'4.0–4.5').attemptCount,0,'levels never mix');
  const evaluation=PICKLEUP_EVALUATION.evaluate([attempt(10,'10'),attempt(14,'12')],level);
  assert.equal(evaluation.level,level);
  assert.throws(()=>PICKLEUP_EVALUATION.evaluate([],'5.0–5.5'),/Cấp độ không hợp lệ/);
 });
}
test('journey counts an advanced check at 3.0–5.0 as an assessment and ignores an unknown level',()=>{
 for(const m of ['weekly-goals-core','weekly-plan-core','weekly-checkins-core','training-journey-core'])require('../modules/'+m+'.js');
 const build=level=>PICKLEUP_JOURNEY.build({lessons:PICKLEUP_CURRICULUM,advancedChecks:[{id:'a',level,values:six(15),average:15,ready:false,date:'2026-11-01T10:00:00Z'}],now:new Date('2026-11-15T10:00:00Z')});
 for(const level of ALL)assert.equal(build(level).hasAssessment,true,level);
 assert.equal(build('5.0–5.5').hasAssessment,false);
 assert.equal(build('2.5–3.0').hasAssessment,false,'an advanced check below 3.0 is not an advanced check');
});
test('import accepts advanced plans, checks and logs at 4.0–5.0 and keeps stage checks within 1.0–3.0',async()=>{
 const core=require('../modules/data/import-core.js'),rescue=require('../modules/data/rescue-core.js');
 const owner='11111111-1111-4111-8111-111111111111',base={app:'PickleUp',schemaVersion:1,scores:{}};
 const prepare=(data,opts={})=>core.prepare(JSON.stringify({...base,...data}),{owner,rescue,...opts});
 for(const level of NEW_LEVELS){
  const plan=coach.createPlan(six(12),[],level,WHEN),exercise=plan.exercises[0];
  const log={id:'t1',planId:plan.id,exerciseId:exercise.id,skill:exercise.skill,level,kind:'drill',hits:11,attempts:20,date:WHEN,note:''};
  const p=await prepare({advancedPlans:[plan],advancedChecks:[{id:'a1',level,values:six(15),average:15,ready:false,date:WHEN}],trainingLog:[log]},{selected:['advancedPlans','advancedChecks','trainingLog']});
  assert.equal(p.counts.invalid,0,level+' '+JSON.stringify(p.rows.filter(r=>r.disposition==='invalid').map(r=>[r.path,r.reason])));
  assert.deepEqual(p.items.map(i=>i.kind).sort(),['personal_plans','skill_assessments','training_entries']);
  const bad=await prepare({stageChecks:[{level,values:Object.fromEntries(['serve','return','dink','volley','position','strategy'].map(k=>[k,15])),date:WHEN}],trainingLog:[{...log,exerciseId:'serve-1',skill:'serve'}]},{selected:['stageChecks','trainingLog']});
  assert.equal(bad.rows.find(r=>r.group==='stageChecks').disposition,'invalid','stage checks stop at 3.0');
  assert.equal(bad.rows.find(r=>r.group==='trainingLog').disposition,'invalid','a basic exercise cannot sit at '+level);
 }
});
