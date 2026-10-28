const {test,expect}=require("@playwright/test");
test("V4.5 Stable upgrades legacy PWA cache without erasing local training data",async({page})=>{
 await page.goto("/?page=home");
 await page.evaluate(async()=>{
  localStorage.setItem("pickleup_v38_migration_probe",JSON.stringify({hits:13,date:"2026-10-28"}));
  const old=await caches.open("pickleup-shell-v3-6-vitals-versioned");
  await old.put("./legacy-v36-probe",new Response("old"));
  const previous=await caches.open("pickleup-shell-v3-7-fragments");
  await previous.put("./v37-probe",new Response("previous"));
  const oldRegistration=await navigator.serviceWorker.getRegistration();
  if(oldRegistration)await oldRegistration.unregister();
  // A fresh install exercises install/activate and cache cleanup.
  const registration=await navigator.serviceWorker.register("./sw.js?migration-test=1");
  await navigator.serviceWorker.ready;
  await registration.update();
 });
 await expect.poll(async()=>await page.evaluate(async()=>!(await caches.keys()).includes("pickleup-shell-v3-7-fragments"))).toBe(true);
 const result=await page.evaluate(async()=>{
  const keys=await caches.keys();
  return {keys,record:JSON.parse(localStorage.getItem("pickleup_v38_migration_probe"))};
 });
 expect(result.record.hits).toBe(13);
 expect(result.keys).not.toContain("pickleup-shell-v3-6-vitals-versioned");
 expect(result.keys).not.toContain("pickleup-shell-v3-7-fragments");
 expect(result.keys).toContain("pickleup-shell-v4-5-stable");
});
test("V4.5 Stable caches a visited advanced page for later offline reuse",async({page,context})=>{
 await page.goto("/?page=home");
 await page.evaluate(async()=>{await navigator.serviceWorker.ready});
 await page.reload(); // ensure the active service worker controls the document
 await expect.poll(async()=>page.evaluate(()=>Boolean(navigator.serviceWorker.controller))).toBe(true);
 await page.locator('#pageNavigation a[data-route="academy"]').click();
 await expect(page.locator("#academyWeek option")).toHaveCount(80);
 const cached=await page.evaluate(async()=>{
  const c=await caches.open("pickleup-shell-v4-5-stable");
  const keys=await c.keys();
  return keys.map(x=>new URL(x.url).pathname);
 });
 expect(cached.some(x=>x.endsWith("/pages/academy.html"))).toBe(true);
 await context.setOffline(true);
 await page.reload();
 await expect(page.locator("#academyWeek option")).toHaveCount(80);
 await context.setOffline(false);
});
