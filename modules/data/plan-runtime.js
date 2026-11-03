/* One source for personal plans and personal selection. No account-to-V5 mirror. */
(function(root){
'use strict';if(root.PICKLEUP_PLANS)return;
const BASIC='pickleup_plans_v24',ADVANCED='pickleup_advanced_plans_v31',SELECTED='pickleup_selected_plan_v31';
let controller=null,state={mode:'loading',owner:null,busy:false,snapshot:null,projection:null},token=0,tag='';
function legacy(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch(_){return fallback}}
function history(source){
 if(state.mode==='guest'){const value=legacy(source==='advanced'?ADVANCED:BASIC,[]);return Array.isArray(value)?value:[]}
 return (state.projection?.plans||[]).filter(p=>p.source===source).map(p=>({...structuredClone(p.plan),id:p.id,_pending:p.pending,_review:p.reviewRequired,_localRevision:p.localRevision})).reverse();
}
function selected(){
 if(state.mode==='guest'){const choice=legacy(SELECTED,null);return choice&&['basic','advanced'].includes(choice.source)?history(choice.source).find(p=>p?.id===choice.id)||null:null}
 const p=state.projection?.selectedPlan;return p?{...structuredClone(p.plan),id:p.id}:null;
}
function notice(){return state.mode==='guest'?'Giáo án và lựa chọn cá nhân: kho thiết bị. Đăng nhập không tự nhập hoặc gửi dữ liệu.':state.mode==='account'?'Giáo án và lựa chọn cá nhân: kho tài khoản trên thiết bị · chỉ gửi khi bấm đồng bộ. Chọn giáo án và đồng bộ trước khi mở Court. Nhật ký tập có nguồn hoạt động riêng; bài Học viện gần nhất vẫn trên thiết bị; điểm không tạo attendance.':state.mode==='loading'?'Đang xác định nguồn giáo án; chưa thể ghi dữ liệu.':'Chưa đọc được kho giáo án tài khoản. Đọc lại hoặc xuất cache; chưa chuyển sang ghi kho khách.'}
function emit(changed){
 for(const el of document.querySelectorAll('[data-plan-notice]')){el.textContent=notice();el.dataset.source=state.mode}
 document.dispatchEvent(new Event('pickleup:plan-data'));
 // Always clear stale A selections, including the loader's unmounted Court cache.
 if(state.mode!=='guest'||changed)document.dispatchEvent(new CustomEvent('pickleup:plan-selected',{detail:{plan:selected()}}));
}
function accept(next){const nextTag=next.owner+':'+next.mode+':'+(next.consent?.localRevision||'0'),changed=nextTag!==tag;state=next;if(changed){tag=nextTag;token++}emit(changed)}
const ready=(async()=>{
 if(root.PICKLEUP_PLAN_CONFIG?.enabled!==true||root.PICKLEUP_AUTH_CONFIG?.enabled!==true||!root.PICKLEUP_AUTH_CONFIG.url||!root.PICKLEUP_AUTH_CONFIG.publishableKey){accept({...state,mode:'guest'});return}
 try{const auth=await PickleUpAuth.getShared(PICKLEUP_AUTH_CONFIG);await auth.ready;const db=await PickleUpLocalRepository.open({onVersionChange:()=>{controller?.close();accept({mode:'error',owner:null,busy:false,error:'upgrade_required',snapshot:null,projection:null})}});controller=PickleUpPlanController.create({auth,repository:db,enabled:()=>root.PICKLEUP_PLAN_CONFIG?.enabled===true,onChange:accept});root.addEventListener('focus',()=>controller.refreshLocal().catch(()=>{}));await controller.ready}catch(_){accept({mode:'error',owner:null,busy:false,error:'storage_unavailable',snapshot:null,projection:null})}
})();
function canWrite(id=null){return state.mode==='guest'||state.mode==='account'&&!state.busy&&!!state.snapshot?.cursor?.epoch&&(!id||!state.snapshot.records.find(r=>r.kind==='personal_plans'&&r.id===id)?.reviewRequired)}
async function command(work){const stamp=token;await ready;if(stamp!==token)throw Error('account_changed');if(state.mode!=='account'||!controller||!canWrite())throw Error('source_unavailable');const result=await work(controller);if(stamp!==token)throw Error('account_changed');return result}
const revision=(kind,id)=>state.snapshot?.records.find(r=>r.kind===kind&&r.id===id)?.localRevision||'0';
root.PICKLEUP_PLANS={ready,notice,history,selected,canWrite,revision,token:()=>token,isAccount:()=>state.mode!=='guest',getState:()=>structuredClone(state),controller:()=>controller,
 raw(key){if(key===BASIC||key===ADVANCED)return JSON.stringify(history(key===BASIC?'basic':'advanced'));if(key===SELECTED){const p=selected();return JSON.stringify(p?{source:p.version==='3.1'?'advanced':'basic',id:p.id}:null)}try{return localStorage.getItem(key)}catch(_){return null}},
 create(intent){const value=structuredClone(intent);return command(c=>c.createPlan(value))},
 choose(id){const expectedLocalRevision=revision('user_selections','self');return command(c=>c.select({operationId:crypto.randomUUID(),expectedLocalRevision,value:{selected_personal_plan_id:id}}))},
 complete(id,score,expectedLocalRevision){return command(c=>c.updateResult({id,operationId:crypto.randomUUID(),expectedLocalRevision,value:{check_score:score,completed_at:new Date().toISOString()}}))}
};
document.addEventListener('pickleup:fragment-ready',()=>{for(const el of document.querySelectorAll('[data-plan-notice]')){el.textContent=notice();el.dataset.source=state.mode}});
})(window);
