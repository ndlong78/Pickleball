/* Run: node --test tests/advanced-curriculum.test.js */
const test=require("node:test");
const assert=require("node:assert/strict");
global.window=globalThis;
require("../curriculum.js");
const original=window.PICKLEUP_CURRICULUM.map(s=>({id:s.id,title:s.title,level:s.level}));
require("../advanced-curriculum.js");
const advanced=window.PICKLEUP_ADVANCED_CURRICULUM,all=window.PICKLEUP_CURRICULUM;
test("preserves the original 36 lessons exactly",()=>{
 assert.equal(original.length,36);
 assert.deepEqual(all.slice(0,36).map(s=>({id:s.id,title:s.title,level:s.level})),original);
});
test("provides 20 intermediate and 24 upper-intermediate tactical lessons",()=>{
 assert.equal(advanced.length,44);
 assert.equal(all.length,80);
 assert.equal(advanced.filter(x=>x.level==="3.0–3.5").length,20);
 assert.equal(advanced.filter(x=>x.level==="3.5–4.0").length,24);
 assert.equal(new Set(all.map(x=>x.id)).size,80);
 assert.equal(all[36].id,"PU-037");assert.equal(all[79].id,"PU-080");
});
test("all 80 practice plans last 60 minutes",()=>{
 for(const x of all){
  assert.equal(x.drills.length,3,x.id);
  assert.deepEqual(x.drills.map(d=>d.minutes),[12,12,15],x.id);
  assert.equal(x.warmup+x.testMinutes+x.cooldown+x.drills.reduce((n,d)=>n+d.minutes,0),60,x.id);
 }
});
test("every advanced lesson has distinct focus, meaningful instruction and a measurable check",()=>{
 const titles=new Set();
 for(const x of advanced){
  assert.equal(x.advanced,true,x.id);
  assert.ok(x.focus&&x.setup.length>40&&x.title.length>6,x.id);
  assert.equal(x.assessment.attempts,20,x.id);
  assert.ok(x.assessment.target>=12&&x.assessment.target<=17,x.id);
  assert.ok(x.drills.every(d=>d.instruction.length>45&&d.check.length>15),x.id);
  assert.ok(x.mistakes.length>=2&&x.cues.length>=2,x.id);
  titles.add(x.title);
 }
 assert.equal(titles.size,44);
 assert.equal(new Set(advanced.map(x=>x.focus)).size,11);
});
