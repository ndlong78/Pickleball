const {test,expect}=require('@playwright/test');
const fs=require('node:fs/promises');
test.use({trace:'off',screenshot:'off',video:'off'});
for(const width of [390,820,1180,1440])test('raw rescue preserves legacy and excludes Auth at '+width,async({page})=>{
 await page.setViewportSize({width,height:900});
 await page.goto('/Pickleball/?page=settings');
 await expect(page.locator('#rescuePanel')).toBeVisible();
 const before=await page.evaluate(()=>{localStorage.setItem('pickleup_scores','{broken');localStorage.setItem('pickleup_weekly_goal_v46','');localStorage.setItem('pickleup_practice_state_v25','{"running":true}');localStorage.setItem('pickleup_auth_v6','fixture-only');localStorage.setItem('pickleup_future','[1,2]');return JSON.stringify(Object.entries(localStorage).sort())});
 await page.locator('[data-refresh]').click();await expect(page.locator('#rescuePanel tbody tr')).toHaveCount(18);
 await expect(page.locator('#rescuePanel [role=status]')).toContainText('Chưa xác thực');
 await expect(page.locator('[data-excluded]')).toContainText('Đã loại 1');
 await page.locator('[data-unknown] input').check();await expect(page.locator('#rescuePanel tbody tr')).toHaveCount(19);
 const pending=page.waitForEvent('download');await page.locator('[data-download]').click();const download=await pending;
 const artifact=JSON.parse(await fs.readFile(await download.path(),'utf8'));
 expect(artifact.entries).toHaveLength(19);expect(artifact.entries.find(e=>e.key==='pickleup_scores').raw).toBe('{broken');expect(artifact.entries.find(e=>e.key==='pickleup_weekly_goal_v46').raw).toBe('');expect(artifact.entries.find(e=>e.key==='pickleup_auth_v6')).toBeUndefined();
 expect(await page.evaluate(()=>JSON.stringify(Object.entries(localStorage).sort()))).toBe(before);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(2);
});
test('preview files is read-only, identifies Home and renders unknown labels as text',async({page})=>{
 await page.goto('/Pickleball/?page=settings');await expect(page.locator('#rescuePanel')).toBeVisible();
 const before=await page.evaluate(()=>JSON.stringify(Object.entries(localStorage).sort()));
 await page.locator('#rescuePanel input[type=file]').setInputFiles({name:'home.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({app:'PickleUp',records:[{week:1,score:3},{week:1,score:3}],'<img src=x onerror=alert(1)>':true}))});
 await expect(page.locator('[data-source]')).toContainText('home-records');
 await expect(page.locator('#rescuePanel tbody')).toContainText('<img src=x onerror=alert(1)>');expect(await page.locator('#rescuePanel tbody img').count()).toBe(0);
 await expect(page.locator('[data-download]')).toBeDisabled();
 expect(await page.evaluate(()=>JSON.stringify(Object.entries(localStorage).sort()))).toBe(before);
});
test('changed snapshot and invalid file produce safe errors without writes',async({page})=>{
 await page.goto('/Pickleball/?page=settings');await page.locator('[data-refresh]').click();await expect(page.locator('[data-download]')).toBeEnabled();
 await page.evaluate(()=>localStorage.setItem('pickleup_scores','{"changed":true}'));await page.locator('[data-download]').click();
 await expect(page.locator('#rescuePanel [role=status]')).toContainText('Dữ liệu đang thay đổi');
 await page.locator('#rescuePanel input[type=file]').setInputFiles({name:'broken.json',mimeType:'application/json',buffer:Buffer.from('{broken')});
 await expect(page.locator('#rescuePanel [role=status]')).toContainText('không phải JSON');expect(await page.evaluate(()=>localStorage.getItem('pickleup_scores'))).toBe('{"changed":true}');
});
test('visited settings and rescue remain available after offline reload',async({page,context})=>{
 await page.goto('/Pickleball/?page=home');
 await page.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));localStorage.setItem('pickleup_weekly_goal_v46','{"days":2}')});
 await page.goto('/Pickleball/?page=settings');await expect(page.locator('#rescuePanel')).toBeVisible();
 await context.setOffline(true);try{await page.reload();await expect(page.locator('#rescuePanel')).toBeVisible();await page.locator('[data-refresh]').click();await expect(page.locator('#rescuePanel tbody tr')).toHaveCount(18);await expect(page.locator('[data-download]')).toBeEnabled()}finally{await context.setOffline(false)}
});
