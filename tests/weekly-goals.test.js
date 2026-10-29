const test=require("node:test"),assert=require("node:assert/strict");
require("../modules/weekly-goals-core.js");
const a=globalThis.PICKLEUP_WEEKLY_GOALS;
const lessons=[
 {id:"PU-001",week:1,level:"1.0–2.0",skill:"serve",title:"Giao",assessment:{target:14}},
 {id:"PU-002",week:2,level:"1.0–2.0",skill:"dink",title:"Dink",assessment:{target:12}},
 {id:"PU-003",week:3,level:"2.0–2.5",skill:"serve",title:"Giao nâng",assessment:{target:15}}
];
function h(id,score,date){const x=lessons.find(y=>y.id===id);return {id,score,date,level:x.level,skill:x.skill}}
test("goal settings are bounded; invalid or corrupted legacy payload safely defaults",()=>{
 assert.deepEqual(a.readSettings('{"days":2,"level":"2.0–2.5"}'),{days:2,level:"2.0–2.5"});
 assert.deepEqual(a.readSettings("{bad"),{days:3,level:"1.0–2.0"});
 assert.equal(a.validSettings({days:7,level:"1.0–2.0"}),false);
 const store={value:null,setItem(k,v){this.value=v;this.key=k}};
 assert.throws(()=>a.saveSettings(store,{days:0,level:"1.0–2.0"}));
 a.saveSettings(store,{days:5,level:"3.0–3.5"});
 assert.equal(store.key,a.KEY);assert.equal(JSON.parse(store.value).days,5);
});
test("Monday-Sunday weeks cross year correctly",()=>{
 assert.equal(a.monday("2027-01-01"),"2026-12-28");
 assert.equal(a.monday("2027-01-03"),"2026-12-28");
 assert.equal(a.monday("2027-01-04"),"2027-01-04");
});
test("repeated scores and same-day drills count ONE activity day, not sessions",()=>{
 const now=new Date("2026-10-28T12:00:00Z");
 const history=[h("PU-001",9,"2026-10-27T04:00:00Z"),h("PU-001",12,"2026-10-27T06:00:00Z")];
 const log=[{date:"2026-10-27T10:00:00Z",hits:12,attempts:20,kind:"drill"},{date:"2026-10-28T09:00:00Z",hits:12,attempts:20,kind:"assessment"}];
 const r=a.summarize(lessons,{"PU-001":{score:12,date:"2026-10-27T06:00:00Z"}},history,log,{days:2,level:"1.0–2.0"},now);
 assert.equal(r.currentCount,2);assert.equal(r.met,true);assert.equal(r.totalDays,2);assert.equal(r.weeks.length,8);
});
test("legacy latest result and malformed/future records cannot inflate history",()=>{
 const now=new Date("2026-10-28T12:00:00Z");
 const history=[h("PU-001",14,"2026-10-26T05:00:00Z"),h("PU-001",17,"bad")];
 const records={"PU-001":{score:11,date:"2026-10-27T05:00:00Z"},"PU-002":{score:15,date:"2026-10-27T05:00:00Z"},"unrelated":{score:20,date:"2026-10-25T01:00:00Z"}};
 const log=[{date:"2030-01-01T00:00:00Z",hits:20,attempts:20,kind:"drill"},{date:"2026-10-27T05:00:00Z",hits:-1,attempts:20,kind:"drill"}];
 const days=a.collectDates(lessons,records,history,log,now);
 assert.deepEqual(days,["2026-10-26","2026-10-27"]);
});
test("repeated same-lesson decline prioritized over different lesson scores",()=>{
 const r=a.recommend(lessons,{},[h("PU-001",19,"2026-10-26T00:00:00Z"),h("PU-001",12,"2026-10-27T00:00:00Z"),h("PU-002",2,"2026-10-28T00:00:00Z")],"1.0–2.0");
 assert.equal(r.code,"decline");assert.equal(r.lesson.id,"PU-001");
});
test("below own lesson target, then new, then review; never blends level",()=>{
 const low=a.recommend(lessons,{},[h("PU-001",13,"2026-10-27T00:00:00Z")],"1.0–2.0");
 assert.equal(low.code,"target");assert.equal(low.lesson.id,"PU-001");
 const next=a.recommend(lessons,{},[h("PU-001",18,"2026-10-27T00:00:00Z")],"1.0–2.0");
 assert.equal(next.code,"new");assert.equal(next.lesson.id,"PU-002");
 const repeat=a.recommend(lessons,{},[h("PU-001",18,"2026-10-26T00:00:00Z"),h("PU-002",15,"2026-10-27T00:00:00Z")],"1.0–2.0");
 assert.equal(repeat.code,"review");assert.equal(repeat.lesson.id,"PU-001");
 const other=a.recommend(lessons,{},[],"2.0–2.5");
 assert.equal(other.lesson.id,"PU-003");
});

test("weekly goal UI hydrates before enabling edits and saves the selected value synchronously",()=>{
 const fs=require("node:fs"),vm=require("node:vm");
 const markup=fs.readFileSync(require.resolve("../pages/progress.html"),"utf8");
 const nodes=new Map();
 const element=()=>({disabled:true,value:"",dataset:{},style:{},handlers:{},
  addEventListener(name,fn){this.handlers[name]=fn},append(){},setAttribute(){},replaceChildren(){}});
 for(const match of markup.matchAll(/id="(wg[^"]+)"/g))nodes.set(match[1],element());
 for(const id of ["wgDays","wgLevel","wgSave","wgRefresh"])
  assert.match(markup,new RegExp('id="'+id+'"[^>]* disabled'));
 const values=new Map([[a.KEY,JSON.stringify({days:4,level:"2.0–2.5"})],["legacy","keep"]]);
 const storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
 const document={getElementById:id=>nodes.get(id),createElement:element,addEventListener(){},dispatchEvent(){}};
 vm.runInNewContext(fs.readFileSync(require.resolve("../modules/weekly-goals-ui.js"),"utf8"),{
  window:{PICKLEUP_WEEKLY_GOALS:a,addEventListener(){}},document,localStorage:storage,Event:class{}
 });
 assert.equal(nodes.get("wgDays").value,"4");
 assert.equal(nodes.get("wgLevel").value,"2.0–2.5");
 for(const id of ["wgDays","wgLevel","wgSave","wgRefresh"]){
  assert.equal(nodes.get(id).disabled,false);
 }
 nodes.get("wgDays").value="2";
 nodes.get("wgSave").handlers.click();
 assert.deepEqual(JSON.parse(values.get(a.KEY)),{days:2,level:"2.0–2.5"});
 assert.match(nodes.get("wgStatus").textContent,/Đã lưu/);
 assert.equal(values.get("legacy"),"keep");
});
