/* PickleUp v2.1 court diagrams. Top half is opponent; bottom half is learner. */
window.PICKLEUP_COURT=function(session){
 const k=session.skill, week=session.week;
 const start={serve:[121,196],return:[121,196],dink:[121,154],volley:[121,153],position:[121,173],strategy:[121,173]}[k]||[121,180];
 const variants={
 serve:[[232,48],[232,34],[232,55],[232,44],[233,43],[230,34]],
 return:[[121,38],[122,35],[240,36],[121,41],[120,36],[120,49]],
 dink:[[125,87],[239,88],[215,90],[130,86],[235,87],[119,90]],
 volley:[[125,40],[125,45],[231,46],[224,41],[175,48],[242,42]],
 position:[[124,157],[126,149],[230,155],[232,150],[126,155],[176,160]],
 strategy:[[230,42],[120,47],[175,49],[235,85],[234,40],[120,56]]
 };
 const goal=(variants[k]||variants.serve)[Math.floor((week-1)/6)%6],x=goal[0],y=goal[1];
 const [px,py]=start, style='style="width:100%;max-width:500px;display:block;margin:12px auto;border-radius:12px"';
 const labels={serve:'Giao chéo sang ô đối diện',return:'Trả sau khi bóng nảy, hướng sâu',dink:'Dink vào kitchen bên kia',volley:'Volley ngoài kitchen và vạch',position:'Di chuyển an toàn và hồi vị',strategy:'Chọn vùng mục tiêu theo tình huống'};
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 260" '+style+' role="img" aria-label="'+labels[k]+'"><rect width="360" height="260" rx="12" fill="#edf3eb"/><rect x="40" y="15" width="280" height="218" fill="#397f79" stroke="#fff" stroke-width="3"/><path d="M40 124H320" stroke="#17332f" stroke-width="5"/><path d="M40 89H320M40 159H320M180 15V89M180 159V233" fill="none" stroke="#fff" stroke-width="2.5"/><rect x="41" y="89" width="278" height="35" fill="#ebcc80" opacity=".4"/><rect x="41" y="124" width="278" height="35" fill="#ebcc80" opacity=".4"/><text x="48" y="111" fill="#142d30" font-size="9">KITCHEN</text><text x="48" y="147" fill="#142d30" font-size="9">KITCHEN</text><text x="48" y="28" fill="#fff" font-size="10">Đối diện</text><rect x="'+(x-23)+'" y="'+(y-13)+'" width="46" height="26" rx="5" fill="#b8ef49" opacity=".75"/><path d="M'+px+' '+py+' Q '+(px+(x-px)*.6-20)+' '+(py+(y-py)*.5)+' '+x+' '+y+'" fill="none" stroke="#ffe289" stroke-width="3.5" stroke-dasharray="7 5"/><circle cx="'+px+'" cy="'+py+'" r="8" fill="#fff" stroke="#17332f" stroke-width="2"/><circle cx="'+x+'" cy="'+y+'" r="5" fill="#17332f"/><text x="48" y="246" fill="#264a43" font-size="10">● Người tập   ▰ Vùng minh họa</text></svg>';
};
