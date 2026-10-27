/* PickleUp V3.4 — declarative page catalog, presentation only. */
(function(root){
"use strict";
const pages=[
 {id:"home",title:"Tổng quan",icon:"🏠",description:"Bắt đầu tập luyện, xem chương trình tuần và đi tới các chức năng chính.",sections:["homeHero","homeShortcuts","homeStats","homeWeeks"]},
 {id:"coach",title:"HLV cá nhân",icon:"🎯",description:"Đánh giá kỹ năng và tạo giáo án cá nhân hóa từ cơ bản tới nâng cao.",sections:["selfAssessment","personalCoach","advancedCoach","advancedReadiness"]},
 {id:"court",title:"Trên sân",icon:"⏱",description:"Tập theo giáo án 60 phút, đồng hồ, sơ đồ sân và ghi kết quả.",sections:["pcOnCourt","practice"]},
 {id:"academy",title:"Học viện",icon:"📚",description:"80 giáo án, lộ trình từ 1.0 tới 5.0 và kỹ thuật theo cấp độ.",sections:["academy","levelRoadmap"]},
 {id:"progress",title:"Tiến bộ",icon:"📈",description:"Xem biểu đồ, lịch sử, kiểm tra chuyển cấp và kết quả trong điều kiện tương đương.",sections:["trainingHistory","dashboard","trainingEvaluation","stageAssessment","activityHistory"]},
 {id:"matches",title:"Thi đấu",icon:"🏓",description:"Nhật ký thi đấu đánh đơn/đôi, phân tích chiến thuật và vấn đề phối hợp.",sections:["matchJournal","tacticalReport"]},
 {id:"settings",title:"Dữ liệu",icon:"⚙️",description:"Sao lưu, khôi phục và kiểm soát dữ liệu lưu trên thiết bị.",sections:["backup"]}
];
root.PICKLEUP_PAGES=Object.freeze(pages.map(p=>Object.freeze({...p,sections:Object.freeze(p.sections.slice())})));
})(typeof window==="undefined"?globalThis:window);
