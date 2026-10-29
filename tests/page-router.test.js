/* Run: node --test tests/page-router.test.js */
const test=require("node:test"),assert=require("node:assert/strict"),vm=require("node:vm"),fs=require("node:fs"),path=require("node:path");
const code=fs.readFileSync(path.resolve(__dirname,"../modules/page-router.js"),"utf8");
const catalog=fs.readFileSync(path.resolve(__dirname,"../modules/page-catalog.js"),"utf8");
function create(urlString){
 const nodes=new Map(),links=[],all=[],listeners=new Map();
 const sectionIds=["homeHero","homeShortcuts","homeStats","homeWeeks","journeyFlow","personalCoach","advancedCoach","advancedReadiness","selfAssessment","pcOnCourt","practice","trainingHistory","dashboard","trainingEvaluation","stageAssessment","activityHistory","academy","levelRoadmap","matchJournal","tacticalReport","backup"];
 for(const id of sectionIds){
  const data=new Map([["data-pickleup-page",id.startsWith("home")?"home":id==="journeyFlow"?"journey":id==="personalCoach"||id==="advancedCoach"||id==="advancedReadiness"||id==="selfAssessment"?"coach":id==="pcOnCourt"||id==="practice"?"court":id==="academy"||id==="levelRoadmap"?"academy":id==="matchJournal"||id==="tacticalReport"?"matches":id==="backup"?"settings":"progress"]]);
  const el={id,attrs:data,top:0,getAttribute(k){return this.attrs.get(k)||null},setAttribute(k,v){this.attrs.set(k,v)},removeAttribute(k){this.attrs.delete(k)},getBoundingClientRect(){return{top:this.top}}};
  nodes.set(id,el);all.push(el);
 }
 for(const id of ["pageHeading","pageDescription","pageKicker"])nodes.set(id,{textContent:""});
 const pages=["home","journey","coach","court","academy","progress","matches","settings"];
 for(const id of pages){
  const attr=new Map();
  links.push({dataset:{route:id},getAttribute(){return"?page="+id},setAttribute(k,v){attr.set(k,v)},removeAttribute(k){attr.delete(k)},get current(){return attr.get("aria-current")}});
 }
 const location={href:urlString};
 function setLocation(value){const u=new URL(value,location.href);location.href=u.href}
 Object.defineProperties(location,{pathname:{get(){return new URL(location.href).pathname}},origin:{get(){return new URL(location.href).origin}},search:{get(){return new URL(location.href).search}},hash:{get(){return new URL(location.href).hash}}});
 const document={
  readyState:"complete",documentElement:{dataset:{}},
  getElementById(id){return nodes.get(id)||null},
  querySelectorAll(s){if(s==="[data-pickleup-page]")return all;if(s.includes("#pageNavigation"))return links;return []},
  addEventListener(type,fn){listeners.set(type,fn)},
  dispatchEvent(){}
 };
 const win={location,history:{pushState(_a,_b,url){setLocation(url)},replaceState(_a,_b,url){setLocation(url)}},scrollY:0,scrollTo(){},requestAnimationFrame(fn){fn()},addEventListener(){},console:{warn(){}}};
 const ctx={window:win,document,URL,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail}}};
 vm.runInNewContext(catalog,ctx);vm.runInNewContext(code,ctx);
 return {win,document,nodes,links};
}
test("query routes show only their respective mounted modules",()=>{
 const app=create("https://example.org/Pickleball/index.html?page=coach");
 assert.equal(app.win.PICKLEUP_ROUTER.getPage(),"coach");
 assert.ok(app.nodes.get("personalCoach").attrs.has("data-page-current"));
 assert.equal(app.nodes.get("academy").attrs.has("data-page-current"),false);
 assert.equal(app.nodes.get("pageHeading").textContent,"🎯 HLV cá nhân");
 assert.equal(app.links.find(x=>x.dataset.route==="coach").current,"page");
});
test("switching sections changes URL without unloading mounted application",()=>{
 const app=create("https://example.org/Pickleball/index.html?page=coach");
 const sameCoachNode=app.nodes.get("personalCoach");
 assert.equal(app.win.PICKLEUP_ROUTER.openSection("pcOnCourt"),true);
 assert.equal(app.win.PICKLEUP_ROUTER.getPage(),"court");
 assert.match(app.win.location.href,/page=court#pcOnCourt/);
 assert.equal(sameCoachNode,app.nodes.get("personalCoach"));
 assert.equal(sameCoachNode.attrs.has("data-page-current"),false);
});
test("legacy hash anchors canonicalize to a shareable query page",()=>{
 const app=create("https://example.org/Pickleball/#matchJournal");
 assert.equal(app.win.PICKLEUP_ROUTER.getPage(),"matches");
 assert.match(app.win.location.href,/page=matches#matchJournal/);
 assert.ok(app.nodes.get("matchJournal").attrs.has("data-page-current"));
});
test("all eight pages resolve a top-level URL",()=>{
 for(const page of ["home","coach","court","academy","progress","matches","settings"]){
  const app=create("https://example.org/Pickleball/?page="+page);
  assert.equal(app.win.PICKLEUP_ROUTER.getPage(),page);
 }
});
