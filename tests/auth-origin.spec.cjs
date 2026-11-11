const {test,expect}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path');
test.use({serviceWorkers:'block',trace:'off',screenshot:'off',video:'off'});
const config=fs.readFileSync(path.join(__dirname,'../modules/auth-config.js'),'utf8');
for(const site of ['https://ndlong78.github.io','https://preview-pickleup-staging.home-309.workers.dev','https://pickleup.no.id.vn'])test('real Auth config on a virtual disallowed origin stays guest with zero Supabase requests: '+site,async({page,context})=>{
 let backend=0,sdk=0;
 await context.addInitScript(()=>{
  // Synthetic expired session: a forbidden origin must not restore or refresh it.
  localStorage.setItem('pickleup_auth_v6',JSON.stringify({access_token:'synthetic-access',refresh_token:'synthetic-refresh',expires_at:1,user:{id:'11111111-1111-4111-8111-111111111111',email:'fixture@example.invalid'}}));
  localStorage.setItem('pickleup_origin_guest_probe','keep');
 });
 await context.route(site+'/**',async route=>{
  const u=new URL(route.request().url()),response=await route.fetch({url:'http://127.0.0.1:4173'+u.pathname+u.search});await route.fulfill({response});
 });
 await context.route('**/modules/auth-config.js*',r=>r.fulfill({contentType:'text/javascript',body:config}));
 await context.route('https://*.supabase.co/**',r=>{backend++;return r.abort()});
 page.on('request',request=>{if(new URL(request.url()).pathname.endsWith('/vendor/supabase.js'))sdk++});
 await page.goto(site+'/Pickleball/?page=settings');
 await page.evaluate(()=>PICKLEUP_PAGE_LOADER.ensure('settings'));
 await expect(page.locator('#accountPanel [role=status]')).toContainText('Chế độ khách');
 await expect(page.locator('#accountPanel form')).toBeHidden();
 expect(await page.evaluate(()=>PICKLEUP_AUTH_CONFIG.enabled)).toBe(false);
 // Config mutation cannot cause the adapter to initialize outside allowed origins.
 expect(await page.evaluate(async()=>{try{await PickleUpAuth.getShared({...PICKLEUP_AUTH_CONFIG,enabled:true});return 'connected'}catch(_){return 'blocked'}})).toBe('blocked');
 expect(backend).toBe(0);expect(sdk).toBe(0);
 expect(await page.evaluate(()=>localStorage.getItem('pickleup_origin_guest_probe'))).toBe('keep');
 expect(await page.evaluate(()=>localStorage.getItem('pickleup_auth_v6')!==null)).toBe(true);
 expect(await page.evaluate(()=>[PICKLEUP_DATA.getState().owner,PICKLEUP_ACTIVITY.getState().owner,PICKLEUP_PLANS.getState().owner])).toEqual([null,null,null]);
});
