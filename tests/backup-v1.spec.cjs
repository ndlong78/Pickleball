const {test,expect}=require('@playwright/test'),fs=require('node:fs');
test.use({serviceWorkers:'block',trace:'off',screenshot:'off',video:'off'});
const SCORE='pickleup_scores',ACADEMY='pickleup_academy_v2',JOURNAL='pickleup_restore_journal_v1';
const before=JSON.stringify({'0':{score:7,date:'2026-11-11'}});
const file=data=>({name:'synthetic-backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({app:'PickleUp',schemaVersion:1,scores:{},...data}))});
async function settings(page){await page.goto('/Pickleball/?page=settings');await page.evaluate(()=>PICKLEUP_PAGE_LOADER.ensure('settings'))}
async function seed(context,extra={}){
 await context.addInitScript(({before,extra})=>{
  if(localStorage.getItem('pickleup_backup_fixture'))return;
  localStorage.setItem('pickleup_backup_fixture','1');localStorage.setItem('pickleup_scores',before);
  localStorage.setItem('pickleup_academy_v2','{}');for(const [key,value]of Object.entries(extra))localStorage.setItem(key,value);
 },{before,extra});
}
test('V1 export fails visibly on corrupt raw and known-key rescue survives discovery failure',async({page,context})=>{
 await seed(context,{[SCORE]:'{broken',pickleup_auth_v6:'synthetic session never exported'});await settings(page);
 await page.locator('#backupAll').click();await expect(page.locator('#backupStatus')).toContainText('Bản cứu hộ nguyên trạng');
 await page.evaluate(()=>Object.defineProperty(Storage.prototype,'length',{get:()=>5000}));
 await page.locator('#rescuePanel [data-refresh]').click();await expect(page.locator('#rescuePanel [role=status]')).toContainText('chỉ gồm đúng 18 khóa');
 const event=page.waitForEvent('download');await page.locator('#rescuePanel [data-download]').click();const artifact=JSON.parse(fs.readFileSync(await(await event).path(),'utf8'));
 expect(artifact.entries).toHaveLength(18);expect(artifact.entries.find(x=>x.key===SCORE).raw).toBe('{broken');expect(artifact.entries.some(x=>x.key==='pickleup_auth_v6')).toBe(false);
});
test('V1 restore quota after a guest write restores preimages and never reports success',async({page,context})=>{
 await seed(context);await settings(page);
 await page.evaluate(()=>{const original=Storage.prototype.setItem;let failed=false;Storage.prototype.setItem=function(key,value){if(key==='pickleup_academy_v2'&&!failed){failed=true;throw new DOMException('synthetic','QuotaExceededError')}return original.call(this,key,value)}});
 page.once('dialog',dialog=>dialog.accept());await page.locator('#restoreFile').setInputFiles(file({academy:{}}));
 await expect(page.locator('#backupStatus')).toContainText('đã quay lại dữ liệu trước đó');
 expect(await page.evaluate(key=>localStorage.getItem(key),SCORE)).toBe(before);expect(await page.evaluate(key=>localStorage.getItem(key),JOURNAL)).toBeNull();
});
test('V1 interrupted restore recovers before Home reads and preserves unrelated guest/Auth state',async({page,context})=>{
 const after=JSON.stringify({'0':{score:19,date:'2026-11-11'}});
 await seed(context,{[SCORE]:after,[JOURNAL]:JSON.stringify({version:1,phase:'applying',entries:[{key:SCORE,before,after}]}),pickleup_auth_v6:'synthetic session never read'});
 await page.goto('/Pickleball/?page=home');await expect(page.locator('#weekList .week').first()).toBeVisible();
 expect(await page.evaluate(key=>localStorage.getItem(key),SCORE)).toBe(before);expect(await page.evaluate(key=>localStorage.getItem(key),JOURNAL)).toBeNull();expect(await page.evaluate(()=>localStorage.getItem('pickleup_auth_v6')!==null)).toBe(true);
});
test('V1 unknown concurrent state blocks feature reads and offers a private emergency rescue',async({page,context})=>{
 const current='other intent',journal=JSON.stringify({version:1,phase:'applying',entries:[{key:SCORE,before,after:'new'}]});
 await seed(context,{[SCORE]:current,[JOURNAL]:journal,pickleup_auth_v6:'synthetic session never exported'});
 await page.goto('/Pickleball/?page=home');await expect(page.locator('#legacyStorageRecovery')).toBeVisible();expect(await page.evaluate(()=>PICKLEUP_PAGE_LOADER.isLoaded('modules/weekly-practice.js'))).toBe(false);
 expect(await page.evaluate(key=>localStorage.getItem(key),SCORE)).toBe(current);
 const event=page.waitForEvent('download');await page.getByRole('button',{name:'Xuất cứu hộ dữ liệu khách và nhật ký phục hồi'}).click();
 const artifact=JSON.parse(fs.readFileSync(await(await event).path(),'utf8'));expect(artifact.journalRaw).toBe(journal);expect(artifact.entries).toHaveLength(18);expect(artifact.entries.some(x=>x.key==='pickleup_auth_v6')).toBe(false);
});
test('V1 rollback failure keeps journal and a later reload finishes recovery',async({page,context})=>{
 await seed(context);await settings(page);
 await page.evaluate(()=>PICKLEUP_PAGE_LOADER.ensure('home'));
 await page.evaluate(before=>{
  const original=Storage.prototype.setItem;let failed=false;window.REPAIR_STORAGE=()=>Storage.prototype.setItem=original;
  Storage.prototype.setItem=function(key,value){if(key==='pickleup_academy_v2'){failed=true;throw new DOMException('synthetic','QuotaExceededError')}if(failed&&key==='pickleup_scores'&&value===before)throw new DOMException('synthetic','QuotaExceededError');return original.call(this,key,value)};
 },before);
 page.once('dialog',dialog=>dialog.accept());await page.locator('#restoreFile').setInputFiles(file({academy:{}}));await expect(page.locator('#legacyStorageRecovery')).toBeVisible();expect(await page.evaluate(key=>localStorage.getItem(key)!==null,JOURNAL)).toBe(true);
 expect(await page.evaluate(()=>PICKLEUP_PAGE_LOADER.ensure('progress').then(()=>false,()=>true))).toBe(true);
 expect(await page.evaluate(()=>PICKLEUP_PAGE_LOADER.ensure('home').then(()=>false,()=>true))).toBe(true);
 await page.evaluate(()=>PICKLEUP_ROUTER.openPage('home'));
 expect(await page.evaluate(()=>PICKLEUP_ROUTER.getPage())).toBe('settings');
 await page.evaluate(()=>REPAIR_STORAGE());await page.reload();await page.evaluate(()=>PICKLEUP_PAGE_LOADER.ensure('settings'));
 expect(await page.evaluate(key=>localStorage.getItem(key),SCORE)).toBe(before);expect(await page.evaluate(key=>localStorage.getItem(key),JOURNAL)).toBeNull();
});
test('V1 old partial backup preserves omitted fields; explicit null clears selected plan',async({page,context})=>{
 const assessment=JSON.stringify({answers:{serve:1,return:1,dink:1,volley:1,position:1,strategy:1}});
 await seed(context,{pickleup_assessment_v1:assessment,pickleup_selected_plan_v31:JSON.stringify({source:'basic',id:'old'})});await settings(page);
 page.once('dialog',dialog=>dialog.accept());await page.locator('#restoreFile').setInputFiles(file({selectedPlan:null}));
 await expect.poll(()=>page.evaluate(()=>localStorage.getItem('pickleup_selected_plan_v31'))).toBeNull();await page.evaluate(()=>PICKLEUP_PAGE_LOADER.ensure('settings'));
 expect(await page.evaluate(()=>localStorage.getItem('pickleup_assessment_v1'))).toBe(assessment);expect(await page.evaluate(key=>localStorage.getItem(key),JOURNAL)).toBeNull();
});
test('V1 missing Web Locks refuses restore before guest mutation while normal pages remain usable',async({page,context})=>{
 await seed(context);await context.addInitScript(()=>Object.defineProperty(navigator,'locks',{value:undefined}));await settings(page);
 page.once('dialog',dialog=>dialog.accept());await page.locator('#restoreFile').setInputFiles(file({}));await expect(page.locator('#backupStatus')).toContainText('chưa hỗ trợ khóa khôi phục an toàn');expect(await page.evaluate(key=>localStorage.getItem(key),SCORE)).toBe(before);expect(await page.evaluate(key=>localStorage.getItem(key),JOURNAL)).toBeNull();
});

test('V1 native two-tab lock rejects a second restore without changing guest data',async({page,context})=>{
 await seed(context);await settings(page);const tab=await context.newPage();await settings(tab);
 await page.evaluate(()=>{window.HELD_RESTORE=navigator.locks.request('pickleup-guest-restore-v1',async()=>{window.LOCK_IS_HELD=true;await new Promise(resolve=>window.RELEASE_RESTORE=resolve)})});
 await expect.poll(()=>page.evaluate(()=>window.LOCK_IS_HELD===true)).toBe(true);
 try{
  tab.once('dialog',dialog=>dialog.accept());await tab.locator('#restoreFile').setInputFiles(file({}));await expect(tab.locator('#backupStatus')).toContainText('Tab khác đang khôi phục');expect(await tab.evaluate(key=>localStorage.getItem(key),SCORE)).toBe(before);expect(await tab.evaluate(key=>localStorage.getItem(key),JOURNAL)).toBeNull();
 }finally{await page.evaluate(async()=>{RELEASE_RESTORE();await HELD_RESTORE});await tab.close()}
});
