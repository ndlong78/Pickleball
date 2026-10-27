/* PickleUp mobile navigation — iOS-safe focus and active section behavior. */
(function(){
"use strict";
function init(){
 const dock=document.getElementById("pickleupMobileDock");
 if(!dock)return;
 const links=Array.from(dock.querySelectorAll('a[href^="#"]'));
 function mark(id){for(const a of links){if(a.getAttribute("href")==="#"+id)a.setAttribute("aria-current","location");else a.removeAttribute("aria-current")}}
 function updateFromHash(){const hash=decodeURIComponent(location.hash.slice(1));if(hash&&links.some(a=>a.hash==="#"+hash))mark(hash)}
 dock.addEventListener("click",event=>{
  const a=event.target.closest('a[href^="#"]');if(a)mark(a.hash.slice(1))
 });
 window.addEventListener("hashchange",updateFromHash);
 updateFromHash();
 if(!location.hash)mark("personalCoach");
 const selectors='input:not([type=checkbox]):not([type=range]), textarea, select, [contenteditable="true"]';
 document.addEventListener("focusin",event=>{
  if(event.target.closest?.(selectors))document.body.classList.add("mobile-keyboard-open");
 });
 document.addEventListener("focusout",()=>{
  // Allow iOS Safari to move focus to another form field before restoring dock.
  setTimeout(()=>{
   const focused=document.activeElement;
   if(!focused||!focused.matches?.(selectors))document.body.classList.remove("mobile-keyboard-open");
  },120);
 });
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);
else init();
})();
