const {test,expect}=require("@playwright/test");
const {navigate}=require('./helpers/navigation.cjs');
test("V5.24.0 upgrades legacy PWA cache without erasing local training data",async({page})=>{
 await page.goto("/?page=home");
 await page.evaluate(async()=>{
  localStorage.setItem("pickleup_v38_migration_probe",JSON.stringify({hits:13,date:"2026-10-28"}));
  const old=await caches.open("pickleup-shell-v3-6-vitals-versioned");
  await old.put("./legacy-v36-probe",new Response("old"));
  const previous=await caches.open("pickleup-shell-v3-7-fragments");
  await previous.put("./v37-probe",new Response("previous"));
  const v50=await caches.open("pickleup-shell-v5-0-stable");
  await v50.put("./v50-probe",new Response("previous journey"));
  const v54=await caches.open("pickleup-shell-v5-4-stable");
  await v54.put("./v54-probe",new Response("previous pilot assets"));
  const v541=await caches.open("pickleup-shell-v5-4-1-stable");
  await v541.put("./v541-probe",new Response("previous sender API cache"));
  const v55=await caches.open("pickleup-shell-v5-5-0-stable");
  await v55.put("./v55-probe",new Response("previous activity lifecycle assets"));
  const v56=await caches.open("pickleup-shell-v5-6-0-stable");
  await v56.put("./v56-probe",new Response("previous Academy source assets"));
  const v57=await caches.open("pickleup-shell-v5-7-0-stable");await v57.put("./v57-probe",new Response("previous plan client assets"));
  const v58=await caches.open("pickleup-shell-v5-8-0-stable");await v58.put("./v58-probe",new Response("previous plan UI assets"));
  const v59=await caches.open("pickleup-shell-v5-9-0-stable");await v59.put("./v59-probe",new Response("previous training UI assets"));
  const v510=await caches.open("pickleup-shell-v5-10-0-stable");await v510.put("./v510-probe",new Response("previous Academy choice assets"));
  const v511=await caches.open("pickleup-shell-v5-11-0-stable");await v511.put("./v511-probe",new Response("previous Academy device state"));
  const v512=await caches.open("pickleup-shell-v5-12-0-stable");await v512.put("./v512-probe",new Response("previous Court checkpoint"));
  const v513=await caches.open("pickleup-shell-v5-13-0-stable");await v513.put("./v513-probe",new Response("previous staging Auth config"));
  const v5131=await caches.open("pickleup-shell-v5-13-1-stable");await v5131.put("./v5131-probe",new Response("previous staging release"));
  const v514=await caches.open("pickleup-shell-v5-14-0-stable");await v514.put("./v514-probe",new Response("previous staging sync status"));
  const v5141=await caches.open("pickleup-shell-v5-14-1-stable");await v5141.put("./v5141-probe",new Response("previous sync feedback release"));
  const v515=await caches.open("pickleup-shell-v5-15-0-stable");await v515.put("./v515-probe",new Response("previous ungated Auth release"));
  const v5151=await caches.open("pickleup-shell-v5-15-1-stable");await v5151.put("./v5151-probe",new Response("previous repository version1"));
  const v517=await caches.open("pickleup-shell-v5-17-0-stable");await v517.put("./v517-probe",new Response("previous cache maintenance"));
  const v518=await caches.open("pickleup-shell-v5-18-0-stable");await v518.put("./v518-probe",new Response("previous four-tab navigation"));
  const v519=await caches.open("pickleup-shell-v5-19-0-stable");await v519.put("./v519-probe",new Response("previous flat Academy lesson"));
  const v520=await caches.open("pickleup-shell-v5-20-0-stable");await v520.put("./v520-probe",new Response("previous generated Academy content"));
  const v521=await caches.open("pickleup-shell-v5-21-0-stable");await v521.put("./v521-probe",new Response("previous CMS release"));
  const v5211=await caches.open("pickleup-shell-v5-21-1-stable");await v5211.put("./v5211-probe",new Response("previous Settings link label"));
  const v522=await caches.open("pickleup-shell-v5-22-0-stable");await v522.put("./v522-probe",new Response("previous assessment version release"));
  const v523=await caches.open("pickleup-shell-v5-23-0-stable");await v523.put("./v523-probe",new Response("previous CMS test unlock"));
  const v516=await caches.open("pickleup-shell-v5-16-0-stable");await v516.put("./v516-probe",new Response("previous cache transactions"));
  await v513.put('./modules/auth-config.js?v=5.13.0',new Response('window.PICKLEUP_AUTH_CONFIG={enabled:true,url:"missing-scheme.invalid",publishableKey:"sb_publishable_synthetic"};',{headers:{'Content-Type':'application/javascript'}}));
  // A different script URL for the same scope installs and activates a fresh worker, which
  // exercises install/activate and cache cleanup the way a real release does (the app never
  // unregisters). If the browser leaves that worker in "waiting", pwa-client asks it again.
  const registration=await navigator.serviceWorker.register("./sw.js?migration-test=1");
  await navigator.serviceWorker.ready;
  await registration.update();
 });
 await expect.poll(async()=>await page.evaluate(async()=>{const keys=await caches.keys();return ["pickleup-shell-v3-6-vitals-versioned","pickleup-shell-v3-7-fragments","pickleup-shell-v5-0-stable","pickleup-shell-v5-4-stable","pickleup-shell-v5-4-1-stable","pickleup-shell-v5-5-0-stable","pickleup-shell-v5-6-0-stable","pickleup-shell-v5-7-0-stable","pickleup-shell-v5-8-0-stable","pickleup-shell-v5-9-0-stable","pickleup-shell-v5-10-0-stable","pickleup-shell-v5-11-0-stable","pickleup-shell-v5-12-0-stable","pickleup-shell-v5-13-0-stable","pickleup-shell-v5-13-1-stable","pickleup-shell-v5-14-0-stable","pickleup-shell-v5-14-1-stable","pickleup-shell-v5-15-0-stable","pickleup-shell-v5-17-0-stable","pickleup-shell-v5-18-0-stable","pickleup-shell-v5-19-0-stable","pickleup-shell-v5-20-0-stable","pickleup-shell-v5-21-0-stable","pickleup-shell-v5-21-1-stable","pickleup-shell-v5-22-0-stable","pickleup-shell-v5-23-0-stable"].every(name=>!keys.includes(name))})).toBe(true);
 const result=await page.evaluate(async()=>{
  const keys=await caches.keys();
  return {keys,record:JSON.parse(localStorage.getItem("pickleup_v38_migration_probe"))};
 });
 expect(result.record.hits).toBe(13);
 expect(result.keys).not.toContain("pickleup-shell-v5-17-0-stable");
 expect(result.keys).not.toContain("pickleup-shell-v5-16-0-stable");
 expect(result.keys).not.toContain("pickleup-shell-v5-15-0-stable");
 expect(result.keys).not.toContain("pickleup-shell-v3-6-vitals-versioned");
 expect(result.keys).not.toContain("pickleup-shell-v3-7-fragments");
 expect(result.keys).not.toContain("pickleup-shell-v5-0-stable");
 expect(result.keys).not.toContain("pickleup-shell-v5-4-stable");
 expect(result.keys).not.toContain("pickleup-shell-v5-5-0-stable");
 expect(result.keys).not.toContain("pickleup-shell-v5-6-0-stable");
 expect(result.keys).not.toContain("pickleup-shell-v5-13-0-stable");
 expect(result.keys).not.toContain("pickleup-shell-v5-13-1-stable");
 expect(result.keys).not.toContain("pickleup-shell-v5-14-0-stable");
 expect(result.keys).not.toContain("pickleup-shell-v5-14-1-stable");
 expect(result.keys).not.toContain("pickleup-shell-v5-18-0-stable");
 expect(result.keys).not.toContain("pickleup-shell-v5-19-0-stable");
 expect(result.keys).not.toContain("pickleup-shell-v5-20-0-stable");
 expect(result.keys).not.toContain("pickleup-shell-v5-21-0-stable");
 expect(result.keys).not.toContain("pickleup-shell-v5-21-1-stable");
 expect(result.keys).not.toContain("pickleup-shell-v5-22-0-stable");
 expect(result.keys).not.toContain("pickleup-shell-v5-23-0-stable");
 expect(result.keys).toContain("pickleup-shell-v5-24-0-stable");
 await page.evaluate(()=>PICKLEUP_ROUTER.openPage('settings'));await page.evaluate(()=>PICKLEUP_PAGE_LOADER.ensure('settings'));
 await expect(page.locator('#accountRescue [role=status]')).toContainText('chưa được cấu hình');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('pickleup_v38_migration_probe')).hits)).toBe(13);
});
test("V5.24.0 caches a visited advanced page for later offline reuse",async({page,context})=>{
 await page.goto("/?page=home");
 await page.evaluate(async()=>{await navigator.serviceWorker.ready});
 await page.reload(); // ensure the active service worker controls the document
 await expect.poll(async()=>page.evaluate(()=>Boolean(navigator.serviceWorker.controller))).toBe(true);
 await navigate(page,'academy');
 await expect(page.locator("#academyWeek option")).toHaveCount(80);
 const cached=await page.evaluate(async()=>{
  const c=await caches.open("pickleup-shell-v5-24-0-stable");
  const keys=await c.keys();
  return keys.map(x=>new URL(x.url).pathname);
 });
 expect(cached.some(x=>x.endsWith("/pages/academy.html"))).toBe(true);
 await context.setOffline(true);
 await page.reload();
 await expect(page.locator("#academyWeek option")).toHaveCount(80);
 await context.setOffline(false);
});
test('V5.24.0 restores the visited match route and its new activity modules offline under Pickleball',async({page,context})=>{
 await page.goto('/Pickleball/?page=matches');await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();
 await expect.poll(()=>page.evaluate(()=>Boolean(navigator.serviceWorker.controller))).toBe(true);
 await page.evaluate(()=>PICKLEUP_PAGE_LOADER.ensure('matches'));await expect(page.locator('#matchFocus option')).toHaveCount(11);
 await page.locator('#matchOurs').fill('11');await page.locator('#matchTheirs').fill('9');await page.locator('#matchSave').click();await expect(page.locator('#matchSummary')).toContainText('1 trận');
 await expect.poll(()=>page.evaluate(async()=>{const c=await caches.open('pickleup-shell-v5-24-0-stable'),keys=(await c.keys()).map(x=>new URL(x.url).pathname);return ['modules/data/activity-source-core.js','modules/data/activity-history-ui.js','match-journal.js','pages/matches.html'].every(x=>keys.includes('/Pickleball/'+x))})).toBe(true);
 await context.setOffline(true);await page.reload();await expect(page.locator('#matchSummary')).toContainText('1 trận');await expect(page.locator('#matchSave')).toBeEnabled();expect(new URL(page.url()).pathname).toBe('/Pickleball/');await context.setOffline(false);
});

