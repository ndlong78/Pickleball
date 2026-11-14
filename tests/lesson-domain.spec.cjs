// C3: ids inside the widened domain but absent from this build's library (a lesson
// added by a newer build, or retired) must never break a page or drop other data.
const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'block'});
const DAY=new Date().toISOString();
const local=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
test('guest data that references an unknown PU-500 lesson keeps every route working and is preserved',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const today=local(new Date());
 await page.addInitScript(({DAY,today})=>{
  if(sessionStorage.getItem('seeded'))return;sessionStorage.setItem('seeded','1');
  localStorage.setItem('pickleup_academy_last_lesson_v4','PU-500');
  localStorage.setItem('pickleup_academy_history_v44',JSON.stringify([{id:'PU-500',skill:'strategy',level:'4.0–4.5',score:11,date:DAY,av:1},{id:'PU-001',skill:'serve',level:'1.0–2.0',score:9,date:DAY,av:1}]));
  localStorage.setItem('pickleup_academy_v2',JSON.stringify({'PU-500':{score:11,date:DAY,skill:'strategy',level:'4.0–4.5',av:1},'PU-001':{score:9,date:DAY,skill:'serve',level:'1.0–2.0',av:1}}));
  localStorage.setItem('pickleup_week_checkins_v48',JSON.stringify({schemaVersion:1,entries:{[today]:{status:'done',minutes:30,lessonId:'PU-500',updatedAt:DAY}}}));
 },{DAY,today});
 for(const route of ['home','academy','journey','progress','court','coach','matches','settings']){
  await page.goto('/Pickleball/?page='+route);
  await page.evaluate(route=>PICKLEUP_PAGE_LOADER.ensure(route),route);
  await expect(page.locator('[data-pickleup-page="'+route+'"]').first()).toBeVisible();
 }
 await page.goto('/Pickleball/?page=academy');
 await expect(page.locator('#academyWeek option')).toHaveCount(104);
 await expect(page.locator('#academyDetail')).not.toBeEmpty();
 await page.locator('#academyWeek').selectOption('PU-001');
 await expect(page.locator('#academyStatus')).toContainText('9/20');
 await page.locator('#academyScore').fill('12');await page.locator('#academySave').click();
 const stored=await page.evaluate(()=>({history:JSON.parse(localStorage.getItem('pickleup_academy_history_v44')),records:JSON.parse(localStorage.getItem('pickleup_academy_v2')),checkins:JSON.parse(localStorage.getItem('pickleup_week_checkins_v48'))}));
 expect(stored.history.map(x=>[x.id,x.score])).toEqual([['PU-500',11],['PU-001',9],['PU-001',12]]);
 expect(stored.records['PU-500'].score).toBe(11);
 expect(Object.values(stored.checkins.entries)[0].lessonId).toBe('PU-500');
 expect(errors).toEqual([]);
});
test('level filters and headings follow the published library, including both 4.0–5.0 bands',async({page})=>{
 await page.goto('/Pickleball/?page=academy');
 await expect(page.locator('#academy .sectionHead h2')).toHaveText('104 buổi tập từ 1.0 đến 5.0');
 await expect(page.locator('#academyLevel option')).toHaveText(['Tất cả','1.0–2.0','2.0–2.5','2.5–3.0','3.0–3.5','3.5–4.0','4.0–4.5','4.5–5.0']);
 await page.locator('#academyLevel').selectOption('4.5–5.0');
 await expect(page.locator('#academyWeek option')).toHaveCount(12);
 await page.goto('/Pickleball/?page=progress');await page.evaluate(()=>PICKLEUP_PAGE_LOADER.ensure('progress'));
 for(const id of ['#wgLevel','#aiLevel'])await expect(page.locator(id+' option')).toHaveText(['1.0–2.0','2.0–2.5','2.5–3.0','3.0–3.5','3.5–4.0','4.0–4.5','4.5–5.0']);
 await expect(page.locator('#dbLevel option')).toHaveText(['Toàn bộ 1.0–5.0','1.0–2.0','2.0–2.5','2.5–3.0','3.0–3.5','3.5–4.0','4.0–4.5','4.5–5.0']);
});
// Long lesson titles once widened #academyWeek past the viewport (852px of content in an 820px
// iPad viewport), which shifted the fixed dock under mobile emulation.
for(const [width,height] of [[320,568],[390,844],[820,1180],[1180,820],[1440,900]])test.describe('Academy width '+width,()=>{
 test.use({viewport:{width,height},isMobile:width<1024,hasTouch:width<1024});
 test('lesson pickers never overflow the page, whatever the longest lesson title',async({page})=>{
  await page.goto('/Pickleball/?page=academy');
  await expect(page.locator('#academyWeek option')).toHaveCount(104);
  for(const level of ['all','4.0–4.5','4.5–5.0']){
   await page.locator('#academyLevel').selectOption(level);
   const box=await page.evaluate(()=>{const de=document.documentElement,s=document.getElementById('academyWeek').getBoundingClientRect();return {scroll:de.scrollWidth,client:de.clientWidth,right:Math.round(s.right)}});
   expect(box.scroll,level).toBeLessThanOrEqual(box.client+1);
   expect(box.right,level).toBeLessThanOrEqual(box.client);
  }
 });
});
