/* PickleUp V4.6 — quick weekly goal and 8-week evidence dashboard. */
(function(){
"use strict";
const core=window.PICKLEUP_WEEKLY_GOALS,lessons=window.PICKLEUP_CURRICULUM||[];
const byId=id=>document.getElementById(id);
if(!core||!byId("wgDays"))return;
const historyCore=window.PICKLEUP_ACADEMY_TRENDS,logCore=window.PICKLEUP_TRAINING_LOG;
const days=byId("wgDays"),level=byId("wgLevel"),data=window.PICKLEUP_DATA;
const goalRaw=()=>data?data.raw(core.KEY):localStorage.getItem(core.KEY);
let editRevision='0',sourceTag='',dirty=false;
for(const input of [days,level])input.addEventListener('change',()=>{dirty=true});
function hydrate(){const state=data?.getView(),tag=state?state.owner+':'+state.mode:'guest',changed=tag!==sourceTag;
 if(changed||!dirty){const saved=core.readSettings(goalRaw());days.value=String(saved.days);level.value=saved.level;editRevision=data?.revision('user_preferences','self')||'0';dirty=false}if(changed)byId('wgStatus').textContent='';sourceTag=tag;
 byId('wgRefresh').textContent=data?.isAccount()?'Đọc lại mục tiêu':'Làm mới';
 byId('wgSave').textContent=data?.deleted('user_preferences','self')?'Khôi phục mục tiêu':'Lưu mục tiêu';
 for(const id of ['wgDays','wgLevel','wgSave'])byId(id).disabled=data?!data.canWrite('user_preferences','self'):false;
}
const settings=(()=>{try{return core.readSettings(goalRaw())}catch(_){return {...core.DEFAULT}}})();
days.value=String(settings.days);level.value=settings.level;
let recommendation=null;
function readJson(key,fallback){try{const x=JSON.parse(localStorage.getItem(key)||"null");return x===null?fallback:x}catch(_){return fallback}}
function redraw(){
 const saved=(()=>{try{return core.readSettings(goalRaw())}catch(_){return {...core.DEFAULT}}})();
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
byId("wgSave").addEventListener("click",async()=>{
 const stamp=sourceTag;
 try{
  if(data?.isAccount())await data.savePreferences({target_days:Number(days.value),level_band:level.value,goal_configured:true},editRevision,{restore:data.deleted('user_preferences','self')});
  else core.saveSettings(localStorage,{days:Number(days.value),level:level.value});
  if(stamp!==sourceTag)return;dirty=false;hydrate();
  byId("wgStatus").textContent=data?.isAccount()?"Đã lưu trong kho tài khoản trên thiết bị · chờ đồng bộ.":"Đã lưu mục tiêu trên thiết bị này.";
  redraw();document.dispatchEvent(new Event("pickleup:weekly-goal-saved"));
 }catch(_){if(stamp===sourceTag)byId("wgStatus").textContent="Không lưu được. Kiểm tra nguồn dữ liệu, xung đột và quyền lưu trữ; lựa chọn cần 1–5 ngày mỗi tuần."}
});
byId("wgOpen").addEventListener("click",()=>{
 const id=byId("wgOpen").dataset.lessonId;if(!id)return;
 try{localStorage.setItem("pickleup_academy_last_lesson_v4",id)}catch(_){}
 document.dispatchEvent(new CustomEvent("pickleup:academy-request-lesson",{detail:{id}}));
});
byId("wgRefresh").addEventListener("click",()=>{if(data?.isAccount()){dirty=false;hydrate()}redraw()});
document.addEventListener("pickleup:score-saved",redraw);
document.addEventListener("pickleup:training-log-updated",redraw);
window.addEventListener("storage",e=>{if([core.KEY,"pickleup_academy_v2","pickleup_academy_history_v44","pickleup_training_log_v26"].includes(e.key)){if(e.key===core.KEY&&!data?.isAccount()){dirty=false;hydrate()}redraw()}});
document.addEventListener("pickleup:domain-data",()=>{hydrate();redraw()});
hydrate();redraw();
// Markup is mounted before lazy scripts execute. Only allow edits after hydration
// and handler registration, so initialization cannot overwrite an early selection.
byId("wgRefresh").disabled=false;hydrate();
})();
