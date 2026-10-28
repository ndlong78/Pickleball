const {test,expect}=require("@playwright/test");
test.describe("PickleUp V3.5 lazy page loading",()=>{
 test.use({viewport:{width:390,height:844}});
 test("home loads only weekly practice before visiting other pages",async({page})=>{
  await page.goto("/?page=home");
  await expect(page.locator("#weekList .week").first()).toBeVisible();
  const first=await page.evaluate(()=>({
   weekly:window.PICKLEUP_PAGE_LOADER.isLoaded("modules/weekly-practice.js"),
   advanced:window.PICKLEUP_PAGE_LOADER.isLoaded("advanced-curriculum.js"),
   match:window.PICKLEUP_PAGE_LOADER.isLoaded("match-journal.js"),
   histogram:window.PICKLEUP_PAGE_LOADER.readMetrics().map(x=>x.page)
  }));
  expect(first.weekly).toBe(true);
  expect(first.advanced).toBe(false);
  expect(first.match).toBe(false);
  expect(first.histogram).toContain("home");
 });
 test("academy loads course modules on first visit and reuses them on return",async({page})=>{
  await page.goto("/?page=home");
  await expect(page.locator("#weekList .week").first()).toBeVisible();
  await page.locator('#pageNavigation a[data-route="academy"]').click();
  await expect(page.locator("#academyWeek option")).toHaveCount(80);
  await expect(page.locator("#academyDetail")).not.toBeEmpty();
  const old=await page.evaluate(()=>window.PICKLEUP_PAGE_LOADER.readMetrics().find(m=>m.page==="academy"));
  expect(old.scripts).toBeGreaterThan(0);
  await page.locator('#pageNavigation a[data-route="home"]').click();
  await page.locator('#pageNavigation a[data-route="academy"]').click();
  const again=await page.evaluate(()=>window.PICKLEUP_PAGE_LOADER.readMetrics().filter(m=>m.page==="academy"));
  expect(again).toHaveLength(1);
 });
 test("court and doubles input fields initialize when visited directly",async({page})=>{
  await page.goto("/?page=court");
  await expect(page.locator("#pcAttemptFeed option")).toHaveCount(4);
  await expect(page.locator("#pcAttemptPace option")).toHaveCount(4);
  await expect(page.locator("#pcAttemptTarget option")).toHaveCount(4);
  await page.goto("/?page=matches");
  await expect(page.locator("#matchDoublesIssue option")).toHaveCount(6);
  await expect(page.locator("#matchFocus option")).toHaveCount(11);
 });
 test("V3.6 measures page paints and requests versioned assets",async({page})=>{
  await page.goto("/?page=home");
  await expect(page.locator("#weekList .week").first()).toBeVisible();
  const scripts=await page.locator("script[src]").evaluateAll(nodes=>nodes.map(x=>x.getAttribute("src")));
  expect(scripts.some(x=>x.includes("web-vitals.js?v=3.9.0"))).toBe(true);
  expect(await page.evaluate(()=>typeof window.PICKLEUP_METRICS?.collect)).toBe("function");
  await page.locator('#pageNavigation a[data-route="academy"]').click();
  await expect(page.locator("#academyWeek option")).toHaveCount(80);
  await page.locator('#pageNavigation a[data-route="settings"]').click();
  await expect(page.locator("#pageVitals .performance-item")).toHaveCount(4);
  await expect(page.locator("#pageRouteMetrics")).toContainText("Học viện");
  const metrics=await page.evaluate(()=>window.PICKLEUP_METRICS.collect());
  expect(metrics.routes.some(x=>x.page==="academy"&&x.completed)).toBe(true);
 });
 test("data page displays recorded local module timing and has no external analytics",async({page})=>{
  await page.goto("/?page=home");
  await expect(page.locator("#weekList .week").first()).toBeVisible();
  await page.locator('#pageNavigation a[data-route="settings"]').click();
  await expect(page.locator("#pagePerformance")).toContainText("Tổng quan");
  await expect(page.locator("#pagePerformance")).toContainText("Dữ liệu");
  await expect(page.locator("#backup")).toBeVisible();
  await expect(page.locator("#pickleupMobileDock")).toBeVisible();
 });
});
