const {test,expect}=require("@playwright/test");
test("V5.4.1 upgrades legacy PWA cache without erasing local training data",async({page})=>{
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
  const oldRegistration=await navigator.serviceWorker.getRegistration();
  if(oldRegistration)await oldRegistration.unregister();
  // A fresh install exercises install/activate and cache cleanup.
  const registration=await navigator.serviceWorker.register("./sw.js?migration-test=1");
  await navigator.serviceWorker.ready;
  await registration.update();
 });
 await expect.poll(async()=>await page.evaluate(async()=>{const keys=await caches.keys();return ["pickleup-shell-v3-6-vitals-versioned","pickleup-shell-v3-7-fragments","pickleup-shell-v5-0-stable","pickleup-shell-v5-4-stable"].every(name=>!keys.includes(name))})).toBe(true);
 const result=await page.evaluate(async()=>{
  const keys=await caches.keys();
  return {keys,record:JSON.parse(localStorage.getItem("pickleup_v38_migration_probe"))};
 });
 expect(result.record.hits).toBe(13);
 expect(result.keys).not.toContain("pickleup-shell-v3-6-vitals-versioned");
 expect(result.keys).not.toContain("pickleup-shell-v3-7-fragments");
 expect(result.keys).not.toContain("pickleup-shell-v5-0-stable");
 expect(result.keys).not.toContain("pickleup-shell-v5-4-stable");
 expect(result.keys).toContain("pickleup-shell-v5-4-1-stable");
});
test("V5.4.1 caches a visited advanced page for later offline reuse",async({page,context})=>{
 await page.goto("/?page=home");
 await page.evaluate(async()=>{await navigator.serviceWorker.ready});
 await page.reload(); // ensure the active service worker controls the document
 await expect.poll(async()=>page.evaluate(()=>Boolean(navigator.serviceWorker.controller))).toBe(true);
 await page.locator('#pageNavigation a[data-route="academy"]').click();
 await expect(page.locator("#academyWeek option")).toHaveCount(80);
 const cached=await page.evaluate(async()=>{
  const c=await caches.open("pickleup-shell-v5-4-1-stable");
  const keys=await c.keys();
  return keys.map(x=>new URL(x.url).pathname);
 });
 expect(cached.some(x=>x.endsWith("/pages/academy.html"))).toBe(true);
 await context.setOffline(true);
 await page.reload();
 await expect(page.locator("#academyWeek option")).toHaveCount(80);
 await context.setOffline(false);
});
