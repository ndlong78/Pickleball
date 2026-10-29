const test=require("node:test"),assert=require("node:assert/strict");
require("../modules/weekly-goals-core.js");require("../modules/weekly-plan-core.js");require("../modules/weekly-checkins-core.js");require("../modules/training-journey-core.js");
const core=globalThis.PICKLEUP_JOURNEY,check=globalThis.PICKLEUP_WEEK_CHECKINS;
const lessons=[
 {id:"PU-001",level:"1.0–2.0",week:1,title:"Giao bóng",skill:"serve",assessment:{target:14}},
 {id:"PU-002",level:"1.0–2.0",week:2,title:"Dinking",skill:"dink",assessment:{target:12}},
 {id:"PU-003",level:"2.0–2.5",week:3,title:"Volley",skill:"volley",assessment:{target:15}}
];
const now=new Date("2026-10-29T12:00:00Z"),goal={days:3,level:"1.0–2.0"};
const base={lessons,goal,goalConfigured:true,now};
const stage={level:"1.0–2.0",date:"2026-10-26T10:00:00Z",values:{serve:12,return:13,dink:10,volley:12,position:14,strategy:11}};
test("uses defaults for old users and does not manufacture a completed step",()=>{
 const x=core.build({lessons,now});
 assert.equal(x.goalConfigured,false);assert.equal(x.next.code,"goal");
 assert.equal(x.todayEntry,null);assert.equal(x.doneThisWeek,0);
 assert.equal(x.lesson?.level,"1.0–2.0");assert.equal(x.plan.days.length,7);
});
test("existing stage-check evidence is optional and validated",()=>{
 assert.equal(core.build(base).next.code,"assess");
 assert.equal(core.build({...base,stageChecks:[{date:"bad",...stage}]}).hasAssessment,true);
 assert.equal(core.build({...base,stageChecks:[stage]}).next.code,"practice");
 const invalid={...stage,values:{serve:200}};
 assert.equal(core.build({...base,stageChecks:[invalid]}).hasAssessment,false);
});
test("selected in-level lesson resumes; other-level choice never mismatched",()=>{
 assert.equal(core.build({...base,selectedLessonId:"PU-002"}).lesson.id,"PU-002");
 assert.notEqual(core.build({...base,selectedLessonId:"PU-003"}).lesson.id,"PU-003");
 assert.equal(core.build({...base,selectedLessonId:"PU-002"}).recommendationReason.includes("bạn chọn"),true);
});
test("assessment scores and academy results cannot complete a session",()=>{
 const score={score:20,date:"2026-10-29T09:00:00Z"};
 const x=core.build({...base,stageChecks:[stage],records:{"PU-001":score},history:[{id:"PU-001",level:"1.0–2.0",skill:"serve",score:20,date:score.date}]});
 assert.equal(x.doneThisWeek,0);assert.equal(x.todayEntry,null);assert.equal(x.lessonScoreRecorded,true);
});
test("only explicit manual check-in transitions next step; no duplicate session credit",()=>{
 const before=core.build({...base,stageChecks:[stage]});assert.equal(before.next.code,"practice");
 let c=check.change(check.empty(),"2026-10-29","done",35,"PU-001",now);
 c=check.change(c,"2026-10-29","done",40,"PU-001",now);
 const after=core.build({...base,stageChecks:[stage],checkins:c});
 assert.equal(after.next.code,"review");assert.equal(after.doneThisWeek,1);assert.equal(after.minutesThisWeek,40);assert.equal(after.todayEntry.minutes,40);
 const missed=core.build({...base,stageChecks:[stage],checkins:check.change(c,"2026-10-29","skipped",null,null,now)});
 assert.equal(missed.doneThisWeek,0);assert.equal(missed.next.code,"practice");
});
test("court link is only claimed ready for a selected personal plan",()=>{
 assert.equal(core.build(base).links.court,"?page=coach#personalCoach");
 assert.equal(core.build({...base,selectedPersonalPlan:true}).links.court,"?page=court#pcOnCourt");
});
