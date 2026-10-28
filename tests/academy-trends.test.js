const test=require("node:test"),assert=require("node:assert/strict");
require("../modules/academy-trends-core.js");
const core=globalThis.PICKLEUP_ACADEMY_TRENDS;
const lessons=[
 {id:"PU-001",skill:"serve",skillName:"Giao bóng",level:"1.0–2.0",title:"Serve 1"},
 {id:"PU-002",skill:"dink",skillName:"Dinking",level:"1.0–2.0",title:"Dink 1"},
 {id:"PU-003",skill:"dink",skillName:"Dinking",level:"1.0–2.0",title:"Dink 2"},
 {id:"PU-004",skill:"serve",skillName:"Giao bóng",level:"2.0–2.5",title:"Serve 2"}
];
const when=i=>new Date(Date.UTC(2026,9,28,0,i)).toISOString();
test("validates and bounds history; rejects malformed or bogus scores",()=>{
 const a=core.append([],lessons[0],9,when(1));
 assert.equal(a.length,1);
 assert.equal(core.readHistory(JSON.stringify(a)).length,1);
 assert.deepEqual(core.readHistory('[{"score":900}]'),[]);
 assert.equal(core.validateHistory([{...a[0],score:-1}]),false);
 assert.equal(core.validateHistory([{...a[0],id:"INVALID"}]),false);
 assert.equal(core.validateHistory(Array.from({length:501},()=>a[0])),false);
 assert.equal(core.append(Array.from({length:500},()=>a[0]),lessons[0],10,when(2)).length,500);
});
test("tracks repeated attempts and recommends the weaker recent skill within a stage",()=>{
 let history=[];
 for(const [skill,score,i] of [["PU-001",12,1],["PU-002",4,2],["PU-002",7,3],["PU-002",10,4]]){
  history=core.append(history,lessons.find(x=>x.id===skill),score,when(i));
 }
 const result=core.recommend(lessons,{"PU-001":{score:12},"PU-002":{score:10}},history,"1.0–2.0");
 assert.equal(result.lesson.id,"PU-003");
 assert.match(result.reason,/7\.0\/20/);
 assert.match(result.trend,/tăng 6 điểm/);
});
test("does not fabricate a trend from a single legacy score",()=>{
 const result=core.recommend(lessons,{"PU-002":{score:3,date:when(1)}},[],"1.0–2.0");
 assert.equal(result.lesson.id,"PU-003");
 assert.match(result.reason,/3\/20/);
 assert.match(result.trend,/chưa thể tính xu hướng/);
});
test("compares like-for-like levels and reports declines",()=>{
 const history=[
  {id:"PU-001",skill:"serve",level:"1.0–2.0",score:15,date:when(1)},
  {id:"PU-001",skill:"serve",level:"1.0–2.0",score:8,date:when(2)},
  {id:"PU-004",skill:"serve",level:"2.0–2.5",score:1,date:when(3)}
 ];
 const result=core.recommend(lessons,{"PU-001":{score:8},"PU-004":{score:1}},history,"1.0–2.0");
 assert.equal(result.lesson.id,"PU-001");
 assert.match(result.trend,/giảm 7 điểm/);
 assert.equal(core.recommend(lessons,{},[],"2.0–2.5").lesson.id,"PU-004");
});
