const {test}=require('node:test'),assert=require('node:assert/strict'),core=require('../modules/data/account-rescue-core.js');
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
const blank=()=>({owner:A,repositoryVersion:1,coverage:'local-cache-only',stores:Object.fromEntries(Object.keys(core.STORES).map(k=>[k,[]]))});
const row=(extra={})=>({namespace:'user:'+A,key:'example',...extra});
test('complete seven-store rescue retains unknown/corrupt JSON, frozen requests and history beyond legacy limits',async()=>{
 const s=blank();s.stores.records=Array.from({length:1201},(_,i)=>({namespace:'user:'+A,kind:'training_entries',id:'synthetic-'+i,base:null,overlay:{note:'Giữ nguyên \n tiếng Việt'},localRevision:'1'}));s.stores.outbox=[{namespace:'user:'+A,operationId:'op-1',state:'sending',request:{p_epoch:'old',p_payload:{score:12}},payload:{badLegacyValue:null}}];s.stores.conflicts=[{namespace:'user:'+A,conflictId:'op-1',state:'open',resolution:{local:{unknown:['raw',null]}}}];s.stores.device_state=[{namespace:'user:'+A,deviceId:'local-device',key:'future-format',value:{corruptButJSON:'{bad'}}];s.stores.metadata=[row({key:'operation:op-1',signature:'{"value":{"target_days":3}}'})];const saved=await core.create(s,{expectedOwner:A}),opened=await core.preview(saved.text,{expectedOwner:A});assert.deepEqual(opened.artifact.payload.snapshot,s);assert.equal(opened.report.counts.records,1201);assert.equal(opened.report.pending,1);assert.equal(opened.report.uncertain,1);assert.equal(opened.report.openConflicts,1);assert.equal(opened.report.deviceStates,1);
});
test('semantic checksum detects edits but does not depend on object property order',async()=>{
 const saved=await core.create(blank());const artifact=JSON.parse(saved.text);artifact.payload.snapshot.stores.metadata.push(row());await assert.rejects(core.preview(JSON.stringify(artifact)),{code:'checksum_mismatch'});const reordered=JSON.parse(saved.text);reordered.payload={snapshot:reordered.payload.snapshot,exportedAt:reordered.payload.exportedAt};await core.preview(JSON.stringify(reordered));
});
test('rejects account mismatch, nested foreign rows and duplicate primary keys without activating anything',async()=>{
 const saved=await core.create(blank());await assert.rejects(core.preview(saved.text,{expectedOwner:B}),{code:'foreign_account'});for(const field of [{namespace:'user:'+B},{user_id:B}]){const s=blank();s.stores.metadata=[row({value:field})];await assert.rejects(core.create(s),{code:'foreign_account'})}const s=blank();s.stores.metadata=[row(),row()];await assert.rejects(core.create(s),{code:'duplicate_key'});
});
test('excludes credentials in nested keys, serialized signatures, URL encodings and raw values',async()=>{
 const samples=[{access_token:'synthetic'},{refreshToken:'synthetic'},{'%61ccess_token':'synthetic'},'{"authorization":"synthetic"}','Bearer synthetic','sb_secret_synthetic','eyJsynthetic.eyJsynthetic.synthetic','access_token%3Dsynthetic','postgresql://u:p@fixture.invalid/db'];for(const value of samples){const s=blank();s.stores.metadata=[row({value})];await assert.rejects(core.create(s),{code:'credentials_detected'})}
});
test('rejects non-JSON values and complexity instead of silently dropping data',async()=>{
 for(const value of [undefined,NaN,1n,new Date(),Object.assign([],{extra:'hidden'})]){const s=blank();s.stores.metadata=[row({value})];await assert.rejects(core.create(s),{code:'unsupported_value'})}const s=blank();let nested={};for(let i=0;i<45;i++)nested={nested};s.stores.metadata=[row({value:nested})];await assert.rejects(core.create(s),{code:'too_complex'});
});
test('bounded preview rejects oversized files and unsupported envelope/schema/store sets',async()=>{
 await assert.rejects(core.preview(' '.repeat(core.MAX_BYTES+1)),{code:'too_large'});await assert.rejects(core.preview('{bad'),{code:'invalid_json'});const s=blank();s.stores.extra=[];await assert.rejects(core.create(s),{code:'invalid_format'});const a=await core.create(blank());const artifact=JSON.parse(a.text);artifact.version=2;await assert.rejects(core.preview(JSON.stringify(artifact)),{code:'invalid_format'});
});
test('inventory uses data-safe state keys and never interprets them as prototypes or training totals',async()=>{
 const s=blank();s.stores.outbox=[{namespace:'user:'+A,operationId:'x',state:'__proto__'},{namespace:'user:'+A,operationId:'y',state:'constructor'}];const {report}=await core.create(s);assert.deepEqual(report.outboxStates,[['__proto__',1],['constructor',1]]);assert.equal(report.pending,2);assert.equal({}.polluted,undefined);
});

test('credential inspection unwraps encoded JSON, repeated URI layers and credential assignments',async()=>{
 const entries=[encodeURIComponent(JSON.stringify({access_token:'synthetic'})),encodeURIComponent(encodeURIComponent(JSON.stringify({refresh_token:'synthetic'}))),'api_key=synthetic','"service_role":"synthetic"'];
 for(const entry of entries){const s=blank();s.stores.metadata=[row({value:entry})];await assert.rejects(core.create(s),{code:'credentials_detected'})}
 const s=blank();s.stores.metadata=[row({value:{'%2561ccess_token':'synthetic'}})];await assert.rejects(core.create(s),{code:'credentials_detected'});
});
