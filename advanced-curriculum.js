/* PickleUp V3.0 beta: 44 advanced lessons, distinct tactical scenarios.
 * Append to the 36-week beginner curriculum without changing IDs or legacy storage. */
(function(root){
"use strict";
const themes=[
{key:"third-drop",skill:"strategy",name:"Third-shot drop",stage:0,
 mistakes:["Đánh drop quá cao khiến đối thủ volley tấn công.","Cố tiến lên trước khi xác định quỹ đạo bóng.","Bỏ qua quy tắc hai lần nảy sau giao bóng."],
 cues:["Đánh sau khi bóng trả giao đã nảy ở sân người giao.","Ưu tiên quỹ đạo mềm rơi gần kitchen đối thủ.","Chỉ tiến lên khi bóng tạo đủ thời gian."],
 variants:[
 ["Drop thuận tay từ giữa cuối sân","Từ baseline, bạn tập trả sâu vào giữa; đánh quả thứ ba mềm tới kitchen chéo.","Đánh 10 quả cùng điểm tiếp xúc thuận tay.","Đổi mục tiêu giữa và chéo sau mỗi 5 quả.","Chơi 5 pha giao–trả–drop, chỉ tiến khi drop thấp.","Ít nhất 12/20 cú drop hợp lệ rơi trong kitchen."],
 ["Drop trái tay từ cuối sân","Bạn tập trả sâu về trái tay; đứng sau baseline và chọn điểm chạm ổn định.","Tập 10 cú trái tay nâng bóng mềm qua lưới.","Đổi vị trí đón bóng trái/phải bằng bước điều chỉnh.","Chơi 5 pha giao–trả–drop bằng trái tay và hồi vị.","Ít nhất 12/20 cú trái tay rơi trong kitchen."],
 ["Drop chéo sau cú trả sâu","Bạn tập luân phiên trả bóng vào nửa sâu hai phía sân.","Đọc hướng bóng, đánh drop chéo với biên an toàn.","Đặt vùng rơi rộng ở hai nửa kitchen rồi đổi tín hiệu.","Chơi 5 pha có người trả đứng sẵn gần kitchen để tạo áp lực.","Ít nhất 13/20 cú drop chéo an toàn."],
 ["Drop rồi tiến lên có kiểm soát","Đánh dấu một điểm dừng trong transition zone và vạch kitchen.","Tập drop, quan sát quỹ đạo rồi bước lên điểm dừng.","Đối tác trả lại bóng nhẹ cho người tập thực hiện reset nếu cần.","Chơi 5 pha ưu tiên không lao lên sau cú drop cao.","Ít nhất 13/20 pha drop hợp lệ kèm chọn đúng thời điểm tiến."]]},
{key:"transition-reset",skill:"position",name:"Reset trong transition zone",stage:0,
 mistakes:["Đứng cứng chân và đánh bật bóng quá cao.","Chạy lên lưới khi bóng đối phương đang tới.","Đánh volley khi đang chạm kitchen hoặc vạch kitchen."],
 cues:["Split-step trước khi đối thủ chạm bóng.","Hấp thụ lực để bóng trở lại thấp, không cố ghi điểm.","Giữ khoảng cách an toàn với kitchen khi volley."],
 variants:[
 ["Reset bóng thấp từ vùng giữa sân","Hai người đứng đối diện; người tập ở vùng giữa sân, người đưa bóng gần kitchen.","Nhận bóng nhẹ từ giữa sân rồi đánh reset chậm.","Đổi bóng sang thuận tay/trái tay mỗi 5 lượt.","Tập tiến một bước sau mỗi reset đủ thấp.","Ít nhất 12/20 reset rơi gần kitchen đối thủ."],
 ["Reset khi di chuyển từ baseline","Vạch đường tiến từ cuối sân tới kitchen với một điểm dừng ở giữa.","Di chuyển rồi dừng cân bằng trước cú reset.","Người đưa bóng thay đổi điểm rơi, buộc người tập chỉnh chân.","Chơi 5 pha chuyển tiếp, ưu tiên không lao quá đà.","Ít nhất 12/20 cú reset hợp lệ trong di chuyển."],
 ["Reset trước bóng volley áp lực vừa","Người đưa bóng volley nhẹ, kiểm soát tốc độ từ gần kitchen.","Giữ vợt trước người, chặn bóng mềm để giảm tốc.","Lần lượt nhận bóng thuận tay rồi trái tay.","Chơi 5 pha chỉ tiến lên sau bóng reset thấp.","Ít nhất 13/20 pha reset giữ bóng thấp."],
 ["Reset liên tiếp hai cú","Người tập ở giữa sân, đối tác gửi hai quả nối tiếp với tốc độ dễ kiểm soát.","Tập reset đầu rồi split-step lại.","Tập cú thứ hai sau bước ngang, không cố lên lưới sớm.","Chơi 5 pha yêu cầu hai reset trước khi tiến.","Ít nhất 12/20 chuỗi hai reset thành công."]]},
{key:"serve-return",skill:"return",name:"Giao – trả – quả thứ ba",stage:0,
 mistakes:["Trả giao bóng khi bóng chưa nảy.","Bóng trả quá ngắn khiến đối thủ dễ đánh lên.","Lên kitchen khi chưa giữ thăng bằng."],
 cues:["Trả sâu tạo thời gian tiến về khu vực kitchen.","Người giao cần để quả trả nảy trước cú thứ ba.","Ưu tiên chuỗi bóng hợp lệ trước khi tăng tốc."],
 variants:[
 ["Trả sâu để ép cú đánh thứ ba","Hai người giao–trả hợp lệ, đánh dấu vùng sâu đối diện.","Tập trả sâu ở 10 cú bên thuận tay.","Đổi góc mục tiêu sau 5 cú.","Chơi 5 pha giao–trả–thứ ba và quan sát hiệu quả.","Ít nhất 13/20 cú trả rơi sâu."],
 ["Trả giao bóng trái tay có kiểm soát","Bạn tập giao vào nửa sân trái tay theo đúng ô chéo.","Tập bước điều chỉnh trước cú trả trái tay.","Đặt mục tiêu ở phần sân sâu an toàn.","Chơi 5 pha trả rồi tiến lên dừng đúng lúc.","Ít nhất 13/20 cú trả trái tay hợp lệ và đủ sâu."],
 ["Đổi chiều sâu của cú trả","Đặt hai vùng sâu và trung bình trong sân đối diện.","Tập phân biệt bóng dễ/khó và ưu tiên trả sâu.","Bạn tập hô mục tiêu rộng sau khi giao.","Chơi 5 pha quan sát cú thứ ba của người giao.","Ít nhất 14/20 lần chọn và đánh vùng hợp lý."],
 ["Trả chéo rồi chiếm vị trí","Bạn tập giao luân phiên hai ô; tập riêng từng ô.","Đánh trả chéo hợp lệ sau một lần nảy.","Tiến tới gần kitchen với split-step trước đối thủ đánh.","Chơi 5 pha giữ vị trí đôi phù hợp.","Ít nhất 14/20 pha trả hợp lệ kèm hồi vị đúng."]]},
{key:"kitchen-pressure",skill:"dink",name:"Tạo áp lực tại kitchen",stage:0,
 mistakes:["Đánh bóng quá cao khi muốn đổi hướng dink.","Tấn công bóng thấp không phù hợp.","Vươn tay quá xa thay vì di chuyển chân."],
 cues:["Giữ dink thấp trước khi tăng nhịp.","Chỉ đổi tốc độ khi bóng thực sự thuận lợi.","Giữ khoảng cách an toàn với kitchen trong mọi cú volley."],
 variants:[
 ["Dink chéo giữ nhịp khi bị ép","Hai người đối diện khu vực kitchen, đánh bóng nhẹ chéo sân.","Tập 10 quả chéo vào vùng rộng.","Đối tác thay đổi độ sâu dink để luyện chỉnh chân.","Chơi 5 pha cố gắng duy trì 6 lượt hợp lệ.","Ít nhất 13/20 quả dink chéo kiểm soát được."],
 ["Dink đổi hướng khi bóng cao","Bạn tập luân phiên bóng thấp và bóng nhỉnh cao.","Tập nhận diện bóng an toàn nên dink.","Đổi hướng khi bóng thuận lợi, không ép cú khó.","Chơi 5 pha mỗi lần đổi hướng phải có điểm rơi hợp lý.","Ít nhất 14/20 lựa chọn cú đánh đúng tình huống."],
 ["Tạo cơ hội bằng dink vào chân","Đối thủ đứng gần kitchen, đánh dấu vùng rộng trước vị trí chân.","Đánh dink nhẹ thấp tránh nảy cao.","Đổi mục tiêu hai bên khu vực đối thủ.","Chơi 5 pha mở khoảng trống rồi đổi hướng.","Ít nhất 14/20 dink thấp trong vùng đích."],
 ["Dink phòng thủ sang trung tính","Người đưa bóng đổi góc, người tập đứng ngoài kitchen.","Tập reset dink thẳng khi bị kéo sang ngang.","Duy trì tư thế sau bóng khó, không giật cổ tay.","Chơi 5 pha từ bị động về thế cân bằng.","Ít nhất 14/20 quả giữ bóng trong kitchen."]]},
{key:"doubles-coverage",skill:"strategy",name:"Phối hợp đánh đôi",stage:0,
 mistakes:["Hai người cùng lao vào bóng giữa mà không gọi.","Một người tiến lên, người còn lại bỏ xa không phối hợp.","Chạy cắt mặt đồng đội khi bóng đang bay."],
 cues:["Gọi bóng rõ ràng trước điểm tiếp xúc.","Di chuyển song song phù hợp với hướng bóng.","Để khoảng trống giữa hai người nhỏ và an toàn."],
 variants:[
 ["Đánh đôi che khoảng giữa","Bốn người chia hai bên sân, tập tình huống bóng giữa với tốc độ vừa.","Gọi 'tôi' hoặc 'bạn' trước khi đánh.","Đổi đội nhận bóng để tập người ưu tiên nhận giữa.","Chơi 5 pha đánh đôi không bỏ khoảng giữa.","Ít nhất 13/20 tình huống phân công hợp lý."],
 ["Di chuyển đồng bộ theo bóng chéo","Hai đồng đội đứng cùng phía, phía đối diện có người đưa bóng.","Tập di chuyển cùng chiều khi bóng sang biên.","Đổi góc bóng liên tục giữa hai phía.","Chơi 5 pha giữ đúng khoảng cách đồng đội.","Ít nhất 13/20 lần phối hợp vị trí phù hợp."],
 ["Chuyển từ phòng thủ sang hai người lên lưới","Hai người bắt đầu ở nửa sân sau, bên kia có người đưa bóng.","Tập tiến lên theo bóng sâu có kiểm soát.","Split-step cùng nhau trước bóng trả.","Chơi 5 pha ưu tiên cả hai cùng lên khi có cơ hội.","Ít nhất 14/20 pha di chuyển phối hợp an toàn."],
 ["Giao tiếp trong pha bóng nhanh","Bốn người chơi nửa sân hoặc toàn sân, tốc độ vừa phải.","Tập gọi ngắn gọn bóng giữa và bóng sau.","Luyện đổi hướng sau khi một người bị kéo ra biên.","Chơi 5 pha tính điểm khi giao tiếp rõ.","Ít nhất 14/20 pha có giao tiếp hữu ích."]]},
{key:"third-choice",skill:"strategy",name:"Quyết định cú thứ ba",stage:1,
 mistakes:["Đánh drive quá mạnh khi mất thăng bằng.","Lạm dụng drop khi bóng trả quá cao dễ tấn công.","Nhầm cú thứ ba với cú volley khi chưa đủ hai lần nảy."],
 cues:["Đợi cú trả giao nảy rồi chọn drop hoặc drive.","Chọn drive có biên an toàn, không chỉ dựa vào lực.","Sau cú đánh, sẵn sàng cho cú thứ năm."],
 variants:[
 ["Third-shot drop hay drive theo độ cao","Bạn tập trả giao bóng sâu, xen kẽ bóng thấp và bóng nhỉnh cao.","Tập quan sát bóng trước khi chọn kỹ thuật.","Gọi tên lựa chọn trước cú đánh trong 20 lượt.","Chơi 5 pha chọn cú phù hợp, không cố ghi điểm sớm.","Ít nhất 14/20 quyết định phù hợp kèm bóng hợp lệ."],
 ["Third-shot drive đặt vào khoảng trống","Đánh dấu vùng rộng ở khoảng giữa hai đối thủ, kiểm soát tốc độ.","Tập drive đúng hướng không quá mạnh.","Sau drive, chuẩn bị nhận volley trả lại và reset.","Chơi 5 pha drive rồi cú thứ năm an toàn.","Ít nhất 14/20 drive vào vùng hợp lệ."],
 ["Drop rồi xử lý cú thứ năm","Một người ở kitchen đối diện, người tập bắt đầu baseline.","Tập drop rồi split-step trước bóng trả.","Nhận bóng thứ năm và đánh reset hoặc dink an toàn.","Chơi 5 pha theo chuỗi ba–năm.","Ít nhất 14/20 chuỗi xử lý đúng quyết định."],
 ["Đổi lựa chọn khi bị ép sâu","Người trả giao luân phiên bóng sâu thuận/trái tay.","Tập điều chỉnh chân rồi chọn drop an toàn.","Tập tình huống khó chọn drive thấp vào giữa.","Chơi 5 pha quản lý rủi ro cú thứ ba.","Ít nhất 15/20 pha giữ bóng hợp lệ và quyết định an toàn."]]},
{key:"advanced-reset",skill:"position",name:"Reset nâng cao",stage:1,
 mistakes:["Mở mặt vợt quá nhiều làm bóng bổng.","Đánh quả sau trước khi thu hồi thăng bằng.","Lao lên khi cú reset còn cao."],
 cues:["Giảm tốc bóng bằng động tác ngắn.","Split-step ở vùng chuyển tiếp.","Chỉ lên kitchen sau khi có bóng đủ thấp."],
 variants:[
 ["Reset liên tiếp dưới áp lực có kiểm soát","Hai người, người đưa bóng ở gần kitchen, người nhận ở vùng giữa.","Tập hai cú reset liên tiếp vào vùng rộng.","Đổi sang nhận bóng trái tay và thuận tay.","Chơi 5 pha chỉ tiến khi bóng đã thấp.","Ít nhất 14/20 chuỗi reset đạt mục tiêu."],
 ["Reset từ bước chân ngang","Bố trí hai điểm nhận bóng cách nhau một bước ngang.","Bước ngang dừng rồi reset vào kitchen.","Đối tác đổi thứ tự hai điểm nhận bóng.","Chơi 5 pha không đánh khi mất thăng bằng.","Ít nhất 14/20 cú reset đúng vùng."],
 ["Reset từ bóng vào chân","Đối tác cấp bóng nhẹ về vị trí chân trong transition zone.","Hạ thấp người và đánh trả mềm.","Tập cùng cú trái tay khi bóng lệch sang cạnh.","Chơi 5 pha chuyển từ khó sang an toàn.","Ít nhất 15/20 lần trả bóng thấp hợp lệ."],
 ["Chọn reset hay block theo tốc độ","Đối tác cấp bóng nhẹ/chậm và vừa phải theo tín hiệu.","Tập nhận diện bóng nên để nảy.","Tập block khi volley hợp lệ và có vị trí an toàn.","Chơi 5 pha chọn cách giảm tốc đúng.","Ít nhất 15/20 quyết định và đường bóng hợp lý."]]},
{key:"counter-volley",skill:"volley",name:"Counter volley",stage:1,
 mistakes:["Vung vợt lớn khi đối phương tăng tốc.","Đứng/chạm vào đường kitchen lúc volley.","Đánh trả vào người ở khoảng cách quá gần khi không kiểm soát được."],
 cues:["Giữ vợt phía trước cơ thể.","Động tác ngắn; chọn hướng an toàn.","Thực hành tốc độ chậm tới vừa, tăng khi đã ổn định."],
 variants:[
 ["Volley chặn tốc độ vừa","Hai người ở ngoài kitchen, người cấp bóng nhẹ tăng tốc có kiểm soát.","Tập chặn vợt trước ngực với cú chạm ngắn.","Đổi bóng thuận/trái tay mỗi 5 lần.","Chơi 5 pha block và hồi vị.","Ít nhất 14/20 cú volley hợp lệ có kiểm soát."],
 ["Counter volley hai phía","Đối tác luân phiên bóng thuận tay và trái tay, tốc độ vừa.","Tập đưa mặt vợt ra trước.","Tập bước nhỏ để điều chỉnh thay vì vươn tay.","Chơi 5 pha sau cú counter giữ thế cân bằng.","Ít nhất 14/20 lần counter hợp lệ."],
 ["Counter bóng cao vào khoảng trống","Người cấp bóng gửi bóng cao vừa đủ, không cần đánh mạnh.","Tập nhận diện bóng có thể đẩy sang vùng trống.","Khi bóng thấp, chọn block thay vì tăng lực.","Chơi 5 pha chọn quyết định an toàn.","Ít nhất 15/20 lựa chọn và cú đánh đạt mục tiêu."],
 ["Phòng thủ sau counter volley","Người đưa bóng trả lại cú counter ở tốc độ vừa.","Tập counter rồi lập tức đưa vợt về phía trước.","Tập block cú tiếp theo khi cần.","Chơi 5 pha giữ vị trí sau cú đánh.","Ít nhất 15/20 chuỗi hai cú hợp lệ."]]},
{key:"doubles-switch",skill:"strategy",name:"Chiến thuật đội đôi nâng cao",stage:1,
 mistakes:["Đổi chỗ không có tín hiệu trước.","Kéo khoảng trống giữa hai người quá rộng.","Dùng stacking khi chưa thống nhất vị trí đứng và điểm số."],
 cues:["Chốt vị trí giao/nhận trước điểm đấu.","Gọi và giữ cự ly hợp lý.","Thử stacking như bài tập tình huống, không bắt buộc dùng trong trận."],
 variants:[
 ["Che giữa khi đồng đội bị ép biên","Bốn người, một đội tạo bóng sang biên rộng.","Đồng đội còn lại dịch chuyển hỗ trợ khoảng giữa.","Đổi tình huống ép biên trái/phải.","Chơi 5 pha hạn chế khoảng trống.","Ít nhất 14/20 pha đứng vị trí phối hợp tốt."],
 ["Phối hợp hai người tại kitchen","Hai đồng đội đứng ngoài kitchen, đối tác gửi bóng qua góc.","Tập dời bước nhỏ cùng hướng bóng.","Tập gọi người đón bóng giữa.","Chơi 5 pha kiểm soát khoảng trống.","Ít nhất 14/20 lần phối hợp đúng."],
 ["Nhập môn stacking theo tình huống","Bốn người cùng kiểm tra vị trí giao/nhận đúng điểm số trước khi bắt đầu.","Tập đổi vị trí sau cú giao hoặc trả theo thỏa thuận.","Mô phỏng 10 điểm số khác nhau, kiểm tra vị trí hợp lệ.","Chơi 5 pha có trao đổi trước giao bóng.","Ít nhất 15/20 tình huống xác nhận đúng vị trí."],
 ["Phân vai forehand giữa sân","Hai người thống nhất quy tắc nhận bóng giữa trước lượt.","Tập gọi bóng khi forehand thuận lợi.","Đổi đối tác/đổi bên để tránh phụ thuộc một vị trí.","Chơi 5 pha quan sát việc che giữa.","Ít nhất 15/20 pha giao tiếp và nhận bóng hợp lý."]]},
{key:"defense-attack",skill:"dink",name:"Từ phòng thủ sang phản công",stage:1,
 mistakes:["Đánh nhanh khi bóng vẫn thấp và bản thân đang bị động.","Bỏ cú reset dù có cơ hội đưa bóng về kitchen.","Tăng tốc mà không có vị trí hồi phục."],
 cues:["Dùng reset để trung tính hóa pha bóng khó.","Tấn công khi bóng cao và thuận lợi.","Hồi vị trước khi chuẩn bị phản công tiếp."],
 variants:[
 ["Reset rồi chờ bóng tấn công","Người tập đứng vùng chuyển tiếp, đối tác ở kitchen.","Tập reset 10 lần vào vùng mềm.","Đối tác gửi bóng cao hơn sau một cú reset tốt.","Chơi 5 pha đợi thời cơ thay vì ép.","Ít nhất 14/20 pha chọn đúng thời điểm phản công."],
 ["Dink phòng thủ rồi đổi hướng","Hai người đánh dink gần kitchen.","Tập dink thấp khi bị kéo ngang.","Khi bóng dễ, đổi sang vùng trống rộng.","Chơi 5 pha từ áp lực về thế cân bằng.","Ít nhất 15/20 pha giữ bóng hợp lệ."],
 ["Hấp thụ lực rồi phản ứng","Đối tác cấp bóng từ nhẹ đến vừa ở khoảng cách an toàn.","Tập chặn mềm giảm tốc.","Tập bước chỉnh chân và xử lý bóng kế tiếp.","Chơi 5 pha không tăng tốc quá sớm.","Ít nhất 15/20 pha reset rồi phản ứng đúng."],
 ["Chuyển trạng thái trong hai pha bóng","Bắt đầu ở cuối sân, đối tác gửi bóng sâu rồi lên kitchen.","Tập drop hoặc reset tùy vị trí.","Nhận cú bóng kế và chọn đánh an toàn hay tấn công.","Chơi 5 pha chủ động đọc cơ hội.","Ít nhất 15/20 chuỗi quyết định tốt."]]},
{key:"tactical-choice",skill:"strategy",name:"Ra quyết định dưới áp lực",stage:1,
 mistakes:["Nhắm sát biên khi chưa đủ kiểm soát.","Đánh nhanh khi đối tác chưa vào vị trí.","Bỏ qua trạng thái đối thủ và đồng đội."],
 cues:["Quan sát trước khi đánh, giữ cú an toàn.","Ưu tiên phối hợp đội đôi hơn pha bóng đẹp đơn lẻ.","Phân biệt tình huống cần giữ bóng và tình huống có thể kết thúc."],
 variants:[
 ["Chọn bóng an toàn khi đang lùi","Đối tác đánh sâu khi người tập đứng vùng chuyển tiếp.","Tập gọi lựa chọn phòng thủ trước cú đánh.","Tập reset hoặc trả sâu tùy vị trí.","Chơi 5 pha không cố tấn công khi lùi.","Ít nhất 14/20 quyết định phòng thủ phù hợp."],
 ["Chọn hướng khi đối thủ lệch vị trí","Bốn người chơi; đối tác dịch chuyển để lộ vùng rộng.","Tập quan sát khoảng trống trước khi đánh.","Tập chọn giữa hoặc chéo có biên an toàn.","Chơi 5 pha giữ cú đánh hợp lệ ưu tiên.","Ít nhất 15/20 hướng bóng hợp lý."],
 ["Khi nào tăng tốc tại kitchen","Hai bên đứng ngoài kitchen, tạo bóng thấp/cao xen kẽ.","Tập nhận diện bóng không nên tăng tốc.","Thử tăng tốc vừa phải khi bóng thuận lợi.","Chơi 5 pha chú ý an toàn và đối tác.","Ít nhất 15/20 quyết định đúng bối cảnh."],
 ["Thi đấu tình huống có mục tiêu","Bốn người đánh đôi, chọn một chiến thuật trước điểm.","Tập giao tiếp ngắn trước cú giao.","Thực hiện chiến thuật theo điểm số mô phỏng.","Chơi 5 pha và nhận xét sau mỗi pha.","Ít nhất 16/20 quyết định phối hợp có chủ đích."]]}
];
const stage0=themes.filter(t=>t.stage===0),stage1=themes.filter(t=>t.stage===1);
const out=[];let index=36;
for(const [level,list] of [["3.0–3.5",stage0],["3.5–4.0",stage1]]){
 for(let cycle=0;cycle<4;cycle++)for(const t of list){
  const v=t.variants[cycle],minutes=[12,12,15],target=level==="3.0–3.5"?12+cycle:14+Math.min(3,cycle);
  index++;
  out.push({
   id:"PU-"+String(index).padStart(3,"0"),week:index,level,advanced:true,focus:t.key,
   skill:t.skill,skillName:t.name,title:v[0],goal:"Tập "+v[0].toLowerCase()+" và quyết định cú đánh hợp lý trong pha bóng.",
   zone:"Vùng mục tiêu tùy tình huống: ưu tiên điểm rơi rộng, an toàn.",
   setup:v[1]+" Thiết bị: vợt, 6–12 bóng, 2 nón đánh dấu mềm.",
   cues:t.cues,mistakes:t.mistakes,
   drills:[
    {minutes:minutes[0],name:"Kỹ thuật nền",instruction:v[2]+" Tập ba hiệp có nghỉ ngắn, ưu tiên chất lượng bóng.",check:"Ghi số lần đúng và một điều chỉnh quan trọng."},
    {minutes:minutes[1],name:"Biến thể có mục tiêu",instruction:v[3]+" Chia thành bốn lượt, mỗi lượt năm tình huống.",check:"Đếm số tình huống xử lý đúng trên 20."},
    {minutes:minutes[2],name:"Áp dụng vào pha bóng",instruction:v[4]+" Chơi ba lượt, mỗi lượt năm phút; đổi vai khi phù hợp.",check:"Ghi một quyết định tốt và một tình huống cần xem lại."}
   ],
   assessment:{attempts:20,target,instruction:v[5]+" Đây là chỉ tiêu nội bộ để chọn giáo án, không phải chứng nhận trình độ."},
   warmup:10,testMinutes:6,cooldown:5,duration:60
  });
 }
}
if(out.length!==44||index!==80)throw Error("Invalid V3 syllabus count.");
root.PICKLEUP_ADVANCED_CURRICULUM=out;
root.PICKLEUP_CURRICULUM=(root.PICKLEUP_CURRICULUM||[]).concat(out);
})(typeof window==="undefined"?globalThis:window);
