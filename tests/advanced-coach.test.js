/* Run: node --test tests/advanced-coach.test.js */
const test=require("node:test");
const assert=require("node:assert/strict");
global.window=globalThis;
require("../curriculum.js");
const oldIds=window.PICKLEUP_CURRICULUM.map(x=>x.id);
require("../advanced-curriculum.js");
require("../advanced-coach-core.js");
const coach=window.PICKLEUP_ADVANCED_COACH;
const scores={third:12,reset:10,movement:15,counter:14,doubles:13,decision:11};
test("keeps the beginner syllabus intact and chooses the three lowest advanced skills",()=>{
 assert.deepEqual(window.PICKLEUP_CURRICULUM.slice(0,36).map(x=>x.id),oldIds);
 assert.deepEqual(coach.priorities(scores),["reset","decision","third"]);
});
for(const level of coach.levels){
 test("builds a valid 60-minute "+level+" training session from the correct lesson pool",()=>{
  const plan=coach.createPlan(scores,[],level,"2026-10-27T14:00:00.000Z");
  assert.equal(plan.version,"3.1");
  assert.equal(plan.level,level);
  assert.ok(coach.validPlan(plan));
  assert.equal(plan.exercises.length,3);
  assert.deepEqual(plan.exercises.map(e=>e.minutes),[12,12,15]);
  assert.equal(plan.exercises.reduce((n,e)=>n+e.minutes,0)+plan.minutes.warmup+plan.minutes.assessment+plan.minutes.cooldown,60);
  assert.equal(new Set(plan.exercises.map(e=>e.id)).size,3);
  assert.deepEqual(plan.exercises.map(e=>e.metric),["reset","decision","third"]);
  assert.ok(plan.exercises.every(e=>window.PICKLEUP_ADVANCED_CURRICULUM.some(s=>"ADV-"+s.id===e.id&&s.level===level)));
 });
 test("rotates advanced exercises across four successive "+level+" sessions",()=>{
  const plans=[];
  for(let i=0;i<4;i++)plans.push(coach.createPlan(scores,plans,level,"2026-10-"+(20+i)+"T14:00:00.000Z"));
  for(let i=0;i<3;i++)assert.equal(new Set(plans.map(p=>p.exercises[i].id)).size,4);
  assert.equal(coach.validateList(plans),true);
 });
}
test("rejects incomplete scores, wrong stages and corrupted stored plans",()=>{
 assert.throws(()=>coach.createPlan({third:12}),/đủ sáu/);
 assert.throws(()=>coach.createPlan({...scores,reset:21}),/đủ sáu/);
 assert.throws(()=>coach.createPlan(scores,[],"4.0–4.5"),/Chọn nhóm/);
 const plan=coach.createPlan(scores);
 assert.equal(coach.validateList([{...plan,checkScore:22}]),false);
 assert.equal(coach.validateList([{...plan,exercises:[...plan.exercises.slice(0,2)]}]),false);
});
