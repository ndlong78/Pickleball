const {test}=require('node:test'),assert=require('node:assert/strict');
const core=require('../modules/data/import-core.js'),rescue=require('../modules/data/rescue-core.js');
const owner='11111111-1111-4111-8111-111111111111',base={app:'PickleUp',schemaVersion:1,scores:{}},date='2026-01-01T10:00:00Z';
const prepare=(data,opts={})=>core.prepare(JSON.stringify({...base,...data}),{owner,rescue,...opts});
const values=Object.fromEntries(['serve','return','dink','volley','position','strategy'].map(k=>[k,12]));
function plan(id='p1'){return {id,version:'2.4',createdAt:date,level:'1.0–2.0',scores:values,exercises:['serve','return','dink'].map((skill,i)=>({id:skill+'-1',skill,name:'Synthetic',setup:'',instructions:'',measure:'',mistake:'',skillName:skill,minutes:[12,12,15][i],baseline:12,target:15})),checkpoint:{skill:'serve',baseline:12,target:15,attempts:20},minutes:{warmup:10,drills:[12,12,15],assessment:6,cooldown:5}}}
test('missing optional data creates no defaults/deletes; snapshots never attendance',async()=>{
 const p=await prepare({scores:{0:{score:5,date}}},{selected:['scores']});assert.equal(p.items.length,1);assert.equal(p.items[0].kind,'legacy_score_snapshots');assert.equal(p.counts.ready,1);assert.equal(p.rows.some(r=>r.kind==='practice_checkins'),false);
 const q=await prepare({weeklyGoal:{days:2,level:'1.0–2.0'}},{selected:['weeklyGoal']});assert.equal(q.counts.unresolved,1);assert.equal(q.items.length,0);
 const both=await prepare({weeklyGoal:{days:2,level:'1.0–2.0'},weeklyPlan:{minutes:30,gentle:true}},{selected:['weeklyGoal','weeklyPlan']});assert.deepEqual(both.items.map(i=>i.expected_revision),['0','1']);assert.equal(both.items[0].payload.session_minutes,30);
});
test('history duplicates survive; event IDs stable by account/fingerprint/path and conditions remain unknown',async()=>{
 const data={academyHistory:[{id:'PU-001',skill:'serve',level:'1.0–2.0',score:7,date},{id:'PU-001',skill:'serve',level:'1.0–2.0',score:7,date}]};const p=await prepare(data,{selected:['academyHistory']}),q=await prepare(data,{selected:['academyHistory']});assert.equal(p.items.length,2);assert.notEqual(p.items[0].payload.client_event_id,p.items[1].payload.client_event_id);assert.equal(p.manifestHash,q.manifestHash);assert.equal(p.items[0].payload.conditions,null);
});
test('plans are preserved, dependencies symbolic, orphan/ambiguous plans quarantined',async()=>{
 const data={personalPlans:[plan()],trainingLog:[{id:'t1',planId:'p1',exerciseId:'serve-1',skill:'serve',level:'1.0–2.0',kind:'drill',hits:10,attempts:20,date,note:'original'}],selectedPlan:{source:'basic',id:'p1'}};const p=await prepare(data,{selected:['personalPlans','trainingLog','selectedPlan']});assert.equal(p.items.length,3);assert.deepEqual(p.items[1].payload.plan_id,{$ref:'personalPlans[0]'});assert.equal(p.items[0].payload.plan_snapshot.id,'p1');assert.equal(p.items[1].source_path,'trainingLog[0]#id='+await core.hash('t1'));
 const q=await prepare({...data,personalPlans:[]},{selected:['trainingLog','selectedPlan']});assert.equal(q.counts.invalid,2);assert.equal(q.rows.find(r=>r.group==='trainingLog').reason,'orphan_plan');
});
test('self/stage/advanced score scales remain separate, malformed/unknown fields never coerce',async()=>{
 const p=await prepare({assessment:{answers:Object.fromEntries(Object.keys(values).map(k=>[k,2])),date},advancedChecks:[{id:'a',level:'3.0–3.5',values:{third:12,reset:12,movement:12,counter:12,doubles:12,decision:12},average:12,ready:false,date}],stageChecks:[{level:'1.0–2.0',values,date}]},{selected:['assessment','advancedChecks','stageChecks']});assert.deepEqual(p.items.map(i=>i.payload.scale),[2,20,20]);assert.equal(p.items[1].payload.assessment_type,'stage');
 const q=await prepare({academyHistory:[{id:'PU-001',skill:'serve',level:'1.0–2.0',score:'7',date},{id:'PU-001',skill:'serve',level:'1.0–2.0',score:7,date,unexpected:'preserve-source'}]},{selected:['academyHistory']});assert.equal(q.counts.invalid,1);assert.equal(q.counts.unresolved,1);
});
test('checkins preserve literal day/null lesson, need explicit timezone and reject future/invalid day',async()=>{
 const data={weeklyCheckins:{schemaVersion:1,entries:{'2026-01-01':{status:'done',minutes:30,lessonId:null,updatedAt:date}}}};const p=await prepare(data,{selected:['weeklyCheckins']});assert.equal(p.counts.unresolved,1);
 const q=await prepare(data,{selected:['weeklyCheckins'],timezone:'Asia/Ho_Chi_Minh'});assert.equal(q.items[0].entity_key,'2026-01-01');assert.equal(q.items[0].payload.lesson_id,null);assert.equal(q.items[0].payload.timezone_at_entry,'Asia/Ho_Chi_Minh');
});
test('overlap requires explicit choice, mutable CAS never silently overwrites, tombstones block',async()=>{
 const key='22222222-2222-4222-8222-222222222222';const data={academyHistory:[{id:'PU-001',skill:'serve',level:'1.0–2.0',score:7,date}]};const remote=[{kind:'academy_attempts',key,row:{user_id:owner,revision:'9',lesson_id:'PU-001',score:5,occurred_at:date}}];
 const p=await prepare(data,{selected:['academyHistory'],remote});assert.equal(p.counts.unresolved,1);
 const q=await prepare(data,{selected:['academyHistory'],remote,choices:{'academyHistory[0]':{mode:'reuse',key,revision:'9'}}});assert.equal(q.items[0].mode,'reuse');assert.deepEqual(q.items[0].payload,{});
 const r=await prepare(data,{selected:['academyHistory'],remote,choices:{'academyHistory[0]':{mode:'keep_both'}}});assert.equal(r.items[0].expected_revision,'0');
 const pref={weeklyGoal:{days:2,level:'1.0–2.0'}},remotePref=[{kind:'user_preferences',key:'self',row:{user_id:owner,revision:'9007199254740993'}}];const s=await prepare(pref,{selected:['weeklyGoal'],remote:remotePref,choices:{weeklyGoal:{mode:'use_source'}}});assert.equal(s.items[0].expected_revision,'9007199254740993');
 remotePref[0].row.deleted_at=date;const t=await prepare(pref,{selected:['weeklyGoal'],remote:remotePref});assert.equal(t.items.length,0);
});
module.exports={plan};
test('duplicate JSON keys and unsafe integers never silently lose source data',async()=>{
 const duplicate='{"app":"PickleUp","schemaVersion":1,"scores":{},"scores":{"0":{"score":5,"date":"2026-01-01T10:00:00Z"}}}';await assert.rejects(core.prepare(duplicate,{owner,rescue,selected:['scores']}),{code:'duplicate_json_keys'});
 await assert.rejects(core.prepare('{"app":"PickleUp","schemaVersion":1,"scores":{},"future":9007199254740993}',{owner,rescue,selected:['scores']}),{code:'unsafe_number'});
});
test('invalid calendar dates quarantine; exact source timestamp precision survives',async()=>{
 const p=await prepare({scores:{0:{score:5,date:'2026-02-31T10:00:00Z'}}},{selected:['scores']});assert.equal(p.counts.invalid,1);
 const precise='2026-01-01T10:00:00.123456Z';const q=await prepare({scores:{0:{score:5,date:precise}}},{selected:['scores']});assert.equal(q.items[0].payload.source_date,precise);
});
test('explicit quarantine of an unresolved record binds its path in consent without dropping source',async()=>{
 const data={scores:{0:{score:5,date},1:{score:6,date,future:'retain-original'}}};const p=await prepare(data,{selected:['scores']});assert.equal(p.counts.unresolved,1);const q=await prepare(data,{selected:['scores'],choices:{'scores.1':{mode:'quarantine'}}});assert.equal(q.counts.invalid,1);assert.equal(q.counts.ready,1);assert.equal(q.decisions.find(row=>row.path==='scores.1').reason,'user_quarantine');assert.notEqual(q.manifestHash,p.manifestHash);
});
