/* PR3a: read-only rescue of legacy storage, never Auth/session/IDB or import writes. */
(function(root){
'use strict';
const INVENTORY=[
 ['pickleup_scores','scores','Điểm tuần'],['pickleup_assessment_v1','assessment','Tự đánh giá'],['pickleup_academy_v2','academy','Điểm Học viện gần nhất'],['pickleup_academy_history_v44','academyHistory','Lịch sử Học viện'],['pickleup_stage_checks_v23','stageChecks','Kiểm tra cấp độ'],['pickleup_advanced_checks_v3','advancedChecks','Kiểm tra nâng cao'],['pickleup_plans_v24','personalPlans','Giáo án cơ bản'],['pickleup_advanced_plans_v31','advancedPlans','Giáo án nâng cao'],['pickleup_selected_plan_v31','selectedPlan','Giáo án đã chọn'],['pickleup_practice_state_v25',null,'Đồng hồ trên máy'],['pickleup_training_log_v26','trainingLog','Nhật ký luyện tập'],['pickleup_match_journal_v3','matchJournal','Nhật ký thi đấu'],['pickleup_academy_last_lesson_v4',null,'Bài Học viện gần nhất'],['pickleup_academy_steps_v41',null,'Checklist trên máy'],['pickleup_academy_focus_v42',null,'Bước tập trung trên máy'],['pickleup_weekly_goal_v46','weeklyGoal','Mục tiêu tuần'],['pickleup_week_plan_v47','weeklyPlan','Lịch tập dự kiến'],['pickleup_week_checkins_v48','weeklyCheckins','Check-in thủ công']
].map(([key,field,label])=>Object.freeze({key,field,label}));
const KNOWN=new Set(INVENTORY.map(x=>x.key));
const DEVICE=new Set(['pickleup_practice_state_v25','pickleup_academy_steps_v41','pickleup_academy_focus_v42']);
const MAX_BYTES=32*1024*1024;
const bytes=text=>new TextEncoder().encode(text).length;
class RescueError extends Error{constructor(code){super(code);this.name='RescueError';this.code=code}}
const fail=code=>{throw new RescueError(code)};
const safeKey=key=>typeof key==='string'&&key.startsWith('pickleup_')&&key.length<=160&&!/(auth|session|token|secret|password|credential|supabase|otp)/i.test(key);
function secretContent(text){return /"(?:access_token|refresh_token|service_role|password|otp|client_secret)"\s*:/i.test(text)||/\bsb_secret_[a-z0-9_]+/i.test(text)}
function canonical(value,depth=0){
 if(depth>30)fail('too_complex');
 if(value===null||typeof value==='string'||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value))return JSON.stringify(value);
 if(Array.isArray(value))return '['+Array.from(value,x=>canonical(x,depth+1)).join(',')+']';
 if(value&&Object.getPrototypeOf(value)===Object.prototype)return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key],depth+1)).join(',')+'}';
 fail('invalid_format');
}
async function hash(text){return Array.from(new Uint8Array(await root.crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),v=>v.toString(16).padStart(2,'0')).join('')}
function discover(storage){
 try{
  if(storage.length>4096)fail('too_many_keys');
  const keys=[];let excluded=0;
  for(let i=0;i<storage.length;i++){const key=storage.key(i);if(typeof key==='string'&&key.startsWith('pickleup_')&&!KNOWN.has(key)){if(safeKey(key))keys.push(key);else excluded++}}
  return {unknown:[...new Set(keys)].sort(),excluded};
 }catch(error){if(error instanceof RescueError)throw error;fail('storage_unavailable')}
}
function read(storage,keys){
 try{return keys.map(key=>{const raw=storage.getItem(key);if(raw!==null&&typeof raw!=='string')fail('storage_unavailable');return {key,present:raw!==null,raw}})}catch(error){if(error instanceof RescueError)throw error;fail('storage_unavailable')}
}
async function capture(storage,{unknownKeys=[]}={}){
 if(!Array.isArray(unknownKeys)||unknownKeys.length>128||unknownKeys.some(key=>KNOWN.has(key)||!safeKey(key)))fail('unsafe_key');
 const available=discover(storage).unknown;
 if(unknownKeys.some(key=>!available.includes(key)))fail('source_changed');
 const keys=[...KNOWN,...new Set(unknownKeys)].sort();
 const entries=read(storage,keys),serialized=canonical(entries);
 if(bytes(serialized)>MAX_BYTES-4096)fail('too_large');
 if(entries.some(entry=>entry.raw!==null&&secretContent(entry.raw)))fail('credentials_detected');
 const fingerprint=await hash(serialized);
 // Detect observed changes around hashing; this is not an atomic browser-wide snapshot.
 if(canonical(read(storage,keys))!==serialized)fail('source_changed');
 return {app:'PickleUp',format:'raw-rescue-v1',schemaVersion:1,adapterVersion:1,exportedAt:new Date().toISOString(),fingerprint,entries};
}
function summary(key,value,present=true,rawBytes=0){
 const entry=INVENTORY.find(x=>x.key===key);
 const count=!present?0:Array.isArray(value)?value.length:value&&typeof value==='object'?Object.keys(value).length:value===null?0:1;
 return {key,label:entry?.label||key,status:present?(DEVICE.has(key)?'device_only':entry?'readable':'unknown'):'absent',count,bytes:rawBytes};
}
function rawRows(entries){return entries.map(entry=>{
 if(!entry.present)return summary(entry.key,null,false);
 if(entry.raw==='')return {...summary(entry.key,null),status:'empty',bytes:0};
 try{return summary(entry.key,entry.key==='pickleup_academy_last_lesson_v4'?entry.raw:JSON.parse(entry.raw),true,bytes(entry.raw))}catch(_){return {...summary(entry.key,null),status:'malformed',bytes:bytes(entry.raw)}}
})}
async function preview(text){
 if(typeof text!=='string'||bytes(text)>MAX_BYTES)fail('too_large');
 if(secretContent(text))fail('credentials_detected');
 let data;try{data=JSON.parse(text)}catch(_){fail('invalid_json')}
 if(!data||data.app!=='PickleUp'||Object.getPrototypeOf(data)!==Object.prototype)fail('invalid_format');
 if(Object.keys(data).length>128||Object.keys(data).some(key=>key.length>160))fail('too_complex');
 let format,rows,semantic;
 if(data.format==='raw-rescue-v1'){
  format=data.format;
  if(data.schemaVersion!==1||data.adapterVersion!==1||!Array.isArray(data.entries)||data.entries.length<18||data.entries.length>146)fail('invalid_format');
  const keys=new Set();
  for(const entry of data.entries){
   if(!entry||!safeKey(entry.key)||keys.has(entry.key)||typeof entry.present!=='boolean'||(entry.present?typeof entry.raw!=='string':entry.raw!==null))fail('invalid_format');
   if(entry.raw!==null&&secretContent(entry.raw))fail("credentials_detected");
   keys.add(entry.key);
  }
  if([...KNOWN].some(key=>!keys.has(key)))fail('missing_inventory');
  const sorted=data.entries.map(({key,present,raw})=>({key,present,raw}));
  // Use the same code-point order as capture; locale ordering is not a hash contract.
  sorted.sort((a,b)=>a.key<b.key?-1:a.key>b.key?1:0);
  if(await hash(canonical(sorted))!==data.fingerprint)fail('checksum_mismatch');
  rows=rawRows(sorted);semantic={format,entries:sorted};
 }else if(data.format!==undefined){fail('invalid_format')}
 else if(data.schemaVersion===1&&data.scores&&typeof data.scores==='object'&&!Array.isArray(data.scores)){
  format='backup-v1';rows=INVENTORY.filter(x=>x.field).map(entry=>summary(entry.key,data[entry.field],Object.hasOwn(data,entry.field),Object.hasOwn(data,entry.field)?bytes(canonical(data[entry.field])):0));
  const fields=new Set(['app','schemaVersion','exportedAt',...INVENTORY.map(x=>x.field).filter(Boolean)]);
  for(const key of Object.keys(data).filter(key=>!fields.has(key)))rows.push({key,label:key,status:'unknown',count:1,bytes:bytes(canonical(data[key]))});
  const {exportedAt,...payload}=data;semantic={format,payload};
 }else if(data.schemaVersion===undefined&&Array.isArray(data.records)){
  format='home-records';rows=[{key:'records',label:'Điểm tuần từ Home',status:'readable',count:data.records.length,bytes:bytes(canonical(data.records))}];
  const {exportedAt,...payload}=data;semantic={format,payload};
  for(const key of Object.keys(data).filter(key=>!['app','records','exportedAt'].includes(key)))rows.push({key,label:key,status:'unknown',count:1,bytes:bytes(canonical(data[key]))});
 }else fail('invalid_format');
 return {format,fingerprint:format==='raw-rescue-v1'?data.fingerprint:await hash(canonical(semantic)),fileHash:await hash(text),rows,bytes:bytes(text),warning:'Chỉ kiểm kê và đọc cấu trúc. Chưa xác thực từng bản ghi, đối soát trùng/xung đột hoặc đủ điều kiện nhập. Không có dữ liệu nào được ghi hoặc tải lên.'};
}
const api={INVENTORY:Object.freeze(INVENTORY),MAX_BYTES,discover,capture,preview,RescueError};
if(typeof module!=='undefined')module.exports=api;else root.PickleUpRescue=api;
})(typeof window==='undefined'?globalThis:window);
