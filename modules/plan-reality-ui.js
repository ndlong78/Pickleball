/* PickleUp V4.9 — live, read-only plan/actual comparison. */
(function(){
"use strict";
const reality=window.PICKLEUP_PLAN_REALITY,checkins=window.PICKLEUP_WEEK_CHECKINS;
const planner=window.PICKLEUP_WEEKLY_PLANNER,goals=window.PICKLEUP_WEEKLY_GOALS;
const historyCore=window.PICKLEUP_ACADEMY_TRENDS,logCore=window.PICKLEUP_TRAINING_LOG;
const byId=id=>document.getElementById(id);
if(!reality||!checkins||!planner||!goals||!byId("prWeeks"))return;
function json(key,fallback){try{const x=JSON.parse(localStorage.getItem(key)||"null");return x===null?fallback:x}catch(_){return fallback}}
function node(tag,cls,value){const e=document.createElement(tag);if(cls)e.className=cls;e.textContent=String(value);return e}
function redraw(){
 const settings=goals.readSettings(JSON.stringify(json(goals.KEY,null)));
 const prefs=planner.readSettings(JSON.stringify(json(planner.KEY,null)));
 const records=json("pickleup_academy_v2",{});
 const history=historyCore?.readHistory(JSON.stringify(json("pickleup_academy_history_v44",[])))||[];
 const log=(()=>{try{return logCore?.read(localStorage)||[]}catch(_){return []}})();
 const week=planner.buildWeek(window.PICKLEUP_CURRICULUM||[],records,history,log,settings,prefs);
 const actual=checkins.read(JSON.stringify(json(checkins.KEY,null)));
 const r=reality.analyze(week,actual);
 byId("prDone").textContent=r.done+"/"+r.goalDays;
 byId("prOnPlan").textContent=r.doneOnPlan+"/"+r.elapsedScheduled;
 byId("prOffPlan").textContent=String(r.extra);
 byId("prMinutes").textContent=r.minutes+" phút";
 byId("prSummary").textContent="Tuần này: "+r.done+" ngày xác nhận đã tập, "+r.skipped+" ngày đánh dấu bỏ qua. "+r.doneOnPlan+"/"+r.elapsedScheduled+" ngày dự kiến đã đến được xác nhận đã tập; "+r.unconfirmed+" ngày dự kiến chưa ghi nhận. Số phút lịch dự kiến đến hôm nay: "+r.plannedElapsedMinutes+" phút.";
 const progress=byId("prProgress");
 progress.max=r.goalDays;progress.value=Math.min(r.goalDays,r.done);
 progress.setAttribute("aria-label","Ngày xác nhận đã tập trong tuần: "+r.done+" trên mục tiêu hiện tại "+r.goalDays);
 const ol=node("ol","pr-week-list","");
 r.weeks.forEach((w,i)=>{
  const item=node("li","pr-week","");
  const head=node("div","pr-week-heading","");
  const label=node("span","",i===7?"Tuần này":w.start.slice(5).replace("-","/"));
  const value=node("strong","",w.done+" ngày");
  head.append(label,value);
  const bar=node("div","pr-bar","");
  const fill=node("div","pr-fill","");
  fill.style.width=Math.min(100,Math.round(w.done/7*100))+"%";
  bar.append(fill);
  item.append(head,bar,node("span","pr-week-detail",w.hasRecords?(w.minutes+" phút xác nhận · "+w.skipped+" ngày bỏ qua"):"Chưa có xác nhận"));
  item.setAttribute("aria-label","Tuần "+w.start+": "+w.done+" ngày xác nhận; "+(w.hasRecords?w.minutes+" phút":"chưa có xác nhận"));
  ol.append(item);
 });
 byId("prWeeks").replaceChildren(ol);
 byId("prEvidence").textContent="Trong 4 tuần đã kết thúc gần nhất: "+r.comparison.weeksWithRecords+"/4 tuần có ghi nhận. Dùng mục tiêu HIỆN TẠI ("+r.goalDays+" ngày/tuần) để tham chiếu; không có dữ liệu lịch mục tiêu lịch sử, nên đây không phải tỷ lệ hoàn thành kế hoạch cũ.";
 byId("prAdvice").textContent=r.advice.text;
}
byId("prRefresh").addEventListener("click",redraw);
document.addEventListener("pickleup:week-checkins-updated",redraw);
document.addEventListener("pickleup:weekly-plan-rendered",redraw);
document.addEventListener("pickleup:weekly-goal-saved",redraw);
window.addEventListener("storage",event=>{
 if([goals.KEY,planner.KEY,checkins.KEY,"pickleup_academy_history_v44","pickleup_academy_v2","pickleup_training_log_v26"].includes(event.key))redraw();
});
redraw();
})();
