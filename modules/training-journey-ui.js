/* V5.0 Journey controller: single read-only overview + explicit manual check-in. */
(function(){
"use strict";
const j=window.PICKLEUP_JOURNEY,g=window.PICKLEUP_WEEKLY_GOALS,p=window.PICKLEUP_WEEKLY_PLANNER,c=window.PICKLEUP_WEEK_CHECKINS;
const $=id=>document.getElementById(id),lessons=window.PICKLEUP_CURRICULUM||[];
if(!j||!g||!p||!c||!$("jRefresh"))return;
function raw(key){try{return localStorage.getItem(key)}catch(_){return null}}
function parse(key,fallback){try{const v=JSON.parse(raw(key)||"null");return v===null?fallback:v}catch(_){return fallback}}
function snapshot(){
 const goal=g.readSettings(raw(g.KEY)),prefs=p.readSettings(raw(p.KEY));
 const history=window.PICKLEUP_ACADEMY_TRENDS?.readHistory(JSON.stringify(parse("pickleup_academy_history_v44",[])))||[];
 const plans=parse("pickleup_selected_plan_v31",null);
 const stored=plans?.source==="basic"?parse("pickleup_plans_v24",[]):plans?.source==="advanced"?parse("pickleup_advanced_plans_v31",[]):[];
 const ready=Array.isArray(stored)&&stored.some(x=>x?.id===plans?.id&&Array.isArray(x.exercises)&&x.exercises.length===3);
 let trainingLog=[];try{trainingLog=window.PICKLEUP_TRAINING_LOG?.read(localStorage)||[]}catch(_){}
 return j.build({lessons,goal,planPrefs:prefs,checkins:c.read(raw(c.KEY)),history,records:parse("pickleup_academy_v2",{}),
 trainingLog,stageChecks:parse("pickleup_stage_checks_v23",[]),goalConfigured:g.validSettings(parse(g.KEY,null)),
 selectedLessonId:raw("pickleup_academy_last_lesson_v4"),selectedPersonalPlan:ready});
}
let current=null;
function state(id,heading,desc){
 const box=$(id);box.replaceChildren();
 const strong=document.createElement("strong");strong.textContent=heading;
 const detail=document.createElement("span");detail.textContent=desc;
 box.append(strong,detail);
}
function redraw(){
 current=snapshot();const x=current,lesson=x.lesson,entry=x.todayEntry;
 $("jIntro").textContent="Hôm nay "+x.today+" · "+x.goal.level+" · "+x.target+" ngày tập được đề xuất/tuần. Hành trình lấy từ dữ liệu đang có trên thiết bị này.";
 $("jProgress").textContent=x.doneThisWeek+"/"+x.target;
 $("jMinutes").textContent=x.minutesThisWeek+" phút";
 $("jNext").textContent=x.next.text;
 const post=x.postSession;
 $("jPostSession").hidden=!post;
 if(post){
  $("jPostMinutes").textContent=post.minutes+" phút thực tế hôm nay";
  $("jPostLesson").textContent=post.lesson?"Bài đã ghi nhận: Tuần "+post.lesson.week+" · "+post.lesson.title:"Buổi này chưa ghi nhận giáo án cụ thể.";
  $("jPostWeek").textContent="Tuần này: "+post.done+"/"+post.target+" ngày xác nhận · "+post.weekMinutes+" phút. So với mục tiêu hiện tại.";
  $("jPostAdvice").textContent=post.action.text;
  $("jPostAction").textContent=post.action.label;$("jPostAction").href=post.action.href;
 }
 state("jAssessState",x.hasAssessment?"Đã có mốc đánh giá":"Chưa có bài kiểm tra kỹ năng đầy đủ","Đánh giá sáu kỹ năng là lựa chọn hỗ trợ cá nhân hóa, không phải điều kiện bắt buộc.");
 state("jGoalState",x.goalConfigured?"Mục tiêu: "+x.goal.days+" ngày/tuần":"Đang dùng mục tiêu mặc định","Cấp độ "+x.goal.level+" · "+(x.goalConfigured?"Bạn đã chọn mục tiêu trên thiết bị.":"Chọn mục tiêu để lưu ưu tiên riêng."));
 state("jLessonState",lesson?"Tuần "+lesson.week+" · "+lesson.title:"Chưa có bài phù hợp",lesson?x.recommendationReason:"Hãy chọn cấp độ khác nếu thư viện chưa có giáo án.");
 state("jRunState",x.selectedPersonalPlan?"Có giáo án cá nhân đã chọn":"Tập theo Học viện","Dùng đồng hồ bước tập trong Học viện, hoặc tạo một giáo án cá nhân riêng để dùng đồng hồ Trên sân.");
 state("jCheckinState",entry?.status==="done"?"Đã xác nhận hôm nay · "+entry.minutes+" phút":entry?.status==="skipped"?"Đã ghi bỏ qua hôm nay":"Hôm nay chưa xác nhận","Chỉ xác nhận sau khi thật sự tập; điểm kiểm tra hoặc đồng hồ không tự ghi buổi hoàn thành.");
 state("jReviewState",x.doneThisWeek+" ngày · "+x.minutesThisWeek+" phút thực tế","Xem báo cáo kế hoạch và thực tế, rồi chọn giáo án phù hợp tiếp theo.");
 $("jLessonOpen").hidden=!lesson;
 $("jLessonOpen").dataset.lessonId=lesson?.id||"";
 $("jCourtOpen").href=x.links.court;
 $("jCourtOpen").textContent=x.selectedPersonalPlan?"Mở đồng hồ Trên sân":"Tạo giáo án cho đồng hồ Trên sân";
 $("jTodayMinutes").value=entry?.status==="done"?String(entry.minutes):"30";
 $("jClear").hidden=!entry;
 $("jCheckStatus").textContent=entry?.status==="done"?"Đã lưu "+entry.minutes+" phút tập thực tế hôm nay.":entry?.status==="skipped"?"Hôm nay đã đánh dấu bỏ qua.":"";
}
$("jLessonOpen").addEventListener("click",()=>{
 const id=$("jLessonOpen").dataset.lessonId;if(!id)return;
 try{localStorage.setItem("pickleup_academy_last_lesson_v4",id)}catch(_){}
 document.dispatchEvent(new CustomEvent("pickleup:academy-request-lesson",{detail:{id}}));
});
function checkin(status){
 const minutes=status==="done"?Number($("jTodayMinutes").value):null;
 try{
  const next=c.change(c.read(raw(c.KEY)),c.today(),status,minutes,current?.lesson?.id||null);
  c.save(localStorage,next);redraw();
  $("jCheckStatus").textContent=status==="clear"?"Đã xóa xác nhận hôm nay.":status==="skipped"?"Đã đánh dấu bỏ qua hôm nay.":"Đã ghi nhận "+minutes+" phút tập thực tế hôm nay.";
  document.dispatchEvent(new Event("pickleup:week-checkins-updated"));
 }catch(e){$("jCheckStatus").textContent=e.message||"Không thể ghi nhận; hãy kiểm tra quyền lưu trữ."}
}
$("jDone").addEventListener("click",()=>checkin("done"));
$("jSkipped").addEventListener("click",()=>checkin("skipped"));
$("jClear").addEventListener("click",()=>checkin("clear"));
$("jRefresh").addEventListener("click",redraw);
for(const evt of ["pickleup:score-saved","pickleup:weekly-goal-saved","pickleup:week-checkins-updated","pickleup:training-log-updated","pickleup:route-change"])
 document.addEventListener(evt,redraw);
window.addEventListener("storage",e=>{
 if([g.KEY,p.KEY,c.KEY,"pickleup_academy_v2","pickleup_academy_history_v44","pickleup_academy_last_lesson_v4","pickleup_stage_checks_v23","pickleup_selected_plan_v31"].includes(e.key))redraw();
});
redraw();
for(const id of ["jRefresh","jTodayMinutes","jDone","jSkipped","jClear"])$(id).disabled=false;
})();
