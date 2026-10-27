/* PickleUp V3.5 — opt-in performance diagnostics; no telemetry leaves device. */
(function(){
"use strict";
const loader=window.PICKLEUP_PAGE_LOADER;
if(!loader)return;
const names=Object.fromEntries((window.PICKLEUP_PAGES||[]).map(p=>[p.id,p.icon+" "+p.title]));
function render(){
 const target=document.getElementById("pagePerformance");
 if(!target)return;
 const metrics=loader.readMetrics();
 target.replaceChildren();
 if(!metrics.length){target.textContent="Chưa có kết quả đo. Mở vài trang rồi quay lại mục Dữ liệu.";return}
 const list=document.createElement("div");list.className="performance-grid";
 for(const item of metrics){
  const card=document.createElement("div");card.className="performance-item";
  const title=document.createElement("strong");title.textContent=names[item.page]||item.page;
  const duration=document.createElement("span");duration.textContent=item.ms+" ms";
  const details=document.createElement("small");details.textContent=item.scripts+" module tải thêm · "+item.styles+" stylesheet theo trang";
  card.append(title,duration,details);list.append(card);
 }
 target.append(list);
}
(window.PICKLEUP_READY||function(fn){document.addEventListener("DOMContentLoaded",fn)})(()=>{
 render();
 document.addEventListener("pickleup:page-ready",render);
 document.getElementById("pagePerformanceRefresh")?.addEventListener("click",render);
});
})();
