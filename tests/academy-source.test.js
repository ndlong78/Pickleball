const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {IDBFactory}=require('fake-indexeddb'),repository=require('../modules/data/local-repository.js'),activity=require('../modules/data/activity-core.js'),lifecycle=require('../modules/data/activity-controller.js'),source=require('../modules/data/academy-source-core.js'),pull=require('../modules/data/pull-controller.js'),sync=require('../modules/data/sync-controller.js'),{model}=require('./helpers/sync-model.cjs');
require('../modules/academy-trends-core.js');require('../modules/academy-insights-core.js');require('../modules/weekly-goals-core.js');
const extra=require('../modules/data/activity-source-core.js');
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',uid=()=>crypto.randomUUID();
const lesson={id:'PU-001',week:1,skill:'serve',skillName:'Giao bóng',level:'1.0–2.0',title:'Synthetic serve',assessment:{target:12,instruction:'20 controlled serves'}},lessons=[lesson,{...lesson,id:'PU-002',week:2,title:'Other exercise'}],known={feed:'partner',pace:'slow',target:'wide'};
function event(score,index=1,extra={}){return {...source.attempt(lesson,score,{eventId:uid(),occurredAt:`2026-01-01T10:00:${String(index).padStart(2,'0')}Z`,conditions:known,activityCore:activity}),id:uid(),source_kind:'manual',...extra}}
const projection=events=>source.project({events:{academy_attempts:events}},lessons,{now:'2026-11-02T00:00:00Z',activityCore:activity});
test('projection keeps distinct event identities beyond legacy caps and excludes unknown/future dates only from analysis',()=>{
 const rows=Array.from({length:501},()=>event(12)),unknown=event(19,2,{occurred_at:null,source_kind:'legacy'}),future=event(20,2,{occurred_at:'2099-01-01T00:00:00Z'}),view=projection([...rows,unknown,future]);
 assert.equal(view.events.length,503);assert.equal(view.history.length,501);assert.equal(new Set(view.history.map(x=>x.eventId)).size,501);assert.equal(view.records['PU-001'].score,12);assert.equal(view.history.every(x=>x.account&&x.currentContent),true);assert.deepEqual(projection([]).records,{});
});
test('equal timestamps use the same deterministic event identity for latest and history, without fabricating a date',()=>{
 const a=event(4,1,{id:'11111111-1111-4111-8111-111111111111'}),b=event(16,1,{id:'22222222-2222-4222-8222-222222222222'}),view=projection([a,b]);assert.equal(view.records['PU-001'].eventId,a.id);assert.equal(view.history.at(-1).eventId,a.id);assert.equal(view.events[0].occurred_at,a.occurred_at);
});
test('latest Academy keeps microsecond order and equivalent timezone offsets instead of rounding to milliseconds',()=>{
 const earlier=event(4,1,{id:'11111111-1111-4111-8111-111111111111',occurred_at:'2026-01-01T10:00:00.123001Z'}),later=event(16,1,{id:'22222222-2222-4222-8222-222222222222',occurred_at:'2026-01-01T17:00:00.123999+07:00'}),view=projection([earlier,later]);assert.equal(view.records['PU-001'].score,16);assert.equal(view.history.at(-1).date,later.occurred_at);assert.equal(view.events[0].id,later.id);
});
test('account trends compare only the same lesson/content/known conditions while legacy behavior stays separate',()=>{
 const view=projection([event(4,1),event(19,2,{conditions:{...known,pace:'match'}}),event(8,3)]),insights=PICKLEUP_ACADEMY_INSIGHTS.analyze(lessons,view.records,view.history,lesson.level,'serve',lesson.id),recommend=PICKLEUP_ACADEMY_TRENDS.recommend(lessons,view.records,view.history,lesson.level);
 assert.equal(insights.delta,4);assert.equal(insights.chart.length,2);assert.equal(insights.lessonCount,3);assert.equal(insights.comparableCount,2);assert.match(recommend.trend,/tăng 4/);
 const unknown=projection([event(18,1,{conditions:null}),event(3,2,{conditions:null})]);assert.equal(PICKLEUP_ACADEMY_INSIGHTS.analyze(lessons,unknown.records,unknown.history,lesson.level,'serve',lesson.id).delta,null);assert.notEqual(PICKLEUP_WEEKLY_GOALS.recommend(lessons,unknown.records,unknown.history,lesson.level).code,'decline');
});
test('unknown legacy content and differing snapshots never prove comparable; old targets do not become current goals',()=>{
 const old=event(2,1,{content_version:'legacy-unknown',lesson_snapshot:{title:lesson.title}}),changed=event(18,2,{content_version:'older-version'}),view=projection([old,changed]);assert.equal(view.history[0].comparisonKey,null);assert.equal(view.history[1].currentContent,false);assert.equal(PICKLEUP_ACADEMY_INSIGHTS.analyze(lessons,view.records,view.history,lesson.level,'serve',lesson.id).delta,null);assert.notEqual(PICKLEUP_WEEKLY_GOALS.recommend(lessons,view.records,view.history,lesson.level).code,'target');assert.equal(activity.comparisonKey('academy_attempts',old),null);
});
test('manual attempt snapshot preserves lesson meaning and rejects partial or invalid conditions',()=>{
 const id=uid(),payload=source.attempt(lesson,16,{eventId:id,occurredAt:'2026-11-02T10:00:00Z',conditions:known,activityCore:activity});assert.equal(payload.client_event_id,id);assert.equal(payload.content_version,source.VERSION);assert.deepEqual(payload.lesson_snapshot,{title:lesson.title,assessment:lesson.assessment.instruction});assert.throws(()=>source.attempt(lesson,16,{eventId:id,occurredAt:'2026-11-02T10:00:00Z',conditions:{feed:'partner'},activityCore:activity}),{code:'invalid_activity'});
});
async function runtime(enabled=true,{sourceCore=extra}={}){
 const db=await repository.open({indexedDB:new IDBFactory()}),server=model({activityRows:true}),listeners=new Set(),calls=[],storage=new Map([[source.SCORES,JSON.stringify({'PU-001':{score:4,date:'2026-01-01T00:00:00Z'}})],[source.HISTORY,'[]']]);let sharedCalls=0;
 const auth={ready:Promise.resolve(),subscribe(fn){listeners.add(fn);fn({status:'authenticated',user:{id:A}});return ()=>listeners.delete(fn)},async eventRpc(owner,name,args){calls.push({owner,name,args});return server.rpc(name,args)}};
 const root={PICKLEUP_ACTIVITY_CONFIG:{enabled},PICKLEUP_AUTH_CONFIG:{enabled:true,url:'https://fixture.invalid',publishableKey:'sb_publishable_fixture'},PICKLEUP_CURRICULUM:lessons,PICKLEUP_ACADEMY_TRENDS,PickleUpAcademySourceCore:source,PickleUpActivitySourceCore:sourceCore,PickleUpActivityCore:activity,PickleUpAuth:{getShared:async()=>{sharedCalls++;return auth}},PickleUpLocalRepository:{open:async()=>db},PickleUpActivityController:{TRAINING_LIFECYCLE:lifecycle.TRAINING_LIFECYCLE,ActivityError:lifecycle.ActivityError,create:options=>lifecycle.create({...options,core:activity,pullFactory:pull,syncFactory:sync,channelFactory:()=>null})},crypto,addEventListener(){}};
 const document={querySelectorAll:()=>[],dispatchEvent(){},addEventListener(){}};root.document=document;
 vm.runInNewContext(fs.readFileSync(require.resolve('../modules/data/activity-runtime.js'),'utf8'),{window:root,document,localStorage:{getItem:key=>storage.get(key)??null,setItem(){assert.fail('runtime must not write V5')}},structuredClone,Event:class{},Date,PickleUpAcademySourceCore:source,PickleUpAuth:root.PickleUpAuth,PickleUpLocalRepository:root.PickleUpLocalRepository,PickleUpActivityController:root.PickleUpActivityController,PICKLEUP_AUTH_CONFIG:root.PICKLEUP_AUTH_CONFIG});
 await root.PICKLEUP_ACTIVITY.ready;return {data:root.PICKLEUP_ACTIVITY,db,storage,calls,get sharedCalls(){return sharedCalls},switch(owner){for(const fn of [...listeners])fn({status:owner?'authenticated':'guest',user:owner?{id:owner}:null})},close(){root.PICKLEUP_ACTIVITY.controller()?.close();db.close()}};
}
test('flag-off Academy facade stays guest and never opens Auth or sends RPC',async()=>{
 const f=await runtime(false);try{assert.equal(f.sharedCalls,0);assert.equal(f.calls.length,0);assert.equal(f.data.records()['PU-001'].score,4);assert.equal(f.data.canWrite(),true)}finally{f.close()}
});
test('account facade never falls back to guest scores, preserves V5, and clears private snapshots on A to B',async()=>{
 const f=await runtime();try{
  const before=new Map(f.storage);await f.data.controller().useAccount();assert.deepEqual(f.data.records(),{});await f.data.saveAttempt(lesson,17,known);assert.equal(f.data.records()['PU-001'].score,17);assert.equal(f.data.history().length,1);assert.equal(f.data.events().length,1);assert.deepEqual(f.storage,before);const token=f.data.token(),late=f.data.saveAttempt(lesson,13,known);f.switch(B);await assert.rejects(late,{code:'account_changed'});assert.ok(f.data.token()>token);assert.equal(f.data.events().length,0);assert.equal(f.data.getState().snapshot,null);assert.equal((await f.db.scope('user:'+B).getActivitySnapshot()).records.length,0);assert.equal((await f.db.scope('user:'+A).listOutbox()).length,1);
 }finally{f.close()}
});

