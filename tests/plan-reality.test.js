const test=require("node:test"),assert=require("node:assert/strict");
require("../modules/weekly-goals-core.js");
require("../modules/weekly-plan-core.js");
require("../modules/weekly-checkins-core.js");
require("../modules/plan-reality-core.js");
const planCore=globalThis.PICKLEUP_WEEKLY_PLANNER,c=globalThis.PICKLEUP_WEEK_CHECKINS,a=globalThis.PICKLEUP_PLAN_REALITY;
function week(now,goal=3){return planCore.buildWeek([],{},[],[],{days:goal,level:"1.0–2.0"},{minutes:45,gentle:false},now)}
const now=new Date("2026-10-29T12:00:00Z");
test("current partial week separates elapsed planned, skipped, actual and off-plan",()=>{
 let data=c.empty();
 data=c.change(data,"2026-10-26","done",35,null,now);
 data=c.change(data,"2026-10-27","done",25,null,now);
 data=c.change(data,"2026-10-28","skipped",null,null,now);
 const r=a.analyze(week(now),data,now);
 assert.equal(r.goalDays,3);assert.equal(r.elapsedScheduled,2);
 assert.equal(r.done,2);assert.equal(r.doneOnPlan,1);assert.equal(r.extra,1);
 assert.equal(r.skippedOnPlan,1);assert.equal(r.unconfirmed,0);
 assert.equal(r.minutes,60);assert.equal(r.plannedElapsedMinutes,90);
 assert.equal(r.currentGoalProgress,67);
 assert.equal(r.weeks.length,8);
});
test("unconfirmed does not mean skipped; future planned days excluded",()=>{
 const r=a.analyze(week(now,4),c.empty(),now);
 assert.equal(r.skipped,0);assert.equal(r.unconfirmed,r.elapsedScheduled);
 assert.equal(r.done,0);assert.equal(r.advice.code,"insufficient");
 assert.equal(r.weeks.at(-1).hasRecords,false);
});
test("past-week references use current goal, not fictional historical plans",()=>{
 let data=c.empty();
 for(const date of ["2026-10-05","2026-10-12","2026-10-19"])
  data=c.change(data,date,"done",30,null,now);
 const r=a.analyze(week(now,3),data,now);
 assert.equal(r.comparison.weeksWithRecords,3);
 assert.equal(r.comparison.belowReference,3);
 assert.equal(r.advice.code,"lighter");
 assert.equal(r.comparison.referenceGoal,3);
 assert.equal(r.weeks.at(-1).done,0);
});
test("repeated confirmed weeks at current goal suggest maintaining not escalating",()=>{
 let data=c.empty();
 for(const mon of ["2026-10-05","2026-10-12","2026-10-19"]){
  const d=new Date(mon+"T12:00:00Z");
  for(let n=0;n<3;n++){
   const date=d.toISOString().slice(0,10);
   data=c.change(data,date,"done",20,null,now);
   d.setUTCDate(d.getUTCDate()+1);
  }
 }
 const r=a.analyze(week(now,3),data,now);
 assert.equal(r.advice.code,"steady");
 assert.equal(r.comparison.metReference,3);
});
test("unknown past weeks do not count as failure and invalid data fails closed",()=>{
 let data=c.empty();data=c.change(data,"2026-10-19","skipped",null,null,now);
 assert.equal(a.analyze(week(now),data,now).advice.code,"insufficient");
 assert.equal(a.analyze(week(now),{bad:true},now).done,0);
 assert.throws(()=>a.analyze({},data,now));
});
test("calendar crossing new year handles prior-week evidence without future credit",()=>{
 const date=new Date("2027-01-01T12:00:00Z");
 const p=week(date,2);
 const r=a.analyze(p,c.empty(),date);
 assert.equal(r.weekStart,"2026-12-28");assert.equal(r.weeks.at(-1).start,"2026-12-28");
 assert.ok(r.elapsedScheduled<=2);
});
