const {test,expect}=require('@playwright/test');
test.use({trace:'off',screenshot:'off',video:'off',serviceWorkers:'block'});
const owner='11111111-1111-4111-8111-111111111111';
async function setup(context,{drop=false,delay=false}={}){
 let manifest,number=0,dropped=false;const receipts=new Map(),changes=[];
 await context.exposeBinding('IMPORT_RPC_TEST',async(_,{owner,name,args})=>{
  if(name==='pull_changes')return {status:'ok',changes:structuredClone(changes),next_revision:'0',high_water:'0',epoch:null,has_more:false};
  if(receipts.has(args.p_operation_id))return structuredClone(receipts.get(args.p_operation_id));
  if(name==='begin_import')manifest={id:'33333333-3333-4333-8333-333333333333',user_id:owner,source_fingerprint:args.p_source_fingerprint,manifest_hash:args.p_manifest_hash,source_item_count:args.p_source_item_count,revision:'1',status:'staging',counts:{applied:0,reused:0,...args.p_excluded}};
  if(name==='import_batch'){for(const item of args.p_items)changes.push({entity_kind:item.kind,entity_key:'44444444-4444-4444-8444-444444444444',row:{user_id:owner,revision:'1',...item.payload}});manifest.revision=String(++number+1);manifest.counts.applied++}
  if(name==='finish_import'){manifest.status='committed';manifest.revision=String(++number+1)}
  const response={status:'applied',import:structuredClone(manifest)};
  if(name==='import_batch')response.items=args.p_items.map(item=>({source_path:item.source_path,target_key:'44444444-4444-4444-8444-444444444444',status:'applied'}));
  receipts.set(args.p_operation_id,structuredClone(response));if(drop&&name==='import_batch'&&!dropped){dropped=true;return {status:'network_error'}}return response;
 });
 await context.route('**/modules/data/import-config.js*',r=>r.fulfill({contentType:'text/javascript',body:'window.PICKLEUP_IMPORT_CONFIG={enabled:true}'}));
 await context.route('**/modules/auth-config.js*',r=>r.fulfill({contentType:'text/javascript',body:'window.PICKLEUP_AUTH_CONFIG={enabled:true,url:"https://fixture.invalid",publishableKey:"sb_publishable_fixture"}'}));
 await context.route('**/modules/auth-adapter.js*',r=>r.fulfill({contentType:'text/javascript',body:`(()=>{
 let current={id:'${owner}',email:'fixture@example.invalid'},listeners=new Set();window.IMPORT_CALLS=[];
 window.SWITCH_IMPORT_ACCOUNT=()=>{current={id:'22222222-2222-4222-8222-222222222222',email:'b@example.invalid'};for(const fn of [...listeners])fn({user:current,status:'authenticated'})};
 const auth={ready:Promise.resolve(),subscribe(fn){listeners.add(fn);fn({user:current,status:'authenticated'});return ()=>listeners.delete(fn)},logout:async()=>({}),privateRead:async()=>({status:'ok'}),async importRpc(owner,name,args){window.IMPORT_CALLS.push({owner,name,args});if(${delay}&&name==='begin_import')await new Promise(resolve=>window.RELEASE_IMPORT=resolve);return window.IMPORT_RPC_TEST({owner,name,args})}};window.PickleUpAuth={getShared:async()=>auth};})();`}));
}
async function source(page){await expect(page.locator('[data-import-body]')).toBeVisible();await expect(page.locator('#importPilot input[type=file]')).toBeEnabled();await page.locator('#importPilot input[type=file]').setInputFiles({name:'synthetic.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({app:'PickleUp',schemaVersion:1,scores:{0:{score:5,date:'2026-01-01T10:00:00Z'}}}))});await expect(page.locator('#importPilot [role=status]')).toContainText('Tệp đã đọc')}
async function preview(page){await page.locator('[data-import-groups] input[value=scores]').check();await page.locator('[data-import-preview]').click();await expect(page.locator('#importPilot [role=status]')).toContainText('Preview sẵn sàng')}
async function consent(page){await page.locator('[data-import-rescue]').check();await page.locator('[data-import-consent]').check()}
test('shipped flag stays off and guest/rescue stay available',async({page})=>{await page.goto('/Pickleball/?page=settings');await expect(page.locator('#importPilot')).toBeVisible();await expect(page.locator('[data-import-body]')).toBeHidden();await expect(page.locator('#rescuePanel')).toBeVisible()});
for(const width of [390,820,1180,1440])test('mock Auth/RPC, real mapper and IDB: explicit consent and no legacy writes '+width,async({page,context})=>{
 await setup(context);await page.setViewportSize({width,height:900});await page.goto('/Pickleball/?page=settings');await expect(page.locator('[data-import-body]')).toBeVisible();
 const before=await page.evaluate(()=>{localStorage.setItem('pickleup_scores','{"keep":"original"}');return JSON.stringify(Object.entries(localStorage).sort())});
 await source(page);await preview(page);await expect(page.locator('[data-import-start]')).toBeDisabled();expect(await page.evaluate(()=>IMPORT_CALLS.filter(c=>c.name==='begin_import').length)).toBe(0);
 await consent(page);await page.locator('[data-import-start]').click();await expect(page.locator('#importPilot [role=status]')).toContainText('Phiên nhập đã hoàn tất');
 expect(await page.evaluate(()=>IMPORT_CALLS.map(c=>c.name))).toEqual(['pull_changes','begin_import','import_batch','finish_import','pull_changes']);expect(await page.evaluate(()=>JSON.stringify(Object.entries(localStorage).sort()))).toBe(before);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(2);
});
test('timeout resume reload replays same ID/body from native IDB checkpoint',async({page,context})=>{
 await setup(context,{drop:true});await page.goto('/Pickleball/?page=settings');await source(page);await preview(page);await consent(page);await page.locator('[data-import-start]').click();await expect(page.locator('#importPilot [role=status]')).toContainText('Lỗi mạng');
 const old=await page.evaluate(()=>IMPORT_CALLS.find(c=>c.name==='import_batch').args);
 await page.reload();await source(page);await page.locator('[data-import-preview]').click();await expect(page.locator('#importPilot [role=status]')).toContainText('Checkpoint đã khôi phục');await expect(page.locator('[data-import-groups] input[value=scores]')).toBeChecked();await expect(page.locator('[data-import-groups] input[value=scores]')).toBeDisabled();await consent(page);await page.locator('[data-import-start]').click();await expect(page.locator('#importPilot [role=status]')).toContainText('Phiên nhập đã hoàn tất');
 const replay=await page.evaluate(()=>IMPORT_CALLS.filter(c=>c.name==='import_batch').at(-1).args);expect(replay).toEqual(old);
});
test('switch A to B clears private preview and ignores late A response',async({page,context})=>{
 await setup(context,{delay:true});await page.goto('/Pickleball/?page=settings');await source(page);await preview(page);await consent(page);await page.locator('[data-import-start]').click();await page.waitForFunction(()=>typeof window.RELEASE_IMPORT==='function');await page.evaluate(()=>{SWITCH_IMPORT_ACCOUNT();RELEASE_IMPORT()});await expect(page.locator('[data-import-account]')).toContainText('b@example.invalid');await expect(page.locator('[data-import-summary]')).toBeEmpty();expect(await page.evaluate(()=>IMPORT_CALLS.filter(c=>c.name==='import_batch').length)).toBe(0);
});
test('quarantine requires explicit acceptance and report preserves exact source text',async({page,context})=>{
 await setup(context);await page.goto('/Pickleball/?page=settings');await expect(page.locator('[data-import-body]')).toBeVisible();await expect(page.locator('#importPilot input[type=file]')).toBeEnabled();
 const text='  '+JSON.stringify({app:'PickleUp',schemaVersion:1,scores:{0:{score:5,date:'2026-01-01T10:00:00Z'},1:{score:'5',date:'2026-01-01T10:00:00Z'},2:{score:6,date:'2026-01-01T10:00:00Z',future:'unknown'}}})+'\n';
 await page.locator('#importPilot input[type=file]').setInputFiles({name:'quarantine.json',mimeType:'application/json',buffer:Buffer.from(text)});await expect(page.locator('#importPilot [role=status]')).toContainText('Tệp đã đọc');await page.locator('[data-import-groups] input[value=scores]').check();await page.locator('[data-import-preview]').click();await expect(page.locator('#importPilot [role=status]')).toContainText('Còn mục');await page.getByRole('button',{name:'Giữ mục này trong quarantine'}).click();await page.locator('[data-import-preview]').click();await expect(page.locator('#importPilot [role=status]')).toContainText('Preview sẵn sàng');await consent(page);await expect(page.locator('[data-import-start]')).toBeDisabled();
 const pending=page.waitForEvent('download');await page.locator('[data-import-report]').click();const downloaded=await pending;const artifact=JSON.parse(await require('node:fs/promises').readFile(await downloaded.path(),'utf8'));expect(artifact.sourceText).toBe(text);expect(artifact.report.some(row=>row.disposition==='invalid')).toBe(true);
 await page.locator('[data-import-quarantine]').check();await page.locator('[data-import-start]').click();await expect(page.locator('#importPilot [role=status]')).toContainText('Phiên nhập đã hoàn tất');
});
