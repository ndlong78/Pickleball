/* PickleUp: persistent navigation on phone, tablet and desktop. */
(function(){
"use strict";
function init(){
 const dock=document.getElementById("pickleupMobileDock");
 if(!dock)return;
 const links=Array.from(dock.querySelectorAll('a[href^="#"]'));
 const targets=links.map(link=>({link,id:link.getAttribute("href").slice(1),section:document.getElementById(link.getAttribute("href").slice(1))})).filter(x=>x.section);
 if(!targets.length)return;
 let lastId="";
 function mark(id){
  if(lastId===id)return;
  lastId=id;
  for(const {link,id:target} of targets){
   if(id===target)link.setAttribute("aria-current","location");
   else link.removeAttribute("aria-current");
  }
 }
 function activeByScroll(){
  // Last visible milestone in document order; this works even in the long dashboard area.
  const threshold=Math.min(200,Math.max(90,window.innerHeight*0.33));
  let selected=targets[0].id;
  for(const item of targets){
   if(item.section.getBoundingClientRect().top<=threshold)selected=item.id;
  }
  mark(selected);
 }
 let queued=false;
 function onScroll(){
  if(queued)return;
  queued=true;
  requestAnimationFrame(()=>{queued=false;activeByScroll()});
 }
 dock.addEventListener("click",event=>{
  const anchor=event.target.closest('a[href^="#"]');
  if(anchor)mark(anchor.getAttribute("href").slice(1));
 });
 window.addEventListener("scroll",onScroll,{passive:true});
 window.addEventListener("resize",onScroll,{passive:true});
 window.addEventListener("hashchange",onScroll);
 // Initial position is often restored by Safari after reload.
 requestAnimationFrame(activeByScroll);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);
else init();
})();
