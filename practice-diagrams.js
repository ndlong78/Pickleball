/* PickleUp V2.5 — 24 skill-aware court illustrations (schematic, not measured placement). */
(function(root){
"use strict";
const NS="http://www.w3.org/2000/svg";
const spots={
 serve:[[[95,449],[218,66]],[[95,449],[225,45]],[[225,449],[95,74]],[[95,449],[232,85]]],
 return:[[[215,432],[145,53]],[[215,432],[120,65]],[[110,432],[215,73]],[[215,432],[194,56]]],
 dink:[[[110,308],[108,183]],[[112,308],[220,193]],[[217,307],[108,189]],[[110,307],[220,197]]],
 volley:[[[115,314],[125,92]],[[115,316],[225,96]],[[220,313],[115,100]],[[219,313],[220,75]]],
 position:[[[108,403],[108,313]],[[110,422],[124,310]],[[105,320],[215,318]],[[212,324],[168,313]]],
 strategy:[[[108,318],[218,94]],[[112,395],[220,179]],[[207,316],[153,93]],[[115,315],[223,190]]]
};
function node(name,attrs,text){
 const e=document.createElementNS(NS,name);
 Object.entries(attrs||{}).forEach(([k,v])=>e.setAttribute(k,String(v)));
 if(text!==undefined)e.textContent=text;
 return e;
}
function draw(target,exercise){
 if(!target)return;target.replaceChildren();
 if(!exercise||typeof exercise.skill!=="string"||!spots[exercise.skill])return;
 const i=Math.max(0,Math.min(3,Number((exercise.id||"").split("-")[1])-1||0));
 const [[x1,y1],[x2,y2]]=spots[exercise.skill][i];
 const movement=exercise.skill==="position";
 const svg=node("svg",{viewBox:"0 0 320 470",width:"100%",role:"img","aria-label":(movement?"Sơ đồ di chuyển":"Sơ đồ hướng bóng")+" cho "+exercise.name,style:"max-width:350px;display:block;margin:0 auto"});
 svg.append(node("rect",{x:0,y:0,width:320,height:470,rx:15,fill:"#e8f1e8"}));
 svg.append(node("rect",{x:50,y:20,width:220,height:418,rx:1,fill:"#397c72",stroke:"white","stroke-width":3}));
 // Net at center, kitchen extends 7 feet in each direction from it.
 svg.append(node("rect",{x:52,y:165,width:216,height:65,fill:"#d8b45e",opacity:".38"}));
 svg.append(node("rect",{x:52,y:230,width:216,height:65,fill:"#d8b45e",opacity:".38"}));
 for(const [x1,y1,x2,y2] of [[50,165,270,165],[50,295,270,295],[50,230,270,230],[160,20,160,165],[160,295,160,438]]){
  svg.append(node("line",{x1,y1,x2,y2,stroke:y1===230?"#142d30":"white","stroke-width":y1===230?4:2}));
 }
 svg.append(node("text",{x:58,y:38,fill:"white","font-size":12,"font-weight":600},"ĐỐI THỦ"));
 svg.append(node("text",{x:58,y:217,fill:"#18372c","font-size":11},"KITCHEN"));
 svg.append(node("text",{x:58,y:246,fill:"#18372c","font-size":11},"KITCHEN"));
 svg.append(node("text",{x:275,y:234,fill:"#17372c","font-size":10},"LƯỚI"));
 const boxY=Math.max(26,Math.min(430,y2-18));
 svg.append(node("rect",{x:Math.max(53,Math.min(230,x2-31)),y:boxY,width:36,height:31,rx:5,fill:"#b8ef49",opacity:".85"}));
 svg.append(node("path",{d:"M"+x1+" "+y1+" Q"+((x1+x2)/2+12)+" "+((y1+y2)/2)+" "+x2+" "+y2,fill:"none",stroke:"#ffe38e","stroke-width":4,"stroke-dasharray":movement?"4 7":"9 6","stroke-linecap":"round"}));
 svg.append(node("circle",{cx:x1,cy:y1,r:8,fill:"#fff",stroke:"#173d3b","stroke-width":2}));
 svg.append(node("circle",{cx:x2,cy:y2,r:5,fill:"#173d3b"}));
 svg.append(node("text",{x:14,y:455,fill:"#18392e","font-size":11},movement?"Trắng: xuất phát · Xanh: vị trí di chuyển":"Trắng: người tập · Xanh: vùng hướng tới"));
 target.append(svg);
 const note=document.createElement("p");note.className="pc-muted";note.textContent="Sơ đồ theo tình huống "+(i+1)+" của "+exercise.skillName+". Chỉ mang tính minh họa, hãy tuân thủ luật và hướng dẫn từng bài.";
 target.append(note);
}
root.PICKLEUP_DRILL_DIAGRAM=draw;
})(typeof window==="undefined"?globalThis:window);
