/* PickleUp V4.5 Stable — compare repeat assessments of the SAME lesson.
 * Other lessons at the same stage remain selectable, never mixed in one chart. */
(function(root){
"use strict";
const SKILLS={serve:"Giao bóng",return:"Trả giao bóng",dink:"Dinking",volley:"Volley",position:"Di chuyển",strategy:"Chiến thuật"};
function scoreOK(n){return Number.isInteger(n)&&n>=0&&n<=20}
function gather(lessons,records,history,level,skill){
 const allowed=new Map((Array.isArray(lessons)?lessons:[]).filter(x=>x&&x.level===level&&x.skill===skill).map(x=>[x.id,x]));
 const attempts=(Array.isArray(history)?history:[])
  .filter(a=>a&&allowed.has(a.id)&&a.level===level&&a.skill===skill&&scoreOK(a.score)&&typeof a.date==="string"&&Number.isFinite(Date.parse(a.date)))
  .map((a,i)=>({id:a.id,score:a.score,date:a.date,order:i,lesson:allowed.get(a.id),legacy:false}));
 const recorded=new Set(attempts.map(a=>a.id));
 for(const [id,lesson] of allowed){
  const r=records&&typeof records==="object"?records[id]:null;
  if(!recorded.has(id)&&r&&scoreOK(r.score))
   attempts.push({id,score:r.score,date:typeof r.date==="string"&&Number.isFinite(Date.parse(r.date))?r.date:"1970-01-01T00:00:00.000Z",order:-1,lesson,legacy:true});
 }
 return attempts.sort((a,b)=>Date.parse(a.date)-Date.parse(b.date)||a.order-b.order);
}
function analyze(lessons,records,history,level,skill,lessonId){
 const attempts=gather(lessons,records,history,level,skill);
 const empty={count:0,lessonCount:0,mean:null,delta:null,lesson:null,lessons:[],chart:[],status:"Chưa có kết quả kỹ năng này ở cấp độ đã chọn.",advice:"Hãy luyện một giáo án và lưu bài kiểm tra 20 lượt để có mốc ban đầu."};
 if(!attempts.length)return empty;
 const byLesson=new Map();
 for(const a of attempts){const arr=byLesson.get(a.id)||[];arr.push(a);byLesson.set(a.id,arr)}
 const lessonOptions=[...byLesson.values()].map(group=>({id:group[0].id,lesson:group[0].lesson,count:group.length,lastDate:group.at(-1).date}))
  .sort((a,b)=>a.lesson.week-b.lesson.week||a.id.localeCompare(b.id));
 const repeatable=[...byLesson.values()].filter(group=>group.length>=2)
  .sort((a,b)=>Date.parse(b.at(-1).date)-Date.parse(a.at(-1).date)||b.at(-1).order-a.at(-1).order);
 const autoGroup=repeatable[0]||byLesson.get(attempts.at(-1).id);
 const chosen=byLesson.get(lessonId)||autoGroup;
 const recent=chosen.slice(-12),comparison=chosen.slice(-6),first=comparison[0],last=comparison.at(-1);
 const delta=comparison.length>=2?last.score-first.score:null;
 const mean=recent.reduce((sum,a)=>sum+a.score,0)/recent.length;
 const target=last.lesson;
 let status,advice;
 if(delta===null){
  status="Giáo án “"+target.title+"” mới có một lần kiểm tra; chưa đủ dữ liệu về xu hướng.";
  advice="Tập lại cùng giáo án trong điều kiện tương tự và ghi điểm để so sánh chính xác hơn.";
 }else if(delta<=-3){
  status="Cùng giáo án “"+target.title+"”: giảm "+Math.abs(delta)+" điểm qua "+comparison.length+" lượt gần nhất.";
  advice="Ưu tiên 2 buổi ôn kỹ thuật, giảm độ khó tình huống và kiểm tra lại cùng bài trước khi tăng tốc độ.";
 }else if(delta>=3){
  status="Cùng giáo án “"+target.title+"”: tăng "+delta+" điểm qua "+comparison.length+" lượt gần nhất.";
  advice="Duy trì nhịp tập và tăng dần yêu cầu kiểm soát bóng; chỉ chuyển bài khó hơn khi kết quả ổn định.";
 }else{
  status="Cùng giáo án “"+target.title+"”: biến động "+(delta===0?"0":delta>0?"+"+delta:String(delta))+" điểm qua "+comparison.length+" lượt gần nhất.";
  advice="Giữ bài tập hiện tại, ưu tiên độ chính xác và luyện thêm một lượt trước khi thay đổi độ khó.";
 }
 return {count:attempts.length,lessonCount:chosen.length,mean,delta,lesson:target,lessons:lessonOptions,
  chart:recent.map(a=>({score:a.score,date:a.date,week:a.lesson.week,title:a.lesson.title,id:a.id,legacy:a.legacy})),
  status,advice};
}
root.PICKLEUP_ACADEMY_INSIGHTS=Object.freeze({SKILLS,gather,analyze});
})(typeof window==="undefined"?globalThis:window);
