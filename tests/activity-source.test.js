const {test}=require('node:test'),assert=require('node:assert/strict'),source=require('../modules/data/activity-source-core.js'),activity=require('../modules/data/activity-core.js');
require('../practice-conditions.js');require('../training-evaluation-core.js');require('../tactical-insights-core.js');
const uid=()=>crypto.randomUUID(),when='2026-01-01T10:00:00Z',options=()=>({eventId:uid(),occurredAt:when,activityCore:activity}),scores=(keys,value)=>Object.fromEntries(keys.map(k=>[k,value]));
const self=(value=1)=>source.assessment('self',scores(source.SKILLS,value),null,options()),stage=(value=14)=>source.assessment('stage',scores(source.SKILLS,value),'2.0–2.5',options()),advanced=(value=14)=>source.assessment('advanced',scores(source.ADVANCED,value),'3.0–3.5',options());
const match=()=>source.match({mode:'doubles',ours:11,theirs:9,focus:'serve-return',note:'Synthetic note',doubles_issue:'middle'},options());
const event=(value,extra={})=>({...value,id:uid(),pending:false,...extra}),view=(checks=[],matches=[])=>source.project({events:{skill_assessments:checks,match_records:matches}},{now:'2026-11-02T10:00:00Z'});
test('self scale2 and separate basic/advanced scale20 metrics retain their own meaning and derived gates',()=>{
 const a=self(2),b=stage(),c=advanced();assert.equal(a.scale,2);assert.equal(a.level_band,null);assert.equal(a.average,null);assert.equal(a.ready,null);assert.equal(b.scale,20);assert.equal(b.average,14);assert.equal(b.ready,true);assert.equal(c.ready,true);assert.deepEqual(Object.keys(c.scores),source.ADVANCED);
 const low={...scores(source.SKILLS,20),serve:1};assert.equal(source.assessment('stage',low,'2.5–3.0',options()).ready,false);
 const fractional={...scores(source.ADVANCED,15),third:14};assert.equal(source.assessment('advanced',fractional,'3.5–4.0',options()).average,14.83);assert.equal(source.assessment('advanced',fractional,'3.5–4.0',options()).ready,false);
});
test('assessment builders reject cross-metric sets, scales, bands, missing/extra and malformed scores',()=>{
 for(const [type,values,level]of [['self',scores(source.SKILLS,3),null],['stage',scores(source.ADVANCED,12),'1.0–2.0'],['advanced',scores(source.SKILLS,12),'3.0–3.5'],['stage',scores(source.SKILLS,12),'3.0–3.5'],['advanced',scores(source.ADVANCED,12),'2.5–3.0'],['self',{...scores(source.SKILLS,1),other:1},null],['self',null,null],['self',{...scores(source.SKILLS,1),serve:'1'},null]])assert.throws(()=>source.assessment(type,values,level,options()),{code:'invalid_activity'});
});
test('projections preserve identities and histories beyond the guest 200/300/500 limits',()=>{
 const a=Array.from({length:301},()=>event(stage())),b=Array.from({length:201},()=>event(advanced())),c=Array.from({length:501},()=>event(match())),snapshot=view([...a,...b,event(self()),event(self())],c);
 assert.equal(snapshot.checks.stage.length,301);assert.equal(snapshot.checks.advanced.length,201);assert.equal(snapshot.checks.self.length,2);assert.equal(snapshot.matches.length,501);assert.equal(new Set(snapshot.matches.map(x=>x.id)).size,501);assert.equal(snapshot.raw[source.KEYS.self].schemaVersion,1);assert.equal(snapshot.raw[source.KEYS.matches].length,501);
});
test('unknown and future events stay raw without becoming latest, counts or a fabricated assessment date',()=>{
 const a=event(self(2),{occurred_at:null,source_kind:'legacy'}),b=event(stage(20),{occurred_at:'2099-01-01T00:00:00Z'}),c=event(match(),{occurred_at:null}),d=event(match(),{occurred_at:'2099-01-01T00:00:00Z'}),snapshot=view([a,b],[c,d]);
 assert.equal(snapshot.events.skill_assessments.length,2);assert.equal(snapshot.events.match_records.length,2);assert.equal(snapshot.raw[source.KEYS.self],null);assert.deepEqual(snapshot.checks.stage,[]);assert.deepEqual(snapshot.matches,[]);assert.equal(snapshot.events.skill_assessments[1].occurred_at,null);
});
test('latest uses microseconds, timezone instants and a deterministic UUID tie; source strings remain exact',()=>{
 const a=event(self(0),{id:'11111111-1111-4111-8111-111111111111',occurred_at:'2026-01-01T10:00:00.123001Z'}),b=event(self(2),{id:'22222222-2222-4222-8222-222222222222',occurred_at:'2026-01-01T17:00:00.123999+07:00'}),snapshot=view([a,b]);assert.equal(snapshot.raw[source.KEYS.self].answers.serve,2);assert.equal(snapshot.checks.self[0].date,b.occurred_at);
 b.occurred_at=a.occurred_at;assert.equal(view([b,a]).checks.self[0].id,a.id);assert.deepEqual([a,b].sort(source.order).map(x=>x.id),[a.id,b.id]);
});
test('match projection keeps notes and optional doubles issue, with detached data and no guest mirror',()=>{
 const original=event(match(),{pending:true}),snapshot=view([],[original]);assert.equal(snapshot.matches[0].doublesIssue,'middle');assert.equal(snapshot.matches[0].note,'Synthetic note');assert.equal(snapshot.matches[0].pending,true);snapshot.matches[0].note='changed';assert.equal(original.note,'Synthetic note');
 assert.throws(()=>source.match({mode:'doubles',ours:100,theirs:9,focus:'serve-return',note:''},options()),{code:'invalid_activity'});assert.throws(()=>source.match({mode:'singles',ours:11,theirs:9,focus:'serve-return',note:'',user_id:uid()},options()),{code:'invalid_activity'});
});
test('account match windows use projection order instead of sorting timestamp strings across offsets',()=>{
 const rows=Array.from({length:21},(_,i)=>({...view([],[event(match())]).matches[0],id:uid(),accountOrder:i,date:i===0?'2026-01-01T09:00:00Z':'2026-01-01T15:00:00+07:00',focus:i===0?'counter-volley':'serve-return',doublesIssue:i===0?'communication':'middle'}));
 assert.equal(PICKLEUP_TACTICAL_INSIGHTS.analyze(rows).votes.counter,1);assert.equal(PICKLEUP_TACTICAL_INSIGHTS.analyze(rows).matchCount,10);assert.equal(PICKLEUP_EVALUATION.doubles(rows).counts.communication,1);assert.equal(PICKLEUP_EVALUATION.doubles(rows).total,20);
});
