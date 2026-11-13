/* PickleUp V5.19 — pure progressive-disclosure model for one Academy lesson.
   No DOM or storage: the UI decides markup, this decides what shows first. */
(function(root){
'use strict';
// Short, rule-book level reminders tied to the lesson skill. Reference only;
// local tournament rules can differ, so the UI keeps the wording advisory.
const RULES={
 serve:{title:'Luật giao bóng cần nhớ',items:[
  'Giao bóng chéo sân, bóng phải qua khỏi vùng Kitchen; bóng chạm vạch Kitchen là lỗi.',
  'Cú giao volley: vợt chạm bóng dưới thắt lưng, đầu vợt không cao hơn cổ tay.',
  'Luật hai lần nảy: bên nhận để bóng nảy, rồi bên giao cũng để cú trả nảy trước khi được volley.'
 ]},
 return:{title:'Luật trả giao bóng cần nhớ',items:[
  'Luật hai lần nảy: phải để bóng giao nảy trước khi trả.',
  'Trả sâu rồi tiến lên vạch Kitchen; bên giao chưa được volley cú trả của bạn.'
 ]},
 dink:{title:'Luật Kitchen (vùng cấm volley) cần nhớ',items:[
  'Được bước vào Kitchen để đánh bóng đã nảy.',
  'Không volley khi bất kỳ phần nào của chân chạm Kitchen hoặc vạch Kitchen.'
 ]},
 volley:{title:'Luật Kitchen (vùng cấm volley) cần nhớ',items:[
  'Không volley khi chân chạm Kitchen hoặc vạch Kitchen.',
  'Đà người đưa bạn vào Kitchen sau cú volley vẫn tính là lỗi, kể cả khi bóng đã chết.'
 ]},
 position:{title:'Luật vị trí cần nhớ',items:[
  'Đánh đôi: đứng đúng ô giao/nhận theo điểm số của đội.',
  'Khi lên lưới, giữ chân ngoài Kitchen trước mỗi cú volley.'
 ]},
 strategy:{title:'Cách gọi điểm cần nhớ',items:[
  'Đánh đôi gọi 3 số: điểm đội giao – điểm đội nhận – người giao 1 hoặc 2. Ván bắt đầu 0-0-2.',
  'Đánh đơn gọi 2 số: điểm người giao – điểm người nhận.'
 ]}
};
const BEGINNER=/^(1\.0|2\.0)/;
function ruleHint(lesson){
 const rule=lesson&&RULES[lesson.skill];
 if(!rule)return null;
 // Beginners see the reminder expanded; 2.5+ keep it one tap away.
 return {title:rule.title,items:rule.items.slice(),open:BEGINNER.test(String(lesson.level||''))};
}
function minutes(lesson){
 const drills=Array.isArray(lesson?.drills)?lesson.drills.reduce((sum,d)=>sum+(Number(d.minutes)||0),0):0;
 const total=(Number(lesson?.warmup)||10)+drills+(Number(lesson?.testMinutes)||6)+(Number(lesson?.cooldown)||5);
 return Number.isFinite(total)&&total>0?total:60;
}
function summary(lesson){
 if(!lesson)return null;
 return {
  cues:(Array.isArray(lesson.cues)?lesson.cues:[]).slice(0,3),
  mistakes:Array.isArray(lesson.mistakes)?lesson.mistakes.slice():[],
  minutes:minutes(lesson),
  parts:(Array.isArray(lesson.drills)?lesson.drills.length:0)+3,
  rule:ruleHint(lesson)
 };
}
const api=Object.freeze({RULES,ruleHint,minutes,summary});
root.PICKLEUP_ACADEMY_LESSON=api;
if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
