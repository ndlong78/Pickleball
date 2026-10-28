/* PickleUp V3.6 — local performance diagnostics, no upload / telemetry. */
(function(){
"use strict";
const loader=window.PICKLEUP_PAGE_LOADER;
if(!loader)return;
const vitals=window.PICKLEUP_METRICS;
const names=Object.fromEntries((window.PICKLEUP_PAGES||[]).map(p=>[p.id,p.icon+" "+p.title]));
function make(tag,text,cls){
 const e=document.createElement(tag);
 if(text!==undefined)e.textContent=String(text);
 if(cls)e.className=cls;
 return e;
}
function metric(label,value,unit,help){
 const card=make("div",undefined,"performance-item");
 card.append(make("strong",label),make("span",value===null?"—":value+unit));
 if(help)card.append(make("small",help));
 return card;
}
function number(value,precision=0){return Number.isFinite(value)?Number(value.toFixed(precision)):null}
function display(){
 const target=document.getElementById("pagePerformance");
 if(!target)return;
 const metrics=loader.readMetrics();
 target.replaceChildren();
 if(!metrics.length)target.textContent="Chưa có dữ liệu nạp module. Mở một trang rồi trở lại mục Dữ liệu.";
 else{
  const list=make("div",undefined,"performance-grid");
  for(const item of metrics){
   const card=make("div",undefined,"performance-item");
   card.append(make("strong",names[item.page]||item.page));
   card.append(make("span",item.ms+" ms"));
   card.append(make("small",item.scripts+" module tải thêm · "+item.styles+" stylesheet"));
   list.append(card);
  }
  target.append(list);
 }
 if(!vitals)return;
 const measurements=vitals.collect();
 const first=measurements.initial;
 const box=document.getElementById("pageVitals");
 if(box){
  box.replaceChildren(
   metric("FCP",number(first.fcp)," ms","Thời gian xuất hiện nội dung đầu tiên"),
   metric("LCP",number(first.lcp)," ms","Phần tử nội dung lớn nhất của lần mở ứng dụng"),
   metric("CLS",number(first.cls,3),"","Mức dịch chuyển bố cục, không tính khi tương tác"),
   metric("INP ước tính",number(first.inpEstimate)," ms","Độ trễ tương tác quan sát được, không phải điểm INP chứng nhận")
  );
 }
 const routes=document.getElementById("pageRouteMetrics");
 if(routes){
  routes.replaceChildren();
  const latest=measurements.routes.filter(r=>r.completed).slice(-7).reverse();
  if(!latest.length)routes.append(make("p","Chưa có chuyển trang nào được đo xong.","sub"));
  for(const row of latest){
   routes.append(metric(names[row.page]||row.page,number(row.paintMs)," ms",
    "Từ lúc chọn trang đến lần vẽ sau tải module · "+(row.newScripts??0)+" module mới"));
  }
 }
 const resource=document.getElementById("pageResourceStats");
 if(resource){
  const data=vitals.reportResourceSummary();
  resource.textContent="Trong phiên: "+data.requests+" tài nguyên cùng nguồn · "+
   (data.transferBytes?Math.round(data.transferBytes/1024)+" KB chuyển tải quan sát được":"không có số byte mạng đáng tin cậy (cache hoặc trình duyệt không hỗ trợ)")+
   ". Đây là số đo cục bộ, không gửi lên máy chủ.";
 }
}
let scheduled=false;
function schedule(){
 if(scheduled)return;scheduled=true;
 requestAnimationFrame(()=>{scheduled=false;display()});
}
(window.PICKLEUP_READY||function(fn){document.addEventListener("DOMContentLoaded",fn)})(()=>{
 display();
 document.addEventListener("pickleup:page-ready",schedule);
 document.getElementById("pagePerformanceRefresh")?.addEventListener("click",display);
 vitals?.subscribe(schedule);
});
})();
