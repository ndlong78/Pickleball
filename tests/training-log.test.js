/* Run: node --test tests/training-log.test.js */
const test=require("node:test");
const assert=require("node:assert/strict");
require("../training-log-core.js");
const log=globalThis.PICKLEUP_TRAINING_LOG;
const base={planId:"plan-1",exerciseId:"dink-1",skill:"dink",level:"1.0–2.0",kind:"drill",hits:10,note:"Giữ bóng thấp"};
const first=log.build(base,"2026-10-27T07:00:00.000Z","first");
const second=log.build({...base,hits:15},"2026-10-28T07:00:00.000Z","second");
test("records two attempts without overwriting the first",()=>{
 const rows=log.append(log.append([],first),second);
 assert.equal(rows.length,2);
 assert.deepEqual(rows.map(x=>x.hits),[10,15]);
 assert.equal(log.compare(rows,base).delta,5);
});
test("only compares same exercise, stage and kind",()=>{
 const extra=[
 log.build({...base,exerciseId:"dink-2",hits:20},"2026-10-29T07:00:00.000Z","third"),
 log.build({...base,level:"2.0–2.5",hits:18},"2026-10-30T07:00:00.000Z","fourth"),
 log.build({...base,kind:"assessment",hits:16},"2026-10-31T07:00:00.000Z","fifth")];
 const list=[first,second,...extra];
 assert.equal(log.compare(list,base).count,2);
 assert.equal(log.compare(list,{...base,exerciseId:"dink-2"}).comparable,false);
 assert.equal(log.compare(list,{...base,kind:"assessment"}).comparable,false);
});
test("strict input and history schema validation",()=>{
 assert.throws(()=>log.build({...base,hits:21}));
 assert.throws(()=>log.build({...base,hits:""}));
 assert.throws(()=>log.build({...base,exerciseId:"not-real",hits:2}));
 assert.equal(log.validateList([first,second]),true);
 assert.equal(log.validateList([{...first,note:"x".repeat(400)}]),false);
 assert.throws(()=>log.append([first],first),/trùng/);
});
test("persistent save does not overwrite malformed old storage",()=>{
 let value="broken JSON";
 const storage={getItem(){return value},setItem(_,next){value=next}};
 assert.throws(()=>log.record(storage,base),/Nhật ký/);
 assert.equal(value,"broken JSON");
});
test("records legitimate repeated attempts in storage",()=>{
 let value=null;
 const storage={getItem(){return value},setItem(_,next){value=next}};
 log.record(storage,base);
 log.record(storage,{...base,hits:13});
 assert.deepEqual(log.read(storage).map(r=>r.hits),[10,13]);
});
