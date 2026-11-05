/* Paused Court checkpoints on this browser only. No RPC or legacy mirror. */
(function(root){
'use strict';if(root.PICKLEUP_COURT_CHECKPOINT)return;
let db=null,opening=null,scope=null,generation=0,tag='',readVersion=0,failed=null;
let state={mode:'loading',owner:null,busy:false,row:null,error:null,stale:false};
const copy=value=>structuredClone(value),source=()=>root.PICKLEUP_PLANS?.getState();
function describe(){
 const s=source();if(s?.mode==='guest')return {mode:'guest',owner:null};
 const selected=s?.projection?.selectedPlan,records=s?.snapshot?.records||[],plan=records.find(r=>r.kind==='personal_plans'&&r.id===selected?.id),selection=records.find(r=>r.kind==='user_selections'&&r.id==='self');
 if(s?.mode!=='account'||!s.owner||selected?.acknowledged!==true||!plan||!selection||[plan,selection].some(r=>r.tailOperationId||r.reviewRequired||r.deleted))return {mode:'unavailable',owner:s?.owner||null};
 return {mode:'account',owner:s.owner,binding:{planId:selected.id,epoch:s.snapshot.cursor.epoch,planRevision:plan.localRevision,selectionRevision:selection.localRevision,consentRevision:s.consent.localRevision}};
}
function sourceTag(){const d=describe();return JSON.stringify([root.PICKLEUP_PLANS?.token(),d.mode,d.owner,d.binding])}
function emit(){document.dispatchEvent(new Event('pickleup:court-checkpoint-data'))}
function guard(stamp){if(stamp!==generation||tag!==sourceTag())throw Object.assign(Error('account_changed'),{code:'account_changed'})}
async function repository(){if(db)return db;opening||=root.PickleUpLocalRepository.open({onVersionChange:()=>{generation++;readVersion++;scope?.close();scope=null;db=null;opening=null;state={mode:'error',owner:null,busy:false,row:null,error:'upgrade_required',stale:false};emit()}});try{db=await opening;return db}catch(error){opening=null;throw error}}
let channel=null;try{if(typeof root.BroadcastChannel==='function')channel=new root.BroadcastChannel('pickleup-court-checkpoint-1')}catch(_){}
async function read(explicit=true){
 const stamp=generation,version=++readVersion,d=describe();if(d.mode!=='account'||state.busy)return;
 try{
  const own=await repository();guard(stamp);scope||=own.scope('user:'+d.owner);const row=await scope.getCourtCheckpoint(d.binding);guard(stamp);if(version!==readVersion)return;
  if(!explicit&&state.row&&state.row.localRevision!==row.localRevision){state={...state,stale:true,error:'local_conflict'};emit();return}
  if(explicit)failed=null;state={mode:'account',owner:d.owner,busy:false,row,error:failed?state.error:null,stale:false};emit();
 }catch(error){if(stamp===generation&&version===readVersion){state={...state,mode:'error',busy:false,row:null,error:error.code||'storage_unavailable'};emit()}}
}
function adopt(){
 const next=sourceTag();if(next===tag)return;tag=next;generation++;readVersion++;scope?.close();scope=null;failed=null;
 const d=describe();state={mode:d.mode==='account'?'loading':d.mode,owner:d.owner,busy:false,row:null,error:null,stale:false};emit();if(d.mode==='account')read();
}
async function commit(intent){
 const stamp=generation;if(!canSave())return;readVersion++;state={...state,busy:true,error:null};failed=null;emit();
 try{const row=await scope.saveCourtCheckpoint(intent.value,intent.revision,intent.binding);guard(stamp);state={...state,busy:false,row,error:state.stale?'local_conflict':null};emit();try{channel?.postMessage({owner:state.owner,planId:intent.binding.planId})}catch(_){}}
 catch(error){if(stamp===generation){failed=error.code==='local_conflict'?null:intent;state={...state,busy:false,error:error.code||'storage_unavailable',stale:error.code==='local_conflict'};emit()}}
}
function canSave(){return state.mode==='account'&&!state.busy&&!state.stale&&!!state.row&&describe().mode==='account'}
function compatible(){return canSave()&&!!state.row.value&&state.row.value.epoch===describe().binding.epoch}
async function restore(){
 if(!compatible())return null;const stamp=generation,preview=copy(state.row);readVersion++;state={...state,busy:true,error:null};emit();
 try{const row=await scope.getCourtCheckpoint(describe().binding);guard(stamp);if(state.stale||row.localRevision!==preview.localRevision||['schemaVersion','planId','epoch','index','remaining','ended'].some(k=>row.value?.[k]!==preview.value[k])){state={...state,busy:false,stale:true,error:'local_conflict'};emit();return null}state={...state,busy:false};emit();return {...copy(row.value),running:false,deadline:null}}
 catch(error){if(stamp===generation){state={...state,busy:false,error:error.code||'storage_unavailable'};emit()}return null}
}
function notice(){
 if(state.mode==='guest')return 'Đồng hồ khách giữ cách lưu trên trình duyệt hiện có.';
 if(state.mode==='loading')return 'Đang đọc điểm dừng Court của tài khoản trên trình duyệt này…';
 if(state.mode!=='account')return 'Chưa đọc được điểm dừng. Cần giáo án đã chọn và đồng bộ; không dùng điểm dừng khách. Đồng hồ đang mở vẫn chỉ ở phiên trang.';
 if(state.busy)return 'Đang xử lý điểm dừng Court…';
 if(state.stale)return 'Điểm dừng đã đổi ở tab khác. Đọc lại và xem vị trí mới trước khi lưu hoặc khôi phục; đồng hồ đang mở được giữ nguyên.';
 if(state.error)return state.error==='quota_exceeded'?'Không đủ dung lượng. Điểm dừng chưa lưu; đồng hồ đã dừng vẫn giữ trong phiên này. Có thể thử lại.':'Chưa xử lý được điểm dừng. Giữ trang đang mở và đọc lại hoặc thử lại.';
 const v=state.row?.value;return v?'Điểm dừng đã lưu: '+(v.ended?'kết thúc 6 phần':'phần '+(v.index+1)+'/6 · còn '+root.PICKLEUP_PRACTICE_CLOCK.fmt(v.remaining))+(v.epoch!==describe().binding.epoch?' · thuộc phiên đồng bộ cũ, không thể khôi phục.':' · khôi phục chỉ khi bạn chủ động bấm nút.'):'Chưa có điểm dừng cho giáo án này. Bấm lưu để tạm dừng đồng hồ và giữ vị trí qua reload.';
}
root.PICKLEUP_COURT_CHECKPOINT={getState:()=>copy(state),token:()=>generation,canSave,canRestore:compatible,notice,refresh:()=>read(true),restore,retry:()=>failed&&state.mode==='account'?commit(failed):read(true),
 save(clock){const d=describe();if(!canSave()||clock?.running||clock?.deadline!==null||clock?.planId!==d.binding.planId)return Promise.resolve();return commit({value:{schemaVersion:1,planId:clock.planId,epoch:d.binding.epoch,index:clock.index,remaining:clock.remaining,ended:clock.ended},revision:state.row.localRevision,binding:copy(d.binding)})}};
document.addEventListener('pickleup:plan-data',adopt);
root.addEventListener('focus',()=>{adopt();read(false)});document.addEventListener('visibilitychange',()=>{if(!document.hidden){adopt();read(false)}});
channel?.addEventListener('message',event=>{const d=describe();if(event.data?.owner===d.owner&&event.data?.planId===d.binding?.planId){readVersion++;state={...state,stale:true,error:'local_conflict'};emit()}});
adopt();
})(window);
