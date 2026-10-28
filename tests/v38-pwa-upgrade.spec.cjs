const {test,expect}=require("@playwright/test");
test("V3.8 upgrades legacy PWA cache without erasing local training data",async({page})=>{
 await page.goto("/?page=home");
 await page.evaluate(async()=>{
  localStorage.setItem("pickleup_v38_migration_probe",JSON.stringify({hits:13,date:"2026-10-28"}));
  const old=await caches.open("pickleup-shell-v3-6-vitals-versioned");
  await old.put("./legacy-v36-probe",new Response("old"));
  const current=await caches.open("pickleup-shell-v3-7-fragments");
  await current.put("./v37-probe",new Response("previous"));
  const registration=await navigator.serviceWorker.ready;
  await registration.update();
  await new Promise(resolve=>setTimeout(resolve,300));
 });
 const result=await page.evaluate(async()=>{
  const keys=await caches.keys();
  return {keys,record:JSON.parse(localStorage.getItem("pickleup_v38_migration_probe"))};
 });
 expect(result.record.hits).toBe(13);
 expect(result.keys).not.toContain("pickleup-shell-v3-6-vitals-versioned");
 expect(result.keys).not.toContain("pickleup-shell-v3-7-fragments");
 expect(result.keys).toContain("pickleup-shell-v3-8-upgrade");
});
test("V3.8 caches a visited advanced page for later offline reuse",async({page,context})=>{
 await page.goto("/?page=academy");
 await expect(page.locator("#academyWeek option")).toHaveCount(80);
 await page.evaluate(async()=>{await navigator.serviceWorker.ready;await navigator.serviceWorker.controller?.postMessage({type:"PICKLEUP_SKIP_WAITING"})});
 const cached=await page.evaluate(async()=>{
  const c=await caches.open("pickleup-shell-v3-8-upgrade");
  const keys=await c.keys();
  return keys.map(x=>new URL(x.url).pathname);
 });
 expect(cached.some(x=>x.endsWith("/pages/academy.html"))).toBe(true);
 await context.setOffline(true);
 await page.reload();
 await expect(page.locator("#academyWeek option")).toHaveCount(80);
 await context.setOffline(false);
});
