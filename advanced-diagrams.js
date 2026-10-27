/* V3.0 tactical court diagrams. Schematics, not court measurements. */
(function(root){
"use strict";
const config={
 "third-drop":{from:[112,302],to:[238,133],other:[112,237],label:"Drop từ baseline vào kitchen"},
 "transition-reset":{from:[112,249],to:[240,131],other:[112,212],label:"Reset từ transition zone"},
 "serve-return":{from:[238,312],to:[112,68],other:[240,212],label:"Trả sâu rồi tiến lên"},
 "kitchen-pressure":{from:[112,209],to:[230,129],other:[112,210],label:"Dink chéo vào kitchen"},
 "doubles-coverage":{from:[122,211],to:[234,132],other:[234,212],label:"Di chuyển đồng bộ đánh đôi"},
 "third-choice":{from:[120,305],to:[237,116],other:[120,251],label:"Chọn drop hoặc drive cú thứ ba"},
 "advanced-reset":{from:[122,260],to:[236,133],other:[121,211],label:"Reset rồi tiến lên"},
 "counter-volley":{from:[122,213],to:[232,94],other:[233,214],label:"Counter volley ngoài kitchen"},
 "doubles-switch":{from:[116,216],to:[230,127],other:[237,215],label:"Phối hợp đội đôi"},
 "defense-attack":{from:[118,253],to:[226,126],other:[116,215],label:"Phòng thủ sang phản công"},
 "tactical-choice":{from:[116,214],to:[234,102],other:[235,215],label:"Chọn mục tiêu theo tình huống"}
};
function make(session){
 const p=config[session.focus];if(!p)return "";
 const a=p.from,b=p.to,friend=p.other;const court='<rect x="34" y="12" width="292" height="324" fill="#327d73" stroke="#fff" stroke-width="3" rx="2"/><rect x="36" y="126" width="288" height="37" fill="#f1d484" opacity=".42"/><rect x="36" y="163" width="288" height="37" fill="#f1d484" opacity=".42"/><path d="M34 163 H326" stroke="#183733" stroke-width="5"/><path d="M34 126 H326 M34 200 H326 M180 12 V126 M180 200 V336" stroke="white" stroke-width="2.4"/>';
 const pathway='<path d="M'+a[0]+' '+a[1]+' Q175 166 '+b[0]+' '+b[1]+'" fill="none" stroke="#fff2a7" stroke-width="4" stroke-dasharray="7 6"/><circle cx="'+a[0]+'" cy="'+a[1]+'" r="8" fill="#fff" stroke="#143b36" stroke-width="2"/><circle cx="'+friend[0]+'" cy="'+friend[1]+'" r="7" fill="#a8d2ec" stroke="#143b36" stroke-width="2"/><rect x="'+(b[0]-18)+'" y="'+(b[1]-11)+'" width="36" height="22" fill="#b8ef49" opacity=".85" rx="4"/>';
 return '<svg viewBox="0 0 360 370" role="img" aria-label="Sơ đồ chiến thuật: '+p.label+'" style="width:100%;max-width:420px;display:block;margin:12px auto;border-radius:12px"><rect width="360" height="370" rx="12" fill="#e8f2e8"/>'+court+pathway+'<text x="44" y="30" fill="#fff" font-size="11">Đối thủ</text><text x="44" y="150" fill="#203b32" font-size="10">KITCHEN</text><text x="44" y="184" fill="#203b32" font-size="10">KITCHEN</text><text x="38" y="355" fill="#25493d" font-size="11">● Trắng: người tập · Xanh: đồng đội · Lục: hướng bóng</text></svg>';
}
root.PICKLEUP_ADVANCED_COURT=make;
})(typeof window==="undefined"?globalThis:window);
