/* Run: node --test tests/page-fragments.test.js */
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"..");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
global.window=globalThis;require("../modules/page-catalog.js");
const pages=window.PICKLEUP_PAGES;
const fragments=["journey","coach","court","academy","progress","matches","settings"];
const ids=source=>[...source.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);
test("initial HTML remains small and contains the fixed bottom navigation",()=>{
 assert.ok(Buffer.byteLength(html,"utf8")<37000,"initial HTML too large");
 assert.ok(html.includes('id="pickleupMobileDock"'));
 assert.ok(html.includes('id="pageNavigation"'));
 assert.ok(html.includes('id="homeHero"'));
 for(const page of fragments)assert.ok(html.includes('id="mount-'+page+'"'),page);
});
test("each functional module belongs to exactly one HTML source",()=>{
 const sources=[html,...fragments.map(p=>fs.readFileSync(path.join(root,"pages",p+".html"),"utf8"))];
 const allIds=sources.flatMap(ids);
 assert.equal(new Set(allIds).size,allIds.length,"duplicate HTML ids across fragments");
 for(const page of pages){
  for(const id of page.sections){
   const count=sources.filter(src=>src.includes('id="'+id+'"')).length;
   assert.equal(count,1,id+" appears in "+count+" documents");
  }
 }
});
test("each fragment contains only markup for its own functional page",()=>{
 for(const page of fragments){
  const content=fs.readFileSync(path.join(root,"pages",page+".html"),"utf8");
  assert.ok(content.includes('data-pickleup-page="'+page+'"'));
  assert.ok(!/<script/i.test(content),page);
  const names=[...content.matchAll(/<section[^>]*data-pickleup-page="([^"]+)"/g)].map(m=>m[1]);
  assert.ok(names.length>0,page);
  assert.ok(names.every(name=>name===page),page);
 }
});
test("Home has no HTML fragment and unused modules stay outside initial HTML",()=>{
 assert.ok(!fs.existsSync(path.join(root,"pages","home.html")));
 for(const id of ["personalCoach","pcOnCourt","academy","dashboard","matchJournal"]){
  assert.ok(!html.includes('id="'+id+'"'),id);
 }
});
