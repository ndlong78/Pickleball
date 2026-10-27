const {test,expect}=require("@playwright/test");
const devices=[
 {name:"iPhone SE",width:320,height:568},
 {name:"iPhone",width:390,height:844},
 {name:"iPhone Plus",width:430,height:932},
 {name:"iPad portrait",width:820,height:1180},
 {name:"iPad landscape",width:1180,height:820},
 {name:"Desktop PC",width:1440,height:900}
];
for(const screen of devices){
 test.describe(screen.name,()=>{
  test.use({viewport:{width:screen.width,height:screen.height},isMobile:screen.width<1024,hasTouch:screen.width<1024});
  test("page and adaptive layout have no horizontal overflow",async({page})=>{
   await page.goto("/");
   await expect(page.locator("#weekList .week").first()).toBeVisible();
   const overflow=await page.evaluate(()=>({
    viewport:document.documentElement.clientWidth,
    document:document.documentElement.scrollWidth,
    offenders:[...document.querySelectorAll("body *")].filter(el=>{
     const box=el.getBoundingClientRect();
     return box.width>0&&(box.right>document.documentElement.clientWidth+3||box.left< -3)
       &&getComputedStyle(el).position!=="fixed";
    }).slice(0,12).map(el=>el.tagName.toLowerCase()+"."+(el.className?.baseVal||el.className||""))
   }));
   expect(overflow.document,JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.viewport+2);
   const dock=page.locator("#pickleupMobileDock");
   await expect(dock).toBeVisible();
   expect(await dock.evaluate(node=>getComputedStyle(node).position)).toBe("fixed");
   expect(await dock.locator("a").count()).toBe(4);
   const start=await dock.boundingBox();
   expect(start).not.toBeNull();
   await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
   await page.waitForTimeout(200);
   const end=await dock.boundingBox();
   expect(end).not.toBeNull();
   expect(Math.abs(start.y-end.y)).toBeLessThanOrEqual(2);
   expect(end.y+end.height).toBeLessThanOrEqual(screen.height+2);
   expect(end.y).toBeGreaterThanOrEqual(-2);
  });
  test("persistent menu links navigate to all four sections",async({page})=>{
   await page.goto("/");
   const links=[
    {href:"#personalCoach",target:"personalCoach"},
    {href:"#pcOnCourt",target:"pcOnCourt"},
    {href:"#trainingHistory",target:"trainingHistory"},
    {href:"#academy",target:"academy"}
   ];
   for(const link of links){
    await page.locator('#pickleupMobileDock a[href="'+link.href+'"]').click();
    await expect(page.locator("#"+link.target)).toBeInViewport();
    await expect(page.locator('#pickleupMobileDock a[href="'+link.href+'"]')).toHaveAttribute("aria-current","location");
   }
  });
  test("personal coach and on-court timer can be used without clipped controls",async({page})=>{
   await page.goto("/");
   const scores={serve:15,return:13,dink:12,volley:14,position:16,strategy:10};
   for(const [skill,value] of Object.entries(scores))await page.locator("#pc-"+skill).fill(String(value));
   await page.locator("#pcGenerate").click();
   await expect(page.locator("#pcPlan")).toContainText("Chiến thuật");
   await page.locator("#pcOpenRun").click();
   await expect(page.locator("#pcRunPlayer")).toBeVisible();
   const buttons=["pcRunStart","pcRunReset","pcRunPrev","pcRunNext"];
   for(const id of buttons){
    const box=await page.locator("#"+id).boundingBox();
    expect(box).not.toBeNull();
    expect(box.height).toBeGreaterThanOrEqual(44);
   }
   await page.locator("#pcRunNext").click();
   await expect(page.locator("#pcAttemptArea")).toBeVisible();
   await page.locator("#pcAttemptHits").fill("11");
   await page.locator("#pcAttemptSave").click();
   await expect(page.locator("#pcRunMessage")).toContainText("Đã lưu");
   await page.locator("#thRefresh").click();
   await expect(page.locator("#thTotal")).toContainText("1 lần tập");
  });
 });
}
