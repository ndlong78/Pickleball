/* PickleUp V4.7 — deterministic, local-only weekly practice suggestion.
 * A scheduled session is NOT a completed session; saved dates are shown separately. */
(function(root){
"use strict";
const GOALS=root.PICKLEUP_WEEKLY_GOALS;
const KEY="pickleup_week_plan_v47";
const MINUTES=Object.freeze([20,30,45,60]);
const DEFAULT=Object.freeze({minutes:45,gentle:false});
const DAYS=Object.freeze(["Thứ Hai","Thứ Ba","Thứ Tư","Thứ Năm","Thứ Sáu","Thứ Bảy","Chủ nhật"]);
const SPACING=Object.freeze({1:[2],2:[1,4],3:[0,2,5],4:[0,2,4,6],5:[0,1,3,4,6]});
const BLOCKS=Object.freeze({20:[5,10,2,3],30:[5,17,4,4],45:[8,25,6,6],60:[10,39,6,5]});
const validScore=n=>Number.isInteger(n)&&n>=0&&n<=20;
const validDate=s=>typeof s==="string"&&s.length<=40&&Number.isFinite(Date.parse(s));
function validSettings(x){return !!x&&typeof x==="object"&&!Array.isArray(x)&&MINUTES.includes(x.minutes)&&typeof x.gentle==="boolean";}
function readSettings(raw){try{const x=JSON.parse(raw||"null");return validSettings(x)?{minutes:x.minutes,gentle:x.gentle}:{...DEFAULT}}catch(_){return {...DEFAULT}}}
function saveSettings(storage,x){
 if(!validSettings(x))throw Error("Thời lượng hoặc chế độ tập chưa hợp lệ.");
 storage.setItem(KEY,JSON.stringify({minutes:x.minutes,gentle:x.gentle}));
 return {minutes:x.minutes,gentle:x.gentle};
}
function addDay(start,n){const d=new Date(start+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
function rank(lessons,records,history,level,now=new Date()){
 const available=(Array.isArray(lessons)?lessons:[]).filter(l=>l&&l.level===level&&typeof l.id==="string"&&typeof l.skill==="string"&&Number.isInteger(l.week));
 const nowTime=new Date(now).getTime();
 const grouped=new Map(available.map(x=>[x.id,[]]));
 const byId=new Map(available.map(x=>[x.id,x]));
 for(const a of Array.isArray(history)?history:[]){
  const l=byId.get(a?.id);
  if(l&&a.level===l.level&&a.skill===l.skill&&validScore(a.score)&&validDate(a.date)&&Date.parse(a.date)<=nowTime)grouped.get(a.id).push(a);
 }
 for(const l of available){
  const rows=grouped.get(l.id);
  if(rows.length)continue;
  const r=records&&typeof records==="object"&&!Array.isArray(records)?records[l.id]:null;
  if(r&&validScore(r.score)&&validDate(r.date)&&Date.parse(r.date)<=nowTime)rows.push({...r,id:l.id,level:l.level,skill:l.skill});
 }
 return available.map(l=>{
  const rows=grouped.get(l.id).sort((a,b)=>Date.parse(a.date)-Date.parse(b.date));
  const last=rows.at(-1),previous=rows.at(-2),drop=last&&previous?last.score-previous.score:null;
  let priority=1,reason="Chưa có kết quả bài này; bắt đầu ở nhịp độ vừa sức.";
  if(drop!==null&&drop<=-3){priority=4;reason="Ôn kỹ thuật: hai lần kiểm tra gần nhất cùng bài giảm ít nhất 3/20."}
  else if(last&&validScore(l.assessment?.target)&&last.score<l.assessment.target){priority=3;reason="Ôn lại: kết quả gần nhất chưa đạt mốc tham khảo riêng của bài."}
  else if(last){priority=0;reason="Củng cố kỹ thuật đã tập, ưu tiên kiểm soát và sự ổn định."}
  return {lesson:l,priority,reason,latest:last?.date||null};
 }).sort((a,b)=>b.priority-a.priority||a.lesson.week-b.lesson.week||a.lesson.id.localeCompare(b.lesson.id));
}
function buildWeek(lessons,records,history,log,goal,settings,now=new Date()){
 if(!GOALS)throw Error("Weekly goals core must load before planner");
 const config=validSettings(settings)?settings:DEFAULT;
 const target=GOALS.validSettings(goal)?goal:GOALS.DEFAULT;
 const week=GOALS.monday(GOALS.localDay(new Date(now).toISOString()));
 const practiceDays=SPACING[target.days];
 const minutes=config.gentle?Math.min(config.minutes,30):config.minutes;
 const candidates=rank(lessons,records,history,target.level,now);
 const recorded=new Set(GOALS.collectDates(lessons,records,history,log,now));
 const chosenLessons=new Set(),chosenSkills=new Set();
 const dayRows=Array.from({length:7},(_,i)=>({
  date:addDay(week,i),day:DAYS[i],dayIndex:i,kind:practiceDays.includes(i)?"practice":"rest",recorded:recorded.has(addDay(week,i))
 }));
 let count=0;
 for(const day of dayRows){
  if(day.kind!=="practice")continue;
  const selected=candidates.find(c=>!chosenLessons.has(c.lesson.id)&&!chosenSkills.has(c.lesson.skill))
   ||candidates.find(c=>!chosenLessons.has(c.lesson.id))
   ||candidates[count%candidates.length]||null;
  if(selected){
   chosenLessons.add(selected.lesson.id);chosenSkills.add(selected.lesson.skill);
   day.lessonId=selected.lesson.id;day.lessonTitle=selected.lesson.title;
   day.lessonWeek=selected.lesson.week;day.skill=selected.lesson.skill;day.skillName=selected.lesson.skillName||selected.lesson.skill;
   day.reason=selected.reason;
  }else{day.reason="Chưa có giáo án ở cấp độ này. Hãy chọn cấp độ phù hợp trong mục Mục tiêu tuần."}
  day.minutes=minutes;
  day.blocks=BLOCKS[minutes].slice();
  count++;
 }
 return {start:week,end:addDay(week,6),goalDays:target.days,level:target.level,minutes,gentle:config.gentle,
  scheduled:practiceDays.length,rest:7-practiceDays.length,totalMinutes:practiceDays.length*minutes,days:dayRows};
}
root.PICKLEUP_WEEKLY_PLANNER=Object.freeze({KEY,MINUTES,DEFAULT,SPACING,validSettings,readSettings,saveSettings,rank,buildWeek});
})(typeof window==="undefined"?globalThis:window);
