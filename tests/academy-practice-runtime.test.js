const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
test('late failed device read cannot erase a newer successful checklist write in the same account',async()=>{
 const document=new EventTarget(),events=new EventTarget(),owner='11111111-1111-4111-8111-111111111111';
 const row={localRevision:'0',value:{schemaVersion:1,lessons:{}}};let rejectRead,held=false;
 const scope={close(){},async getAcademyPractice(){if(held)return new Promise((_,reject)=>rejectRead=reject);return structuredClone(row)},async changeAcademyPractice(){return {localRevision:'1',value:{schemaVersion:1,lessons:{'PU-037':{checked:[0],focus:0}}}}}};
 const window={addEventListener:events.addEventListener.bind(events),PickleUpLocalRepository:{open:async()=>({scope:()=>scope})},PICKLEUP_PLAN_CONFIG:{enabled:true},PICKLEUP_ACTIVITY_CONFIG:{enabled:false},PICKLEUP_PLANS:{token:()=>1,getState:()=>({mode:'account',owner,consent:{enabled:true,localRevision:'1'}})},PICKLEUP_ACTIVITY:{token:()=>1,getState:()=>({mode:'guest',owner:null})}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../modules/data/academy-practice-runtime.js'),'utf8'),{window,document,Event,structuredClone});
 await new Promise(setImmediate);const runtime=window.PICKLEUP_ACADEMY_PRACTICE;assert.equal(runtime.getState().mode,'account');
 held=true;const stale=runtime.refresh();await new Promise(setImmediate);await runtime.edit({lessonId:'PU-037',action:'check',index:0,checked:true});
 rejectRead(Object.assign(Error('synthetic'),{code:'storage_unavailable'}));await stale;
 assert.equal(runtime.getState().mode,'account');assert.deepEqual(runtime.getState().row.value.lessons['PU-037'].checked,[0]);assert.equal(runtime.getState().error,null);
});
