/* Run: node --test tests/page-loader.test.js */
const test=require("node:test"),assert=require("node:assert/strict");
const vm=require("node:vm"),fs=require("node:fs"),path=require("node:path");
const loaderSource=fs.readFileSync(path.join(__dirname,"../modules/page-loader.js"),"utf8");
function mock(version=""){
 const scripts=[],styles=[],listeners=new Map(),preloads=new Set();
 const status={hidden:true,textContent:""};
 const document={
  readyState:"complete",
  createElement(tag){
   const node={tag,dataset:{},events:{},addEventListener(event,fn){this.events[event]=fn},
    remove(){},set rel(v){this._rel=v},get rel(){return this._rel}};
   return node;
  },
  getElementById(id){return id==="pageLoadStatus"?status:null},
  querySelector(selector){if(selector.startsWith('link[data-pu-preload="'))return preloads.has(selector.split('"')[1])?{}:null;return null},
  head:{appendChild(element){if(element._rel==="preload"){preloads.add(element.dataset.puPreload)}else{styles.push(element.href);setImmediate(()=>element.events.load())}}},
  body:{appendChild(element){scripts.push(element.src);setImmediate(()=>element.events.load())}},
  dispatchEvent(event){listeners.get(event.type)?.forEach(fn=>fn(event))},
  addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(fn)}
 };
 const window={PICKLEUP_BUILD:version,PICKLEUP_PAGES:[{id:"home",title:"Tổng quan"},{id:"progress",title:"Tiến bộ"}],PICKLEUP_ROUTER:{getPage:()=>"home"}};
 const context={window,document,performance:{now:()=>Date.now()},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail}},console,Promise,Date,Map,Set,Error};
 vm.runInNewContext(loaderSource,context);
 return {window,scripts,styles,status,preloads};
}
test("home fetches the lightweight weekly module, never the advanced course",async()=>{
 const app=mock(),loader=app.window.PICKLEUP_PAGE_LOADER;
 const info=await loader.ensure("home");
 assert.equal(info.scripts,1);
 assert.deepEqual(app.scripts,["./modules/weekly-practice.js"]);
 assert.equal(loader.isLoaded("advanced-curriculum.js"),false);
 assert.equal(app.status.hidden,true);
});
test("opening progress fetches only missing dependencies once",async()=>{
 const app=mock(),loader=app.window.PICKLEUP_PAGE_LOADER;
 await loader.ensure("home");
 const stats=await loader.ensure("progress");
 assert.ok(stats.scripts>0);
 assert.equal(app.scripts.filter(s=>s==="./modules/weekly-practice.js").length,1);
 assert.equal(loader.isLoaded("training-history-ui.js"),true);
 await loader.ensure("progress");
 assert.equal(app.scripts.filter(s=>s==="./training-history-ui.js").length,1);
});
test("on-demand CSS and modules are reused across related pages",async()=>{
 const app=mock(),loader=app.window.PICKLEUP_PAGE_LOADER;
 await loader.ensure("court");
 assert.ok(app.styles.includes("./training-evaluation.css"));
 await loader.ensure("progress");
 assert.equal(app.styles.filter(s=>s==="./training-evaluation.css").length,1);
 assert.equal(app.scripts.filter(s=>s==="./practice-conditions.js").length,1);
});
test("every page defines a nonempty lazy dependency list",()=>{
 const loader=mock().window.PICKLEUP_PAGE_LOADER;
 assert.deepEqual(Object.keys(loader.PAGE_FILES),["home","coach","court","academy","progress","matches","settings"]);
 for(const [id,files] of Object.entries(loader.PAGE_FILES)){
  assert.ok(files.length>0,id);
  assert.equal(new Set(files).size,files.length,id);
 }
});

test("a new app build uses versioned URLs without changing module identities",async()=>{
 const app=mock("3.6.0"),loader=app.window.PICKLEUP_PAGE_LOADER;
 await loader.ensure("home");
 assert.deepEqual(app.scripts,["./modules/weekly-practice.js?v=3.6.0"]);
 assert.equal(loader.isLoaded("modules/weekly-practice.js"),true);
 await loader.ensure("matches");
 assert.ok(app.scripts.some(x=>x==="./match-journal.js?v=3.6.0"));
 assert.equal(new Set(app.scripts).size,app.scripts.length);
});
