/* PickleUp 2.2 dashboard — local-only analytics, no external libraries. */
(function(){
"use strict";
const names={serve:"Giao bóng",return:"Trả giao bóng",dink:"Dinking",volley:"Volley",position:"Di chuyển",strategy:"Chiến thuật"};
const keys=Object.keys(names),sessions=window.PICKLEUP_CURRICULUM||[];
const byId=Object.fromEntries(sessions.map(s=>[s.id,s]));
const $=id=>document.getElementById(id);
function read(key){try{const data=JSON.parse(localStorage.getItem(key)||"{}");return data&&typeof data==="object"&&!Array.isArray(data)?data:{}}catch(_){return {}}}
function entries(){
 const academy=Object.entries(read("pickleup_academy_v2")).map(([id,r])=>({id,r,s:byId[id]})).filter(({r,s})=>s&&r&&Number.isInteger(r.score)&&r.score>=0&&r.score<=20&&typeof r.date==="string");
 const legacy=Object.entries(read("pickleup_scores")).map(([id,r])=>({id,r,s:sessions[Number(id)]})).filter(({id,r,s})=>/^[0-5]$/.test(id)&&s&&r&&Number.isInteger(r.score)&&r.score>=0&&r.score<=20&&typeof r.date==="string");
 // Prefer academy results when a matching first-six-week lesson has both formats.
 const newer=new Set(academy.map(x=>x.s.week));
 return academy.concat(legacy.filter(x=>!newer.has(x.s.week))).sort((a,b)=>a.s.week-b.s.week);
}
function node(tag,cls,content){const x=document.createElement(tag);if(cls)x.className=cls;if(content!==undefined)x.textContent=String(content);return x}
function draw(){
 const data=entries(),count=data.length,mean=count?Math.round(data.reduce((n,x)=>n+x.r.score,0)/count*5):null;
 $("dbCompleted").textContent=count+"/36";$("dbAverage").textContent=mean===null?"—":mean+"%";
 $("dbProgress").style.width=(count/36*100)+"%";
 const skills=$("dbSkills");skills.replaceChildren();
 const sums={};
 keys.forEach(k=>sums[k]=data.filter(x=>x.s.skill===k));
 let weakest=null,weakScore=101;
 keys.forEach(k=>{
  const a=sums[k],avg=a.length?Math.round(a.reduce((n,x)=>n+x.r.score,0)/a.length*5):null;
  const line=node("div","db-skill");const heading=node("div","db-skill-head");
  heading.append(node("span","",names[k]),node("strong","",avg===null?"Chưa có dữ liệu":avg+"% · "+a.length+" buổi"));
  const bar=node("div","db-bar");const fill=node("div","db-fill");fill.style.width=(avg??0)+"%";bar.append(fill);line.append(heading,bar);skills.append(line);
  if(avg!==null&&avg<weakScore){weakScore=avg;weakest=k}
 });
 const note=$("dbRecommendation");
 if(!count){note.textContent="Chưa có dữ liệu luyện tập. Hãy hoàn thành bài kiểm tra cuối buổi và lưu kết quả trong Học viện."; }
 else{const candidates=sessions.filter(s=>s.skill===weakest&&!data.some(x=>x.s.id===s.id));const target=candidates[0];note.textContent="Kỹ năng có tỷ lệ đạt mục tiêu thấp nhất trong dữ liệu hiện tại: "+names[weakest]+". "+(target?"Gợi ý bài tiếp theo: tuần "+target.week+" – "+target.title+".":"Bạn đã ghi nhận tất cả các bài thuộc kỹ năng này.")+" Tỷ lệ ở các bài có độ khó khác nhau không phản ánh trực tiếp trình độ thực tế.";}
 const trend=$("dbTrend");trend.replaceChildren();
 if(!count){trend.append(node("p","sub","Lưu kết quả ít nhất một buổi để xem lịch sử tiến bộ."));}
 else{
  const scroll=node("div","db-trend-scroll");const chart=node("div","db-chart");
  data.forEach(x=>{const col=node("div","db-column");const val=node("strong","",x.r.score*5+"%");const bar=node("div","db-vbar");bar.style.height=Math.max(2,x.r.score*5)+"%";bar.title="Tuần "+x.s.week+": "+x.r.score+"/20";const label=node("span","","T"+x.s.week);col.append(val,bar,label);chart.append(col)});
  scroll.append(chart);trend.append(scroll);
  const legend=node("p","sub","Mỗi cột là kết quả gần nhất đã lưu của một tuần giáo án; không phải biểu đồ nhiều lần tập trong cùng một tuần.");trend.append(legend);
 }
 const latest=$("dbLast");if(count){const q=data[data.length-1];latest.textContent="Buổi gần nhất trong lộ trình có dữ liệu: tuần "+q.s.week+" · "+q.r.score+"/20."}else latest.textContent="Chưa có buổi tập được ghi nhận.";
}
document.addEventListener("DOMContentLoaded",()=>{
if(!$("dbSkills"))return;
draw();
window.addEventListener("storage",e=>{if(["pickleup_scores","pickleup_academy_v2"].includes(e.key))draw()});
document.addEventListener("pickleup:score-saved",draw);
$("dbRefresh").addEventListener("click",draw);
});
})();
