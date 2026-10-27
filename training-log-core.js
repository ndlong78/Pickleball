/* PickleUp V2.6: append-only training attempts, local-only storage.
   Comparisons intentionally require the same exercise ID, stage and test type. */
(function(root){
"use strict";
const KEY="pickleup_training_log_v26",MAX=1000;
const skills=["serve","return","dink","volley","position","strategy"],levels=["1.0–2.0","2.0–2.5","2.5–3.0"];
function isEntry(r){
 return !!r&&typeof r==="object"&&!Array.isArray(r)
 &&typeof r.id==="string"&&r.id.length>0&&r.id.length<=100
 &&typeof r.planId==="string"&&r.planId.length>0&&r.planId.length<=100
 &&typeof r.exerciseId==="string"&&/^(serve|return|dink|volley|position|strategy)-[1-4]$/.test(r.exerciseId)
 &&skills.includes(r.skill)&&r.exerciseId.startsWith(r.skill+"-")
 &&levels.includes(r.level)&&["drill","assessment"].includes(r.kind)
 &&Number.isInteger(r.hits)&&r.hits>=0&&r.hits<=20
 &&r.attempts===20&&typeof r.date==="string"&&!Number.isNaN(Date.parse(r.date))
 &&typeof r.note==="string"&&r.note.length<=240;
}
function validateList(input){return Array.isArray(input)&&input.length<=MAX&&input.every(isEntry)}
function build(input,date=new Date().toISOString(),id){
 const item={id:id||("PU26-"+String(Date.now())+"-"+Math.random().toString(36).slice(2,10)),
 planId:String(input?.planId||""),exerciseId:String(input?.exerciseId||""),
 skill:String(input?.skill||""),level:String(input?.level||""),
 kind:input?.kind||"drill",hits:Number(input?.hits),attempts:20,
 date,note:String(input?.note||"").trim().slice(0,240)};
 if(!isEntry(item))throw Error("Kết quả không hợp lệ. Nhập số nguyên từ 0 đến 20 và chọn đúng bài tập.");
 return item;
}
function append(records,item){
 if(!Array.isArray(records)||records.some(r=>!isEntry(r))||!isEntry(item))throw Error("Nhật ký không hợp lệ.");
 if(records.some(r=>r.id===item.id))throw Error("Mã lần tập bị trùng.");
 // Retain the latest 1000 attempts (approx. several years of weekly practice).
 return records.concat(item).slice(-MAX);
}
function read(storage){
 try{const rows=JSON.parse(storage.getItem(KEY)||"[]");return validateList(rows)?rows:[]}catch(_){return []}
}
function record(storage,input){
 const item=build(input),next=append(read(storage),item);
 storage.setItem(KEY,JSON.stringify(next));return item;
}
function matching(rows,{skill,exerciseId,level,kind="drill"}){
 return rows.filter(r=>r.skill===skill&&r.exerciseId===exerciseId&&r.level===level&&r.kind===kind)
 .slice().sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
}
function compare(rows,filter){
 const group=matching(rows,filter);
 if(group.length<2)return {comparable:false,count:group.length,delta:null,first:null,last:null};
 return {comparable:true,count:group.length,first:group[0].hits,last:group[group.length-1].hits,delta:group[group.length-1].hits-group[0].hits};
}
root.PICKLEUP_TRAINING_LOG={KEY,MAX,skills,levels,isEntry,validateList,build,append,read,record,matching,compare};
})(typeof window==="undefined"?globalThis:window);
