const {test,expect}=require("@playwright/test");
const {navigate}=require("./helpers/navigation.cjs");
const REMOTE=/cdn\.jsdelivr\.net|storage\.googleapis\.com/;

for(const screen of [
 {name:"narrow phone",width:320,height:640},
 {name:"iPhone",width:390,height:844},
 {name:"iPad portrait",width:820,height:1180},
 {name:"iPad landscape",width:1180,height:820},
 {name:"Desktop",width:1440,height:900}
]){
 test.describe("V5.37 video analysis - "+screen.name,()=>{
  test.use({viewport:{width:screen.width,height:screen.height}});
  test("route opens from the menu, shows privacy notices and downloads nothing until asked",async({page})=>{
   const remote=[];page.on("request",r=>{if(REMOTE.test(r.url()))remote.push(r.url())});
   await page.goto("/?page=home");
   const before=await page.evaluate(()=>JSON.stringify(Object.keys(localStorage).sort()));
   await navigate(page,"video");
   await expect(page).toHaveURL(/\?page=video/);
   await expect(page.locator("#pageHeading")).toHaveText("🎥 Phân tích động tác");
   await expect(page.locator("#pageKicker")).toHaveText("PICKLEUP · 8/9");
   await expect(page.locator("#videoAnalysis")).toBeVisible();
   await expect(page.locator("#videoAnalysis .va-privacy")).toContainText("Video không rời thiết bị");
   await expect(page.locator("#videoAnalysis .va-caution")).toContainText("chưa được HLV kiểm chứng");
   await expect(page.locator("#vaLoad")).toBeEnabled();
   await expect(page.locator("#vaRun")).toBeDisabled();
   await expect(page.locator("#vaStage")).toBeHidden();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   for(const id of ["vaLoad","vaRun"]){const box=await page.locator("#"+id).boundingBox();expect(box.height).toBeGreaterThanOrEqual(44)}
   expect(remote).toEqual([]);
   expect(await page.evaluate(()=>!!window.PICKLEUP_PAGE_LOADER.isLoaded("modules/video-analysis-ui.js"))).toBe(true);
   expect(await page.evaluate(()=>JSON.stringify(Object.keys(localStorage).sort()))).toBe(before);
   await navigate(page,"court");
   await expect(page.locator("#pcOnCourt")).toBeVisible();
   await expect(page.locator("#videoAnalysis")).toBeHidden();
  });
 });
}

test("Home does not load the video analysis modules or vendor engine",async({page})=>{
 await page.goto("/?page=home");
 await expect(page.locator("#weekList .week").first()).toBeVisible();
 const names=await page.evaluate(()=>performance.getEntriesByType("resource").map(x=>x.name));
 expect(names.some(n=>/video-analysis|vendor\/mediapipe/.test(n))).toBe(false);
});

test.describe("engine integrity",()=>{
 // page.route() cannot see requests a service worker handles (WebKit), so block the worker here.
 test.use({serviceWorkers:"block"});
test("tampered engine downloads are refused by the pinned SHA-256 and nothing runs",async({page})=>{
 const served=[];
 await page.route(REMOTE,route=>{served.push(route.request().url());route.fulfill({status:200,headers:{"access-control-allow-origin":"*","content-type":"application/octet-stream"},body:Buffer.alloc(1024,7)})});
 const imported=[];page.on("request",r=>{if(r.url().includes("vendor/mediapipe/"))imported.push(r.url())});
 await page.goto("/?page=video");
 await expect(page.locator("#vaLoad")).toBeEnabled();
 const before=await page.evaluate(()=>JSON.stringify(Object.keys(localStorage).sort()));
 await page.locator("#vaLoad").click();
 await expect(page.locator("#vaEngineStatus")).toContainText("không khớp mã băm");
 await expect(page.locator("#vaLoad")).toBeEnabled();
 await expect(page.locator("#vaRun")).toBeDisabled();
 expect(await page.evaluate(()=>window.PICKLEUP_VIDEO_UI.isReady())).toBe(false);
 expect(served.some(u=>u.endsWith(".wasm"))).toBe(true);
 expect(served.some(u=>u.endsWith(".task"))).toBe(true);
 expect(imported,"engine JS must not be imported before both hashes pass").toEqual([]);
 expect(await page.evaluate(()=>JSON.stringify(Object.keys(localStorage).sort()))).toBe(before);
});
});

test("a video can be picked from the device library; the camera is a separate optional input",async({page})=>{
 await page.goto("/?page=video");
 await expect(page.locator("#vaFile")).not.toHaveAttribute("capture",/.*/);
 await expect(page.locator("#vaFile")).toHaveAttribute("accept",/^video\/\*,.*\.mov/);
 await expect(page.locator('label[for="vaFile"]')).toContainText("Chọn video từ máy");
 await expect(page.locator("#vaCapture")).toHaveAttribute("capture","environment");
 await expect(page.locator('label[for="vaCapture"]')).toContainText("Quay video mới");
 await expect(page.locator("#videoAnalysis")).toContainText("không gửi lên máy chủ");
 await page.locator("#vaCapture").setInputFiles({name:"notes.txt",mimeType:"text/plain",buffer:Buffer.from("not a video")});
 await expect(page.locator("#vaFileStatus")).toHaveText("Tệp này không phải video.");
});

test("non-video files are rejected without creating a preview",async({page})=>{
 await page.goto("/?page=video");
 await page.locator("#vaFile").setInputFiles({name:"notes.txt",mimeType:"text/plain",buffer:Buffer.from("not a video")});
 await expect(page.locator("#vaFileStatus")).toHaveText("Tệp này không phải video.");
 await expect(page.locator("#vaStage")).toBeHidden();
 await expect(page.locator("#vaRun")).toBeDisabled();
});
