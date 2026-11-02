const {test,expect}=require("@playwright/test");
const sizes=[
 {name:"iPhone",width:390,height:844},
 {name:"iPad portrait",width:820,height:1180},
 {name:"iPad landscape",width:1180,height:820},
 {name:"Desktop PC",width:1440,height:900}
];
for(const size of sizes){
 test.describe("Routed PickleUp pages - "+size.name,()=>{
  test.use({viewport:{width:size.width,height:size.height}});
  test("opens each of eight functional pages directly without exposing other modules",async({page})=>{
   const routes=[
    ["home","homeWeeks"],
    ["journey","journeyFlow"],
    ["coach","personalCoach"],
    ["court","pcOnCourt"],
    ["academy","academy"],
    ["progress","dashboard"],
    ["matches","matchJournal"],
    ["settings","backup"]
   ];
   for(const [route,id] of routes){
    await page.goto("/?page="+route);
    await expect(page.locator("#"+id)).toBeVisible();
    await expect(page.locator('#pageNavigation a[data-route="'+route+'"]')).toHaveAttribute("aria-current","page");
    await expect(page.locator("#pageHeading")).not.toBeEmpty();
    if(route!=="home")await expect(page.locator("#homeHero")).toBeHidden();
   }
   await expect(page.locator("#pickleupMobileDock")).toBeVisible();
  });
  test("fixed bottom navigation and browser Back preserve route state",async({page})=>{
   await page.goto("/?page=coach");
   await page.locator('#pickleupMobileDock a[href="#pcOnCourt"]').click();
   await expect(page).toHaveURL(/page=court/);
   await expect(page.locator("#pcOnCourt")).toBeVisible();
   await expect(page.locator('#pickleupMobileDock a[href="#pcOnCourt"]')).toHaveAttribute("aria-current","page");
   await page.goBack();
   await expect(page).toHaveURL(/page=coach/);
   await expect(page.locator("#personalCoach")).toBeVisible();
   await expect(page.locator("#pcOnCourt")).toBeHidden();
  });
  test("legacy deep links navigate to their new page and data is not reset during navigation",async({page})=>{
   await page.goto("/#matchJournal");
   await expect(page).toHaveURL(/page=matches/);
   await expect(page.locator("#matchJournal")).toBeVisible();
   await page.evaluate(()=>localStorage.setItem("pickleup-route-smoke","saved"));
   await page.locator('#pageNavigation a[data-route="progress"]').click();
   await expect(page.locator("#trainingHistory")).toBeVisible();
   expect(await page.evaluate(()=>localStorage.getItem("pickleup-route-smoke"))).toBe("saved");
   await page.locator('#pageNavigation a[data-route="settings"]').click();
   await expect(page.locator("#backup")).toBeVisible();
  });
 });
}
test.describe('optional font loading',()=>{
 test.use({serviceWorkers:'block'});
 test('delayed optional font does not block load, dock navigation or Progress controls',async({page})=>{
  let release,reached,settled=false;const gate=new Promise(resolve=>release=resolve),requested=new Promise(resolve=>reached=resolve);
  await page.route('https://fonts.googleapis.com/**',async route=>{reached();await gate;settled=true;await route.fulfill({contentType:'text/css',body:'/* controlled optional font response */'}).catch(()=>{})});
  try{
   // This is intentionally load, not domcontentloaded: the held font must be optional.
   await page.goto('/Pickleball/?page=home',{waitUntil:'load'});await requested;
   expect(await page.evaluate(()=>performance.getEntriesByType('navigation')[0].loadEventEnd>0)).toBe(true);expect(settled).toBe(false);
   await page.locator('#pickleupMobileDock a[href="#personalCoach"]').click();await page.evaluate(()=>PICKLEUP_PAGE_LOADER.ensure('coach'));await expect(page.locator('#personalCoach')).toBeInViewport();await expect(page.locator('#pickleupMobileDock a[href="#personalCoach"]')).toHaveAttribute('aria-current','page');
   await page.locator('#pickleupMobileDock a[href="#trainingHistory"]').click();await page.evaluate(()=>PICKLEUP_PAGE_LOADER.ensure('progress'));await page.locator('#aiRefresh').click();await expect(page.locator('#aiCount')).toHaveText('0');await expect(page.locator('#pickleupMobileDock a[href="#trainingHistory"]')).toHaveAttribute('aria-current','page');expect(settled).toBe(false);
  }finally{release();await page.unrouteAll({behavior:'wait'})}
 });
});
