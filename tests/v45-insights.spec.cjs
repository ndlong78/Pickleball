const {test,expect}=require("@playwright/test");
for(const width of [390,820,1440]){
 test.describe("V4.5 Academy skill insights "+width,()=>{
  test.use({viewport:{width,height:900}});
  test("shows repeated score series, stage filters, suggestions and opens Academy",async({page})=>{
   await page.goto("/?page=academy");
   const id=await page.locator("#academyWeek").inputValue();
   for(const value of [6,9,12]){
    await page.locator("#academyScore").fill(String(value));
    await page.locator("#academySave").click();
   }
   await page.goto("/?page=progress");
   await expect(page.locator("#aiSkill option")).not.toHaveCount(0);
   await page.locator("#aiLevel").selectOption("1.0–2.0");
   await page.locator("#aiSkill").selectOption("serve");
   await expect(page.locator("#aiCount")).toHaveText("3");
   await expect(page.locator("#aiAverage")).toHaveText("9.0/20");
   await expect(page.locator("#aiDelta")).toHaveText("+6 điểm");
   await expect(page.locator("#aiChart .ai-column")).toHaveCount(3);
   await expect(page.locator("#aiAdvice")).toContainText("Duy trì");
   await page.locator("#aiOpenLesson").click();
   await expect(page.locator("#academyWeek")).toHaveValue(id);
  });
 });
}
test("V4.5 never mixes scores from different levels",async({page})=>{
 await page.goto("/?page=progress");
 await expect(page.locator("#aiSkill option")).not.toHaveCount(0);
 await page.evaluate(()=>{
  const lessons=window.PICKLEUP_CURRICULUM.filter(x=>x.skill==="serve");
  const one=lessons.find(x=>x.level==="1.0–2.0");
  const two=lessons.find(x=>x.level==="2.0–2.5");
  if(!one||!two)throw Error("Missing serve lessons for two stages");
  const date=new Date().toISOString();
  const records={[one.id]:{score:13,date},[two.id]:{score:1,date}};
  localStorage.setItem("pickleup_academy_v2",JSON.stringify(records));
  localStorage.setItem("pickleup_academy_history_v44",JSON.stringify([
    {id:one.id,skill:one.skill,level:one.level,score:13,date},
    {id:two.id,skill:two.skill,level:two.level,score:1,date}
  ]));
 });
 await page.locator("#aiRefresh").click();
 await page.locator("#aiLevel").selectOption("1.0–2.0");
 await page.locator("#aiSkill").selectOption("serve");
 await expect(page.locator("#aiCount")).toHaveText("1");
 await expect(page.locator("#aiAverage")).toHaveText("13.0/20");
 await page.locator("#aiLevel").selectOption("2.0–2.5");
 await page.locator("#aiSkill").selectOption("serve");
 await expect(page.locator("#aiAverage")).toHaveText("1.0/20");
});

test("V4.5 lesson selector does not compare scores from different lessons",async({page})=>{
 await page.goto("/?page=progress");
 await expect(page.locator("#aiSkill option")).not.toHaveCount(0);
 const ids=await page.evaluate(()=>{
  const items=window.PICKLEUP_CURRICULUM.filter(x=>x.skill==="serve"&&x.level==="1.0–2.0");
  if(items.length<2)throw Error("Need two serve lessons");
  const date=new Date().toISOString();
  const attempts=[
   {id:items[0].id,skill:"serve",level:"1.0–2.0",score:8,date},
   {id:items[1].id,skill:"serve",level:"1.0–2.0",score:19,date},
   {id:items[0].id,skill:"serve",level:"1.0–2.0",score:12,date}
  ];
  localStorage.setItem("pickleup_academy_history_v44",JSON.stringify(attempts));
  return items.map(x=>x.id);
 });
 await page.locator("#aiRefresh").click();
 await page.locator("#aiLevel").selectOption("1.0–2.0");
 await page.locator("#aiSkill").selectOption("serve");
 await expect(page.locator("#aiCount")).toHaveText("3");
 await page.locator("#aiLesson").selectOption(ids[0]);
 await expect(page.locator("#aiChart .ai-column")).toHaveCount(2);
 await expect(page.locator("#aiDelta")).toHaveText("+4 điểm");
 await page.locator("#aiLesson").selectOption(ids[1]);
 await expect(page.locator("#aiChart .ai-column")).toHaveCount(1);
 await expect(page.locator("#aiAverage")).toHaveText("19.0/20");
 await expect(page.locator("#aiDelta")).toHaveText("Chưa đủ dữ liệu");
 await expect(page.locator("#aiChartSummary")).toContainText("1 lượt");
});
