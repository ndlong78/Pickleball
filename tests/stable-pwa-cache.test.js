const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const source=fs.readFileSync(path.resolve(__dirname,"../sw.js"),"utf8");
function setup(){
 const callbacks=new Map(),stores=new Map();let network=0;
 const cache={async match(req){return stores.get(typeof req==="string"?req:req.url)},async put(req,res){stores.set(typeof req==="string"?req:req.url,res)}};
 const self={location:{origin:"https://example.org"},addEventListener(t,fn){callbacks.set(t,fn)},skipWaiting:async()=>{},clients:{claim:async()=>{}}};
 const caches={open:async()=>cache,match:async req=>cache.match(req),keys:async()=>[],delete:async()=>true};
 const fetch=async()=>{network++;return {ok:true,clone(){return this}}};
 vm.runInNewContext(source,{self,caches,fetch,URL,Response:{error:()=>({ok:false})},Promise});
 return{callbacks,stores,get network(){return network}};
}
test("stable PWA defines a release-specific cache",()=>{
 assert.match(source,/pickleup-shell-v4-5-beta/);
 assert.match(source,/v=4\.5\.0/);
});
test("cached static assets are not fetched or overwritten in the background",async()=>{
 const env=setup();
 const url="https://example.org/modules/page-router.js?v=4.5.0";
 const cached={ok:true,sentinel:"cached"},req={method:"GET",url,mode:"same-origin"};
 env.stores.set(url,cached);
 let response;
 env.callbacks.get("fetch")({request:req,respondWith(p){response=p}});
 assert.equal(await response,cached);
 assert.equal(env.network,0);
});
test("uncached same-origin assets are fetched once and cached",async()=>{
 const env=setup();let response;
 const url="https://example.org/pages/court.html?v=4.5.0";
 env.callbacks.get("fetch")({request:{method:"GET",url,mode:"same-origin"},respondWith(p){response=p}});
 assert.equal((await response).ok,true);
 assert.equal(env.network,1);
 assert.equal(env.stores.has(url),true);
});
