/* PickleUp V4.9 — plan versus MANUALLY CONFIRMED activity.
 * Prior weeks have no saved historical goal snapshots. Historical targets are
 * a reference using the CURRENT goal, never a claim about past scheduled plans. */
(function(root){
"use strict";
const CHECKINS=root.PICKLEUP_WEEK_CHECKINS;
function analyze(plan,checkins,now=new Date()){
 if(!CHECKINS||!plan||!Array.isArray(plan.days)||plan.days.length!==7||
  !Number.isInteger(plan.goalDays)||plan.goalDays<1||plan.goalDays>5||
  !Number.isInteger(plan.minutes)||plan.minutes<1)throw Error("Lịch tập không hợp lệ");
 const data=CHECKINS.valid(checkins)?checkins:CHECKINS.empty();
 const currentDay=CHECKINS.today(now);
 const weekly=CHECKINS.summary(data,now);
 const eligible=plan.days.filter(d=>d.kind==="practice"&&d.date<=currentDay);
 const recorded=(d,status)=>d.date<=currentDay&&data.entries[d.date]?.status===status;
 const done=plan.days.filter(d=>recorded(d,"done"));
 const skipped=plan.days.filter(d=>recorded(d,"skipped"));
 const doneOnPlan=eligible.filter(d=>recorded(d,"done")).length;
 const extra=done.filter(d=>d.kind==="rest").length;
 const unconfirmed=eligible.filter(d=>!data.entries[d.date]).length;
 const skippedOnPlan=eligible.filter(d=>recorded(d,"skipped")).length;
 const past=weekly.weeks.slice(-5,-1);
 const evidence=past.filter(w=>w.done+w.skipped>0);
 const meets=evidence.filter(w=>w.done>=plan.goalDays).length;
 const below=evidence.filter(w=>w.done<plan.goalDays).length;
 let advice={code:"insufficient",text:"Chưa đủ dữ liệu xác nhận từ ít nhất 3 tuần đã kết thúc. Hãy tiếp tục ghi nhận thực tế; chưa nên tăng hoặc giảm lịch chỉ vì thiếu dữ liệu."};
 if(evidence.length>=3){
  if(below>=2)advice={code:"lighter",text:plan.goalDays>1
   ?"Trong ít nhất 2 tuần có ghi nhận, số ngày xác nhận thấp hơn mục tiêu hiện tại. Bạn có thể thử giảm 1 ngày tập mỗi tuần hoặc chọn tuần nhẹ, rồi đánh giá lại."
   :"Có nhiều tuần chỉ ghi nhận ít hoạt động. Hãy cân nhắc phiên tập ngắn, dễ thực hiện và ưu tiên hồi phục; không cần tập bù."};
  else if(meets>=3)advice={code:"steady",text:"Trong ít nhất 3 tuần có ghi nhận, số ngày xác nhận đạt mục tiêu hiện tại. Có thể tiếp tục lịch hiện tại và chú ý hồi phục, không cần tăng cường độ tự động."};
  else advice={code:"variable",text:"Số ngày được xác nhận khác nhau giữa các tuần. Hãy giữ lịch linh hoạt, ghi nhận đều hơn và điều chỉnh theo thời gian thực tế."};
 }
 return {
  today:currentDay,weekStart:plan.start,goalDays:plan.goalDays,scheduled:plan.scheduled,
  elapsedScheduled:eligible.length,done:done.length,doneOnPlan,extra,skipped:skipped.length,
  skippedOnPlan,unconfirmed,minutes:weekly.current.minutes,plannedElapsedMinutes:eligible.length*plan.minutes,
  currentGoalProgress:Math.min(100,Math.round(done.length/plan.goalDays*100)),
  weeks:weekly.weeks.map((w,i)=>({...w,current:i===7,hasRecords:w.done+w.skipped>0})),
  comparison:{weeksWithRecords:evidence.length,metReference:meets,belowReference:below,referenceGoal:plan.goalDays},
  advice
 };
}
root.PICKLEUP_PLAN_REALITY=Object.freeze({analyze});
})(typeof window==="undefined"?globalThis:window);
