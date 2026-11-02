/* Single Academy source for all mounted readers. No account-to-V5 writes. */
(function(root){
'use strict';
if(root.PICKLEUP_ACTIVITY)return;
const core=PickleUpAcademySourceCore,empty=()=>({records:{},history:[],events:[]});
let controller=null,state={mode:'loading',owner:null,busy:false,error:null,snapshot:null,projection:null},view=empty(),token=0,tag='';
function legacy(key){try{return localStorage.getItem(key)}catch(_){return null}}
function notice(){
 if(state.mode==='guest')return 'Học viện: dữ liệu khách trên thiết bị. Đăng nhập không tự nhập điểm hoặc lịch sử.';
 if(state.mode==='loading')return 'Học viện: đang xác định nguồn dữ liệu, chưa thể lưu điểm.';
 if(state.mode==='error')return 'Không đọc được kho hoạt động tài khoản. Chưa chuyển sang ghi dữ liệu khách; đọc lại hoặc xuất cache trong Dữ liệu.';
 return 'Học viện: kho tài khoản trên thiết bị · chỉ gửi khi bấm đồng bộ. Đánh giá, giáo án, nhật ký tập, trận đấu, bài gần nhất, timer và checklist vẫn dùng kho thiết bị. Điểm không phải attendance hoặc DUPR.';
}
function emit(){
 for(const element of document.querySelectorAll('[data-activity-notice]')){element.textContent=notice();element.dataset.source=state.mode}
 document.dispatchEvent(new Event('pickleup:activity-data'));
}
function accept(next){
 state=next;const nextTag=next.owner+':'+next.mode+':'+(next.consent?.localRevision||'0');if(nextTag!==tag){token++;tag=nextTag}
 try{view=next.mode==='account'?core.project(next.projection,root.PICKLEUP_CURRICULUM||[],{activityCore:root.PickleUpActivityCore}):empty()}
 catch(_){state={...next,mode:'error',error:'invalid_activity',snapshot:null,projection:null};view=empty();token++}
 emit();
}
const ready=(async()=>{
 if(root.PICKLEUP_ACTIVITY_CONFIG?.enabled!==true||root.PICKLEUP_AUTH_CONFIG?.enabled!==true||!root.PICKLEUP_AUTH_CONFIG.url||!root.PICKLEUP_AUTH_CONFIG.publishableKey){accept({...state,mode:'guest'});return}
 try{
  const auth=await PickleUpAuth.getShared(PICKLEUP_AUTH_CONFIG);await auth.ready;
  const db=await PickleUpLocalRepository.open({onVersionChange:()=>{controller?.close();accept({mode:'error',owner:null,busy:false,error:'upgrade_required',snapshot:null,projection:null})}});
  controller=PickleUpActivityController.create({auth,repository:db,enabled:()=>root.PICKLEUP_ACTIVITY_CONFIG?.enabled===true,onChange:accept});
  root.addEventListener('focus',()=>controller.refreshLocal().catch(()=>{}));await controller.ready;
 }catch(_){accept({mode:'error',owner:null,busy:false,error:'storage_unavailable',snapshot:null,projection:null})}
})();
function canWrite(){if(state.busy)return false;return state.mode==='guest'||state.mode==='account'&&!state.busy&&!!state.snapshot?.cursor?.epoch}
root.PICKLEUP_ACTIVITY={ready,notice,canWrite,isAccount:()=>state.mode!=='guest',token:()=>token,controller:()=>controller,
 getState:()=>structuredClone(state),getView:()=>({mode:state.mode,owner:state.owner,busy:state.busy,error:state.error}),
 raw(key){if(state.mode==='guest'||![core.SCORES,core.HISTORY].includes(key))return legacy(key);return JSON.stringify(key===core.SCORES?view.records:view.history)},
 records(){if(state.mode!=='guest')return structuredClone(view.records);try{const rows=JSON.parse(legacy(core.SCORES)||'{}');return rows&&typeof rows==='object'&&!Array.isArray(rows)?rows:{}}catch(_){return {}}},
 history(){return state.mode==='guest'?(root.PICKLEUP_ACADEMY_TRENDS?.readHistory(legacy(core.HISTORY))||[]):structuredClone(view.history)},
 events(){return structuredClone(view.events)},
 async saveAttempt(lesson,score,conditions){
  const stamp=token,id=root.crypto.randomUUID(),operationId=root.crypto.randomUUID(),eventId=root.crypto.randomUUID(),value=core.attempt(lesson,score,{eventId,occurredAt:new Date().toISOString(),conditions:structuredClone(conditions),activityCore:root.PickleUpActivityCore});
  await ready;if(stamp!==token)throw new PickleUpActivityController.ActivityError('account_changed');if(state.mode!=='account'||!canWrite()||!controller)throw new PickleUpActivityController.ActivityError('source_unavailable');
  const result=await controller.createEvent({kind:'academy_attempts',id,operationId,value});if(stamp!==token)throw new PickleUpActivityController.ActivityError('account_changed');return result;
 },
 async deleteAttempt(id,expectedLocalRevision){const stamp=token;await ready;if(stamp!==token)throw new PickleUpActivityController.ActivityError('account_changed');if(!controller||state.mode!=='account')throw new PickleUpActivityController.ActivityError('source_unavailable');return controller.deleteEvent({kind:'academy_attempts',id,operationId:root.crypto.randomUUID(),expectedLocalRevision})}
};
document.addEventListener('pickleup:fragment-ready',()=>{for(const el of document.querySelectorAll('[data-activity-notice]')){el.textContent=notice();el.dataset.source=state.mode}});
})(window);
