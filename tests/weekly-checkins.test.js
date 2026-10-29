const test=require("node:test"),assert=require("node:assert/strict");
require("../modules/weekly-checkins-core.js");
const c=globalThis.PICKLEUP_WEEK_CHECKINS,now=new Date("2026-10-29T12:00:00Z");
test("corrupt and older absent data safely start empty",()=>{assert.deepEqual(c.read("invalid"),c.empty());assert.deepEqual(c.read(null),c.empty())});
test("manual done, missed, revised and cleared are distinct; plans do not count",()=>{
 const a=c.change(c.empty(),"2026-10-28","done",40,"PU-001",now);assert.equal(c.summary(a,now).current.done,1);
 const b=c.change(a,"2026-10-28","skipped",null,"PU-001",now);assert.equal(c.summary(b,now).current.done,0);assert.equal(c.summary(b,now).current.skipped,1);
 const n=c.change(b,"2026-10-28","clear",null,null,now);assert.equal(c.summary(n,now).current.skipped,0);assert.equal(a.entries["2026-10-28"].minutes,40);
});
test("two days counted, minutes summed from actual inputs, dates cannot be future",()=>{
 let x=c.empty();x=c.change(x,"2026-10-26","done",25,null,now);x=c.change(x,"2026-10-28","done",45,null,now);
 assert.equal(c.summary(x,now).current.done,2);assert.equal(c.summary(x,now).current.minutes,70);
 assert.throws(()=>c.change(x,"2026-11-01","done",30,null,now));
 assert.throws(()=>c.change(x,"2026-10-29","done",190,null,now));
 assert.throws(()=>c.change(x,"2026-10-29","done",20,"bad",now));
});
test("validates leap days and strict imported payloads",()=>{
 assert.equal(c.dayOK("2028-02-29"),true);assert.equal(c.dayOK("2027-02-29"),false);
 const x=c.change(c.empty(),"2026-10-29","done",20,null,now);
 assert.equal(c.valid(x),true);x.entries["2026-10-29"].minutes=-1;assert.equal(c.valid(x),false);
});
test("future records from backed up clock do not count as completed",()=>{
 const f={schemaVersion:1,entries:{"2030-01-01":{status:"done",minutes:30,lessonId:null,updatedAt:"2026-10-29T00:00:00Z"}}};
 assert.equal(c.valid(f),true);assert.equal(c.summary(f,now).current.done,0);
 const storage={setItem(k,v){this.key=k;this.value=v}};
 c.save(storage,f);assert.equal(storage.key,c.KEY);
});
