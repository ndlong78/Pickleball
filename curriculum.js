/* PickleUp v2.1: skill-specific progression and court plans. */
window.PICKLEUP_CURRICULUM=(function(){
const groups=[
{key:"serve",name:"Giao bóng",titles:["Giao bóng vào vùng an toàn","Giao bóng sâu đến cuối sân","Giao chéo từ hai phía","Giao theo nhịp nhất quán","Thay đổi hướng giao bóng","Giao bóng sâu dưới áp lực"],zones:["Ô giao bóng chéo, vùng trung tâm","Nửa sâu của ô nhận giao","Hai ô giao bóng chéo","Ô chéo, tránh đường biên","Hai góc sâu và vùng giữa","Vùng sâu, đổi mục tiêu theo tín hiệu"],mistakes:["Không đứng sau vạch cuối sân khi giao","Cố đánh quá mạnh","Nhắm quá sát vạch"],cues:["Đứng phía sau baseline và chọn ô chéo","Thực hiện giao bóng đúng luật đã chọn","Giữ cùng một nhịp chuẩn bị"]},
{key:"return",name:"Trả giao bóng",titles:["Trả bóng sâu giữa sân","Trả sâu và tiến tới kitchen","Trả chéo theo hướng giao","Split-step trước cú trả","Trả thuận tay sau di chuyển","Trả trái tay và hồi vị"],zones:["Giữa cuối sân đối phương","Nửa sân sâu của đối phương","Ô sâu chéo phía đối diện","Giữa sân sau khi tách chân","Vùng sâu thuận tay","Vùng sâu trái tay"],mistakes:["Vào sân quá sớm khi đối phương giao bóng","Bóng trả quá ngắn","Mải nhìn bóng và quên lên lưới"],cues:["Đợi giao bóng nảy trước khi trả","Đánh sâu để có thời gian tiến lên","Tiến có kiểm soát về phía kitchen"]},
{key:"dink",name:"Dinking",titles:["Dink thẳng thấp qua lưới","Dink chéo chậm có kiểm soát","Dink đổi điểm rơi","Dink sau bước ngang","Dink theo nhịp liên tục","Dink từ trái sang phải"],zones:["Trong kitchen thẳng trước mặt","Trong kitchen chéo sân","Hai nửa kitchen phía đối diện","Kitchen sau di chuyển ngang","Kitchen phía đối diện","Kitchen trái và phải"],mistakes:["Hất cổ tay làm bóng bổng","Đứng quá thẳng","Đánh bóng quá sát mép lưới"],cues:["Giữ vợt phía trước và cổ tay vững","Hạ trọng tâm, đánh mềm","Bóng rơi trong kitchen đối phương"]},
{key:"volley",name:"Volley",titles:["Volley chặn bóng mềm","Volley thuận tay","Volley trái tay","Volley hai phía luân phiên","Volley đưa vào giữa sân","Volley phản xạ an toàn"],zones:["Vùng giữa sân đối phương","Nửa sân thuận tay","Nửa sân trái tay","Hai phía luân phiên","Khoảng giữa hai đối thủ","Vùng trống an toàn"],mistakes:["Bước vào khu vực kitchen để volley","Vung vợt quá dài","Không giữ đầu vợt trước người"],cues:["Đứng ngoài kitchen kể cả vạch","Giữ động tác ngắn, kiểm soát","Chạm bóng phía trước thân"]},
{key:"position",name:"Di chuyển",titles:["Split-step đúng thời điểm","Tiến lên kitchen an toàn","Bước ngang giữ thăng bằng","Đánh đôi di chuyển đồng bộ","Đánh xong trở về vị trí","Nhường và gọi bóng giữa sân"],zones:["Giữa vị trí chờ bóng","Hành lang cuối sân đến kitchen","Dọc đường kitchen","Hai vị trí song song","Vùng giữa sân","Đường giữa sân đánh đôi"],mistakes:["Chạy trong lúc đối thủ chạm bóng","Dồn cả hai người về một phía","Quay lưng với bóng"],cues:["Chia bước trước cú đánh đối thủ","Giữ thăng bằng khi chạm bóng","Gọi bóng rõ ràng cùng bạn tập"]},
{key:"strategy",name:"Chiến thuật",titles:["Đánh về khoảng trống an toàn","Chọn lúc lên lưới","Giao tiếp khi đánh đôi","Xây điểm bằng bóng an toàn","Quan sát vị trí đối thủ","Chọn tấn công hay phòng thủ"],zones:["Khoảng trống giữa hai người","Đường tiến từ cuối sân","Khu vực giữa sân","Vùng sâu và kitchen luân phiên","Vùng đối thủ bỏ trống","Vùng an toàn khi phòng thủ"],mistakes:["Cố thắng điểm ngay trong một cú đánh","Không giao tiếp với đồng đội","Tấn công khi đang mất thăng bằng"],cues:["Ưu tiên đưa bóng vào sân","Quan sát khoảng trống và vị trí đối thủ","Chọn cú đánh phù hợp độ khó bóng"]}
];
const levels=[["1.0–2.0",8],["2.0–2.5",12],["2.5–3.0",16]],sessions=[];
let w=0;
for(const [level,count] of levels)for(let j=0;j<count;j++){
 const skill=groups[w%6],stage=Math.floor(w/6),variant=stage%6,title=skill.titles[variant],zone=skill.zones[variant],target=Math.min(17,12+Math.floor(w/8));
 const mode=stage<2?"đứng ổn định":stage<4?"di chuyển một bước rồi dừng giữ thăng bằng":"đọc tín hiệu hướng bóng trước khi đánh";
 const scenarios=[
 ["Đánh vào một vùng cố định","Đặt hai mục tiêu và thay đổi sau 5 lần","Đổi phía sân sau mỗi hiệp"],
 ["Thêm độ sâu cho cú đánh","Chuyển từ đứng yên sang di chuyển","Tập trở về vị trí chuẩn bị"],
 ["Trộn tình huống dễ và khó","Bạn tập báo mục tiêu bất ngờ","Xây dựng một pha bóng ngắn"]
 ];
 const frame=scenarios[Math.min(2,Math.floor(stage/2))];
 sessions.push({id:"PU-"+String(w+1).padStart(3,"0"),week:w+1,level,skill:skill.key,skillName:skill.name,title,goal:"Tập "+title.toLowerCase()+"; vùng mục tiêu: "+zone+".",zone,setup:"2 người, 1 sân, 6–12 bóng, 2 vật đánh dấu mềm. Bố trí mục tiêu ở "+zone+".",cues:skill.cues,
 drills:[
 {minutes:12,name:frame[0]+" — "+title,instruction:"Bạn tập cấp bóng đều; "+mode+". Thực hiện 3 hiệp, mỗi hiệp 10 lần. Giữ cùng điểm tiếp xúc và quan sát đường bóng.",check:"Đếm số lần kỹ thuật đúng trong hiệp cuối."},
 {minutes:12,name:frame[1]+" — bài kiểm soát",instruction:"Đánh 20 lần vào "+zone+". Chia 4 lượt x 5 lần. Sau từng lượt ghi số lần đạt và điều chỉnh một yếu tố kỹ thuật.",check:"Số lần vào mục tiêu /20."},
 {minutes:15,name:frame[2]+" — ứng dụng thi đấu",instruction:"Tập với bạn trong 3 lượt x 5 phút. Đổi vai sau mỗi lượt. Chỉ tính thành công khi quyết định an toàn và thực hiện "+title.toLowerCase()+" đúng mục tiêu.",check:"Ghi một lựa chọn hiệu quả và một lỗi cần sửa."}
 ],mistakes:skill.mistakes,assessment:{attempts:20,target,instruction:"Thực hiện 20 lần "+title.toLowerCase()+" trong vùng "+zone+". Đếm số lần đúng kỹ thuật và đúng vùng mục tiêu."},duration:60,warmup:10,testMinutes:6,cooldown:5,diagram:{skill:skill.key,label:zone},coachNote:stage<2?"Tập chậm và ưu tiên tính hợp lệ.":stage<4?"Tăng ổn định khi có di chuyển.":"Đưa kỹ thuật vào tình huống có lựa chọn."});
 w++;
}
return sessions;
})();
