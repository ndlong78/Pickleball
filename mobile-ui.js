/* PickleUp V3.4 — mobile controls cooperate with shared page router.
   The fixed four-item dock is rendered in index.html on phone, tablet and desktop. */
(function(){
"use strict";
function init(){
 const dock=document.getElementById("pickleupMobileDock");
 if(!dock)return;
 // Page router owns aria-current, so hidden sections cannot falsely become active on scroll.
 function update(){
  const page=window.PICKLEUP_ROUTER?.getPage();
  if(!page)return;
  const sectionToPage={personalCoach:"coach",pcOnCourt:"court",trainingHistory:"progress",academy:"academy"};
  for(const a of dock.querySelectorAll('a[href^="#"]')){
   const id=a.getAttribute("href").slice(1);
   if(sectionToPage[id]===page)a.setAttribute("aria-current","page");
   else a.removeAttribute("aria-current");
  }
 }
 document.addEventListener("pickleup:route-change",update);
 update();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);
else init();
})();
