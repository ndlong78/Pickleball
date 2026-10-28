const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const pkg=JSON.parse(read("package.json")),index=read("index.html"),sw=read("sw.js");
const version=pkg.version;
const cacheMatch=sw.match(/const CACHE="([^"]+)"/);
test("PWA shell cache is release-specific and index agrees with package version",()=>{
 assert.ok(cacheMatch,"Service worker CACHE name missing");
 assert.match(cacheMatch[1],new RegExp("(^|-)v"+version.split(".").slice(0,2).join("-")+"-(?:stable|beta|[a-z0-9-]+)$"),"Cache must identify the release minor line and channel");
 assert.match(index,new RegExp("PICKLEUP_BUILD\\s*=\\s*[\'\\\"]"+version.replaceAll(".","\\.")+"[\'\\\"]"));
});
test("PWA script and stylesheet version references match the package",()=>{
 const urls=[...index.matchAll(/(?:src|href)="([^"]+\?v=[^"]+)"/g)].map(x=>x[1]);
 assert.ok(urls.length>=5,"Expected versioned application assets");
 for(const url of urls){const suffix=url.split("?v=")[1];assert.equal(suffix,version,"Version mismatch for "+url)}
 const swAssets=[...sw.matchAll(/\?v=([0-9]+\.[0-9]+\.[0-9]+)/g)].map(x=>x[1]);
 assert.ok(swAssets.length>=5);
 for(const v of swAssets)assert.equal(v,version);
});
test("offline regression tests refer to the actual current service worker cache",()=>{
 for(const file of ["tests/stable-pwa-cache.test.js","tests/v38-pwa-upgrade.spec.cjs"])
  assert.ok(read(file).includes(cacheMatch[1]),file+" has a stale cache assertion");
});
