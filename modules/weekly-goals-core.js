/* PickleUp V4.6 — weekly participation & conservative lesson-level coaching.
 * A "day" means a local calendar day with >=1 saved result, NOT a verified full session. */
(function(root){
"use strict";
const KEY="pickleup_weekly_goal_v46";
const LEVELS=Object.freeze(["1.0–2.0","2.0–2.5","2.5–3.0","3.0–3.5","3.5–4.0"]);
const DEFAULT=Object.freeze({days:3,level:"1.0–2.0"});
const isDate=s=>typeof s==="string"&&s.length<=40&&Number.isFinite(Date.parse(s));
const isScore=n=>Number.isInteger(n)&&n>=0&&n<=20;
function validSettings(s){return !!s&&typeof s==="object"&&!Array.isArray(s)&&Number.isInteger(s.days)&&s.days>=1&&s.days<=5&&LEVELS.includes(s.level)}
function readSettings(raw){
 try{const v=JSON.parse(raw||"null");return validSettings(v)?{days:v.days,level:v.level}:{...DEFAULT}}
 catch(_){return {...DEFAULT}}
}
function saveSettings(storage,settings){
 if(!validSettings(settings))throw Error("Mục tiêu tuần phải từ 1–5 ngày và cấp độ phải hợp lệ.");
 storage.setItem(KEY,JSON.stringify({days:settings.days,level:settings.level}));
 return {days:settings.days,level:settings.level};
}
function localDay(iso){
 if(!isDate(iso))return null;
 const d=new Date(iso);
 return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
}
function monday(day){
 const d=new Date(day+"T12:00:00.000Z");
 if(!Number.isFinite(d.getTime()))return null;
 d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);
 return d.toISOString().slice(0,10);
}
function plusDays(day,n){
 const d=new Date(day+"T12:00:00.000Z");d.setUTCDate(d.getUTCDate()+n);
 return d.toISOString().slice(0,10);
}
function validLessonAttempt(a,byId){
 const x=byId.get(a?.id);
 return x&&a.level===x.level&&a.skill===x.skill&&isScore(a.score)&&isDate(a.date);
}
function collectDates(lessons,academyRecords,academyHistory,trainingLog,now=new Date()){
 const byId=new Map((Array.isArray(lessons)?lessons:[]).filter(x=>x&&typeof x.id==="string").map(x=>[x.id,x]));
 const history=Array.isArray(academyHistory)?academyHistory.filter(a=>validLessonAttempt(a,byId)):[];
 const covered=new Set(history.map(a=>a.id)),times=[];
 for(const a of history)times.push(a.date);
 // A pre-V4.4 latest score is a fallback only for a lesson without full history.
 if(academyRecords&&typeof academyRecords==="object"&&!Array.isArray(academyRecords))
  for(const [id,r] of Object.entries(academyRecords)){
   if(byId.has(id)&&!covered.has(id)&&r&&isScore(r.score)&&isDate(r.date))times.push(r.date);
  }
 if(Array.isArray(trainingLog))for(const a of trainingLog){
  if(a&&isDate(a.date)&&isScore(a.hits)&&a.attempts===20&&["drill","assessment"].includes(a.kind))times.push(a.date);
 }
 const today=localDay(now instanceof Date?now.toISOString():new Date(now).toISOString());
 // Future data can be caused by an incorrect device clock; do not credit it.
 return [...new Set(times.map(localDay).filter(day=>day&&day<=today))].sort();
}
function summarize(lessons,records,history,log,settings,now=new Date()){
 const config=validSettings(settings)?settings:DEFAULT;
 const today=localDay(now instanceof Date?now.toISOString():new Date(now).toISOString());
 const current=monday(today),days=collectDates(lessons,records,history,log,now);
 const daysSet=new Set(days);
 const weeks=Array.from({length:8},(_,i)=>{
  const start=plusDays(current,(i-7)*7);
  const dates=Array.from({length:7},(_,n)=>plusDays(start,n)).filter(day=>daysSet.has(day));
  return {start,end:plusDays(start,6),count:dates.length,days:dates};
 });
 const currentCount=weeks.at(-1).count;
 return {today,currentStart:current,totalDays:weeks.reduce((n,w)=>n+w.count,0),activeWeeks:weeks.filter(w=>w.count>0).length,currentCount,target:config.days,met:currentCount>=config.days,weeks,allRecordedDays:days.length};
}
function recommend(lessons,academyRecords,academyHistory,level){
 const available=(Array.isArray(lessons)?lessons:[]).filter(x=>x&&x.level===level).sort((a,b)=>a.week-b.week);
 if(!available.length)return {lesson:null,reason:"Chưa có giáo án ở cấp độ này.",code:"empty"};
 const grouped=new Map(available.map(x=>[x.id,[]]));
 for(const a of Array.isArray(academyHistory)?academyHistory:[]){
  const x=available.find(l=>l.id===a?.id);
  if(x&&validLessonAttempt(a,new Map([[x.id,x]])))grouped.get(x.id).push(a);
 }
 for(const x of available){
  if(grouped.get(x.id).length)continue;
  const r=academyRecords&&academyRecords[x.id];
  if(r&&isScore(r.score)&&isDate(r.date))grouped.get(x.id).push({id:x.id,skill:x.skill,level:x.level,score:r.score,date:r.date});
 }
 for(const rows of grouped.values())rows.sort((a,b)=>Date.parse(a.date)-Date.parse(b.date));
 const repeated=available.map(x=>({lesson:x,rows:grouped.get(x.id)})).filter(x=>x.rows.length>=2);
 const declining=repeated.filter(x=>x.rows.at(-1).score-x.rows.at(-2).score<=-3)
  .sort((a,b)=>Date.parse(b.rows.at(-1).date)-Date.parse(a.rows.at(-1).date)||a.lesson.week-b.lesson.week);
 if(declining.length)return {lesson:declining[0].lesson,code:"decline",reason:"Kết quả 2 lần gần nhất của cùng giáo án giảm ít nhất 3/20. Nên ôn kỹ thuật với điều kiện kiểm tra tương tự."};
 const below=available.map(x=>({lesson:x,rows:grouped.get(x.id)}))
  .filter(x=>x.rows.length&&isScore(x.lesson.assessment?.target)&&x.rows.at(-1).score<x.lesson.assessment.target)
  .sort((a,b)=>Date.parse(b.rows.at(-1).date)-Date.parse(a.rows.at(-1).date)||a.lesson.week-b.lesson.week);
 if(below.length)return {lesson:below[0].lesson,code:"target",reason:"Lần kiểm tra gần nhất chưa đạt mục tiêu tham khảo của chính giáo án này. Hãy tập lại trước khi tăng độ khó."};
 const next=available.find(x=>grouped.get(x.id).length===0);
 if(next)return {lesson:next,code:"new",reason:"Giáo án này chưa có điểm kiểm tra. Bạn có thể bắt đầu để tạo mốc đánh giá."};
 const oldest=available.map(x=>({lesson:x,rows:grouped.get(x.id)}))
  .sort((a,b)=>Date.parse(a.rows.at(-1).date)-Date.parse(b.rows.at(-1).date)||a.lesson.week-b.lesson.week)[0];
 return {lesson:oldest.lesson,code:"review",reason:"Bạn đã có điểm ở tất cả giáo án trong cấp độ; hãy ôn bài lâu chưa kiểm tra để củng cố kỹ thuật."};
}
root.PICKLEUP_WEEKLY_GOALS=Object.freeze({KEY,LEVELS,DEFAULT,validSettings,readSettings,saveSettings,localDay,monday,collectDates,summarize,recommend});
})(typeof window==="undefined"?globalThis:window);
