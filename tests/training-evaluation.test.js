/* Run: node --test tests/training-evaluation.test.js */
const test=require("node:test"),assert=require("node:assert/strict");
global.window=globalThis;
require("../practice-conditions.js");
require("../training-log-core.js");
require("../training-evaluation-core.js");
const C=window.PICKLEUP_PRACTICE_CONDITIONS,L=window.PICKLEUP_TRAINING_LOG,E=window.PICKLEUP_EVALUATION;
const conditions={feed:"partner",pace:"moderate",target:"standard"};
const base={planId:"p1",exerciseId:"ADV-PU-037",skill:"strategy",level:"3.0–3.5",kind:"drill",note:"",attempts:20};
const make=(id,hits,date,context)=>L.build({...base,hits,...(context?{conditions:context}:{})},date,id);
test("keeps legacy attempts valid; accepts optional complete conditions",()=>{
 assert.equal(L.isEntry(make("old",9,"2026-10-21T08:00:00Z")),true);
 assert.equal(L.isEntry(make("new",10,"2026-10-22T08:00:00Z",conditions)),true);
 assert.equal(L.validateList([make("old",9,"2026-10-21T08:00:00Z")]),true);
 assert.throws(()=>L.build({...base,hits:10,conditions:{feed:"partner",pace:"moderate"}}));
});
test("does not mistake unclassified historical attempts for matched tests",()=>{
 const old=make("old",10,"2026-10-21T08:00:00Z"),now=make("n1",14,"2026-10-22T08:00:00Z",conditions);
 const r=E.evaluate([old,now],"3.0–3.5");
 assert.equal(r.total,2);assert.equal(r.unknown,1);assert.equal(r.comparable.length,0);
});
test("compares identical drill, level, kind and all three training conditions",()=>{
 const list=[
 make("n1",10,"2026-10-20T08:00:00Z",conditions),
 make("n2",15,"2026-10-23T08:00:00Z",conditions),
 make("n3",20,"2026-10-24T08:00:00Z",{...conditions,pace:"match"}),
 make("n4",19,"2026-10-25T08:00:00Z",{...conditions,target:"narrow"}),
 make("old",2,"2026-10-26T08:00:00Z")];
 const r=E.evaluate(list,"3.0–3.5");
 assert.equal(r.comparable.length,1);
 assert.equal(r.comparable[0].count,2);
 assert.equal(r.comparable[0].first,10);
 assert.equal(r.comparable[0].last,15);
 assert.equal(r.comparable[0].delta,5);
 assert.equal(r.unknown,1);
 assert.equal(L.compare(list,{skill:"strategy",exerciseId:"ADV-PU-037",level:"3.0–3.5",kind:"drill",conditionsKey:C.signature(conditions)}).count,2);
});
test("doubles issues are independently classified and never invented for legacy matches",()=>{
 const m=(id,doublesIssue,mode="doubles")=>({id,date:"2026-10-2"+id+"T08:00:00Z",mode,ours:11,theirs:9,...(doublesIssue?{doublesIssue}:{})});
 const rows=[m("1","middle"),m("2","middle"),m("3","communication"),m("4",null),m("5","middle","singles")];
 const report=E.doubles(rows);
 assert.equal(report.total,4);
 assert.equal(report.documented,3);
 assert.equal(report.unclassified,1);
 assert.equal(report.top,"middle");
});
