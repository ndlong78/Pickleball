// Guest journey for the advanced levels added in V5.28: readiness check, personal plan,
// on-court attempt and the match page's insight report at 4.0–4.5 and 4.5–5.0.
const {test,expect}=require('@playwright/test');
const {navigate}=require('./helpers/navigation.cjs');
const GATES={'4.0–4.5':{pass:16,fail:10,average:16,min:11},'4.5–5.0':{pass:17,fail:11,average:17,min:12}};
const KEYS=['third','reset','movement','counter','doubles','decision'];
for(const level of Object.keys(GATES))for(const width of [390,1440])test.describe(level+' at '+width,()=>{
 test.use({viewport:{width,height:width<500?844:900},isMobile:width<500,hasTouch:width<500});
 test('readiness check, personal plan, on-court attempt and match report all work at '+level,async({page})=>{
  const gate=GATES[level],errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('/?page=coach');
  // 1. Advanced readiness: the gate follows the level and a low area blocks "ready".
  await page.locator('#advancedLevel').selectOption(level);
  await expect(page.locator('#advancedCheckTarget')).toContainText('trung bình ≥'+gate.average+'/20 và từng mục ≥'+gate.min+'/20');
  for(const key of KEYS)await page.locator('#ac-'+key).fill(String(gate.pass));
  await page.locator('#ac-third').fill(String(gate.fail));
  await page.locator('#advancedCheckSave').click();
  await expect(page.locator('#advancedCheckResult')).toContainText('Chưa đạt ngưỡng luyện tập nội bộ của nhóm '+level);
  await page.locator('#ac-third').fill(String(gate.pass));
  await page.locator('#advancedCheckSave').click();
  await expect(page.locator('#advancedCheckResult')).toContainText('Đạt ngưỡng luyện tập nội bộ của nhóm '+level);
  await expect(page.locator('#advancedCheckHistory')).toContainText(level);
  const checks=await page.evaluate(()=>JSON.parse(localStorage.getItem('pickleup_advanced_checks_v3')));
  expect(checks.map(c=>[c.level,c.ready])).toEqual([[level,false],[level,true]]);
  // 2. Personal plan for the level, from lessons of that level only.
  await page.locator('#acCoachLevel').selectOption(level);
  const scores={third:12,reset:10,movement:15,counter:14,doubles:13,decision:11};
  for(const [key,value] of Object.entries(scores))await page.locator('#acInput-'+key).fill(String(value));
  await page.locator('#acCoachCreate').click();
  await expect(page.locator('#acCoachPlan')).toContainText('Giáo án nâng cao · '+level);
  const plan=await page.evaluate(()=>JSON.parse(localStorage.getItem('pickleup_advanced_plans_v31')).at(-1));
  expect(plan.level).toBe(level);
  expect(plan.exercises.every(e=>/^ADV-PU-(08[1-9]|09[0-9]|10[0-4])$/.test(e.id)&&e.week>=81)).toBe(true);
  expect(await page.evaluate(p=>PICKLEUP_ADVANCED_COACH.validPlan(p),plan)).toBe(true);
  const lessonLevels=await page.evaluate(ids=>ids.map(id=>PICKLEUP_ADVANCED_CURRICULUM.find(l=>'ADV-'+l.id===id).level),plan.exercises.map(e=>e.id));
  expect(new Set(lessonLevels)).toEqual(new Set([level]));
  // 3. On-court attempt is stored at that level.
  await page.locator('#acCoachRun').click();
  await expect(page.locator('#pcRunPlayer')).toBeVisible();
  await page.locator('#pcRunNext').click();
  await page.locator('#pcAttemptHits').fill('13');
  await page.locator('#pcAttemptFeed').selectOption('partner');
  await page.locator('#pcAttemptPace').selectOption('moderate');
  await page.locator('#pcAttemptTarget').selectOption('standard');
  await page.locator('#pcAttemptSave').click();
  await expect(page.locator('#pcRunMessage')).toContainText('Đã lưu');
  const attempts=await page.evaluate(()=>JSON.parse(localStorage.getItem('pickleup_training_log_v26')));
  expect(attempts).toHaveLength(1);
  expect([attempts[0].level,attempts[0].hits,attempts[0].exerciseId.startsWith('ADV-PU-')]).toEqual([level,13,true]);
  // The V1 backup validators accept everything this journey stored.
  expect(await page.evaluate(()=>({
   checks:PICKLEUP_VALIDATE_ADVANCED_CHECKS(JSON.parse(localStorage.getItem('pickleup_advanced_checks_v3'))),
   plans:PICKLEUP_VALIDATE_ADVANCED_PLANS(JSON.parse(localStorage.getItem('pickleup_advanced_plans_v31'))),
   log:PICKLEUP_TRAINING_LOG.validateList(JSON.parse(localStorage.getItem('pickleup_training_log_v26')))
  }))).toEqual({checks:true,plans:true,log:true});
  // 4. Match report: a second measurement of the same exercise makes a comparison; levels never mix.
  await page.evaluate(()=>{const log=JSON.parse(localStorage.getItem('pickleup_training_log_v26')),first=log[0];
   log.push({...first,id:first.id+'-2',hits:first.hits+4,date:new Date(Date.parse(first.date)+86400000).toISOString()});
   localStorage.setItem('pickleup_training_log_v26',JSON.stringify(log))});
  await navigate(page,'matches');
  await page.locator('#matchFocus').selectOption('counter-volley');
  await page.locator('#matchOurs').fill('11');await page.locator('#matchTheirs').fill('8');
  await page.locator('#matchSave').click();
  await expect(page.locator('#matchSummary')).toContainText('1 trận');
  await page.locator('#tacticalLevel').selectOption(level);
  await page.locator('#tacticalRefresh').click();
  await expect(page.locator('#tacticalStats')).toContainText('Lượt đo tại cấp độ này');
  await expect(page.locator('#tacticalComparisons')).toContainText('+4/20');
  await expect(page.locator('#tacticalRecommendation')).toContainText('Counter volley');
  const other=level==='4.0–4.5'?'4.5–5.0':'3.5–4.0';
  await page.locator('#tacticalLevel').selectOption(other);
  await expect(page.locator('#tacticalComparisons')).toContainText('Chưa có hai lượt');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(2);
  expect(errors).toEqual([]);
 });
});
