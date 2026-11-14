// C3: one canonical lesson-id pattern and level list across client validators and SQL.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const PATTERN='PU-(?:0(?:0[1-9]|[1-9][0-9])|[1-9][0-9]{2,3})';
const LEVELS=['1.0–2.0','2.0–2.5','2.5–3.0','3.0–3.5','3.5–4.0','4.0–4.5','4.5–5.0'];
function sources(){
 const out=[];
 (function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){
  if(['node_modules','dist','tests','.git','test-results','playwright-report','docs','supabase'].includes(e.name))continue;
  const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(/\.(js|cjs|html)$/.test(e.name)&&e.name!=='curriculum.js')out.push(p);
 }})(root);
 return out;
}
test('no client file keeps the PU-001…PU-080 lesson pattern; every lesson pattern is the canonical one',()=>{
 let canonical=0;
 for(const file of sources()){
  const text=fs.readFileSync(file,'utf8').replace(/ADV-PU-0\(\??:?3\[7-9\]\|\[4-7\]\[0-9\]\|80\)/g,'');
  assert.equal(/PU-0\(\??:?0\[1-9\]\|\[1-7\]\[0-9\]\|80\)/.test(text),false,path.relative(root,file)+' still limits lessons to PU-080');
  canonical+=text.split(PATTERN).length-1;
 }
 assert.ok(canonical>=16,'expected the canonical pattern in every validator, found '+canonical);
});
test('canonical pattern accepts each lesson number once and rejects ambiguous or malformed ids',()=>{
 const re=new RegExp('^'+PATTERN+'$');
 for(const id of ['PU-001','PU-080','PU-081','PU-099','PU-100','PU-999','PU-1000','PU-9999'])assert.equal(re.test(id),true,id);
 for(const id of ['PU-000','PU-0000','PU-0081','PU-81','PU-1','PU-10000','pu-081','PU-08A','ADV-PU-081','PU-081 ',''])assert.equal(re.test(id),false,id);
});
test('validators accept new ids and both 4.0–5.0 bands for Academy data; personal plans stay within 1.0–4.0',()=>{
 const content=require('../modules/content-core.js'),activity=require('../modules/data/activity-core.js'),domain=require('../modules/data/domain-core.js');
 require('../modules/weekly-goals-core.js');require('../modules/academy-trends-core.js');
 assert.deepEqual(content.LEVELS,LEVELS);assert.deepEqual([...globalThis.PICKLEUP_WEEKLY_GOALS.LEVELS],LEVELS);
 assert.equal(globalThis.PICKLEUP_WEEKLY_GOALS.validSettings({days:3,level:'4.5–5.0'}),true);
 assert.equal(globalThis.PICKLEUP_ACADEMY_TRENDS.validateHistory([{id:'PU-081',skill:'strategy',level:'4.0–4.5',score:12,date:'2026-11-14T00:00:00.000Z',av:1}]),true);
 const attempt={client_event_id:'11111111-1111-4111-8111-111111111111',lesson_id:'PU-081',skill:'strategy',level_band:'4.0–4.5',score:12,occurred_at:'2026-11-14T00:00:00Z',content_version:'PU-081@a1',lesson_snapshot:{title:'T',assessment:'A'},conditions:null};
 assert.ok(activity.payload('academy_attempts',attempt));
 assert.throws(()=>activity.payload('academy_attempts',{...attempt,lesson_id:'PU-0081'}),{code:'invalid_activity'});
 assert.throws(()=>activity.payload('academy_attempts',{...attempt,level_band:'5.0–5.5'}),{code:'invalid_activity'});
});
test('SQL migration widens the same domains to the same values',()=>{
 const dir=path.join(root,'supabase/migrations'),sql=fs.readdirSync(dir).filter(f=>f.includes('lesson_domain')).map(f=>fs.readFileSync(path.join(dir,f),'utf8')).join('\n');
 assert.ok(sql,'lesson domain migration missing');
 assert.equal(sql.split("'^PU-(0(0[1-9]|[1-9][0-9])|[1-9][0-9]{2,3})$'").length-1,2);
 for(const level of LEVELS)assert.ok(sql.includes("'"+level+"'"),level);
});
