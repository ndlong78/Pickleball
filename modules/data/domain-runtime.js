/* One source for the two pilot domains. Guest writes stay synchronous in V5. */
(function(root){
'use strict';
if(root.PICKLEUP_DATA)return;
const keys=new Set(Object.values(PickleUpDomainCore.KEYS));let controller=null;
let state={mode:'loading',owner:null,busy:false,error:null,snapshot:null,projection:null};
const emit=()=>document.dispatchEvent(new CustomEvent('pickleup:domain-data'));
const messages={guest:'Dữ liệu thiết bị · mục tiêu và check-in vẫn ở kho khách trên máy này.',loading:'Đang xác định nguồn dữ liệu…',error:'Không đọc được kho tài khoản. Chưa chuyển sang ghi dữ liệu khách.'};
function raw(key){
 if(!keys.has(key)||state.mode==='guest'){try{return localStorage.getItem(key)}catch(_){return null}}
 const p=state.projection;if(!p)return null;
 return JSON.stringify(key===PickleUpDomainCore.KEYS.goal?p.goal:key===PickleUpDomainCore.KEYS.plan?p.plan:p.checkins);
}
function canWrite(kind,id){
 if(state.busy)return false;
 if(state.mode==='guest')return true;
 if(state.mode!=='account'||state.busy||!state.projection||!state.snapshot?.cursor?.epoch)return false;
 if(kind==='practice_checkins'&&!state.timezone)return false;
 return !state.projection.rows[kind+':'+id]?.reviewRequired;
}
function notice(){return state.mode==='account'?'Dữ liệu tài khoản · mục tiêu/lịch tập và check-in. Hoạt động và giáo án có lựa chọn nguồn riêng; đồng hồ không gửi lên cloud. Biểu đồ check-in hiển thị 8 tuần.'+(!state.timezone?' Chọn múi giờ ghi nhận mới trong trang Dữ liệu trước khi check-in.':' Múi giờ ghi nhận mới: '+state.timezone+'.'):messages[state.mode]}
function paint(){for(const el of document.querySelectorAll('[data-domain-notice]')){el.textContent=notice();el.dataset.source=state.mode}}
const ready=(async()=>{
 if(root.PICKLEUP_SYNC_CONFIG?.enabled!==true||root.PICKLEUP_AUTH_CONFIG?.enabled!==true||!root.PICKLEUP_AUTH_CONFIG.url||!root.PICKLEUP_AUTH_CONFIG.publishableKey){state={...state,mode:'guest'};emit();return}
 try{
  const auth=await PickleUpAuth.getShared(PICKLEUP_AUTH_CONFIG);await auth.ready;
  const db=await PickleUpLocalRepository.open({onVersionChange:()=>{controller?.close();state={mode:'error',owner:null,busy:false,error:'storage_unavailable',snapshot:null,projection:null};emit()}});
  const channel=typeof BroadcastChannel==='function'?new BroadcastChannel('pickleup-domains-1'):null;
  controller=PickleUpDomainController.create({auth,repository:db,enabled:()=>root.PICKLEUP_SYNC_CONFIG?.enabled===true,onChange:next=>{state=next;emit()},notify:owner=>channel?.postMessage({type:'changed',owner})});
  channel?.addEventListener('message',event=>{if(event.data?.type==='changed'&&event.data.owner===state.owner)controller.refreshLocal().catch(()=>{})});
  root.addEventListener('focus',()=>controller.refreshLocal().catch(()=>{}));
  await controller.ready;
 }catch(_){state={mode:'error',owner:null,busy:false,error:'storage_unavailable',snapshot:null,projection:null};emit()}
})();
root.PICKLEUP_DATA={ready,raw,getState:()=>structuredClone(state),
 getView:()=>({mode:state.mode,owner:state.owner,busy:state.busy,error:state.error,timezone:state.timezone,goalConfigured:state.projection?.goalConfigured===true}),
 pending:(kind,id)=>!!state.projection?.rows[kind+':'+id]?.tailOperationId,isAccount:()=>state.mode!=='guest',canWrite,notice,
 revision(kind,id){return state.projection?.rows[kind+':'+id]?.localRevision||'0'},
 deleted(kind,id){return state.projection?.rows[kind+':'+id]?.deleted===true},
 async savePreferences(...args){await ready;if(!controller)throw new PickleUpDomainCore.DomainError('source_unavailable');return controller.savePreferences(...args)},
 async saveCheckin(args){await ready;if(!controller)throw new PickleUpDomainCore.DomainError('source_unavailable');return controller.saveCheckin(args)},
 controller:()=>controller};
document.addEventListener('pickleup:domain-data',paint);document.addEventListener('pickleup:fragment-ready',paint);paint();
})(window);
