/* Run with: node --test tests/personalized-core.test.js */
const test=require("node:test");
const assert=require("node:assert/strict");
require("../personalized-core.js");
const coach=globalThis.PICKLEUP_PERSONAL_CORE;
const scores={serve:15,return:13,dink:12,volley:14,position:16,strategy:10};
test("uses the three lowest skills from the example scorecard",()=>{
 assert.deepEqual(coach.pickPriority(scores),["strategy","dink","return"]);
});
test("makes a 60-minute session with three timed drills",()=>{
 const p=coach.createPlan(scores,[],"1.0–2.0","2026-10-27T13:08:00.000Z");
 assert.equal(p.exercises.length,3);
 assert.equal(p.minutes.warmup+p.exercises.reduce((n,e)=>n+e.minutes,0)+p.minutes.assessment+p.minutes.cooldown,60);
 assert.deepEqual(p.exercises.map(e=>e.skill),["strategy","dink","return"]);
 assert.deepEqual(p.exercises.map(e=>e.target),[14,15,16]);
});
test("rotates four distinct exercises per weak skill",()=>{
 const plans=[];
 for(let i=0;i<4;i++)plans.push(coach.createPlan(scores,plans,"1.0–2.0",`2026-10-27T13:0${i}:00.000Z`));
 for(let index=0;index<3;index++)assert.equal(new Set(plans.map(p=>p.exercises[index].id)).size,4);
});
test("rejects incomplete or out-of-range scores",()=>{
 assert.throws(()=>coach.createPlan({serve:15}),/sáu điểm/);
 assert.throws(()=>coach.createPlan({...scores,serve:21}),/sáu điểm/);
 assert.throws(()=>coach.createPlan(scores,[],"5.0"),/Nhóm giáo án/);
});
test("updates priorities when a weaker skill improves",()=>{
 const after={...scores,strategy:17};
 assert.deepEqual(coach.pickPriority(after),["dink","return","volley"]);
});
