/* PickleUp V5.0 — pure guided journey. Never infer attendance from timers/scores.
 * No new storage key: existing V2–V4 keys remain the source of truth. */
(function(root){
"use strict";
const GOALS=root.PICKLEUP_WEEKLY_GOALS,PLAN=root.PICKLEUP_WEEKLY_PLANNER,CHECK=root.PICKLEUP_WEEK_CHECKINS;
const SKILLS=["serve","return","dink","volley","position","strategy"];
const validScores=x=>x&&typeof x==="object"&&SKILLS.every(k=>Number.isInteger(x[k])&&x[k]>=0&&x[k]<=20);
function build({lessons=[],goal=null,planPrefs=null,checkins=null,history=[],records={},trainingLog=[],stageChecks=[],goalConfigured=false,selectedLessonId=null,selectedPersonalPlan=false,now=new Date()}={}){
 if(!GOALS||!PLAN||!CHECK)throw Error("Thiếu module nền tảng Hành trình");
 const config=GOALS.validSettings(goal)?goal:GOALS.DEFAULT;
 const prefs=PLAN.validSettings(planPrefs)?planPrefs:PLAN.DEFAULT;
 const library=Array.isArray(lessons)?lessons:[];
 const checks=CHECK.valid(checkins)?checkins:CHECK.empty();
 const date=CHECK.today(now);
 const plan=PLAN.buildWeek(library,records,history,trainingLog,config,prefs,now);
 const todays=plan.days.find(d=>d.date===date)||null;
 const todayEntry=checks.entries[date]||null;
 const todayDone=todayEntry?.status==="done";
 const current=CHECK.summary(checks,now).current;
 const assessment=Array.isArray(stageChecks)&&stageChecks.some(a=>a&&GOALS.LEVELS.includes(a.level)&&validScores(a.values)&&typeof a.date==="string"&&Number.isFinite(Date.parse(a.date))&&Date.parse(a.date)<=new Date(now).getTime());
 const choice=library.find(x=>x?.id===selectedLessonId&&x.level===config.level);
 const nextScheduled=plan.days.find(d=>d.kind==="practice"&&d.date>=date&&d.lessonId);
 const recommended=GOALS.recommend(library,records,history,config.level);
 const lesson=choice||library.find(x=>x.id===nextScheduled?.lessonId)||recommended.lesson||null;
 const recordedLesson=!!lesson&&(Array.isArray(history)&&history.some(a=>a?.id===lesson.id&&a.level===lesson.level&&a.skill===lesson.skill&&Number.isInteger(a.score)&&a.score>=0&&a.score<=20)
  ||!!(records&&Number.isInteger(records[lesson.id]?.score)&&records[lesson.id].score>=0&&records[lesson.id].score<=20));
 const totalDays=plan.days.filter(d=>d.kind==="practice").length;
 const remaining=plan.days.filter(d=>d.kind==="practice"&&d.date>=date).length;
 let next;
 if(todayDone)next={code:"review",text:"Hôm nay đã xác nhận tập. Xem tóm tắt và chọn bước tiếp theo phù hợp."};
 else if(!goalConfigured)next={code:"goal",text:"Chọn số ngày tập và cấp độ để cá nhân hóa lộ trình."};
 else if(!assessment)next={code:"assess",text:"Bạn có thể đánh giá 6 kỹ năng để tạo mốc khởi đầu; không bắt buộc trước khi tập."};
 else if(!lesson)next={code:"lesson",text:"Chưa tìm được giáo án phù hợp, hãy kiểm tra cấp độ và thư viện Học viện."};
 else next={code:"practice",text:"Mở giáo án đã chọn và tập theo khả năng; chỉ ghi đã tập sau khi thực sự hoàn thành buổi của bạn."};
 // The recorded lesson belongs to the check-in, not the current Academy choice.
 const completedLesson=todayDone?library.find(x=>x?.id===todayEntry.lessonId):null;
 const resultToday=todayDone&&!!completedLesson&&(
  (Array.isArray(history)&&history.some(a=>a?.id===completedLesson.id&&a.level===completedLesson.level&&a.skill===completedLesson.skill&&Number.isInteger(a.score)&&a.score>=0&&a.score<=20&&GOALS.localDay(a.date)===date))||
  (records&&Number.isInteger(records[completedLesson.id]?.score)&&records[completedLesson.id].score>=0&&records[completedLesson.id].score<=20&&GOALS.localDay(records[completedLesson.id].date)===date));
 const future=plan.days.find(d=>d.kind==="practice"&&d.date>date&&d.lessonId);
 const action=current.done>=config.days||prefs.gentle||todayEntry?.minutes>=60
  ?{code:"rest",label:"Xem nhịp tập và nghỉ ngơi",href:"?page=progress#weeklyReality",text:"Ưu tiên thả lỏng và hồi phục. Nếu đau hoặc mệt, hãy giảm cường độ; không cần tập bù."}
  :resultToday?{code:"results",label:"Xem kết quả kiểm tra",href:"?page=progress#academyInsights",text:"Bạn có kết quả của bài này hôm nay. Xem lại trong cùng bài và cấp độ; điểm không phải DUPR."}
  :{code:"prepare",label:"Chuẩn bị buổi kế tiếp",href:"?page=progress#weeklyPlanner",text:future?"Buổi đề xuất kế tiếp: "+future.date+" · "+future.lessonTitle+". Chỉ chuẩn bị khi đã hồi phục.":"Xem lịch và chọn giáo án cho tuần kế tiếp khi đã hồi phục; không cần tập thêm hôm nay."};
 const postSession=todayDone?{minutes:todayEntry.minutes,lesson:completedLesson||null,done:current.done,target:config.days,weekMinutes:current.minutes,action}:null;
 return {
  postSession,
  today:date,goal:config,goalConfigured:!!goalConfigured,hasAssessment:!!assessment,
  plan,lesson,lessonScoreRecorded:recordedLesson,selectedPersonalPlan:!!selectedPersonalPlan,
  todayEntry,todayScheduled:todays?.kind==="practice",remainingScheduled:remaining,
  doneThisWeek:current.done,minutesThisWeek:current.minutes,skippedThisWeek:current.skipped,
  target:totalDays,next,recommendationReason:choice?"Bài bạn chọn gần nhất trong Học viện.":recommended.reason,
  links:Object.freeze({assess:"?page=coach#selfAssessment",goals:"?page=progress#weeklyGoals",
   plan:"?page=progress#weeklyPlanner",academy:"?page=academy#academy",
   court:selectedPersonalPlan?"?page=court#pcOnCourt":"?page=coach#personalCoach",
   results:"?page=progress#weeklyReality"})
 };
}
root.PICKLEUP_JOURNEY=Object.freeze({build});
})(typeof window==="undefined"?globalThis:window);
