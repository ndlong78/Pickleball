/* Run: node --test tests/web-vitals.test.js */
const test=require("node:test"),assert=require("node:assert/strict");
const vm=require("node:vm"),fs=require("node:fs"),path=require("node:path");
const source=fs.readFileSync(path.join(__dirname,"../modules/web-vitals.js"),"utf8");
function create(){
 const observers=new Map(),listeners=new Map();
 let now=0;
 class Observer{
  constructor(cb){this.callback=cb}
  observe(opts){observers.set(opts.type,this.callback)}
 }
 const perf={timeOrigin:1000,now:()=>now,getEntriesByType(type){
  return type==="resource"?[{name:"https://example.org/Pickleball/modules/page-router.js",transferSize:1024,decodedBodySize:2048},{name:"https://fonts.example/x",transferSize:2048,decodedBodySize:3072}]:[];
 }};
 const window={performance:perf,PerformanceObserver:Observer,location:{href:"https://example.org/Pickleball/",origin:"https://example.org"},
  document:{hidden:false,addEventListener(type,fn){listeners.set(type,fn)}},
  requestAnimationFrame(cb){now+=8;setImmediate(cb)}
 };
 const context={window,performance:perf,URL,Map,Set,Promise,Date,Number};
 vm.runInNewContext(source,context);
 return {window,emit(type,entries){const cb=observers.get(type);assert.ok(cb,type);cb({getEntries:()=>entries})},advance(ms){now+=ms},listeners};
}
test("collects first paint and layout shifts without recent-input shifts",()=>{
 const m=create();
 m.emit("paint",[{name:"first-contentful-paint",startTime:240}]);
 m.emit("largest-contentful-paint",[{startTime:620}]);
 m.emit("layout-shift",[{value:0.12,hadRecentInput:false},{value:0.25,hadRecentInput:true}]);
 const data=m.window.PICKLEUP_METRICS.collect();
 assert.equal(data.initial.fcp,240);
 assert.equal(data.initial.lcp,620);
 assert.equal(data.initial.cls,0.12);
});
test("tracks route timing and module completion, without claiming LCP for SPA route",async()=>{
 const m=create();
 const promise=Promise.resolve({scripts:3});
 m.window.PICKLEUP_METRICS.trackRoute("academy",promise);
 await new Promise(resolve=>setImmediate(()=>setImmediate(resolve)));
 const r=m.window.PICKLEUP_METRICS.collect().routes[0];
 assert.equal(r.page,"academy");
 assert.equal(r.newScripts,3);
 assert.equal(r.completed,true);
 assert.ok(r.paintMs>=r.loadedMs);
 assert.equal(m.window.PICKLEUP_METRICS.collect().initial.lcp,null);
});
test("resource summary counts same-origin assets only",()=>{
 const m=create(),out=m.window.PICKLEUP_METRICS.reportResourceSummary();
 assert.equal(out.requests,1);assert.equal(out.transferBytes,1024);assert.equal(out.decodedBytes,2048);
});
test("observer errors degrade to unsupported metrics",()=>{
 const context={window:{performance:{timeOrigin:0,now(){return 0},getEntriesByType(){return []}},location:{href:"https://example.com/",origin:"https://example.com"},document:{hidden:false,addEventListener(){}},requestAnimationFrame:fn=>fn()},performance:{timeOrigin:0,now(){return 0},getEntriesByType(){return []}},URL,Map,Set,Promise,Date,Number};
 vm.runInNewContext(source,context);
 assert.equal(context.window.PICKLEUP_METRICS.collect().initial.observerSupport.paint,false);
});
