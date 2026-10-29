/* V4.8: explicit manual check-ins, independent from planned or scored days. */
(function(root){
"use strict";
const KEY="pickleup_week_checkins_v48",SCHEMA=1,MAX=1095;
function dayOK(s){if(typeof s!=="string"||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(s))return false;const d=new Date(s+"T00:00:00.000Z");return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s}
function today(now=new Date()){const d=new Date(now);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")}
function entryOK(r){return !!r&&typeof r==="object"&&!Array.isArray(r)&&["done","skipped"].includes(r.status)&&typeof r.updatedAt==="string"&&r.updatedAt.length<=40&&Number.isFinite(Date.parse(r.updatedAt))&&(r.lessonId===null||typeof r.lessonId==="string"&&/^PU-0(?:0[1-9]|[1-7][0-9]|80)$/.test(r.lessonId))&&(r.status==="done"?Number.isInteger(r.minutes)&&r.minutes>=5&&r.minutes<=180:r.minutes===null)}
function valid(d){return !!d&&typeof d==="object"&&!Array.isArray(d)&&d.schemaVersion===SCHEMA&&!!d.entries&&typeof d.entries==="object"&&!Array.isArray(d.entries)&&Object.keys(d.entries).length<=MAX&&Object.entries(d.entries).every(([k,v])=>dayOK(k)&&entryOK(v))}
function empty(){return {schemaVersion:SCHEMA,entries:{}}}
function read(raw){try{const x=JSON.parse(raw||"null");return valid(x)?{schemaVersion:SCHEMA,entries:{...x.entries}}:empty()}catch(_){return empty()}}
function save(storage,data){if(!valid(data))throw Error("Dữ liệu ghi nhận không hợp lệ");storage.setItem(KEY,JSON.stringify(data))}
function change(data,day,status,minutes,lessonId=null,now=new Date()){
 if(!valid(data))throw Error("Dữ liệu không hợp lệ");
 if(!dayOK(day)||day>today(now))throw Error("Không thể ghi nhận cho ngày trong tương lai");
 if(!["done","skipped","clear"].includes(status))throw Error("Trạng thái không hợp lệ");
 const next={schemaVersion:SCHEMA,entries:{...data.entries}};
 if(status==="clear"){delete next.entries[day];return next}
 const row={status,minutes:status==="done"?minutes:null,lessonId:lessonId||null,updatedAt:new Date(now).toISOString()};
 if(!entryOK(row))throw Error("Số phút thực tế phải từ 5 đến 180");
 next.entries[day]=row;
 if(!valid(next))throw Error("Nhật ký đạt giới hạn 1095 ngày; hãy sao lưu trước khi tiếp tục");
 return next;
}
function summary(data,now=new Date()){
 const d=valid(data)?data:empty(),t=today(now),m=new Date(t+"T12:00:00Z");m.setUTCDate(m.getUTCDate()-(m.getUTCDay()+6)%7);
 const weeks=Array.from({length:8},(_,i)=>{
  const a=new Date(m);a.setUTCDate(a.getUTCDate()+(i-7)*7);const start=a.toISOString().slice(0,10);
  a.setUTCDate(a.getUTCDate()+7);const end=a.toISOString().slice(0,10);
  const rows=Object.entries(d.entries).filter(([date])=>date>=start&&date<end&&date<=t).map(([,x])=>x);
  return {start,done:rows.filter(x=>x.status==="done").length,skipped:rows.filter(x=>x.status==="skipped").length,minutes:rows.filter(x=>x.status==="done").reduce((s,x)=>s+x.minutes,0)};
 });
 return {weeks,current:weeks.at(-1)};
}
root.PICKLEUP_WEEK_CHECKINS=Object.freeze({KEY,SCHEMA,MAX,dayOK,entryOK,valid,empty,read,save,change,summary,today});
})(typeof window==="undefined"?globalThis:window);
