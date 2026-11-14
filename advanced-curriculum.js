/* PickleUp Academy advanced adapter: lessons live in curriculum.js (edit via cms/). */
(function(root){
"use strict";
const doc=root.PICKLEUP_CONTENT_DOC;
if(!doc||!Array.isArray(doc.lessons))throw new Error("Academy content must load before advanced-curriculum.js");
const out=doc.lessons.filter(l=>l.advanced&&l.status==="published").map(({assessmentHash,...l})=>l);
root.PICKLEUP_ADVANCED_CURRICULUM=out;
root.PICKLEUP_CURRICULUM=(root.PICKLEUP_CURRICULUM||[]).concat(out);
// Level filters follow the published library: a select keeps its markup options and gains
// any further band that has at least one published lesson (for example 4.0–4.5).
const levels=[...new Set(root.PICKLEUP_CURRICULUM.map(l=>l.level))].sort((a,b)=>parseFloat(a)-parseFloat(b));
root.PICKLEUP_LESSON_LEVELS=Object.freeze(levels);
root.PICKLEUP_LESSON_RANGE=levels.length?levels[0].split("–")[0]+"–"+levels.at(-1).split("–")[1]:"";
root.PICKLEUP_FILL_LEVELS=function(select){
 if(!select||!select.options)return;
 const have=new Set([...select.options].map(o=>o.value));
 for(const level of levels)if(!have.has(level)){const option=select.ownerDocument.createElement("option");option.value=option.textContent=level;select.append(option)}
};
})(typeof window==="undefined"?globalThis:window);
