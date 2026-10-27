/* PickleUp V3.3 — standardize practice conditions; optional for legacy records. */
(function(root){
"use strict";
const OPTIONS={
 feed:{partner:"Bạn tập đưa bóng",machine:"Máy bắn bóng",rally:"Trong pha bóng thực tế"},
 pace:{slow:"Chậm – tập kỹ thuật",moderate:"Vừa – ổn định",match:"Gần tốc độ thi đấu"},
 target:{wide:"Vùng mục tiêu rộng",standard:"Vùng mục tiêu tiêu chuẩn",narrow:"Vùng mục tiêu hẹp"}
};
const DOUBLES={
 middle:"Bỏ khoảng giữa sân",
 communication:"Gọi bóng/phân công chưa rõ",
 transition:"Di chuyển lên kitchen chưa đồng bộ",
 third:"Xử lý cú thứ ba chưa tốt",
 none:"Không ghi nhận vấn đề cụ thể"
};
const KEYS=Object.keys(OPTIONS);
function valid(c){return !!c&&typeof c==="object"&&!Array.isArray(c)&&KEYS.every(k=>typeof c[k]==="string"&&Object.prototype.hasOwnProperty.call(OPTIONS[k],c[k]))}
function signature(c){return valid(c)?KEYS.map(k=>c[k]).join("|"):null}
function describe(c){return valid(c)?KEYS.map(k=>OPTIONS[k][c[k]]).join(" · "):"Chưa ghi đủ điều kiện"}
function fromSelect(values){
 const c={feed:values?.feed||"",pace:values?.pace||"",target:values?.target||""};
 return valid(c)?c:null;
}
function canCompare(a,b){return signature(a)!==null&&signature(a)===signature(b)}
function isDoublesIssue(issue){return issue===null||issue===undefined||Object.prototype.hasOwnProperty.call(DOUBLES,issue)}
root.PICKLEUP_PRACTICE_CONDITIONS={OPTIONS,DOUBLES,KEYS,valid,signature,describe,fromSelect,canCompare,isDoublesIssue};
})(typeof window==="undefined"?globalThis:window);
