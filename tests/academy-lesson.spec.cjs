const {test,expect}=require("@playwright/test");
const legacy=page=>page.evaluate(()=>JSON.stringify(Object.entries(localStorage).filter(([k])=>k.startsWith("pickleup_")).sort()));
for(const width of [390,820,1180,1440]){
 test.describe("V5.20 Academy lesson progressive disclosure "+width,()=>{
  test.use({viewport:{width,height:900}});
  test("layer 1 shows cues and one start action; details stay one tap away; start never saves",async({page})=>{
   await page.goto("/?page=academy");
   const detail=page.locator("#academyDetail");
   await expect(detail.locator(".lesson-cues li")).toHaveCount(3);
   await expect(detail.locator("[data-lesson-start]")).toBeVisible();
   // Lesson content renders before the practice controls.
   const order=await page.evaluate(()=>{const d=document.getElementById("academyDetail"),s=document.getElementById("academyStepList");return !!(d.compareDocumentPosition(s)&Node.DOCUMENT_POSITION_FOLLOWING)});
   expect(order).toBe(true);
   for(const key of ["mistakes","setup","timeline"])await expect(detail.locator('[data-lesson-more="'+key+'"]')).not.toHaveAttribute("open","");
   await expect(detail.locator('[data-lesson-more="timeline"] .block')).toHaveCount(6);
   await expect(detail.locator('[data-lesson-more="timeline"] .block').first()).toBeHidden();
   await detail.locator('[data-lesson-more="timeline"] summary').click();
   await expect(detail.locator('[data-lesson-more="timeline"] .block').first()).toBeVisible();
   await expect(detail).toContainText("Kiểm tra");
   const before=await legacy(page);
   await detail.locator("[data-lesson-start]").click();
   await expect(page.locator("#academyFocusToggle")).toHaveAttribute("aria-pressed","true");
   await expect(page.locator("#academyFocusPanel")).toBeVisible();
   await expect(page.locator("#academyFocus")).toBeInViewport();
   expect(await legacy(page)).toBe(before);
   await expect(page.locator("#academyStatus")).not.toContainText("Đã lưu");
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
   expect(overflow).toBeLessThanOrEqual(2);
  });
 });
}
test("Kitchen reminder opens for beginners and stays collapsed from 2.5",async({page})=>{
 await page.goto("/?page=academy");
 await page.locator("#academyLevel").selectOption({label:"1.0–2.0"});
 const ids=await page.evaluate(()=>PICKLEUP_CURRICULUM.filter(x=>x.skill==="volley").map(x=>({id:x.id,level:x.level})));
 const beginner=ids.find(x=>x.level==="1.0–2.0"),later=ids.find(x=>x.level==="2.5–3.0");
 await page.locator("#academyWeek").selectOption(beginner.id);
 const rule=page.locator('#academyDetail [data-lesson-more="rule"]');
 await expect(rule).toHaveAttribute("open","");
 await expect(rule).toContainText("Kitchen");
 await page.locator("#academyLevel").selectOption({label:"2.5–3.0"});
 await page.locator("#academyWeek").selectOption(later.id);
 await expect(rule).not.toHaveAttribute("open","");
 await expect(rule.locator("li").first()).toBeHidden();
});
