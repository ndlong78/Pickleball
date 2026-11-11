/* Recover interrupted guest restores before any lazy feature reads legacy keys. */
(function(root){
'use strict';
const JOURNAL='pickleup_restore_journal_v1',LOCK='pickleup-guest-restore-v1';
const FIELDS={
 scores:'pickleup_scores',assessment:'pickleup_assessment_v1',academy:'pickleup_academy_v2',
 academyHistory:'pickleup_academy_history_v44',stageChecks:'pickleup_stage_checks_v23',
 personalPlans:'pickleup_plans_v24',trainingLog:'pickleup_training_log_v26',
 advancedChecks:'pickleup_advanced_checks_v3',matchJournal:'pickleup_match_journal_v3',
 advancedPlans:'pickleup_advanced_plans_v31',selectedPlan:'pickleup_selected_plan_v31',
 weeklyGoal:'pickleup_weekly_goal_v46',weeklyPlan:'pickleup_week_plan_v47',
 weeklyCheckins:'pickleup_week_checkins_v48'
};
const KEYS=new Set(Object.values(FIELDS)),MAX_BYTES=8*1024*1024;
const EXTRA=['pickleup_practice_state_v25','pickleup_academy_last_lesson_v4','pickleup_academy_steps_v41','pickleup_academy_focus_v42'];
class RestoreError extends Error{constructor(code){super(code);this.code=code}}
const fail=code=>{throw new RestoreError(code)};
const size=text=>new TextEncoder().encode(text).length;
function decode(raw){
 if(typeof raw!=='string'||size(raw)>MAX_BYTES)fail('invalid_journal');
 let journal;try{journal=JSON.parse(raw)}catch(_){fail('invalid_journal')}
 if(journal?.version!==1||!['applying','rollback'].includes(journal.phase)||!Array.isArray(journal.entries)||!journal.entries.length||journal.entries.length>KEYS.size)fail('invalid_journal');
 const seen=new Set();
 for(const row of journal.entries){
  if(!row||!KEYS.has(row.key)||seen.has(row.key)||![row.before,row.after].every(x=>x===null||typeof x==='string'))fail('invalid_journal');
  seen.add(row.key);
 }
 return journal;
}
function recover(storage){
 try{
  const raw=storage.getItem(JOURNAL);if(raw===null)return {status:'clean'};
  const journal=decode(raw),entries=journal.entries;
  for(const row of entries){
   const current=storage.getItem(row.key);
   if(current!==row.before&&current!==row.after&&!(journal.phase==='rollback'&&current===null))return {status:'blocked',code:'concurrent_change'};
  }
  // Mark rollback durably before clearing intermediate writes to free quota.
  if(journal.phase!=='rollback'){journal.phase='rollback';storage.setItem(JOURNAL,JSON.stringify(journal))}
  for(const row of entries)if(storage.getItem(row.key)!==row.before)storage.removeItem(row.key);
  for(const row of entries)if(storage.getItem(row.key)!==row.before){
   if(row.before===null)storage.removeItem(row.key);else storage.setItem(row.key,row.before);
  }
  if(entries.some(row=>storage.getItem(row.key)!==row.before))return {status:'blocked',code:'rollback_failed'};
  storage.removeItem(JOURNAL);return {status:'rolled_back'};
 }catch(error){return {status:'blocked',code:error.code==='invalid_journal'?'invalid_journal':'storage_unavailable'}}
}
function apply(storage,patch){
 if(!Array.isArray(patch)||!patch.length||patch.length>KEYS.size||Array.from(patch).some(x=>!x||!KEYS.has(x.key)||x.value!==null&&typeof x.value!=='string')
  ||new Set(patch.map(x=>x.key)).size!==patch.length)fail('invalid_patch');
 if(recover(storage).status==='blocked')fail('recovery_required');
 const entries=patch.map(({key,value})=>({key,before:storage.getItem(key),after:value}));
 const journal=JSON.stringify({version:1,phase:'applying',entries});if(size(journal)>MAX_BYTES)fail('too_large');
 try{
  // If quota prevents this durable preimage, no guest key has been changed.
  storage.setItem(JOURNAL,journal);
  if(storage.getItem(JOURNAL)!==journal)fail('concurrent_change');
  for(const row of entries){
   if(storage.getItem(row.key)!==row.before)fail('concurrent_change');
   if(row.after===null)storage.removeItem(row.key);else storage.setItem(row.key,row.after);
  }
  if(entries.some(row=>storage.getItem(row.key)!==row.after))fail('concurrent_change');
  storage.removeItem(JOURNAL);
  return {status:'committed'};
 }catch(_){
  // Removal may have completed before storage reported an error.
  try{if(storage.getItem(JOURNAL)===null&&entries.every(row=>storage.getItem(row.key)===row.after))return {status:'committed'}}catch(_){}
  const recovery=recover(storage);
  fail(recovery.status==='blocked'?'recovery_required':'rolled_back');
 }
}
async function locked(work){
 if(!root.navigator?.locks?.request)fail('locks_unavailable');
 return root.navigator.locks.request(LOCK,{ifAvailable:true},lock=>{if(!lock)fail('busy');return work()});
}
function emergency(storage){
 const journalRaw=storage.getItem(JOURNAL);
 const entries=[...KEYS,...EXTRA].map(key=>({key,raw:storage.getItem(key)}));
 if(storage.getItem(JOURNAL)!==journalRaw||entries.some(row=>storage.getItem(row.key)!==row.raw))fail('concurrent_change');
 const text=JSON.stringify({app:'PickleUp',format:'interrupted-guest-restore-rescue-v1',journalRaw,entries});
 if(size(text)>MAX_BYTES)fail('too_large');
 if(/(?:access_token|refresh_token|service_role|client_secret|password|otp)[\\"'\s]*[:=]|sb_secret_/i.test(text))fail('credentials_detected');
 return text;
}
let held=false,panel;
function showBlocked(message){
 held=true;if(!root.document?.body)return;
 if(!panel){
  panel=document.createElement('section');panel.id='legacyStorageRecovery';panel.className='card';panel.setAttribute('role','alert');
  const status=document.createElement('p'),download=document.createElement('button'),reload=document.createElement('button');
  download.textContent='Xuất cứu hộ dữ liệu khách và nhật ký phục hồi';reload.textContent='Đóng tab khác rồi tải lại';
  download.addEventListener('click',()=>{
   try{const text=emergency(root.localStorage),url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='pickleup-interrupted-restore-rescue.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
   catch(_){status.textContent='Chưa xuất được cứu hộ an toàn. Giữ nguyên lưu trữ; không xóa dữ liệu hoặc nhật ký phục hồi.'}
  });
  reload.addEventListener('click',()=>root.location.reload());panel.append(status,download,reload);document.body.prepend(panel);
 }
 panel.querySelector('p').textContent=message+' Dữ liệu được giữ nguyên; đóng các tab khác trước khi thử lại. Tệp cứu hộ riêng tư chỉ để giữ dữ liệu, chưa có chức năng nhập lại.';
}
const api={FIELDS:Object.freeze(FIELDS),JOURNAL,MAX_BYTES,apply,recover,emergency,RestoreError,isBlocked:()=>held,
 async restore(patch){
  try{return await locked(()=>apply(root.localStorage,patch))}
  catch(error){if(error.code==='recovery_required')showBlocked('Chưa hoàn tất quay lại dữ liệu trước lần khôi phục.');throw error}
 },ready:Promise.resolve({status:'clean'})};
if(root.document){
 for(const type of ['click','submit','input','change'])document.addEventListener(type,event=>{if(held&&!event.target.closest?.('#legacyStorageRecovery')){event.preventDefault();event.stopImmediatePropagation()}},true);
 root.addEventListener('storage',event=>{
  if(event.key===JOURNAL){showBlocked(event.newValue===null?'Lần khôi phục ở tab khác đã kết thúc; cần tải lại giao diện.':'Một tab khác đang khôi phục dữ liệu khách.');event.stopImmediatePropagation()}
  else if(held&&KEYS.has(event.key))event.stopImmediatePropagation();
 });
 api.ready=(async()=>{
  try{
   if(root.localStorage.getItem(JOURNAL)===null)return {status:'clean'};
   const result=await locked(()=>recover(root.localStorage));
   if(result.status==='blocked')showBlocked('Lần khôi phục trước chưa hoàn tất; đang tạm dừng các trang dữ liệu.');
   return result;
  }catch(_){showBlocked('Chưa đọc được trạng thái khôi phục an toàn.');return {status:'blocked'}}
 })();
}
root.PickleUpLegacyStorage=api;
if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
