/* PickleUp V4.6 — quick weekly goal and 8-week evidence dashboard. */
(function(){
"use strict";
const core=window.PICKLEUP_WEEKLY_GOALS,lessons=window.PICKLEUP_CURRICULUM||[];
const byId=id=>document.getElementById(id);
if(!core||!byId("wgDays"))return;
const historyCore=window.PICKLEUP_ACADEMY_TRENDS,logCore=window.PICKLEUP_TRAINING_LOG;
const days=byId("wgDays"),level=byId("wgLevel");
const settings=(()=>{try{return core.readSettings(localStorage.getItem(core.KEY))}catch(_){return {...core.DEFAULT}}})();
days.value=String(settings.days);level.value=settings.level;
let recommendation=null;
function readJson(key,fallback){try{const x=JSON.parse(localStorage.getItem(key)||"null");return x===null?fallback:x}catch(_){return fallback}}
function redraw(){
 const saved=(()=>{try{return core.readSettings(localStorage.getItem(core.KEY))}catch(_){return {...core.DEFAULT}}})();
 const history=historyCore?.readHistory(JSON.stringify(readJson("pickleup_academy_history_v44",[])))||[];
 const records=readJson("pickleup_academy_v2",{});
 const log=(()=>{try{return logCore?.read(localStorage)||[]}catch(_){return []}})();
 const report=core.summarize(lessons,records,history,log,saved);
 byId("wgCurrent").textContent=report.currentCount+"/"+report.target;
 byId("wgRecorded").textContent=String(report.totalDays);
 byId("wgActiveWeeks").textContent=report.activeWeeks+"/8";
 byId("wgSummary").textContent=report.met
  ?"Tuần này đã có kết quả ghi nhận trong "+report.currentCount+" ngày. Bạn đã đạt mục tiêu tự đặt."
  :"Tuần này đã có kết quả ghi nhận trong "+report.currentCount+" ngày; mục tiêu là "+report.target+" ngày. Không cần tập bù quá sức.";
 const graph=byId("wgChart"),list=document.createElement("ol");list.className="wg-bars";
 report.weeks.forEach((week,index)=>{
  const item=document.createElement("li");item.className="wg-bar-item";
  const count=document.createElement("strong");count.textContent=String(week.count);
  const bar=document.createElement("div");bar.className="wg-bar";bar.style.height=Math.max(3,week.count/7*100)+"%";
  const caption=document.createElement("span");caption.textContent=index===7?"Tuần này":week.start.slice(5).replace("-","/");
  item.setAttribute("aria-label","Tuần bắt đầu "+week.start+": "+week.count+" ngày có kết quả");
  item.append(count,bar,caption);list.append(item);
 });
 graph.replaceChildren(list);
 recommendation=core.recommend(lessons,records,history,saved.level);
 const link=byId("wgOpen");
 link.hidden=!recommendation.lesson;link.dataset.lessonId=recommendation.lesson?.id||"";
 link.textContent=recommendation.lesson
  ?"Mở tuần "+recommendation.lesson.week+" · "+recommendation.lesson.title:"Chưa có bài để mở";
 byId("wgRecommendation").textContent=recommendation.reason;
}
byId("wgSave").addEventListener("click",()=>{
 try{
  core.saveSettings(localStorage,{days:Number(days.value),level:level.value});
  byId("wgStatus").textContent="Đã lưu mục tiêu trên thiết bị này.";
  redraw();document.dispatchEvent(new Event("pickleup:weekly-goal-saved"));
 }catch(_){byId("wgStatus").textContent="Không lưu được. Kiểm tra quyền lưu trữ và chọn 1–5 ngày mỗi tuần."}
});
byId("wgOpen").addEventListener("click",()=>{
 const id=byId("wgOpen").dataset.lessonId;if(!id)return;
 try{localStorage.setItem("pickleup_academy_last_lesson_v4",id)}catch(_){}
 document.dispatchEvent(new CustomEvent("pickleup:academy-request-lesson",{detail:{id}}));
});
byId("wgRefresh").addEventListener("click",redraw);
document.addEventListener("pickleup:score-saved",redraw);
document.addEventListener("pickleup:training-log-updated",redraw);
window.addEventListener("storage",e=>{if([core.KEY,"pickleup_academy_v2","pickleup_academy_history_v44","pickleup_training_log_v26"].includes(e.key)){if(e.key===core.KEY){const s=core.readSettings(e.newValue);days.value=String(s.days);level.value=s.level}redraw()}});
redraw();
})();
