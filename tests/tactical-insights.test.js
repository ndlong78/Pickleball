/* Run with: node --test tests/tactical-insights.test.js */
const test=require("node:test");
const assert=require("node:assert/strict");
global.window=globalThis;
require("../curriculum.js");
require("../advanced-curriculum.js");
require("../advanced-coach-core.js");
require("../tactical-insights-core.js");
const api=window.PICKLEUP_TACTICAL_INSIGHTS,coach=window.PICKLEUP_ADVANCED_COACH;
const score={third:14,reset:12,movement:13,counter:16,doubles:15,decision:11};
const match=(id,focus,date,mode="doubles")=>({id,focus,date,mode,ours:11,theirs:9});
const matches=[
 match("m1","counter-volley","2026-10-25T08:00:00Z"),
 match("m2","counter-volley","2026-10-26T08:00:00Z"),
 match("m3","third-drop","2026-10-27T08:00:00Z")
];
const attempt=(id,hits,date,exerciseId="ADV-PU-037",level="3.0–3.5",kind="drill")=>
 ({id,hits,date,exerciseId,level,kind});
test("uses last ten matches and maps repeated tactical observations",()=>{
 const insight=api.analyze(matches,[],"3.0–3.5");
 assert.equal(insight.matchCount,3);
 assert.equal(insight.suggested,"counter");
 assert.equal(insight.votes.counter,2);
 assert.equal(insight.votes.third,1);
});
test("defaults to measured skill ranking until learner opts into a match focus",()=>{
 assert.deepEqual(coach.priorities(score),["decision","reset","movement"]);
 const defaultPlan=coach.createPlan(score,[],"3.0–3.5","2026-10-27T09:00:00Z");
 assert.deepEqual(defaultPlan.exercises.map(x=>x.metric),["decision","reset","movement"]);
 const insight=api.analyze(matches);
 assert.equal(api.recommend(score,insight).suggested,"counter");
 const chosen=coach.createPlan(score,[],"3.0–3.5","2026-10-27T09:00:00Z",window.PICKLEUP_ADVANCED_CURRICULUM,{focusMetric:"counter"});
 assert.deepEqual(chosen.exercises.map(x=>x.metric),["counter","decision","reset"]);
 assert.equal(chosen.matchFocus,"counter");
 assert.equal(coach.validPlan(chosen),true);
 assert.throws(()=>coach.createPlan(score,[],"3.0–3.5","2026-10-27T09:00:00Z",window.PICKLEUP_ADVANCED_CURRICULUM,{focusMetric:"invalid"}));
});
test("comparable progress requires identical drill, level and assessment kind",()=>{
 const rows=[
 attempt("a",10,"2026-10-21T00:00:00Z"),
 attempt("b",15,"2026-10-23T00:00:00Z"),
 attempt("c",19,"2026-10-24T00:00:00Z","ADV-PU-037","3.5–4.0"),
 attempt("d",20,"2026-10-25T00:00:00Z","ADV-PU-038"),
 attempt("e",18,"2026-10-26T00:00:00Z","ADV-PU-037","3.0–3.5","assessment")
 ];
 const analysis=api.analyze([],rows,"3.0–3.5");
 assert.equal(analysis.attemptCount,4);
 assert.equal(analysis.comparable.length,1);
 assert.equal(analysis.comparable[0].delta,5);
 assert.equal(analysis.comparable[0].count,2);
});
test("invalid data does not drive recommendations",()=>{
 const insight=api.analyze([{...matches[0],focus:"unknown"}],
 [{...attempt("a",10,"2026-10-21T00:00:00Z"),hits:21}],"3.0–3.5");
 assert.equal(insight.matchCount,0);
 assert.equal(insight.attemptCount,0);
 assert.equal(api.recommend(score,insight).eligible,false);
 assert.equal(api.recommend({third:3},api.analyze(matches)).eligible,false);
});
