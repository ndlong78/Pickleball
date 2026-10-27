/* PickleUp V3.4 — URL-addressable page router.
 * All feature modules and their DOM nodes remain mounted, protecting timers and local state.
 * URLs use ?page=... plus optional #section; works on static GitHub Pages and offline PWA. */
(function(root){
"use strict";
const pages=root.PICKLEUP_PAGES||[];
const byId=new Map(pages.map(p=>[p.id,p]));
const sections=new Map(pages.flatMap(p=>p.sections.map(id=>[id,p.id])));
const DEFAULT="home";
const pageParam="page";
let initialized=false,current=null;
function fromLocation(){
 const url=new URL(root.location.href);
 const id=decodeURIComponent(url.hash.slice(1));
 if(id&&sections.has(id))return {page:sections.get(id),section:id};
 const query=url.searchParams.get(pageParam);
 return {page:byId.has(query)?query:DEFAULT,section:null};
}
function hrefFor(page,section){
 const url=new URL(root.location.href);
 url.searchParams.set(pageParam,byId.has(page)?page:DEFAULT);
 url.hash=section?"#"+encodeURIComponent(section):"";
 return url.pathname+url.search+url.hash;
}
function render(page){
 const p=byId.get(page)||byId.get(DEFAULT);
 current=p.id;
 document.documentElement.dataset.pickleupPage=p.id;
 for(const x of document.querySelectorAll("[data-pickleup-page]")){
  const visible=x.getAttribute("data-pickleup-page")===p.id;
  if(visible)x.setAttribute("data-page-current","");
  else x.removeAttribute("data-page-current");
 }
 const heading=document.getElementById("pageHeading");
 const lead=document.getElementById("pageDescription");
 const kicker=document.getElementById("pageKicker");
 if(heading)heading.textContent=p.icon+" "+p.title;
 if(lead)lead.textContent=p.description;
 if(kicker)kicker.textContent="PICKLEUP · "+(pages.findIndex(x=>x.id===p.id)+1)+"/"+pages.length;
 for(const a of document.querySelectorAll("#pageNavigation a[data-route], #pickleupMobileDock a")){
  const target=a.dataset.route||sections.get((a.getAttribute("href")||"").replace(/^#/,""));
  if(target===p.id)a.setAttribute("aria-current","page");
  else a.removeAttribute("aria-current");
 }
 document.title=p.title+" | PickleUp";
 document.dispatchEvent(new CustomEvent("pickleup:route-change",{detail:{page:p.id}}));
}
function scrollToSection(section){
 if(!section){root.scrollTo({top:0,behavior:"auto"});return}
 const item=document.getElementById(section);
 if(!item||item.getAttribute("data-pickleup-page")!==current)return;
 const top=Math.max(0,item.getBoundingClientRect().top+root.scrollY-18);
 root.scrollTo({top,behavior:"auto"});
}
function openPage(page,section=null,replace=false){
 if(!byId.has(page))page=DEFAULT;
 if(section&&sections.get(section)!==page)section=null;
 const next=hrefFor(page,section);
 const method=replace?"replaceState":"pushState";
 const path=root.location.pathname+root.location.search+root.location.hash;
 if(next!==path)root.history[method]({pickleupPage:page},"",next);
 render(page);
 root.requestAnimationFrame(()=>scrollToSection(section));
}
function openSection(section){
 const page=sections.get(section);
 if(!page)return false;
 openPage(page,section,false);
 return true;
}
function onClick(event){
 if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.altKey||event.shiftKey)return;
 const a=event.target.closest?.("a[href]");
 if(!a||a.hasAttribute("download")||a.target&&a.target!=="_self")return;
 const url=new URL(a.href,root.location.href);
 if(url.origin!==root.location.origin||url.pathname!==root.location.pathname)return;
 const id=url.hash?decodeURIComponent(url.hash.slice(1)):null;
 const page=id&&sections.has(id)?sections.get(id):url.searchParams.get(pageParam);
 if(!byId.has(page))return;
 event.preventDefault();
 openPage(page,id&&sections.has(id)?id:null);
}
function restore(){
 const route=fromLocation();
 const url=new URL(root.location.href);
 // Canonicalize old #section bookmarks into the new shareable page URL.
 if(url.searchParams.get(pageParam)!==route.page)root.history.replaceState({pickleupPage:route.page},"",hrefFor(route.page,route.section));
 render(route.page);
 root.requestAnimationFrame(()=>scrollToSection(route.section));
}
function init(){
 if(initialized)return;initialized=true;
 if(!pages.length)return;
 const missing=pages.flatMap(p=>p.sections.filter(id=>!document.getElementById(id)));
 if(missing.length)root.console?.warn?.("PickleUp: page sections not present:",missing);
 document.addEventListener("click",onClick,true);
 root.addEventListener("popstate",restore);
 root.addEventListener("hashchange",restore);
 restore();
}
root.PICKLEUP_ROUTER={pages,openPage,openSection,getPage:()=>current,sectionPage:id=>sections.get(id)||null,hrefFor};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);
else init();
})(window);
