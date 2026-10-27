/* PickleUp: 36 beginner sessions, 60 minutes each. */
window.PICKLEUP_CURRICULUM = (function(){
const skills=[
{key:"serve",name:"Giao bóng",actions:["Nhắm vùng giữa ô","Giao bóng sâu","Đổi bên giao bóng","Đưa bóng qua vùng an toàn","Giao bóng theo nhịp cố định","Giao bóng chọn hướng"],errors:["Vung vợt quá mạnh","Chạm bóng không ổn định","Nhắm sát vạch biên"]},
{key:"return",name:"Trả giao bóng",actions:["Trả bóng về giữa","Trả bóng sâu","Trả chéo sân","Split-step trước khi trả","Trả thuận tay","Trả trái tay"],errors:["Đứng quá sát vạch cuối sân","Đánh xong không tiến lên","Cố đánh bóng mạnh"]},
{key:"dink",name:"Dinking",actions:["Dink thẳng","Dink chéo sân","Dink đổi điểm rơi","Dink sau bước ngang","Dink giữ nhịp chậm","Dink chuyển từ trái sang phải"],errors:["Hất cổ tay quá nhiều","Đánh bóng cao dễ bị tấn công","Không hạ trọng tâm"]},
{key:"volley",name:"Volley",actions:["Volley block","Volley thuận tay","Volley trái tay","Volley luân phiên hai phía","Volley đỡ bóng vào giữa","Volley phản xạ ở kitchen"],errors:["Vung vợt quá rộng","Đứng sát lưới sai vị trí","Không giữ vợt trước ngực"]},
{key:"position",name:"Di chuyển",actions:["Split-step đúng thời điểm","Tiến từ cuối sân lên kitchen","Bước ngang giữ vị trí","Di chuyển đồng bộ với đồng đội","Trở về tư thế sẵn sàng","Phối hợp nhận bóng giữa sân"],errors:["Chạy khi đối thủ đang đánh","Hai người để hở khoảng trống giữa","Mất thăng bằng sau cú đánh"]},
{key:"strategy",name:"Chiến thuật",actions:["Đánh vào khoảng trống an toàn","Chọn bóng để tiến lên lưới","Gọi bóng khi đánh đôi","Chơi điểm bằng cú đánh an toàn","Quan sát vị trí đối thủ","Chọn khi nào tấn công hoặc phòng thủ"],errors:["Cố ghi điểm từ mọi cú đánh","Không trao đổi với đồng đội","Đứng sai vị trí khi giao và trả bóng"]}
];
const phases=[["1.0–2.0",8],["2.0–2.5",12],["2.5–3.0",16]],data=[];
let week=0;
for(const [level,count] of phases){for(let j=0;j<count;j++){
const i=week%6,cycle=Math.floor(week/6),skill=skills[i],name=skill.actions[cycle%skill.actions.length],target=Math.min(17,12+Math.floor(week/8));
const context=cycle%3===0?"đứng tại vị trí cố định":cycle%3===1?"di chuyển một bước trước khi đánh":"di chuyển rồi chọn mục tiêu";
data.push({
id:"PU-"+String(week+1).padStart(3,"0"),week:week+1,level,skill:skill.key,skillName:skill.name,title:name,
goal:"Tập "+name.toLowerCase()+" với tư thế ổn định; ưu tiên đưa bóng hợp lệ và có chủ đích.",
drills:[
{minutes:12,name:"Kỹ thuật: "+name,instruction:"Thực hiện 3 hiệp x 10 lần, "+context+". Nghỉ ngắn mỗi hiệp. Người tập cùng đưa bóng đều, đánh chậm.",check:"Đếm số lần hợp lệ ở hiệp cuối."},
{minutes:12,name:"Mục tiêu: "+name,instruction:"Đánh 20 quả vào vùng mục tiêu được chọn trước, đổi góc hoặc độ sâu sau 5 quả. Đánh chậm và ghi kết quả.",check:"Ghi số quả chính xác trên 20."},
{minutes:15,name:"Tình huống: "+name,instruction:"Chơi 3 lượt 5 phút với bạn tập, chỉ tính điểm khi thực hiện đúng kỹ năng và lựa chọn bóng an toàn.",check:"Tự nhận xét 1 quyết định đúng và 1 lỗi cần sửa."}
],mistakes:skill.errors,assessment:{attempts:20,target,instruction:"Đánh 20 quả vào vùng mục tiêu theo kỹ thuật tuần này; ghi số lần hợp lệ."},duration:60,warmup:10,testMinutes:6,cooldown:5});
week++;
}}
return data;
})();
