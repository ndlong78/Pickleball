/* Run: node --test tests/page-loader.test.js */
const test=require("node:test"),assert=require("node:assert/strict");
const vm=require("node:vm"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"..");
const loaderSource=fs.readFileSync(path.join(root,"modules/page-loader.js"),"utf8");
const catalogSource=fs.readFileSync(path.join(root,"modules/page-catalog.js"),"utf8");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const staticIds=new Set([...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]));
function mock(version=""){
 const scripts=[],styles=[],fetches=[],preloads=new Set(),nodes=new Map();
 const status={hidden:true,textContent:""};
 const mounts=new Map();
 for(const page of ["coach","court","academy","progress","matches","settings"]){
  mounts.set(page,{parts:[],replaceChildren(content){
   this.parts=content.sections.map(s=>{const e={setAttribute(){},removeAttribute(){}};nodes.set(s.id,e);return e});
  },querySelectorAll(){return this.parts}});
 }
 function template(){
  let sections=[],source="";
  const content={
   get sections(){return sections},
   querySelectorAll(selector){return selector==="section[data-pickleup-page]"?sections:[]},
   querySelector(selector){
    if(selector==="script")return source.includes("<script")?{}:null;
    return sections.some(s=>selector.includes('id="'+s.id+'"')&&selector.includes('data-pickleup-page="'+s.page+'"'))?{}:null;
   }
  };
  const t={content};
  Object.defineProperty(t,"innerHTML",{set(raw){
   source=raw;
   sections=[...source.matchAll(/<section[^>]+id="([^"]+)"[^>]+data-pickleup-page="([^"]+)"/g)].map(m=>({id:m[1],page:m[2]}))
  }});
  return t;
 }
 const document={
  readyState:"complete",
  createElement(tag){
   if(tag==="template")return template();
   return {tag,dataset:{},events:{},addEventListener(name,fn){this.events[name]=fn},remove(){},
    set rel(v){this._rel=v},get rel(){return this._rel}}
  },
  getElementById(id){
   if(id==="pageLoadStatus")return status;
   if(id.startsWith("mount-"))return mounts.get(id.slice(6))||null;
   return nodes.get(id)||(staticIds.has(id)?{}:null)
  },
  querySelector(selector){return selector.startsWith('link[data-pu-preload="')&&preloads.has(selector.split('"')[1])?{}:null},
  head:{appendChild(el){
   if(el._rel==="preload")preloads.add(el.dataset.puPreload);
   else{styles.push(el.href);setImmediate(()=>el.events.load())}
  }},
  body:{appendChild(el){
   scripts.push(el.src);
   if(el.src.includes("personalized-ui.js"))assert.ok(nodes.has("personalCoach"));
   if(el.src.includes("match-journal.js"))assert.ok(nodes.has("matchJournal"));
   setImmediate(()=>el.events.load())
  }},
  dispatchEvent(){},addEventListener(){}
 };
 const window={PICKLEUP_BUILD:version,PICKLEUP_ROUTER:{getPage:()=>"home"}};
 const context={
  window,document,performance:{now:()=>Date.now()},
  CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail}},
  fetch:async url=>{
   fetches.push(url);
   const file=path.resolve(root,url.replace("./","").split("?")[0]);
   return {ok:true,text:async()=>fs.readFileSync(file,"utf8")};
  },console,Promise,Date,Map,Set,Error
 };
 vm.runInNewContext(catalogSource,context);
 vm.runInNewContext(loaderSource,context);
 return {window,scripts,styles,fetches,nodes,mounts,status};
}
test("Home starts with one module and no HTML fragments",async()=>{
 const x=mock("4.1.0"),l=x.window.PICKLEUP_PAGE_LOADER;
 const info=await l.ensure("home");
 assert.equal(info.scripts,1);assert.equal(info.htmlSections,0);
 assert.equal(x.fetches.length,0);
 assert.deepEqual(x.scripts,["./modules/weekly-practice.js?v=4.1.0"]);
 assert.equal(l.hasMarkup("coach"),false);
 assert.equal(x.styles.length,0);
});
test("direct Coach route hydrates its three sections before scripts",async()=>{
 const x=mock("4.1.0"),l=x.window.PICKLEUP_PAGE_LOADER;
 const info=await l.ensure("coach");
 assert.equal(info.htmlSections,3);
 assert.deepEqual(x.fetches,["./pages/coach.html?v=4.1.0"]);
 for(const name of ["personalCoach","advancedCoach","advancedReadiness"])assert.ok(x.nodes.has(name));
 assert.ok(x.styles.includes("./advanced.css?v=4.1.0"));
});
test("navigation reuses markup and shared JS/CSS",async()=>{
 const x=mock("4.1.0"),l=x.window.PICKLEUP_PAGE_LOADER;
 await l.ensure("academy");await l.ensure("coach");
 await l.ensure("academy");await l.ensure("progress");
 assert.equal(x.fetches.filter(v=>v.includes("academy.html")).length,1);
 assert.equal(x.scripts.filter(v=>v.includes("advanced-curriculum.js")).length,1);
 assert.equal(x.styles.filter(v=>v.includes("advanced.css")).length,1);
 assert.equal(l.hasMarkup("progress"),true);
 assert.equal(l.hasMarkup("matches"),false);
});
test("Court and Matches independently hydrate their forms",async()=>{
 const x=mock("4.1.0"),l=x.window.PICKLEUP_PAGE_LOADER;
 await l.ensure("court");
 assert.ok(x.nodes.has("pcOnCourt"));assert.equal(x.nodes.has("matchJournal"),false);
 await l.ensure("matches");
 assert.ok(x.nodes.has("matchJournal"));assert.ok(x.nodes.has("tacticalReport"));
 assert.equal(x.fetches.length,2);
});
test("manifest has seven pages with six on-demand HTML files",()=>{
 const l=mock().window.PICKLEUP_PAGE_LOADER;
 assert.deepEqual(Object.keys(l.PAGE_FILES),["home","coach","court","academy","progress","matches","settings"]);
 assert.equal(Object.keys(l.FRAGMENTS).length,6);
 for(const files of Object.values(l.PAGE_FILES))assert.equal(new Set(files).size,files.length);
});
