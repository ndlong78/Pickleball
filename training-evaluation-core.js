/* PickleUp V3.3 — context-matched performance evaluation.
   Descriptive only; differences are not proof of causal improvement or rating. */
(function(root){
"use strict";
const cond=root.PICKLEUP_PRACTICE_CONDITIONS;
const VALID_LEVELS=["1.0–2.0","2.0–2.5","2.5–3.0","3.0–3.5","3.5–4.0"];
function evaluate(attempts=[],level="3.0–3.5"){
 if(!VALID_LEVELS.includes(level))throw Error("Cấp độ không hợp lệ.");
 const log=root.PICKLEUP_TRAINING_LOG;
 const rows=Array.isArray(attempts)&&log?attempts.filter(r=>log.isEntry(r)&&r.level===level):[];
 const measured=rows.filter(r=>cond.valid(r.conditions)),unknown=rows.length-measured.length;
 const groups=new Map();
 for(const r of measured){
  const context=cond.signature(r.conditions),key=[r.exerciseId,r.level,r.kind,context].join("::");
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key).push(r);
 }
 const comparable=[];
 for(const row of groups.values()){
  row.sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
  if(row.length<2)continue;
  const first=row[0],last=row[row.length-1];
  comparable.push({exerciseId:first.exerciseId,level:first.level,kind:first.kind,
   conditions:first.conditions,conditionsKey:cond.signature(first.conditions),
   count:row.length,first:first.hits,last:last.hits,delta:last.hits-first.hits,
   initialDate:first.date,finalDate:last.date});
 }
 comparable.sort((a,b)=>b.count-a.count||a.exerciseId.localeCompare(b.exerciseId));
 return {level,total:rows.length,measured:measured.length,unknown,comparable,
  groups:groups.size,improved:comparable.filter(g=>g.delta>0).length,
  unchanged:comparable.filter(g=>g.delta===0).length,declined:comparable.filter(g=>g.delta<0).length};
}
function doubles(matches=[]){
 const opts=cond.DOUBLES;
 const all=Array.isArray(matches)?matches.filter(m=>m&&m.mode==="doubles"&&typeof m.date==="string"&&Number.isFinite(Date.parse(m.date))).slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,20):[];
 const counts=Object.fromEntries(Object.keys(opts).map(k=>[k,0]));
 let documented=0;
 for(const m of all){if(Object.prototype.hasOwnProperty.call(opts,m.doublesIssue)){counts[m.doublesIssue]++;documented++}}
 const top=Object.keys(opts).filter(k=>k!=="none"&&counts[k]>0).sort((a,b)=>counts[b]-counts[a]||Object.keys(opts).indexOf(a)-Object.keys(opts).indexOf(b));
 return {total:all.length,documented,unclassified:all.length-documented,counts,top:top[0]||null};
}
root.PICKLEUP_EVALUATION={VALID_LEVELS,evaluate,doubles};
})(typeof window==="undefined"?globalThis:window);
