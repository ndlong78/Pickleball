const test=require("node:test"),assert=require("node:assert/strict");
require("../modules/weekly-goals-core.js");
require("../modules/weekly-plan-core.js");
const p=globalThis.PICKLEUP_WEEKLY_PLANNER;
const items=[
 {id:"PU-001",week:1,title:"Giao",skill:"serve",skillName:"Giao bóng",level:"1.0–2.0",assessment:{target:14}},
 {id:"PU-002",week:2,title:"Dink",skill:"dink",skillName:"Dinking",level:"1.0–2.0",assessment:{target:12}},
 {id:"PU-003",week:3,title:"Volley",skill:"volley",skillName:"Volley",level:"1.0–2.0",assessment:{target:15}},
 {id:"PU-004",week:4,title:"Trả giao",skill:"return",level:"1.0–2.0",assessment:{target:13}},
 {id:"PU-005",week:5,title:"Di chuyển",skill:"position",level:"1.0–2.0",assessment:{target:12}},
 {id:"PU-006",week:6,title:"Chiến thuật",skill:"strategy",level:"1.0–2.0",assessment:{target:13}},
 {id:"PU-007",week:7,title:"Khác cấp",skill:"serve",level:"2.0–2.5",assessment:{target:15}}
];
const now=new Date("2026-10-28T12:00:00Z");
function h(id,score,date){const l=items.find(x=>x.id===id);return {id,score,level:l.level,skill:l.skill,date}}
test("preferences bound minutes, gentle boolean, and persistence without changing V4.6 goals",()=>{
 assert.deepEqual(p.readSettings("bad"),{minutes:45,gentle:false});
 assert.equal(p.validSettings({minutes:90,gentle:false}),false);
 assert.equal(p.validSettings({minutes:30,gentle:"true"}),false);
 const storage={data:{},setItem(k,v){this.data[k]=v}};
 assert.throws(()=>p.saveSettings(storage,{minutes:60,gentle:null}));
 p.saveSettings(storage,{minutes:20,gentle:true});
 assert.deepEqual(JSON.parse(storage.data[p.KEY]),{minutes:20,gentle:true});
});
test("all day-targets 1–5 produce distinct scheduled days, explicit rest days and <=2 consecutive days",()=>{
 for(let target=1;target<=5;target++){
  const result=p.buildWeek(items,{},[],[],{days:target,level:"1.0–2.0"},{minutes:45,gentle:false},now);
  assert.equal(result.scheduled,target);assert.equal(result.rest,7-target);assert.equal(result.days.length,7);
  assert.equal(result.totalMinutes,target*45);
  assert.equal(result.days.filter(x=>x.kind==="practice").length,target);
  assert.equal(result.days.filter(x=>x.kind==="rest").length,7-target);
  let streak=0;for(const d of result.days){streak=d.kind==="practice"?streak+1:0;assert.ok(streak<=2)}
  assert.equal(new Set(result.days.map(x=>x.date)).size,7);
 }
});
test("20/30/45/60 minute blocks add up and gentle mode caps the length",()=>{
 for(const minutes of p.MINUTES){
  const result=p.buildWeek(items,{},[],[],{days:3,level:"1.0–2.0"},{minutes,gentle:false},now);
  for(const d of result.days.filter(d=>d.kind==="practice"))assert.equal(d.blocks.reduce((a,b)=>a+b,0),minutes);
 }
 const gentle=p.buildWeek(items,{},[],[],{days:3,level:"1.0–2.0"},{minutes:60,gentle:true},now);
 assert.equal(gentle.minutes,30);
 for(const d of gentle.days.filter(d=>d.kind==="practice"))assert.equal(d.blocks.reduce((a,b)=>a+b,0),30);
});
test("same-lesson decline ranks above below-target and new; other levels never mixed",()=>{
 const hst=[h("PU-001",18,"2026-10-26T00:00:00Z"),h("PU-001",12,"2026-10-27T00:00:00Z"),h("PU-002",5,"2026-10-27T00:00:00Z"),h("PU-007",1,"2026-10-28T00:00:00Z")];
 const result=p.buildWeek(items,{},hst,[],{days:3,level:"1.0–2.0"},{minutes:45,gentle:false},now);
 const a=result.days.filter(d=>d.kind==="practice");
 assert.equal(a[0].lessonId,"PU-001");
 assert.equal(a[1].lessonId,"PU-002");
 assert.equal(new Set(a.map(d=>d.skill)).size,3);
 assert.ok(a.every(d=>d.lessonId!=="PU-007"));
});
test("future and invalid records never influence lesson prioritization",()=>{
 const history=[h("PU-001",15,"2026-10-27T00:00:00Z"),h("PU-001",0,"2035-01-01T00:00:00Z"),h("PU-001",8,"bad")];
 const candidates=p.rank(items,{"PU-002":{score:0,date:"2030-01-01T00:00:00Z"}},history,"1.0–2.0",now);
 const a=candidates.find(c=>c.lesson.id==="PU-001");
 assert.equal(a.priority,0);
 assert.equal(candidates.find(c=>c.lesson.id==="PU-002").priority,1);
});
test("calendar spans year boundary and data are annotations only, not completion signals",()=>{
 const t=new Date("2027-01-01T11:00:00Z");
 const result=p.buildWeek(items,{},[h("PU-001",12,"2027-01-01T01:00:00Z")],[],{days:2,level:"1.0–2.0"},{minutes:20,gentle:false},t);
 assert.equal(result.start,"2026-12-28");assert.equal(result.end,"2027-01-03");
 assert.ok(result.days.some(d=>d.recorded));
 assert.equal(result.days.filter(x=>x.kind==="practice").length,2);
});
