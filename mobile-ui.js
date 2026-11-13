/* PickleUp V5.18 — four primary tabs plus one shared "Thêm" disclosure.
   Page router owns aria-current on route links; this file only owns the
   secondary menu state, so hidden sections never become active on scroll. */
(function(){
"use strict";
function init(){
 const panel=document.getElementById("pageNavMore");
 const toggles=[...document.querySelectorAll("[data-nav-more-toggle]")];
 if(!panel||!toggles.length)return;
 const secondary=new Map([...panel.querySelectorAll("a[data-route]")].map(a=>[a.dataset.route,a.querySelector("strong")?.textContent||a.textContent.trim()]));
 const current=document.querySelector("[data-nav-more-current]");
 let opener=null;
 function setOpen(open,source){
  panel.hidden=!open;
  for(const t of toggles)t.setAttribute("aria-expanded",String(open));
  if(open){
   opener=source||toggles[0];
   // The dock is fixed at the bottom; bring the shared panel into view first.
   if(opener.closest("#pickleupMobileDock"))panel.scrollIntoView({block:"nearest"});
   panel.querySelector('a[aria-current="page"]')?.focus()||panel.querySelector("a")?.focus();
  }
 }
 function close(restoreFocus){
  if(panel.hidden)return;
  setOpen(false);
  if(restoreFocus)opener?.focus();
 }
 for(const t of toggles)t.addEventListener("click",()=>{if(panel.hidden)setOpen(true,t);else close(true)});
 document.addEventListener("keydown",event=>{if(event.key==="Escape"&&!panel.hidden)close(true)});
 document.addEventListener("click",event=>{
  if(panel.hidden||panel.contains(event.target)||toggles.some(t=>t.contains(event.target)))return;
  close(false);
 });
 function update(){
  const page=window.PICKLEUP_ROUTER?.getPage();
  const inMore=secondary.has(page);
  for(const t of toggles){
   if(inMore)t.setAttribute("data-active","");
   else t.removeAttribute("data-active");
  }
  if(current)current.textContent=inMore?secondary.get(page):"";
 }
 // A secondary link hides itself on navigation; return focus to its toggle.
 document.addEventListener("pickleup:route-change",()=>{close(panel.contains(document.activeElement));update()});
 update();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);
else init();
})();
