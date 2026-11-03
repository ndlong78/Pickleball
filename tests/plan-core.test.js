const {test}=require('node:test'),assert=require('node:assert/strict');
const core=require('../modules/data/plan-core.js'),{payload,WHEN}=require('./helpers/plan-fixtures.cjs');
const A='11111111-1111-4111-8111-111111111111',ID='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const row=()=>({...payload(),id:ID,user_id:A,source_kind:'manual',revision:'9007199254740993',created_at:WHEN,updated_at:WHEN,deleted_at:null,check_score:null,completed_at:null});
test('basic and actual advanced core snapshots validate without legacy list caps or mutation',()=>{
 const value=payload(),copy=structuredClone(value);assert.deepEqual(core.payload('personal_plans',value),copy);
 global.window=globalThis;require('../curriculum.js');require('../advanced-curriculum.js');require('../advanced-coach-core.js');const snapshot=PICKLEUP_ADVANCED_COACH.createPlan(Object.fromEntries(['third','reset','movement','counter','doubles','decision'].map(k=>[k,12])),[],'3.0–3.5',WHEN,PICKLEUP_ADVANCED_CURRICULUM);
 assert.deepEqual(core.snapshot(snapshot,'advanced','3.0–3.5'),snapshot);assert.deepEqual(value,copy);assert.equal(core.row('personal_plans',row(),{owner:A,id:ID}).revision,'9007199254740993');
});
test('strict snapshots reject scale/metric/band/schema, size, date, IDs and credential fields',()=>{
 for(const change of [v=>v.schema_version=2,v=>v.source='advanced',v=>v.level_band='3.0–3.5',v=>v.plan_snapshot.scores.serve=21,v=>v.plan_snapshot.exercises[0].id='ADV-PU-037',v=>v.plan_snapshot.createdAt='2026-02-30T10:00:00Z',v=>v.plan_snapshot.id='',v=>v.plan_snapshot.exercises[0].instructions='x'.repeat(1801),v=>v.plan_snapshot.access_token='synthetic',v=>v.plan_snapshot.minutes.warmup=9]){const v=payload();change(v);assert.throws(()=>core.payload('personal_plans',v));}
});
test('plan updates/restores accept only explicit result patches, delete is empty and never copies snapshot',()=>{
 for(const action of ['put','restore']){assert.deepEqual(core.payload('personal_plans',{check_score:15,completed_at:null},{action,revision:'1'}),{check_score:15,completed_at:null});for(const v of [{plan_snapshot:payload().plan_snapshot},{source:'basic'},{schema_version:1},{check_score:21},{completed_at:'invalid'},{user_id:A}])assert.throws(()=>core.payload('personal_plans',v,{action,revision:'1'}));}
 assert.deepEqual(core.payload('personal_plans',{}, {action:'delete',revision:'1'}),{});assert.throws(()=>core.payload('personal_plans',{check_score:1},{action:'delete',revision:'1'}));
});
test('canonical rows require owner, entity ID, decimal strings and complete nullable fields',()=>{
 const value=row();for(const v of [{...value,user_id:ID},{...value,id:A},{...value,revision:9007199254740992},{...value,revision:'01'},{...value,revision:'9223372036854775808'},{...value,deleted_at:'unknown'},{...value,check_score:undefined}])assert.throws(()=>core.row('personal_plans',v,{owner:A,id:ID}));
 const selected={user_id:A,source_kind:'legacy',created_at:WHEN,updated_at:WHEN,deleted_at:null,revision:'1',selected_personal_plan_id:null,selected_academy_lesson_id:null};assert.doesNotThrow(()=>core.row('user_selections',selected,{owner:A,id:'self'}));delete selected.selected_personal_plan_id;assert.throws(()=>core.row('user_selections',selected,{owner:A,id:'self'}));
});
test('projection retains over 100 plans, immutable content and current results with explicit selection readiness',()=>{
 const records=Array.from({length:120},()=>{const id=crypto.randomUUID();return {namespace:'user:'+A,kind:'personal_plans',id,base:{...row(),id},localRevision:'1',deleted:false}});const selectedId=records[0].id;records[0].overlay={...records[0].base,check_score:17,completed_at:WHEN};records[0].tailOperationId=crypto.randomUUID();records.push({namespace:'user:'+A,kind:'user_selections',id:'self',base:{user_id:A,source_kind:'manual',created_at:WHEN,updated_at:WHEN,deleted_at:null,revision:'1',selected_personal_plan_id:selectedId,selected_academy_lesson_id:null}});
 const result=core.project({records},{owner:A});assert.equal(result.plans.length,120);assert.equal(result.selectedPlan.plan.checkScore,17);assert.equal(result.selectedPlan.plan_snapshot.checkScore,null);
 records.at(-1).tailOperationId=crypto.randomUUID();assert.equal(core.project({records},{owner:A}).selectionStatus,'pending_selection');records[0].deleted=true;assert.equal(core.project({records},{owner:A}).selectionStatus,'unavailable');assert.equal(core.project({records},{owner:A}).selectedPlan,null);
});

test('optimistic plan and selection metadata cannot introduce a different owner into the UI projection',()=>{
 const plan={namespace:'user:'+A,kind:'personal_plans',id:ID,base:row(),overlay:{user_id:ID},tailOperationId:crypto.randomUUID()};assert.throws(()=>core.project({records:[plan]},{owner:A}),{code:'invalid_plan'});plan.overlay={id:A};assert.throws(()=>core.project({records:[plan]},{owner:A}),{code:'invalid_plan'});
 const selection={namespace:'user:'+A,kind:'user_selections',id:'self',overlay:{user_id:ID,selected_personal_plan_id:null}};assert.throws(()=>core.project({records:[selection]},{owner:A}),{code:'invalid_plan'});
});
