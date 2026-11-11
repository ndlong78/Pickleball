const {test}=require('node:test'),assert=require('node:assert/strict');
const core=require('../modules/legacy-storage.js');
const scores=core.FIELDS.scores,assessment=core.FIELDS.assessment;
function store(initial={}){
 const values=new Map(Object.entries(initial));return {values,getItem:key=>values.get(key)??null,setItem(key,value){values.set(key,value)},removeItem(key){values.delete(key)}};
}
const patch=[{key:scores,value:'new scores'},{key:assessment,value:null}];
test('guest restore commits all intended keys, clears explicit null, preserves absent and Auth',()=>{
 const s=store({[scores]:'old',[assessment]:'old assessment',pickleup_auth_v6:'never read',pickleup_academy_v2:'keep'});
 assert.equal(core.apply(s,patch).status,'committed');assert.equal(s.getItem(scores),'new scores');assert.equal(s.getItem(assessment),null);assert.equal(s.getItem(core.JOURNAL),null);assert.equal(s.getItem('pickleup_auth_v6'),'never read');assert.equal(s.getItem('pickleup_academy_v2'),'keep');
});
test('quota at durable preimage refuses all guest writes',()=>{
 const s=store({[scores]:'old',[assessment]:'old assessment'}),before=new Map(s.values),set=s.setItem;
 s.setItem=(key,value)=>{if(key===core.JOURNAL)throw Error('quota');set(key,value)};
 assert.throws(()=>core.apply(s,patch),{code:'rolled_back'});assert.deepEqual(s.values,before);
});
test('every observed interruption prefix recovers exact preimages before feature reads',()=>{
 const s=store({[scores]:'old',[assessment]:'old assessment'}),snapshots=[],set=s.setItem,remove=s.removeItem;
 s.setItem=(key,value)=>{set(key,value);snapshots.push(new Map(s.values))};s.removeItem=key=>{remove(key);snapshots.push(new Map(s.values))};
 core.apply(s,patch);
 for(const snapshot of snapshots.filter(x=>x.has(core.JOURNAL))){const crashed=store(Object.fromEntries(snapshot));assert.equal(core.recover(crashed).status,'rolled_back');assert.equal(crashed.getItem(scores),'old');assert.equal(crashed.getItem(assessment),'old assessment');assert.equal(crashed.getItem(core.JOURNAL),null)}
});
test('failure after mutation rolls back, including a storage API that throws after a put',()=>{
 for(const after of [false,true]){
  const s=store({[scores]:'old',[assessment]:'old assessment'}),remove=s.removeItem;let fail=true;
  s.removeItem=key=>{if(key===assessment&&fail){fail=false;if(after)remove(key);throw Error('quota')}remove(key)};
  assert.throws(()=>core.apply(s,patch),{code:'rolled_back'});assert.equal(s.getItem(scores),'old');assert.equal(s.getItem(assessment),'old assessment');assert.equal(s.getItem(core.JOURNAL),null);
 }
});
test('rollback failure preserves journal, and a later recovery completes old state',()=>{
 const s=store({[scores]:'old',[assessment]:'old assessment'}),set=s.setItem,remove=s.removeItem;let broken=true;
 s.setItem=(key,value)=>{if(broken&&key===scores&&value==='old')throw Error('quota');set(key,value)};
 s.removeItem=key=>{if(broken&&key===assessment)throw Error('quota');remove(key)};
 assert.throws(()=>core.apply(s,patch),{code:'recovery_required'});assert.ok(s.getItem(core.JOURNAL));broken=false;assert.equal(core.recover(s).status,'rolled_back');assert.equal(s.getItem(scores),'old');assert.equal(s.getItem(assessment),'old assessment');
});
test('observed concurrent values stop recovery without overwriting the other intent',()=>{
 const journal={version:1,phase:'applying',entries:[{key:scores,before:'old',after:'new'}]},s=store({[scores]:'different intent',[core.JOURNAL]:JSON.stringify(journal)}),before=new Map(s.values);
 assert.deepEqual(core.recover(s),{status:'blocked',code:'concurrent_change'});assert.deepEqual(s.values,before);
});
test('malformed journals cannot write Auth, foreign keys, duplicates or unbounded values',()=>{
 for(const entries of [[{key:'pickleup_auth_v6',before:'old',after:'new'}],[{key:scores,before:'old',after:'new'},{key:scores,before:'old',after:null}],[{key:scores,before:{bad:true},after:'new'}]]){
  const s=store({[core.JOURNAL]:JSON.stringify({version:1,phase:'applying',entries})}),before=new Map(s.values);assert.equal(core.recover(s).status,'blocked');assert.deepEqual(s.values,before);
 }
 assert.throws(()=>core.apply(store(),Array(1)),{code:'invalid_patch'});
});
test('emergency rescue never reads Auth or unknown origin keys and refuses credential content',()=>{
 const s=store({pickleup_auth_v6:'do not export',[scores]:'old'}),get=s.getItem;
 s.getItem=key=>{assert.notEqual(key,'pickleup_auth_v6');return get(key)};
 const rescue=JSON.parse(core.emergency(s));assert.equal(rescue.entries.length,18);assert.equal(rescue.entries.some(x=>x.key==='pickleup_auth_v6'),false);
 s.setItem(scores,'{"refresh_token":"synthetic"}');assert.throws(()=>core.emergency(s),{code:'credentials_detected'});
});

test('crash during rollback cleanup retains recoverable preimages at each durable prefix',()=>{
 const s=store({[scores]:'old',[assessment]:'old assessment'}),snapshots=[],set=s.setItem,remove=s.removeItem;let failed=false;
 s.setItem=(key,value)=>{set(key,value);snapshots.push(new Map(s.values))};
 s.removeItem=key=>{if(key===assessment&&!failed){failed=true;throw Error('quota')}remove(key);snapshots.push(new Map(s.values))};
 assert.throws(()=>core.apply(s,patch),{code:'rolled_back'});
 const interrupted=snapshots.filter(x=>x.has(core.JOURNAL)&&JSON.parse(x.get(core.JOURNAL)).phase==='rollback');assert.ok(interrupted.length>1);
 for(const snapshot of interrupted){const copy=store(Object.fromEntries(snapshot));assert.equal(core.recover(copy).status,'rolled_back');assert.equal(copy.getItem(scores),'old');assert.equal(copy.getItem(assessment),'old assessment')}
});
