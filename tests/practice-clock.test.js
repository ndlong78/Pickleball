/* Run: node --test tests/practice-clock.test.js */
const test=require("node:test");
const assert=require("node:assert/strict");
require("../practice-clock.js");
const timer=globalThis.PICKLEUP_PRACTICE_CLOCK;
test("six sections add to exactly sixty minutes",()=>{
 assert.equal(timer.stages.length,6);
 assert.equal(timer.stages.reduce((n,x)=>n+x.minutes,0),60);
 assert.deepEqual(timer.stages.map(x=>x.minutes),[10,12,12,15,6,5]);
});
test("clock does not lose seconds under throttled callbacks",()=>{
 let s=timer.create("PU24-1");
 s=timer.start(s,1000);
 assert.equal(timer.seconds(s,61000),540);
 s=timer.tick(s,121000);
 assert.equal(s.remaining,480);
});
test("pause and resume preserve remaining time",()=>{
 let s=timer.start(timer.create("PU24-2"),1000);
 s=timer.pause(s,121000);
 assert.equal(s.remaining,480);
 assert.equal(s.running,false);
 s=timer.start(s,200000);
 assert.equal(timer.seconds(s,230000),450);
});
test("expired stage stops without silently skipping to the next drill",()=>{
 let s=timer.tick(timer.start(timer.create("PU24-3"),0),700000);
 assert.equal(s.remaining,0);
 assert.equal(s.running,false);
 assert.equal(s.index,0);
 s=timer.step(s,1,700000);
 assert.equal(s.index,1);
 assert.equal(s.remaining,720);
});
test("stage navigation reaches final cooldown and finished state",()=>{
 let s=timer.create("PU24-4");
 for(let i=0;i<6;i++)s=timer.step(s,1,0);
 assert.equal(s.ended,true);
 assert.equal(s.index,6);
 assert.equal(s.remaining,0);
 s=timer.step(s,-1,0);
 assert.equal(s.index,5);
 assert.equal(s.remaining,300);
});
test("refresh resumes same plan and isolates different plans",()=>{
 const started=timer.start(timer.create("PU24-a"),1000);
 const resumed=timer.readStored(JSON.parse(JSON.stringify(started)),"PU24-a",121000);
 assert.equal(resumed.running,true);
 assert.equal(resumed.remaining,480);
 assert.equal(timer.readStored(started,"PU24-b",121000).remaining,600);
});
test("clock cannot start at zero remaining and uses mm:ss formatting",()=>{
 const s=timer.tick(timer.start(timer.create("PU24-zero"),0),9999999);
 assert.equal(timer.start(s,10000000).running,false);
 assert.equal(timer.fmt(0),"00:00");
 assert.equal(timer.fmt(720),"12:00");
});