test('V5.24.0 caches the visited plan runtime and restores direct Court offline with flags off',async({page,context})=>{
 await page.goto('/Pickleball/');await page.evaluate(()=>navigator.serviceWorker.ready);await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
 await page.goto('/Pickleball/?page=court');await page.evaluate(()=>PICKLEUP_PAGE_LOADER.ensure('court'));await expect.poll(()=>page.evaluate(async()=>{const c=await caches.open('pickleup-shell-v5-24-0-stable'),keys=(await c.keys()).map(x=>new URL(x.url).pathname);return ['modules/data/activity-source-core.js','modules/data/activity-runtime.js','modules/data/plan-config.js','modules/data/plan-core.js','modules/data/plan-controller.js','modules/data/plan-runtime.js','modules/data/court-checkpoint-runtime.js','practice-runner.js','pages/court.html'].every(x=>keys.includes('/Pickleball/'+x))})).toBe(true);await context.setOffline(true);await page.reload();await expect(page.locator('#pcRunEmpty')).toBeVisible();expect(await page.evaluate(()=>PICKLEUP_PLANS.getState().mode)).toBe('guest');
});

test('V5.24.0 restores guest Academy choice and practice state offline under Pickleball',async({page,context})=>{await page.goto('/Pickleball/');await page.evaluate(()=>navigator.serviceWorker.ready);await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);await page.goto('/Pickleball/?page=academy');await expect(page.locator('#academyWeek option')).toHaveCount(80);await page.locator('#academyWeek').selectOption('PU-037');await page.locator('#academyStepList input').first().check();await expect.poll(()=>page.evaluate(async()=>{const cache=await caches.open('pickleup-shell-v5-24-0-stable'),keys=(await cache.keys()).map(x=>new URL(x.url).pathname);return ['modules/academy-page.js','modules/data/plan-runtime.js','modules/data/academy-practice-runtime.js','pages/academy.html'].every(x=>keys.includes('/Pickleball/'+x))})).toBe(true);await context.setOffline(true);await page.reload();await expect(page.locator('#academyWeek')).toHaveValue('PU-037');await expect(page.locator('#academyStepList input').first()).toBeChecked();expect(await page.evaluate(()=>localStorage.getItem('pickleup_academy_last_lesson_v4'))).toBe('PU-037');expect(await page.evaluate(()=>PICKLEUP_PLANS.isAccount())).toBe(false);await context.setOffline(false)});


test('V5.24.0 restores visited Settings and account rescue modules offline with guest controls disabled',async({page,context})=>{
 await page.goto('/Pickleball/');await page.evaluate(()=>navigator.serviceWorker.ready);await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);await page.goto('/Pickleball/?page=settings');await page.evaluate(()=>PICKLEUP_PAGE_LOADER.ensure('settings'));
 await expect.poll(()=>page.evaluate(async()=>{const c=await caches.open('pickleup-shell-v5-24-0-stable'),paths=(await c.keys()).map(r=>new URL(r.url).pathname);return ['modules/auth-origin.js','modules/auth-config.js','pages/settings.html','modules/data/account-rescue-core.js','modules/data/restore-preview-core.js','modules/data/account-rescue-controller.js','modules/data/account-rescue-ui.js'].every(p=>paths.includes('/Pickleball/'+p))})).toBe(true);
 await context.setOffline(true);await page.reload();await expect(page.locator('[data-account-capture]')).toBeDisabled();await expect(page.locator('#accountRescue [role=status]')).toContainText('chưa được cấu hình');await expect(page.locator('#rescuePanel [data-refresh]')).toBeEnabled();expect(new URL(page.url()).pathname).toBe('/Pickleball/');await context.setOffline(false);
});
