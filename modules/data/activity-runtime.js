/* Single activity source for all mounted readers. No account-to-V5 writes. */
(function(root){
'use strict';
if(root.PICKLEUP_ACTIVITY)return;
const core=PickleUpAcademySourceCore,extra=root.PickleUpActivitySourceCore,empty=()=>({records:{},history:[],events:[]});
const keys={self:'pickleup_assessment_v1',stage:'pickleup_stage_checks_v23',advanced:'pickleup_advanced_checks_v3',matches:'pickleup_match_journal_v3',training:'pickleup_training_log_v26'};
function projectDomains(value){return typeof extra?.project==='function'?extra.project(value):null}
let domains=projectDomains(null);
let controller=null,state={mode:'loading',owner:null,busy:false,error:null,snapshot:null,projection:null},view=empty(),token=0,tag='';
function legacy(key){try{return localStorage.getItem(key)}catch(_){return null}}
function notice(){
 if(state.mode==='guest')return 'Hoạt động: dữ liệu khách trên thiết bị. Đăng nhập không tự nhập điểm, đánh giá hoặc trận đấu.';
 if(state.mode==='loading')return 'Học viện: đang xác định nguồn dữ liệu, chưa thể lưu điểm.';
 if(state.mode==='error')return 'Không đọc được kho hoạt động tài khoản. Chưa chuyển sang ghi dữ liệu khách; đọc lại hoặc xuất cache trong Dữ liệu.';
 return 'Học viện, đánh giá, nhật ký tập và trận đấu: kho tài khoản trên thiết bị · chỉ gửi khi bấm đồng bộ. Giáo án và lựa chọn cá nhân có nguồn riêng trong Dữ liệu. Lựa chọn bài Học viện có nguồn giáo án riêng. Timer/checklist khi dùng tài khoản chỉ giữ trong phiên trang, không gửi lên cloud. Điểm và trận đấu không phải attendance hoặc DUPR.';
}
function emit(){
 for(const element of document.querySelectorAll('[data-activity-notice]')){element.textContent=notice();element.dataset.source=state.mode}
 document.dispatchEvent(new Event('pickleup:activity-data'));
}
function accept(next){
 state=next;const nextTag=next.owner+':'+next.mode+':'+(next.consent?.localRevision||'0');if(nextTag!==tag){token++;tag=nextTag}
 try{view=next.mode==='account'?core.project(next.projection,root.PICKLEUP_CURRICULUM||[],{activityCore:root.PickleUpActivityCore}):empty();domains=projectDomains(next.mode==='account'?next.projection:null)}
 catch(_){state={...next,mode:'error',error:'invalid_activity',snapshot:null,projection:null};view=empty();domains=projectDomains(null);token++}
 emit();
}
const ready=(async()=>{
 if(root.PICKLEUP_ACTIVITY_CONFIG?.enabled!==true||root.PICKLEUP_AUTH_CONFIG?.enabled!==true||!root.PICKLEUP_AUTH_CONFIG.url||!root.PICKLEUP_AUTH_CONFIG.publishableKey){accept({...state,mode:'guest'});return}
 if(typeof extra?.project!=='function'||typeof extra?.assessment!=='function'||typeof extra?.match!=='function'||typeof extra?.training!=='function'||root.PickleUpActivityController?.TRAINING_LIFECYCLE!==1){accept({mode:'error',owner:null,busy:false,error:'upgrade_required',snapshot:null,projection:null});return}
 try{
  const auth=await PickleUpAuth.getShared(PICKLEUP_AUTH_CONFIG);await auth.ready;
  const db=await PickleUpLocalRepository.open({onVersionChange:()=>{controller?.close();accept({mode:'error',owner:null,busy:false,error:'upgrade_required',snapshot:null,projection:null})}});
  if(db.trainingLifecycle!==1)throw Object.assign(Error('upgrade_required'),{code:'upgrade_required'});
  controller=PickleUpActivityController.create({auth,repository:db,enabled:()=>root.PICKLEUP_ACTIVITY_CONFIG?.enabled===true,onChange:accept});
  root.addEventListener('focus',()=>controller.refreshLocal().catch(()=>{}));await controller.ready;
 }catch(error){accept({mode:'error',owner:null,busy:false,error:error.code==='upgrade_required'?'upgrade_required':'storage_unavailable',snapshot:null,projection:null})}
})();
function canWrite(){if(state.busy)return false;return state.mode==='guest'||state.mode==='account'&&!state.busy&&!!state.snapshot?.cursor?.epoch}
async function saveEvent(kind,build){
 const stamp=token,id=root.crypto.randomUUID(),operationId=root.crypto.randomUUID(),value=build({eventId:root.crypto.randomUUID(),occurredAt:new Date().toISOString(),activityCore:root.PickleUpActivityCore});
 await ready;if(stamp!==token)throw new PickleUpActivityController.ActivityError('account_changed');if(state.mode!=='account'||!canWrite()||!controller)throw new PickleUpActivityController.ActivityError('source_unavailable');
 const result=await controller.createEvent({kind,id,operationId,value});if(stamp!==token)throw new PickleUpActivityController.ActivityError('account_changed');return {...result,id,value};
}
async function deleteEvent(kind,id,expectedLocalRevision){const stamp=token;await ready;if(stamp!==token)throw new PickleUpActivityController.ActivityError('account_changed');if(!controller||state.mode!=='account'||!canWrite()||!['academy_attempts','skill_assessments','match_records','training_entries'].includes(kind))throw new PickleUpActivityController.ActivityError('source_unavailable');const result=await controller.deleteEvent({kind,id,operationId:root.crypto.randomUUID(),expectedLocalRevision});if(stamp!==token)throw new PickleUpActivityController.ActivityError('account_changed');return result}
root.PICKLEUP_ACTIVITY={ready,notice,canWrite,isAccount:()=>state.mode!=='guest',token:()=>token,controller:()=>controller,
 getState:()=>structuredClone(state),getView:()=>({mode:state.mode,owner:state.owner,busy:state.busy,error:state.error}),
 raw(key){if(state.mode==='guest')return legacy(key);if(Object.values(keys).includes(key))return JSON.stringify(domains?.raw[key]??(key===keys.self?null:[]));if(![core.SCORES,core.HISTORY].includes(key))return legacy(key);return JSON.stringify(key===core.SCORES?view.records:view.history)},
 records(){if(state.mode!=='guest')return structuredClone(view.records);try{const rows=JSON.parse(legacy(core.SCORES)||'{}');return rows&&typeof rows==='object'&&!Array.isArray(rows)?rows:{}}catch(_){return {}}},
 history(){return state.mode==='guest'?(root.PICKLEUP_ACADEMY_TRENDS?.readHistory(legacy(core.HISTORY))||[]):structuredClone(view.history)},
 events(kind='academy_attempts'){return structuredClone(kind==='academy_attempts'?view.events:domains?.events[kind]||[])},
 assessments(type){if(state.mode!=='guest')return structuredClone(domains?.checks[type]||[]);try{const value=JSON.parse(legacy(keys[type])||'null');return type==='self'?(value?[value]:[]):Array.isArray(value)?value:[]}catch(_){return []}},
 training(){if(state.mode!=='guest')return structuredClone(domains?.training||[]);return root.PICKLEUP_TRAINING_LOG?.read(localStorage)||[]},
 canTrain(planId){const p=root.PICKLEUP_PLANS,s=p?.getState(),selected=p?.selected();return canWrite()&&state.mode==='account'&&s?.mode==='account'&&!s.busy&&s.owner===state.owner&&s.projection?.selectedPlan?.acknowledged===true&&s.snapshot?.cursor?.epoch===state.snapshot?.cursor?.epoch&&selected?.id===planId},
 async saveTraining(input){
  const captured=structuredClone(input),stamp=token,p=root.PICKLEUP_PLANS,planStamp=p?.token(),plan=p?.selected();
  if(!this.canTrain(captured.planId))throw new PickleUpActivityController.ActivityError('plan_unavailable');
  const ps=p.getState(),trainingPlan={localRevision:p.revision('personal_plans',plan.id),consentRevision:ps.consent.localRevision,epoch:ps.snapshot.cursor.epoch},value=extra.training(plan,captured,{eventId:root.crypto.randomUUID(),occurredAt:new Date().toISOString(),activityCore:root.PickleUpActivityCore});
  await ready;if(stamp!==token||planStamp!==p.token())throw new PickleUpActivityController.ActivityError('account_changed');
  if(!this.canTrain(plan.id))throw new PickleUpActivityController.ActivityError('plan_unavailable');
  const result=await controller.createEvent({kind:'training_entries',id:root.crypto.randomUUID(),operationId:root.crypto.randomUUID(),value,trainingPlan});
  if(stamp!==token||planStamp!==p.token())throw new PickleUpActivityController.ActivityError('account_changed');return result;
 },
 matches(){if(state.mode!=='guest')return structuredClone(domains?.matches||[]);try{const value=JSON.parse(legacy(keys.matches)||'[]');return Array.isArray(value)?value:[]}catch(_){return []}},
 saveAssessment(type,scores,level=null){const captured=structuredClone(scores);return saveEvent('skill_assessments',options=>extra.assessment(type,captured,level,options))},
 saveMatch(value){const captured=structuredClone(value);return saveEvent('match_records',options=>extra.match(captured,options))},
 async saveAttempt(lesson,score,conditions){
  const stamp=token,id=root.crypto.randomUUID(),operationId=root.crypto.randomUUID(),eventId=root.crypto.randomUUID(),value=core.attempt(lesson,score,{eventId,occurredAt:new Date().toISOString(),conditions:structuredClone(conditions),activityCore:root.PickleUpActivityCore});
  await ready;if(stamp!==token)throw new PickleUpActivityController.ActivityError('account_changed');if(state.mode!=='account'||!canWrite()||!controller)throw new PickleUpActivityController.ActivityError('source_unavailable');
  const result=await controller.createEvent({kind:'academy_attempts',id,operationId,value});if(stamp!==token)throw new PickleUpActivityController.ActivityError('account_changed');return result;
 },
 deleteEvent,deleteAttempt:(id,expectedLocalRevision)=>deleteEvent('academy_attempts',id,expectedLocalRevision)
};
document.addEventListener('pickleup:fragment-ready',()=>{for(const el of document.querySelectorAll('[data-activity-notice]')){el.textContent=notice();el.dataset.source=state.mode}});
})(window);
