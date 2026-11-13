const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const origin=require('../modules/auth-origin.js');
const {ACCOUNT_CARDS,DIAGNOSTIC_CARDS,decide,apply}=require('../modules/settings-surface.js');
const stage='https://pickleup-staging.home-309.workers.dev';
test('production origins hide account pilots and diagnostics; debug only reveals diagnostics',()=>{
 for(const href of ['https://ndlong78.github.io/Pickleball/?page=settings','https://pickleup.no.id.vn/?page=settings','https://preview-pickleup-staging.home-309.workers.dev/?page=settings']){
  assert.deepEqual(decide({href},{enabled:false},origin),{account:false,diagnostics:false});
  assert.deepEqual(decide({href:href+'&debug=1'},{enabled:false},origin),{account:false,diagnostics:true});
  assert.deepEqual(decide({href:href+'&debug=true'},{enabled:false},origin),{account:false,diagnostics:false});
 }
});
test('staging and loopback keep every operator tool; enabled Auth keeps account cards',()=>{
 for(const href of [stage+'/?page=settings','http://127.0.0.1:4173/Pickleball/?page=settings','http://localhost:4173/?page=settings'])
  assert.deepEqual(decide({href},{enabled:false},origin),{account:true,diagnostics:true});
 assert.deepEqual(decide({href:'https://example.invalid/'},{enabled:true},origin),{account:true,diagnostics:false});
});
test('missing helpers or malformed locations fail closed',()=>{
 assert.deepEqual(decide({href:'https://ndlong78.github.io/'},undefined,undefined),{account:false,diagnostics:false});
 assert.deepEqual(decide(undefined,undefined,origin),{account:false,diagnostics:false});
 assert.equal(origin.internal({href:'not a url'}),false);
});
test('markup hides every managed card by default and never the guest rescue card',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../pages/settings.html'),'utf8');
 for(const id of [...ACCOUNT_CARDS,...DIAGNOSTIC_CARDS])assert.match(html,new RegExp('id="'+id+'" data-surface-hidden'));
 assert.doesNotMatch(html,/id="rescuePanel"[^>]*data-surface-hidden/);
 const attrs=new Map(),document={getElementById:id=>({setAttribute:k=>attrs.set(id,k),removeAttribute:()=>attrs.delete(id)})};
 apply(document,{account:false,diagnostics:true});
 assert.deepEqual([...attrs.keys()].sort(),[...ACCOUNT_CARDS].sort());
});
