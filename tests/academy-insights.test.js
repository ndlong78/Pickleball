const test=require("node:test"),assert=require("node:assert/strict");
require("../modules/academy-insights-core.js");
const core=globalThis.PICKLEUP_ACADEMY_INSIGHTS;
const lessons=[
 {id:"PU-001",skill:"serve",level:"1.0–2.0",week:1,title:"Giao bóng dễ"},
 {id:"PU-002",skill:"serve",level:"1.0–2.0",week:2,title:"Giao bóng nâng cao"},
 {id:"PU-003",skill:"serve",level:"2.0–2.5",week:3,title:"Giao bóng cấp khác"},
 {id:"PU-004",skill:"dink",level:"1.0–2.0",week:4,title:"Dink"}
];
const at=n=>new Date(Date.UTC(2026,9,28,0,n)).toISOString();
const entry=(id,score,n)=>{const x=lessons.find(y=>y.id===id);return {id,skill:x.skill,level:x.level,score,date:at(n)}};
test("empty stage/skill provides guidance but does not invent scores",()=>{
 const x=core.analyze(lessons,{},[],"1.0–2.0","serve");
 assert.equal(x.count,0);assert.equal(x.mean,null);assert.equal(x.delta,null);assert.equal(x.chart.length,0);
 assert.match(x.advice,/Hãy luyện/);
});
test("trend is based on repeated SAME lesson, not rising scores on harder lesson",()=>{
 const history=[entry("PU-001",8,1),entry("PU-002",19,2),entry("PU-003",1,3),entry("PU-001",11,4)];
 const x=core.analyze(lessons,{},history,"1.0–2.0","serve");
 assert.equal(x.count,3);assert.equal(x.delta,3);
 assert.equal(x.lesson.id,"PU-001");
 assert.match(x.status,/tăng 3 điểm/);
 assert.equal(x.chart.length,2);
 assert.deepEqual(x.chart.map(p=>p.id),["PU-001","PU-001"]);
});
test("unmatched levels and unrelated skills never enter the series",()=>{
 const history=[entry("PU-001",12,1),entry("PU-003",1,2),entry("PU-004",2,3)];
 const x=core.analyze(lessons,{},history,"1.0–2.0","serve");
 assert.equal(x.count,1);assert.equal(x.delta,null);
 assert.match(x.status,/chưa đủ/i);
});
test("legacy latest score is included once unless that lesson already has history",()=>{
 const history=[entry("PU-001",4,1),entry("PU-001",7,2)];
 const records={"PU-001":{score:18,date:at(8)},"PU-002":{score:0,date:at(9)}};
 const x=core.analyze(lessons,records,history,"1.0–2.0","serve");
 assert.equal(x.count,3);
 assert.deepEqual(x.chart.map(p=>p.score),[4,7]);
 assert.equal(x.delta,3);
});
test("decline triggers re-practice guidance, stable data does not overclaim",()=>{
 const decline=core.analyze(lessons,{},[entry("PU-001",17,1),entry("PU-001",10,2)],"1.0–2.0","serve");
 assert.equal(decline.delta,-7);assert.match(decline.advice,/ôn kỹ thuật/);
 const stable=core.analyze(lessons,{},[entry("PU-001",10,1),entry("PU-001",11,2)],"1.0–2.0","serve");
 assert.equal(stable.delta,1);assert.match(stable.advice,/Giữ bài/);
});
test("history is capped at 12 visible points with all attempts counted",()=>{
 const history=Array.from({length:20},(_,i)=>entry("PU-001",i%21,i));
 const x=core.analyze(lessons,{},history,"1.0–2.0","serve");
 assert.equal(x.count,20);assert.equal(x.chart.length,12);
});

test("choosing one lesson never blends results from another lesson in chart, average or trend",()=>{
 const history=[entry("PU-001",8,1),entry("PU-002",19,2),entry("PU-001",11,3)];
 const x=core.analyze(lessons,{},history,"1.0–2.0","serve","PU-002");
 assert.equal(x.count,3); // skill-level total
 assert.equal(x.lessonCount,1);
 assert.equal(x.mean,19);
 assert.equal(x.delta,null);
 assert.deepEqual(x.chart.map(p=>p.id),["PU-002"]);
 assert.equal(x.lessons.length,2);
});
test("manual lesson selection retains the same lesson for repeated results",()=>{
 const x=core.analyze(lessons,{},[entry("PU-001",8,1),entry("PU-002",10,2),entry("PU-001",11,3),entry("PU-002",16,4)],"1.0–2.0","serve","PU-002");
 assert.equal(x.lesson.id,"PU-002");assert.equal(x.delta,6);
 assert.deepEqual(x.chart.map(p=>p.score),[10,16]);
});
test("invalid history entries and legacy duplicates never inflate an existing lesson",()=>{
 const history=[entry("PU-001",5,1),{...entry("PU-001",11,2),skill:"dink"},entry("PU-001",9,3)];
 const x=core.analyze(lessons,{"PU-001":{score:20,date:at(8)}},history,"1.0–2.0","serve");
 assert.equal(x.count,2);assert.equal(x.delta,4);
});
