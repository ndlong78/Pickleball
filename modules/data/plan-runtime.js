/* One source for personal plans and personal selection. No account-to-V5 mirror. */
(function(root){
'use strict';if(root.PICKLEUP_PLANS)return;
const BASIC='pickleup_plans_v24',ADVANCED='pickleup_advanced_plans_v31',SELECTED='pickleup_selected_plan_v31',LESSON='pickleup_academy_last_lesson_v4';
let controller=null,state={mode:'loading',owner:null,busy:false,snapshot:null,projection:null},token=0,tag='',lessonFeedback='',navigation=0;
function legacy(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch(_){return fallback}}
function history(source){
 if(state.mode==='guest'){const value=legacy(source==='advanced'?ADVANCED:BASIC,[]);return Array.isArray(value)?value:[]}
 return (state.projection?.plans||[]).filter(p=>p.source===source).map(p=>({...structuredClone(p.plan),id:p.id,_pending:p.pending,_review:p.reviewRequired,_localRevision:p.localRevision})).reverse();
}
function selected(){
 if(state.mode==='guest'){const choice=legacy(SELECTED,null);return choice&&['basic','advanced'].includes(choice.source)?history(choice.source).find(p=>p?.id===choice.id)||null:null}
 const p=state.projection?.selectedPlan;return p?{...structuredClone(p.plan),id:p.id}:null;
}
function academySelection(){
 if(state.mode==='guest'){let id=null;try{id=localStorage.getItem(LESSON)}catch(_){}return {id:/^PU-0(?:0[1-9]|[1-7][0-9]|80)$/.test(id)?id:null,status:'guest'}}
 if(state.mode!=='account')return {id:null,status:state.mode};
 const row=state.snapshot?.records.find(r=>r.kind==='user_selections'&&r.id==='self');
 if(row?.reviewRequired)return {id:null,status:'needs_review'};
 if(row?.deleted)return {id:null,status:'deleted'};
 return {id:state.projection?.selection?.selected_academy_lesson_id||null,status:row?.tailOperationId?'pending':'account'};
}
function canSelectLesson(){const s=academySelection();return canWrite()&&!['needs_review','deleted'].includes(s.status)}
function selectionNotice(){const s=academySelection();return lessonFeedback||({guest:'Bài Học viện gần nhất: kho thiết bị.',loading:'Đang đọc lựa chọn bài Học viện; chưa lưu lựa chọn mới.',error:'Chưa đọc được lựa chọn tài khoản. Đọc lại trong Dữ liệu; chưa dùng lựa chọn khách.',needs_review:'Lựa chọn bài Học viện cần xem và xử lý trong Dữ liệu.',deleted:'Lựa chọn đã xóa. Khôi phục lựa chọn trống trong Dữ liệu trước khi chọn lại.',pending:'Bài Học viện: đã lưu trên thiết bị · chờ đồng bộ giáo án/lựa chọn.',account:'Bài Học viện: kho tài khoản. Không tự chọn bài hoặc gửi khi đăng nhập.'})[s.status]}
function paintSelection(){for(const el of document.querySelectorAll('[data-lesson-selection-status]'))el.textContent=selectionNotice()}
function selectionError(error){return ({quota_exceeded:'Không đủ dung lượng. Lựa chọn chưa lưu; giữ bài đang xem và thử lại.',local_conflict:'Lựa chọn đã đổi ở tab khác. Đọc lại trước khi chọn.',needs_review:'Lựa chọn cần xem và xử lý trong Dữ liệu.',busy:'Đang xử lý lựa chọn. Thử lại sau.',explicit_restore_required:'Khôi phục lựa chọn trống trong Dữ liệu trước khi chọn lại.',storage_unavailable:'Chưa lưu được lựa chọn trên thiết bị.'})[error?.code]||'Chưa lưu được lựa chọn. Kiểm tra nguồn dữ liệu và thử lại.'}
function rememberGuestLesson(id){if(id!==null&&!/^PU-0(?:0[1-9]|[1-7][0-9]|80)$/.test(id))throw Object.assign(Error('invalid_selection'),{code:'invalid_selection'});if(state.mode!=='guest')throw Object.assign(Error('source_unavailable'),{code:'source_unavailable'});if(id===null)localStorage.removeItem(LESSON);else localStorage.setItem(LESSON,id)}
function chooseLesson(id){
 if(id!==null&&!/^PU-0(?:0[1-9]|[1-7][0-9]|80)$/.test(id))return Promise.reject(new PickleUpPlanController.PlanError('invalid_selection'));
 if(state.mode==='account'&&canSelectLesson()&&academySelection().id===id)return Promise.resolve({status:'unchanged'});
 const stamp=token,expectedLocalRevision=revision('user_selections','self');lessonFeedback='Đang lưu lựa chọn bài Học viện…';paintSelection();
 const work=state.mode==='guest'?(()=>{try{rememberGuestLesson(id);emit(false);return Promise.resolve({status:'saved_locally'})}catch(_){return Promise.reject(Object.assign(Error('storage_unavailable'),{code:'storage_unavailable'}))}})():command(c=>c.select({operationId:crypto.randomUUID(),expectedLocalRevision,value:{selected_academy_lesson_id:id}}));
 return work.then(result=>{if(stamp!==token)throw Object.assign(Error('account_changed'),{code:'account_changed'});lessonFeedback='';paintSelection();return result}).catch(error=>{if(stamp===token){lessonFeedback=selectionError(error);paintSelection()}throw error});
}
async function requestLesson(id){
 const stamp=token,serial=++navigation,route=root.PICKLEUP_ROUTER?.getPage?.();let saved=false;
 try{await chooseLesson(id);saved=true;if(stamp!==token||serial!==navigation||route!==root.PICKLEUP_ROUTER?.getPage?.())return;root.PICKLEUP_ROUTER?.openPage('academy');await root.PICKLEUP_PAGE_LOADER?.ensure('academy');if(stamp!==token||serial!==navigation||root.PICKLEUP_ROUTER?.getPage&&root.PICKLEUP_ROUTER.getPage()!=='academy')return;document.dispatchEvent(new CustomEvent('pickleup:academy-request-lesson',{detail:{id,sourceToken:stamp,persisted:true}}))}
 catch(error){if(stamp===token&&serial===navigation){lessonFeedback=saved?'Lựa chọn đã lưu trên thiết bị; chưa mở được nội dung. Kiểm tra mạng và mở lại.':selectionError(error);paintSelection()}}
}
function notice(){return state.mode==='guest'?'Giáo án và lựa chọn cá nhân: kho thiết bị. Đăng nhập không tự nhập hoặc gửi dữ liệu.':state.mode==='account'?'Giáo án và lựa chọn cá nhân: kho tài khoản trên thiết bị · chỉ gửi khi bấm đồng bộ. Chọn giáo án và đồng bộ trước khi mở Court. Nhật ký tập có nguồn hoạt động riêng; lựa chọn bài Học viện dùng cùng kho giáo án; điểm không tạo attendance.':state.mode==='loading'?'Đang xác định nguồn giáo án; chưa thể ghi dữ liệu.':'Chưa đọc được kho giáo án tài khoản. Đọc lại hoặc xuất cache; chưa chuyển sang ghi kho khách.'}
function emit(changed){
 for(const el of document.querySelectorAll('[data-plan-notice]')){el.textContent=notice();el.dataset.source=state.mode}
 paintSelection();document.dispatchEvent(new Event('pickleup:plan-data'));
 // Always clear stale A selections, including the loader's unmounted Court cache.
 if(state.mode!=='guest'||changed)document.dispatchEvent(new CustomEvent('pickleup:plan-selected',{detail:{plan:selected()}}));
}
function accept(next){const nextTag=next.owner+':'+next.mode+':'+(next.consent?.localRevision||'0'),changed=nextTag!==tag;state=next;if(changed){tag=nextTag;token++;navigation++;lessonFeedback=''}emit(changed)}
const ready=(async()=>{
 if(root.PICKLEUP_PLAN_CONFIG?.enabled!==true||root.PICKLEUP_AUTH_CONFIG?.enabled!==true||!root.PICKLEUP_AUTH_CONFIG.url||!root.PICKLEUP_AUTH_CONFIG.publishableKey){accept({...state,mode:'guest'});return}
 try{const auth=await PickleUpAuth.getShared(PICKLEUP_AUTH_CONFIG);await auth.ready;const db=await PickleUpLocalRepository.open({onVersionChange:()=>{controller?.close();accept({mode:'error',owner:null,busy:false,error:'upgrade_required',snapshot:null,projection:null})}});controller=PickleUpPlanController.create({auth,repository:db,enabled:()=>root.PICKLEUP_PLAN_CONFIG?.enabled===true,onChange:accept});root.addEventListener('focus',()=>controller.refreshLocal().catch(()=>{}));await controller.ready}catch(_){accept({mode:'error',owner:null,busy:false,error:'storage_unavailable',snapshot:null,projection:null})}
})();
function canWrite(id=null){return state.mode==='guest'||state.mode==='account'&&!state.busy&&!!state.snapshot?.cursor?.epoch&&(!id||!state.snapshot.records.find(r=>r.kind==='personal_plans'&&r.id===id)?.reviewRequired)}
async function command(work){const stamp=token;await ready;if(stamp!==token)throw Object.assign(Error('account_changed'),{code:'account_changed'});if(state.mode!=='account'||!controller||!canWrite())throw Object.assign(Error('source_unavailable'),{code:'source_unavailable'});const result=await work(controller);if(stamp!==token)throw Object.assign(Error('account_changed'),{code:'account_changed'});return result}
const revision=(kind,id)=>state.snapshot?.records.find(r=>r.kind===kind&&r.id===id)?.localRevision||'0';
root.PICKLEUP_PLANS={rememberGuestLesson,academySelection,canSelectLesson,chooseLesson,requestLesson,selectionNotice,ready,notice,history,selected,canWrite,revision,token:()=>token,isAccount:()=>state.mode!=='guest',getState:()=>structuredClone(state),controller:()=>controller,
 raw(key){if(key===LESSON)return academySelection().id;if(key===BASIC||key===ADVANCED)return JSON.stringify(history(key===BASIC?'basic':'advanced'));if(key===SELECTED){const p=selected();return JSON.stringify(p?{source:p.version==='3.1'?'advanced':'basic',id:p.id}:null)}try{return localStorage.getItem(key)}catch(_){return null}},
 create(intent){const value=structuredClone(intent);return command(c=>c.createPlan(value))},
 choose(id){const expectedLocalRevision=revision('user_selections','self');return command(c=>c.select({operationId:crypto.randomUUID(),expectedLocalRevision,value:{selected_personal_plan_id:id}}))},
 complete(id,score,expectedLocalRevision){return command(c=>c.updateResult({id,operationId:crypto.randomUUID(),expectedLocalRevision,value:{check_score:score,completed_at:new Date().toISOString()}}))}
};
document.addEventListener('pickleup:fragment-ready',()=>{paintSelection();for(const el of document.querySelectorAll('[data-plan-notice]')){el.textContent=notice();el.dataset.source=state.mode}});
})(window);