test('account assessment and match writers capture intent before await, preserve all guest keys and never transfer A work to B',async()=>{
 const f=await runtime();try{await f.data.controller().useAccount();const before=new Map(f.storage),values=Object.fromEntries(extra.SKILLS.map(key=>[key,2]));await f.data.saveAssessment('self',values);assert.equal(f.data.assessments('self')[0].answers.serve,2);assert.equal(f.data.events('skill_assessments').length,1);await f.data.saveMatch({mode:'doubles',ours:11,theirs:7,focus:'serve-return',note:'Synthetic',doubles_issue:null});assert.equal(f.data.matches()[0].ours,11);assert.deepEqual(f.storage,before);assert.equal(f.calls.filter(x=>x.name==='apply_event_operation').length,0);const late=f.data.saveAssessment('self',values);f.switch(B);await assert.rejects(late,{code:'account_changed'});assert.equal(f.data.events('skill_assessments').length,0);assert.equal(f.data.matches().length,0);assert.equal((await f.db.scope('user:'+B).listOutbox()).length,0);assert.equal((await f.db.scope('user:'+A).listOutbox()).length,2)}finally{f.close()}
});

test('mixed account assets stop before Auth and never expose guest assessment or match data as account views',async()=>{
 const f=await runtime(true,{sourceCore:null});try{f.storage.set(extra.KEYS.matches,JSON.stringify([{note:'Guest only'}]));assert.equal(f.sharedCalls,0);assert.equal(f.data.getState().error,'upgrade_required');assert.equal(f.data.canWrite(),false);assert.equal(f.data.raw(extra.KEYS.matches),'[]');assert.equal(f.data.raw(extra.KEYS.self),'null')}finally{f.close()}
});
