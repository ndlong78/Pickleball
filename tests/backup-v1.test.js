const {test}=require('node:test'),assert=require('node:assert/strict');
const core=require('../modules/backup-v1-core.js'),{FIELDS}=require('../modules/legacy-storage.js');
for(const file of ['../modules/academy-trends-core.js','../training-log-core.js','../modules/weekly-goals-core.js','../modules/weekly-plan-core.js','../modules/weekly-checkins-core.js'])require(file);
const env={...globalThis,PICKLEUP_VALIDATE_ADVANCED_CHECKS:x=>Array.isArray(x)&&!x.length,PICKLEUP_VALIDATE_MATCHES:x=>Array.isArray(x)&&!x.length,PICKLEUP_VALIDATE_ADVANCED_PLANS:x=>Array.isArray(x)&&!x.length};
const minimal=()=>({app:'PickleUp',schemaVersion:1,scores:{'0':{score:5,date:'2026-11-11'}}});
test('old V1 backup remains accepted, absent sections preserve current state and explicit null clears choices',()=>{
 const data=core.parse(JSON.stringify({...minimal(),selectedPlan:null}),env),patch=core.patch(data,FIELDS);
 assert.deepEqual(patch.map(x=>x.key),[FIELDS.scores,FIELDS.selectedPlan]);assert.equal(patch[1].value,null);
});
test('invalid dates, assessment scales and malformed sections reject the whole file before any patch',()=>{
 for(const data of [{...minimal(),scores:{'0':{score:5,date:'2026-02-30'}}},{...minimal(),assessment:{answers:{serve:20}}},{...minimal(),academy:[]},{...minimal(),weeklyGoal:{days:99,level:'unknown'}}])assert.throws(()=>core.parse(JSON.stringify(data),env),{code:'invalid_data'});
});
test('capture fails closed on corrupt JSON or sanitized-invalid weekly data, without reading Auth',()=>{
 for(const raw of ['{bad','{"days":99}']){
  const source={getItem:key=>{assert.notEqual(key,'pickleup_auth_v6');return key===FIELDS.weeklyGoal?raw:null}};
  assert.throws(()=>core.capture(source,env,FIELDS),{code:'invalid_data'});
 }
});
test('empty guest capture round trips all V1 sections without account/session or device-only data',()=>{
 const data=core.capture({getItem:()=>null},env,FIELDS),restored=core.parse(JSON.stringify(data),env);
 assert.deepEqual(restored,data);assert.equal(core.patch(data,FIELDS).length,14);assert.equal(Object.hasOwn(data,'access_token'),false);
});
test('invalid JSON, oversized files and denied storage have bounded safe errors',()=>{
 assert.throws(()=>core.parse('{bad',env),{code:'invalid_json'});assert.throws(()=>core.parse(' '.repeat(core.MAX_BYTES+1),env),{code:'too_large'});
 assert.throws(()=>core.capture({getItem(){throw Error('private details')}},env,FIELDS),{code:'storage_unavailable'});
});

test('capture detects observed changes and credential-shaped data is never exported or restored',()=>{
 let reads=0;
 const source={getItem:key=>{reads++;return key===FIELDS.scores&&reads>14?'{}':null}};
 assert.throws(()=>core.capture(source,env,FIELDS),{code:'source_changed'});
 assert.throws(()=>core.parse(JSON.stringify({...minimal(),refresh_token:'synthetic'}),env),{code:'credentials_detected'});
});
