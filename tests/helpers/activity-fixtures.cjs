'use strict';
const PLAN='55555555-5555-4555-8555-555555555555',WHEN='2026-01-01T10:00:00Z';
function payload(kind,eventId=crypto.randomUUID(),planId=PLAN){
 const shared={client_event_id:eventId,occurred_at:WHEN};
 if(kind==='academy_attempts')return {...shared,lesson_id:'PU-001',skill:'serve',level_band:'1.0–2.0',score:12,content_version:'test-1',lesson_snapshot:{title:'Synthetic serve',assessment:'20 controlled serves'},conditions:null};
 if(kind==='skill_assessments')return {...shared,assessment_type:'self',scale:2,scores:Object.fromEntries(['serve','return','dink','volley','position','strategy'].map(key=>[key,1]))};
 if(kind==='training_entries')return {...shared,plan_id:planId,exercise_id:'serve-1',skill:'serve',level_band:'1.0–2.0',kind:'drill',hits:12,attempts:20,note:'',conditions:null};
 if(kind==='match_records')return {...shared,mode:'doubles',ours:11,theirs:7,focus:'serve-return',note:'',doubles_issue:null};
 throw Error('Unknown synthetic kind');
}
module.exports={payload,PLAN,WHEN};
