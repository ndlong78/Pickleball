const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const pkg=JSON.parse(read("package.json")),index=read("index.html"),sw=read("sw.js");
const version=pkg.version;
const assetVersion=version.split("-")[0];
const releaseChannel=version.includes("-")?"beta":"stable";
const cacheMatch=sw.match(/const CACHE="([^"]+)"/);
test("PWA shell cache is release-specific and index agrees with package version",()=>{
 assert.ok(cacheMatch,"Service worker CACHE name missing");
 assert.equal(cacheMatch[1],"pickleup-shell-v"+assetVersion.split(".").slice(0,2).join("-")+"-"+releaseChannel,"PWA cache must match version line and release channel");
 assert.match(index,new RegExp("PICKLEUP_BUILD\\s*=\\s*[\'\\\"]"+assetVersion.replaceAll(".","\\.")+"[\'\\\"]"));
});
test("PWA script and stylesheet version references match the package",()=>{
 const urls=[...index.matchAll(/(?:src|href)="([^"]+\?v=[^"]+)"/g)].map(x=>x[1]);
 assert.ok(urls.length>=5,"Expected versioned application assets");
 for(const url of urls){const suffix=url.split("?v=")[1];assert.equal(suffix,assetVersion,"Version mismatch for "+url)}
 const swAssets=[...sw.matchAll(/\?v=([0-9]+\.[0-9]+\.[0-9]+)/g)].map(x=>x[1]);
 assert.ok(swAssets.length>=5);
 for(const v of swAssets)assert.equal(v,assetVersion);
});
test("offline regression tests refer to the actual current service worker cache",()=>{
 for(const file of ["tests/stable-pwa-cache.test.js","tests/v38-pwa-upgrade.spec.cjs"])
  assert.ok(read(file).includes(cacheMatch[1]),file+" has a stale cache assertion");
});
