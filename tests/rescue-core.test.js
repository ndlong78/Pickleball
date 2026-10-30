const {test}=require('node:test'),assert=require('node:assert/strict');
const core=require('../modules/data/rescue-core.js');
function storage(entries={}){const values=new Map(Object.entries(entries));return {get length(){return values.size},key:i=>[...values.keys()][i]??null,getItem:key=>values.has(key)?values.get(key):null}}
test('raw rescue preserves all18 keys, malformed/empty/absent and device state exactly',async()=>{
 const values={pickleup_scores:'{bad',pickleup_weekly_goal_v46:'',pickleup_practice_state_v25:'{"running":true}',pickleup_academy_last_lesson_v4:'PU-080'};
 const captured=await core.capture(storage(values));assert.equal(captured.entries.length,18);for(const [key,raw]of Object.entries(values))assert.equal(captured.entries.find(e=>e.key===key).raw,raw);
 assert.deepEqual(captured.entries.find(e=>e.key==='pickleup_week_plan_v47'),{key:'pickleup_week_plan_v47',present:false,raw:null});
 const preview=await core.preview(JSON.stringify(captured));assert.equal(preview.fingerprint,captured.fingerprint);assert.equal(preview.rows.find(r=>r.key==='pickleup_scores').status,'malformed');assert.equal(preview.rows.find(r=>r.key==='pickleup_weekly_goal_v46').status,'empty');assert.equal(preview.rows.find(r=>r.key==='pickleup_practice_state_v25').status,'device_only');assert.equal(preview.rows.find(r=>r.key==='pickleup_academy_last_lesson_v4').status,'readable');
});
test('unknown keys require selection, auth/session keys and embedded credential fields are excluded',async()=>{
 const source=storage({pickleup_future:'[1,2]',pickleup_auth_v6:'fixture-session',unrelated:'private'});assert.deepEqual(core.discover(source),{unknown:['pickleup_future'],excluded:1});
 const captured=await core.capture(source);assert.equal(captured.entries.length,18);assert.equal((await core.capture(source,{unknownKeys:['pickleup_future']})).entries.length,19);
 await assert.rejects(core.capture(source,{unknownKeys:['pickleup_auth_v6']}),{code:'unsafe_key'});
 await assert.rejects(core.capture(storage({pickleup_scores:'{"access_token":"fixture-only"}'})),{code:'credentials_detected'});
});
test('double read detects observed changes and denied storage fails without fallback',async()=>{
 let reads=0;const source=storage();source.getItem=key=>{reads++;return key==='pickleup_scores'?(reads<=18?'{}':'{"changed":true}'):null};await assert.rejects(core.capture(source),{code:'source_changed'});
 await assert.rejects(core.capture({get length(){throw Error('denied')}}),{code:'storage_unavailable'});
});
test('raw checksum rejects tampering/duplicates/missing keys while malformed raw remains exportable',async()=>{
 const captured=await core.capture(storage());captured.entries[0].raw='tampered';captured.entries[0].present=true;await assert.rejects(core.preview(JSON.stringify(captured)),{code:'checksum_mismatch'});
 const duplicate=await core.capture(storage());duplicate.entries.push(duplicate.entries[0]);await assert.rejects(core.preview(JSON.stringify(duplicate)),{code:'invalid_format'});
 const missing=await core.capture(storage());missing.entries.pop();await assert.rejects(core.preview(JSON.stringify(missing)),{code:'invalid_format'});
});
test('backup semantic hash ignores exportedAt and object order but preserves array order and missing fields',async()=>{
 const a={app:'PickleUp',schemaVersion:1,scores:{},academyHistory:[{score:1},{score:2}],exportedAt:'first'};
 const b={exportedAt:'second',academyHistory:[{score:1},{score:2}],scores:{},schemaVersion:1,app:'PickleUp'};
 const p=await core.preview(JSON.stringify(a)),q=await core.preview(JSON.stringify(b));assert.equal(p.fingerprint,q.fingerprint);assert.notEqual(p.fileHash,q.fileHash);assert.equal(p.rows.find(r=>r.key==='pickleup_weekly_goal_v46').status,'absent');assert.equal(p.rows.find(r=>r.key==='pickleup_weekly_goal_v46').count,0);
 b.academyHistory.reverse();assert.notEqual((await core.preview(JSON.stringify(b))).fingerprint,p.fingerprint);
});
test('Home backup detected separately; duplicate rows and over-legacy history are counted without trimming',async()=>{
 const home=await core.preview(JSON.stringify({app:'PickleUp',records:[{week:1,score:3},{week:1,score:3}]}));assert.equal(home.format,'home-records');assert.equal(home.rows[0].count,2);
 const captured=await core.capture(storage({pickleup_academy_history_v44:JSON.stringify(Array.from({length:501},()=>({id:'PU-001',score:5})))}));const p=await core.preview(JSON.stringify(captured));assert.equal(p.rows.find(r=>r.key==='pickleup_academy_history_v44').count,501);
});
test('unknown/deep formats and sparse non-JSON input fail with safe codes',async()=>{
 await assert.rejects(core.preview('not-json'),{code:'invalid_json'});await assert.rejects(core.preview('{"app":"Other"}'),{code:'invalid_format'});await assert.rejects(core.preview('{"app":"PickleUp","format":"future","schemaVersion":1,"scores":{}}'),{code:'invalid_format'});
});
