/* PickleUp V3.5 - load each page's feature modules once, on demand.
 * Keep every section mounted; do not reset active clocks or localStorage when routing.
 * Scripts are inserted in dependency order, with page-specific CSS loaded on demand. */
(function(root){
"use strict";
const PAGE_FILES={
 home:["modules/weekly-practice.js"],
 coach:["curriculum.js","advanced-curriculum.js","modules/academy-trends-core.js","personalized-core.js","practice-conditions.js","training-log-core.js","advanced-coach-core.js","modules/assessments-and-backup.js","advanced-readiness.js","personalized-ui.js","advanced-coach-ui.js"],
 court:["modules/weekly-practice.js","curriculum.js","advanced-curriculum.js","personalized-core.js","practice-conditions.js","training-log-core.js","practice-clock.js","practice-diagrams.js","advanced-diagrams.js","advanced-coach-core.js","practice-runner.js"],
 academy:["curriculum.js","advanced-curriculum.js","modules/academy-trends-core.js","advanced-diagrams.js","court-diagrams.js","modules/assessments-and-backup.js","modules/academy-page.js"],
 progress:["modules/weekly-practice.js","curriculum.js","advanced-curriculum.js","personalized-core.js","practice-conditions.js","training-log-core.js","dashboard.js","stage-assessment.js","training-history-ui.js","training-evaluation-core.js","training-evaluation-ui.js"],
 matches:["curriculum.js","advanced-curriculum.js","practice-conditions.js","advanced-coach-core.js","tactical-insights-core.js","match-journal.js","tactical-insights-ui.js"],
 settings:["modules/weekly-practice.js","modules/academy-trends-core.js","practice-conditions.js","training-log-core.js","advanced-coach-core.js","advanced-readiness.js","match-journal.js","modules/assessments-and-backup.js","modules/page-performance.js"]
};
const PAGE_STYLES={
 coach:["advanced.css"],
 court:["training-evaluation.css"],
 academy:["advanced.css"],
 progress:["advanced.css","training-evaluation.css"],
 matches:["advanced.css","tactical-insights.css"]
};
const FRAGMENTS={coach:"pages/coach.html",court:"pages/court.html",academy:"pages/academy.html",progress:"pages/progress.html",matches:"pages/matches.html",settings:"pages/settings.html"};
const fragmentPromises=new Map();
const mountedFragments=new Set();
function ensureMarkup(page){
 const file=FRAGMENTS[page];
 if(!file)return Promise.resolve({file:null,bytes:0,sections:0,cached:true});
 if(mountedFragments.has(page))return Promise.resolve({file,bytes:0,sections:0,cached:true});
 if(fragmentPromises.has(page))return fragmentPromises.get(page);
 const promise=(async()=>{
  const mount=document.getElementById("mount-"+page);
  if(!mount)throw Error("Thiếu vùng chứa giao diện: "+page);
  const response=await fetch(assetUrl(file));
  if(!response.ok)throw Error("Không tải được giao diện "+page+" (HTTP "+response.status+")");
  const content=await response.text();
  const template=document.createElement("template");
  template.innerHTML=content;
  const list=template.content.querySelectorAll("section[data-pickleup-page]");
  const expected=(root.PICKLEUP_PAGES||[]).find(x=>x.id===page)?.sections||[];
  const dynamic=expected.filter(id=>!document.getElementById(id));
  if(list.length!==dynamic.length||dynamic.some(id=>!template.content.querySelector('section[id="'+id+'"][data-pickleup-page="'+page+'"]')))
   throw Error("Giao diện "+page+" không khớp danh mục module.");
  // Static same-origin fragments contain markup only; never execute scripts.
  if(template.content.querySelector("script"))throw Error("Trang module không được chứa script.");
  mount.replaceChildren(template.content);
  const current=root.PICKLEUP_ROUTER?.getPage()===page;
  for(const element of mount.querySelectorAll("[data-pickleup-page]")){
   if(current)element.setAttribute("data-page-current","");
   else element.removeAttribute("data-page-current");
  }
  mountedFragments.add(page);
  const detail={page,file,bytes:typeof Blob==="function"?new Blob([content]).size:content.length,sections:list.length,cached:false};
  document.dispatchEvent(new CustomEvent("pickleup:fragment-ready",{detail}));
  return detail;
 })().catch(err=>{fragmentPromises.delete(page);throw err});
 fragmentPromises.set(page,promise);
 return promise;
}
const version=root.PICKLEUP_BUILD||"";
function assetUrl(file){return "./"+file+(version?"?v="+encodeURIComponent(version):"")}
let pendingSelectedPlan=null;
document.addEventListener("pickleup:plan-selected",event=>{
 pendingSelectedPlan=event.detail?.plan||null;
});
const loadedScripts=new Set();
const loadedStyles=new Set();
const promises=new Map();
const timings=new Map();
let pipeline=Promise.resolve(),initial=false;
function ready(fn){
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",fn,{once:true});
 else fn();
}
function loadStyle(file){
 if(loadedStyles.has(file))return Promise.resolve();
 loadedStyles.add(file);
 return new Promise((resolve,reject)=>{
  const link=document.createElement("link");
  link.rel="stylesheet";link.href=assetUrl(file);
  link.addEventListener("load",resolve,{once:true});
  link.addEventListener("error",()=>{loadedStyles.delete(file);reject(new Error("CSS không tải được: "+file))},{once:true});
  document.head.appendChild(link);
 });
}
function loadScript(file){
 if(loadedScripts.has(file))return Promise.resolve(false);
 return new Promise((resolve,reject)=>{
  const el=document.createElement("script");
  el.src=assetUrl(file);
  el.async=false;
  el.addEventListener("load",()=>{loadedScripts.add(file);resolve(true)},{once:true});
  el.addEventListener("error",()=>{el.remove();reject(new Error("Module không tải được: "+file))},{once:true});
  document.body.appendChild(el);
 });
}
function prefetch(files){
 // Preload only the requested page's scripts, not the whole application.
 // Network fetches may overlap; ordered script execution keeps dependencies safe.
 for(const file of files){
  if(loadedScripts.has(file))continue;
  if(document.querySelector('link[data-pu-preload="'+file+'"]'))continue;
  const link=document.createElement("link");
  link.rel="preload";link.as="script";link.href=assetUrl(file);
  link.dataset.puPreload=file;
  document.head.appendChild(link);
 }
}
function loading(flag,message){
 const status=document.getElementById("pageLoadStatus");
 if(!status)return;
 status.hidden=!flag;
 status.textContent=flag?message:"";
}
function ensure(page){
 if(!Object.prototype.hasOwnProperty.call(PAGE_FILES,page))return Promise.reject(new Error("Trang không tồn tại: "+page));
 if(promises.has(page))return promises.get(page);
 const files=PAGE_FILES[page],styles=PAGE_STYLES[page]||[];
 const start=performance.now();
 prefetch(files);
 const promise=pipeline.then(async()=>{
  if(root.PICKLEUP_ROUTER?.getPage()===page)loading(true,"Đang mở "+((root.PICKLEUP_PAGES||[]).find(x=>x.id===page)?.title||"trang")+"…");
  const css=styles.map(loadStyle);
  const fragment=await ensureMarkup(page);
  let scripts=0;
  for(const file of files)if(await loadScript(file))scripts++;
  await Promise.all(css);
  // Coach may dispatch plan-selected before the on-court module exists.
  // Replay the latest selection after its event listener is installed.
  if(page==="court"&&pendingSelectedPlan)
   document.dispatchEvent(new CustomEvent("pickleup:plan-selected",{detail:{plan:pendingSelectedPlan}}));
  const info={page,ms:Math.round(performance.now()-start),scripts,styles:styles.length,htmlBytes:fragment.bytes,htmlSections:fragment.sections,at:new Date().toISOString()};
  timings.set(page,info);
  document.dispatchEvent(new CustomEvent("pickleup:page-ready",{detail:info}));
  if(root.PICKLEUP_ROUTER?.getPage()===page)loading(false);
  return info;
 }).catch(err=>{
  promises.delete(page);
  if(root.PICKLEUP_ROUTER?.getPage()===page)loading(true,"Không tải được nội dung. Kiểm tra kết nối mạng và tải lại trang.");
  console.error("PickleUp module load error",page,err);
  throw err;
 });
 promises.set(page,promise);
 pipeline=promise.catch(()=>{});
 return promise;
}
function readMetrics(){return [...timings.values()].map(x=>({...x}))}
function isLoaded(file){return loadedScripts.has(file)}
root.PICKLEUP_READY=ready;
root.PICKLEUP_PAGE_LOADER={ensure,ensureMarkup,PAGE_FILES,PAGE_STYLES,FRAGMENTS,readMetrics,isLoaded,hasMarkup:page=>mountedFragments.has(page)};
})(window);
