const {defineConfig,devices}=require("@playwright/test");
module.exports=defineConfig({
 testDir:"./tests",
 testMatch:["import-pilot.spec.cjs","rescue.spec.cjs","data-repository.spec.cjs","auth.spec.cjs","responsive.spec.cjs","tactical-responsive.spec.cjs","evaluation-responsive.spec.cjs","page-routing.spec.cjs","page-performance.spec.cjs","page-fragments.spec.cjs","v38-benchmark.spec.cjs","v38-pwa-upgrade.spec.cjs","v40-academy.spec.cjs","v41-steps.spec.cjs","v42-focus.spec.cjs","v42-timer.spec.cjs","v43-recommend.spec.cjs","v44-trends.spec.cjs","v45-insights.spec.cjs","v46-weekly-goals.spec.cjs","v47-weekly-plan.spec.cjs","v48-checkins.spec.cjs","v49-plan-reality.spec.cjs","v50-journey.spec.cjs"],
 timeout:30000,
 retries:process.env.CI?1:0,
 reporter:process.env.CI?[["list"],["html",{open:"never"}]]:"list",
 use:{baseURL:"http://127.0.0.1:4173",trace:"retain-on-failure",screenshot:"only-on-failure"},
 projects:[
  {name:"Chromium responsive",use:{...devices["Desktop Chrome"],browserName:"chromium"}},
  {name:"WebKit responsive",use:{...devices["Desktop Safari"],browserName:"webkit"}}
 ],
 webServer:{command:"python3 scripts/serve_test.py",url:"http://127.0.0.1:4173/",reuseExistingServer:!process.env.CI,timeout:30000}
});
