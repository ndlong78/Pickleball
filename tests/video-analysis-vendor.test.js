const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p));
const readme=read("vendor/mediapipe/README.md").toString("utf8");
const ui=read("modules/video-analysis-ui.js").toString("utf8");
const sha=buf=>crypto.createHash("sha256").update(buf).digest("base64");

test("self-hosted MediaPipe JS is byte-identical to the documented npm files",()=>{
 for(const file of ["vision_bundle.js","vision_wasm_internal.js"]){
  const buf=read("vendor/mediapipe/"+file);
  const row=readme.split("\n").find(l=>l.startsWith("| `"+file+"`"));
  assert.ok(row,file+" missing from vendor README");
  assert.ok(row.includes("| "+buf.length+" |"),file+" byte count differs from README");
  assert.ok(row.includes("`"+sha(buf)+"`"),file+" SHA-256 differs from README");
 }
});

test("pinned remote binaries in the UI match the README and one package version",()=>{
 const pins=[...ui.matchAll(/\{url:"(https:[^"]+)",sha256:"([A-Za-z0-9+/=]{44})",bytes:(\d+)/g)].map(m=>({url:m[1],sha:m[2],bytes:m[3]}));
 assert.equal(pins.length,2,"expected pinned wasm and model");
 for(const p of pins){
  assert.match(p.url,/^https:\/\/(cdn\.jsdelivr\.net\/npm\/@mediapipe\/tasks-vision@\d+\.\d+\.\d+\/|storage\.googleapis\.com\/mediapipe-models\/)/);
  const row=readme.split("\n").find(l=>l.includes(p.url));
  assert.ok(row,"README lacks "+p.url);
  assert.ok(row.includes("| "+p.bytes+" |")&&row.includes("`"+p.sha+"`"),"README pin differs for "+p.url);
 }
 const version=ui.match(/version:"@mediapipe\/tasks-vision (\d+\.\d+\.\d+)"/)[1];
 assert.ok(pins[0].url.includes("@"+version+"/"),"wasm URL version differs from ENGINE.version");
 assert.ok(readme.startsWith("# MediaPipe Tasks Vision "+version),"README version differs");
});

test("the analysis UI never persists video or results to device storage",()=>{
 for(const file of ["modules/video-analysis-ui.js","modules/video-analysis-core.js"]){
  const src=read(file).toString("utf8");
  assert.doesNotMatch(src,/localStorage|sessionStorage|indexedDB|caches\.open/,file+" must not write device storage");
  assert.doesNotMatch(src,/\beval\s*\(|new Function\s*\(|innerHTML/,file+" must not evaluate or inject markup");
 }
 const src=read("modules/video-analysis-ui.js").toString("utf8");
 assert.doesNotMatch(src,/method:\s*["']POST|XMLHttpRequest|sendBeacon|FormData/,"video must never be uploaded");
});

test("the page fragment carries the privacy and not-coach-validated notices",()=>{
 const html=read("pages/video.html").toString("utf8");
 assert.match(html,/Video không rời thiết bị/);
 assert.match(html,/chưa được HLV kiểm chứng/);
 assert.doesNotMatch(html,/<script/i);
});
