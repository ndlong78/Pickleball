/* V4.7 weekly plan UI. Dynamic text uses textContent, never injected HTML. */
(function(){
"use strict";
const planner=window.PICKLEUP_WEEKLY_PLANNER,goals=window.PICKLEUP_WEEKLY_GOALS;
const historyCore=window.PICKLEUP_ACADEMY_TRENDS,logCore=window.PICKLEUP_TRAINING_LOG;
const lessons=window.PICKLEUP_CURRICULUM||[],el=id=>document.getElementById(id);
if(!planner||!goals||!el("wpMinutes"))return;
const minutes=el("wpMinutes"),gentle=el("wpGentle");
function json(key,fallback){
 try{const v=JSON.parse(localStorage.getItem(key)||"null");return v===null?fallback:v}catch(_){return fallback}
}
function storedPlan(){try{return planner.readSettings(localStorage.getItem(planner.KEY))}catch(_){return {...planner.DEFAULT}}}
function storedGoal(){try{return goals.readSettings(localStorage.getItem(goals.KEY))}catch(_){return {...goals.DEFAULT}}}
function textNode(tag,cl,value){const n=document.createElement(tag);if(cl)n.className=cl;n.textContent=String(value);return n}
function draw(){
 const config=storedPlan(),target=storedGoal();
 const records=json("pickleup_academy_v2",{});
 const history=historyCore?.readHistory(JSON.stringify(json("pickleup_academy_history_v44",[])))||[];
 const log=(()=>{try{return logCore?.read(localStorage)||[]}catch(_){return []}})();
 const week=planner.buildWeek(lessons,records,history,log,target,config);
 el("wpSummary").textContent="Tuần "+week.start+" đến "+week.end+" · "+week.scheduled+" ngày tập đề xuất, "+week.rest+" ngày hồi phục · "+week.totalMinutes+" phút dự kiến. Cấp độ: "+week.level+".";
 el("wpCaution").textContent=week.gentle
  ?"Đang dùng chế độ nhẹ: tối đa 30 phút/ngày. Nếu mệt hoặc đau, ưu tiên nghỉ và điều chỉnh mục tiêu."
  :week.goalDays>=4?"Tần suất tập nhiều ngày: chủ động điều chỉnh cường độ và nghỉ khi cần, không cố tập bù.":"Phân bổ ngày nghỉ giữa các buổi để hỗ trợ hồi phục.";
 const frag=document.createDocumentFragment();
 for(const day of week.days){
  const card=document.createElement("article");
  card.className="wp-day"+(day.kind==="rest"?" wp-rest":"");card.dataset.date=day.date;
  const heading=textNode("h3","",""+day.day+" · "+day.date.slice(8)+"/"+day.date.slice(5,7));
  card.append(heading);
  if(day.recorded)card.append(textNode("span","wp-recorded","Có kết quả ghi nhận trong ngày"));
  if(day.kind==="rest"){card.append(textNode("p","sub","Ngày hồi phục: đi bộ nhẹ hoặc vận động linh hoạt thoải mái, không bắt buộc luyện kỹ thuật."));}
  else {
   card.append(textNode("strong","wp-duration",day.minutes+" phút · "+(day.skillName||"Luyện cơ bản")));
   if(day.lessonId)card.append(textNode("p","wp-reason","Tuần "+day.lessonWeek+" · "+day.lessonTitle+" — "+day.reason));
   else card.append(textNode("p","sub",day.reason));
   const b=day.blocks;
   card.append(textNode("p","wp-blocks","Khởi động "+b[0]+"′ · Kỹ thuật "+b[1]+"′ · Kiểm tra "+b[2]+"′ · Thả lỏng "+b[3]+"′"));
   if(day.lessonId){
    const a=textNode("a","wp-open","Mở bài tập trong Học viện");
    a.href="?page=academy";a.dataset.lessonId=day.lessonId;
    card.append(a);
   }
  }
  frag.append(card);
 }
 el("wpDays").replaceChildren(frag);document.dispatchEvent(new Event("pickleup:weekly-plan-rendered"));
}
const original=storedPlan();minutes.value=String(original.minutes);gentle.checked=original.gentle;
el("wpSave").addEventListener("click",()=>{
 try{
  planner.saveSettings(localStorage,{minutes:Number(minutes.value),gentle:gentle.checked});
  el("wpStatus").textContent="Đã lưu tùy chọn lịch tập trên thiết bị này.";draw();
 }catch(_){el("wpStatus").textContent="Không lưu được lịch tập; vui lòng kiểm tra quyền lưu trữ."}
});
el("wpRefresh").addEventListener("click",draw);
el("wpDays").addEventListener("click",event=>{
 const a=event.target.closest?.("a[data-lesson-id]");if(!a)return;
 try{localStorage.setItem("pickleup_academy_last_lesson_v4",a.dataset.lessonId)}catch(_){}
});
document.addEventListener("pickleup:score-saved",draw);
document.addEventListener("pickleup:training-log-updated",draw);
document.addEventListener("pickleup:weekly-goal-saved",draw);
window.addEventListener("storage",event=>{
 if([planner.KEY,goals.KEY,"pickleup_academy_v2","pickleup_academy_history_v44","pickleup_training_log_v26"].includes(event.key)){
  if(event.key===planner.KEY){const s=storedPlan();minutes.value=String(s.minutes);gentle.checked=s.gentle}
  draw();
 }
});
draw();
})();
