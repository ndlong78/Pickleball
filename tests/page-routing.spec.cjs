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
