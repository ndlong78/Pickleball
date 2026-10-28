const {test,expect}=require("@playwright/test");
const fs=require("node:fs"),path=require("node:path");
const profiles=[
 {name:"iphone-390",width:390,height:844,isMobile:true,hasTouch:true},
 {name:"ipad-820",width:820,height:1180,isMobile:true,hasTouch:true},
 {name:"ipad-landscape-1180",width:1180,height:820,isMobile:true,hasTouch:true},
 {name:"desktop-1440",width:1440,height:900,isMobile:false,hasTouch:false}
];
const routes=["home","coach","court","academy","progress","matches","settings"];
const results=[];
for(const profile of profiles){
 test.describe("V3.8 benchmark "+profile.name,()=>{
  test.use({viewport:{width:profile.width,height:profile.height},isMobile:profile.isMobile,hasTouch:profile.hasTouch});
  test("cold load and route transition samples",async({page})=>{
   const failed=[];
   page.on("pageerror",e=>failed.push(e.message));
   await page.goto("/?page=home");
   await page.locator("#weekList .week").first().waitFor();
   for(const id of routes){
    if(id!=="home")await page.locator('#pageNavigation a[data-route="'+id+'"]').click();
    await expect(page.locator("#pageHeading")).not.toBeEmpty();
    await page.waitForFunction(p=>window.PICKLEUP_PAGE_LOADER?.readMetrics().some(m=>m.page===p),id);
    const row=await page.evaluate(p=>{
      const mod=window.PICKLEUP_PAGE_LOADER.readMetrics().find(x=>x.page===p);
      const paint=window.PICKLEUP_METRICS?.collect().routes.filter(x=>x.page===p&&x.completed).at(-1);
      return {page:p,loadMs:mod?.ms??null,routePaintMs:paint?.paintMs??null,scripts:mod?.scripts??0,htmlBytes:mod?.htmlBytes??0};
    },id);
    results.push({profile:profile.name,...row});
   }
   expect(failed).toEqual([]);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(2);
  });
 });
}
test.afterAll(async()=>{
 const dir=path.resolve("test-results");fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,"v38-browser-benchmark.json"),JSON.stringify({kind:"emulated-browser-measurement",note:"Chromium/WebKit viewport emulation is not a physical iPhone/iPad benchmark",results},null,2));
});
