/* PickleUp V3.1 — adaptive 3.0–4.0 plan selection.
 * Does not modify the 1.0–3.0 planner or any existing training records. */
(function(root){
"use strict";
const KEY="pickleup_advanced_plans_v31";
const categories=[
{key:"third",name:"Third-shot drop",foci:["third-drop","third-choice"]},
{key:"reset",name:"Reset & transition",foci:["transition-reset","advanced-reset","defense-attack"]},
{key:"movement",name:"Di chuyển chuyển tiếp",foci:["transition-reset","doubles-coverage","advanced-reset","doubles-switch"]},
{key:"counter",name:"Counter volley",foci:["counter-volley","kitchen-pressure"]},
{key:"doubles",name:"Phối hợp đánh đôi",foci:["doubles-coverage","doubles-switch"]},
{key:"decision",name:"Quyết định chiến thuật",foci:["tactical-choice","third-choice","defense-attack","kitchen-pressure"]}
];
const levels=["3.0–3.5","3.5–4.0"];
const names=Object.fromEntries(categories.map(x=>[x.key,x.name]));
function validScores(values){
 return !!values&&typeof values==="object"&&categories.every(c=>Number.isInteger(values[c.key])&&values[c.key]>=0&&values[c.key]<=20);
}
function priorities(values){if(!validScores(values))return [];return categories.map(c=>c.key).sort((a,b)=>values[a]-values[b]||categories.findIndex(c=>c.key===a)-categories.findIndex(c=>c.key===b)).slice(0,3)}
function validPlan(p){
 if(!p||p.version!=="3.1"||!levels.includes(p.level)||typeof p.id!=="string"||p.id.length>100||typeof p.createdAt!=="string"||!Number.isFinite(Date.parse(p.createdAt))||!validScores(p.scores)||!Array.isArray(p.exercises)||p.exercises.length!==3||!p.checkpoint||!names[p.checkpoint.skill])return false;
 if(p.exercises.some(e=>!e||!/^ADV-PU-0(?:3[7-9]|[4-7][0-9]|80)$/.test(e.id)||typeof e.skill!=="string"||!names[e.metric]||typeof e.name!=="string"||typeof e.instructions!=="string"||![12,15].includes(e.minutes)||typeof e.setup!=="string"||e.setup.length>1000||e.instructions.length>1800))return false;
 if(p.exercises.map(e=>e.minutes).join(",")!=="12,12,15")return false;
 if(!Number.isInteger(p.checkpoint.baseline)||p.checkpoint.baseline<0||p.checkpoint.baseline>20||!Number.isInteger(p.checkpoint.target)||p.checkpoint.target<0||p.checkpoint.target>20)return false;
 if(p.checkScore!==null&&p.checkScore!==undefined&&(!Number.isInteger(p.checkScore)||p.checkScore<0||p.checkScore>20))return false;
 return p.completedAt===null||p.completedAt===undefined||typeof p.completedAt==="string"&&Number.isFinite(Date.parse(p.completedAt));
}
function validateList(value){return Array.isArray(value)&&value.length<=100&&value.every(validPlan)}
function createPlan(values,previous=[],level="3.0–3.5",createdAt=new Date().toISOString(),curriculum=root.PICKLEUP_ADVANCED_CURRICULUM||[]){
 if(!validScores(values))throw Error("Cần đủ sáu kết quả nguyên từ 0 đến 20.");
 if(!levels.includes(level))throw Error("Chọn nhóm 3.0–3.5 hoặc 3.5–4.0.");
 if(!Array.isArray(previous))throw Error("Lịch sử giáo án không hợp lệ.");
 const recent=previous.filter(p=>validPlan(p)).slice(-100);
 const weak=priorities(values),used=new Set();
 const exercises=weak.map((metric,i)=>{
  const cat=categories.find(c=>c.key===metric);
  const candidates=curriculum.filter(x=>x.level===level&&cat.foci.includes(x.focus)&&!used.has(x.id));
  if(!candidates.length)throw Error("Không tìm thấy bài tập nâng cao phù hợp.");
  const ordered=candidates.slice().sort((a,b)=>{
   const rank=s=>{for(let j=recent.length-1;j>=0;j--){if(recent[j].exercises.some(e=>e.id==="ADV-"+s.id&&e.metric===metric))return j}return -1};
   return rank(a)-rank(b)||cat.foci.indexOf(a.focus)-cat.foci.indexOf(b.focus)||a.week-b.week;
  });
  const selected=ordered[0];used.add(selected.id);
  const chosen=selected.drills[i];
  return {
   id:"ADV-"+selected.id,week:selected.week,advanced:true,focus:selected.focus,metric,
   skill:selected.skill,skillName:cat.name,name:selected.title,setup:selected.setup,
   instructions:chosen.instruction,measure:selected.assessment.instruction,
   mistake:selected.mistakes.join(" · "),minutes:[12,12,15][i],
   baseline:values[metric],target:Math.min(20,values[metric]+(values[metric]<=10?4:values[metric]<=14?3:2))
  };
 });
 const plan={
  id:"PU31-"+createdAt.replace(/[^0-9]/g,"").slice(0,17)+"-"+(recent.length+1),
  version:"3.1",createdAt,level,scores:{...values},exercises,
  checkpoint:{skill:weak[0],baseline:values[weak[0]],target:exercises[0].target,attempts:20},
  minutes:{warmup:10,drills:[12,12,15],assessment:6,cooldown:5},
  completedAt:null,checkScore:null
 };
 if(!validPlan(plan))throw Error("Không tạo được giáo án hợp lệ.");
 return plan;
}
root.PICKLEUP_ADVANCED_COACH={KEY,categories,levels,names,validScores,priorities,createPlan,validPlan,validateList};
root.PICKLEUP_VALIDATE_ADVANCED_PLANS=validateList;
})(typeof window==="undefined"?globalThis:window);
