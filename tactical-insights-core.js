/* PickleUp V3.2 — transparent tactical insights from locally saved sessions.
   Match notes are qualitative signals, never a substitute for measured skill tests. */
(function(root){
"use strict";
const FOCUS={
 "third-drop":"third","third-choice":"third","serve-return":"third",
 "transition-reset":"reset","advanced-reset":"reset","defense-attack":"reset",
 "doubles-coverage":"movement","doubles-switch":"doubles",
 "counter-volley":"counter","kitchen-pressure":"decision","tactical-choice":"decision"
};
const METRICS=["third","reset","movement","counter","doubles","decision"];
const MATCH_KEY="pickleup_match_journal_v3",ATTEMPT_KEY="pickleup_training_log_v26";
function isMatch(m){return !!m&&typeof m==="object"&&typeof m.date==="string"&&Number.isFinite(Date.parse(m.date))&&Object.prototype.hasOwnProperty.call(FOCUS,m.focus)&&["singles","doubles"].includes(m.mode)&&Number.isInteger(m.ours)&&Number.isInteger(m.theirs)}
function isAttempt(r){return !!r&&typeof r==="object"&&r.exerciseId&&/^ADV-PU-0(?:3[7-9]|[4-7][0-9]|80)$/.test(r.exerciseId)&&["3.0–3.5","3.5–4.0"].includes(r.level)&&["drill","assessment"].includes(r.kind)&&Number.isInteger(r.hits)&&r.hits>=0&&r.hits<=20&&typeof r.date==="string"&&Number.isFinite(Date.parse(r.date))}
function analyze(matches=[],attempts=[],level="3.0–3.5"){
 const usable=Array.isArray(matches)?matches.filter(isMatch).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,10):[];
 const votes=Object.fromEntries(METRICS.map(m=>[m,0]));
 for(const match of usable)votes[FOCUS[match.focus]]++;
 const ordered=METRICS.filter(m=>votes[m]>0).sort((a,b)=>votes[b]-votes[a]||METRICS.indexOf(a)-METRICS.indexOf(b));
 const suggested=ordered[0]||null;
 const records=Array.isArray(attempts)?attempts.filter(r=>isAttempt(r)&&r.level===level):[];
 const groups=new Map();
 for(const a of records){
  const key=a.exerciseId+"|"+a.kind;
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key).push(a);
 }
 const comparable=[];
 for(const [key,group] of groups){
  const sorted=group.slice().sort((a,b)=>a.date.localeCompare(b.date)||String(a.id).localeCompare(String(b.id)));
  if(sorted.length<2)continue;
  const first=sorted[0],last=sorted[sorted.length-1];
  comparable.push({exerciseId:first.exerciseId,kind:first.kind,count:sorted.length,first:first.hits,last:last.hits,delta:last.hits-first.hits});
 }
 comparable.sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)||a.exerciseId.localeCompare(b.exerciseId));
 const wins=usable.filter(m=>m.ours>m.theirs).length,losses=usable.filter(m=>m.ours<m.theirs).length;
 return {matchCount:usable.length,wins,losses,unresolved:usable.length-wins-losses,votes,suggested,comparable,attemptCount:records.length,level};
}
function recommend(scores,insight){
 const p=root.PICKLEUP_ADVANCED_COACH;
 if(!p||!p.validScores(scores))return {eligible:false,suggested:null,message:"Nhập đủ sáu điểm kỹ năng để xem đề xuất."};
 if(!insight?.suggested)return {eligible:false,suggested:null,message:"Chưa có nhật ký trận đủ thông tin để gợi ý ưu tiên."};
 const suggestion=insight.suggested;
 const normal=p.priorities(scores);
 return {
  eligible:true,suggested:suggestion,normal,
  counted:insight.votes[suggestion],
  message:"Nhật ký "+insight.matchCount+" trận gần nhất nhắc đến nhóm "+p.names[suggestion]+" "+insight.votes[suggestion]+" lần. Đây chỉ là phản hồi sau trận; bạn tự quyết định có ưu tiên kỹ năng này cho giáo án kế tiếp hay không."
 };
}
function readStorage(storage,key){
 try{const raw=JSON.parse(storage.getItem(key)||"[]");return Array.isArray(raw)?raw:[]}catch(_){return []}
}
function fromStorage(storage,level="3.0–3.5"){return analyze(readStorage(storage,MATCH_KEY),readStorage(storage,ATTEMPT_KEY),level)}
root.PICKLEUP_TACTICAL_INSIGHTS={MATCH_KEY,ATTEMPT_KEY,FOCUS,METRICS,isMatch,isAttempt,analyze,recommend,fromStorage};
})(typeof window==="undefined"?globalThis:window);
