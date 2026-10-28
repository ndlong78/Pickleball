/* PickleUp V4.4: bounded Academy assessment history and transparent, level-aware suggestions. */
(function(root){
"use strict";
const LIMIT=500;
function validAttempt(a){
 return Boolean(a&&typeof a==="object"&&/^PU-0(?:0[1-9]|[1-7][0-9]|80)$/.test(a.id)&&
  /^[a-z][a-z-]{0,39}$/.test(a.skill||"")&&typeof a.level==="string"&&a.level.length<=30&&
  Number.isInteger(a.score)&&a.score>=0&&a.score<=20&&
  typeof a.date==="string"&&a.date.length<=40&&!Number.isNaN(Date.parse(a.date)));
}
function validateHistory(list){return Array.isArray(list)&&list.length<=LIMIT&&list.every(validAttempt)}
function readHistory(raw){
 try{const a=JSON.parse(raw||"[]");return validateHistory(a)?a:[]}catch(_){return []}
}
function append(history,lesson,score,date){
 const attempt={id:lesson.id,skill:lesson.skill,level:lesson.level,score,date};
 if(!validAttempt(attempt))throw Error("Invalid Academy attempt");
 return history.concat(attempt).slice(-LIMIT);
}
function recommend(lessons,records,history,level){
 const available=lessons.filter(x=>level==="all"||x.level===level);
 if(!available.length)return {lesson:null,reason:"Chưa có giáo án phù hợp.",trend:""};
 const valid=history.filter(a=>validAttempt(a)&&available.some(x=>x.id===a.id&&x.skill===a.skill&&x.level===a.level));
 const loggedIds=new Set(valid.map(a=>a.id));
 // One legacy score counts once, only when that lesson has no recorded attempts.
 const legacy=available.filter(x=>!loggedIds.has(x.id)&&Number.isInteger(records[x.id]?.score)&&records[x.id].score>=0&&records[x.id].score<=20)
  .map(x=>({id:x.id,skill:x.skill,level:x.level,score:records[x.id].score,date:records[x.id].date||"1970-01-01T00:00:00.000Z"}));
 const attempts=valid.concat(legacy).map((a,i)=>({...a,order:i})).sort((a,b)=>Date.parse(a.date)-Date.parse(b.date)||a.order-b.order);
 if(!attempts.length)return {lesson:available[0],reason:"Chưa có điểm kiểm tra ở cấp độ này. Hãy bắt đầu để tạo mốc theo dõi.",trend:"Chưa đủ dữ liệu xu hướng."};
 const skills=[...new Set(attempts.map(a=>a.skill))].map(skill=>{
  const recent=attempts.filter(a=>a.skill===skill).slice(-3);
  const average=recent.reduce((sum,a)=>sum+a.score,0)/recent.length;
  return {skill,recent,average,delta:recent.length>=2?recent.at(-1).score-recent[0].score:null};
 }).sort((a,b)=>a.average-b.average||a.recent.at(-1).score-b.recent.at(-1).score);
 const weak=skills[0],last=weak.recent.at(-1),named=available.find(x=>x.skill===weak.skill)||available[0];
 const completed=new Set(available.filter(x=>Number.isInteger(records[x.id]?.score)&&records[x.id].score>=0&&records[x.id].score<=20).map(x=>x.id));
 const lesson=available.find(x=>x.skill===weak.skill&&!completed.has(x.id))||
  available.find(x=>x.id===last.id)||named;
 const trend=weak.delta===null?"Mới có 1 lần đánh giá kỹ năng này; chưa thể tính xu hướng.":
  "Xu hướng "+weak.recent.length+" lượt gần nhất: "+(weak.delta>0?"tăng "+weak.delta:weak.delta<0?"giảm "+Math.abs(weak.delta):"không đổi")+" điểm.";
 return {lesson,reason:"Ưu tiên "+(named.skillName||weak.skill)+": trung bình "+weak.average.toFixed(1)+"/20 trong "+weak.recent.length+" lượt gần nhất (lần mới nhất "+last.score+"/20).",trend};
}
root.PICKLEUP_ACADEMY_TRENDS=Object.freeze({validateHistory,readHistory,append,recommend});
})(typeof window==="undefined"?globalThis:window);
