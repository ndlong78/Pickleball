/* PickleUp Academy advanced adapter: lessons live in curriculum.js (edit via cms/). */
(function(root){
"use strict";
const doc=root.PICKLEUP_CONTENT_DOC;
if(!doc||!Array.isArray(doc.lessons))throw new Error("Academy content must load before advanced-curriculum.js");
const out=doc.lessons.filter(l=>l.advanced).map(({assessmentHash,...l})=>l);
root.PICKLEUP_ADVANCED_CURRICULUM=out;
root.PICKLEUP_CURRICULUM=(root.PICKLEUP_CURRICULUM||[]).concat(out);
})(typeof window==="undefined"?globalThis:window);
