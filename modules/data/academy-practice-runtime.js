/* Local Academy checklist/focus. No RPC, legacy migration, timer or attendance. */
(function(root){
'use strict';if(root.PICKLEUP_ACADEMY_PRACTICE)return;
let db=null,opening=null,scope=null,generation=0,sourceTag='',failed=null,readVersion=0,reread=false;
let state={mode:'loading',owner:null,busy:false,error:null,row:null};
const clone=value=>structuredClone(value);
const sources=()=>({plan:root.PICKLEUP_PLANS?.getState(),activity:root.PICKLEUP_ACTIVITY?.getState()});
function describe(){
 const all=sources(),privateSources=Object.values(all).filter(s=>s&&s.mode!=='guest');
 if(!privateSources.length)return {mode:'guest',owner:null};
 const owners=new Set(privateSources.map(s=>s.owner));
 if(privateSources.some(s=>s.mode!=='account')||owners.size!==1||!privateSources[0].owner)return {mode:'unavailable',owner:null};
 const owner=privateSources[0].owner;
 if(Object.values(all).some(s=>s?.owner&&s.owner!==owner))return {mode:'unavailable',owner:null};
 const fence={};for(const [key,config] of [['plan',root.PICKLEUP_PLAN_CONFIG],['activity',root.PICKLEUP_ACTIVITY_CONFIG]])fence[key]=config?.enabled===true?all[key]?.consent:null;
 return {mode:'account',owner,fence};
}
const tag=()=>[root.PICKLEUP_PLANS?.token(),root.PICKLEUP_ACTIVITY?.token()].join(':');
function emit(){document.dispatchEvent(new Event('pickleup:academy-practice-data'))}
function guard(stamp){if(stamp!==generation||sourceTag!==tag())throw Object.assign(Error('account_changed'),{code:'account_changed'})}
async function repository(){if(db)return db;opening||=root.PickleUpLocalRepository.open({onVersionChange:()=>{scope?.close();scope=null;db=null;opening=null;generation++;state={mode:'error',owner:null,busy:false,error:'upgrade_required',row:null};emit()}});try{db=await opening;return db}catch(error){opening=null;throw error}}
let channel=null;try{if(typeof root.BroadcastChannel==='function')channel=new root.BroadcastChannel('pickleup-academy-device-1')}catch(_){}
async function read(){
 const stamp=generation,version=++readVersion,current=describe();if(current.mode!=='account')return;if(state.busy){reread=true;return}
 try{
  const repositoryDb=await repository();guard(stamp);scope||=repositoryDb.scope('user:'+current.owner);
  const row=await scope.getAcademyPractice(current.fence);guard(stamp);if(version!==readVersion)return;
  if(!state.row||BigInt(row.localRevision)>=BigInt(state.row.localRevision)){state={...state,mode:'account',owner:current.owner,error:failed?state.error:null,row};emit()}
 }catch(error){if(stamp===generation&&version===readVersion){state={...state,mode:'error',busy:false,error:error.code||'storage_unavailable',row:null};emit()}}
}
function adopt(){
 const nextTag=tag();if(sourceTag===nextTag)return;
 sourceTag=nextTag;generation++;readVersion++;scope?.close();scope=null;failed=null;reread=false;
 const next=describe();state={mode:next.mode==='account'?'loading':next.mode,owner:next.owner,busy:false,error:null,row:null};emit();if(next.mode==='account')read();
}
async function edit(patch){
 const captured=clone(patch),stamp=generation,current=describe();
 if(state.mode!=='account'||state.busy||current.mode!=='account')return;
 const own=scope;readVersion++;state={...state,busy:true,error:null};failed=null;emit();
 try{
  const row=await own.changeAcademyPractice(captured,current.fence);guard(stamp);
  state={...state,busy:false,error:null,row};emit();try{channel?.postMessage({type:'changed',owner:current.owner})}catch(_){}
 }catch(error){if(stamp===generation){failed=captured;state={...state,busy:false,error:error.code||'storage_unavailable'};emit()}}
 finally{if(stamp===generation&&reread){reread=false;read()}}
}
const api={getState:()=>clone(state),edit,refresh:read,retry:()=>failed&&state.mode==='account'?edit(failed):read(),canEdit:()=>state.mode==='account'&&!state.busy,
 notice(){
  if(state.mode==='guest')return 'Checklist và bước tập trung: kho khách trên trình duyệt. Không tự xác nhận buổi tập.';
  if(state.mode==='loading')return 'Đang đọc checklist và bước tập trung của tài khoản trên thiết bị…';
  if(state.mode!=='account')return 'Chưa đọc được trạng thái thực hành tài khoản. Đọc lại; không dùng dữ liệu khách hoặc tự ghi đè. Timer chỉ giữ trong phiên trang.';
  if(state.busy)return 'Đang lưu checklist / bước tập trung trên thiết bị…';
  if(state.error)return state.error==='quota_exceeded'?'Không đủ dung lượng. Thao tác chưa lưu; thử lại sau khi giải phóng dung lượng.':'Thao tác chưa lưu. Đọc lại nguồn hoặc thử lại; trạng thái đã lưu được giữ nguyên.';
  return 'Checklist và bước tập trung: đã lưu theo tài khoản trên trình duyệt này, giữ qua reload. Không gửi lên cloud, chưa nằm trong bản xuất hiện tại; có thể mất khi xóa dữ liệu trình duyệt. Timer chỉ giữ trong phiên trang; không tự xác nhận buổi tập.';
 }};
root.PICKLEUP_ACADEMY_PRACTICE=api;
document.addEventListener('pickleup:plan-data',adopt);document.addEventListener('pickleup:activity-data',adopt);
root.addEventListener('focus',()=>{adopt();read()});document.addEventListener('visibilitychange',()=>{if(!document.hidden){adopt();read()}});
channel?.addEventListener('message',event=>{if(event.data?.type==='changed'&&event.data.owner===state.owner)read()});
adopt();
})(window);
