'use strict';
let confirmed=false;
chrome.runtime.onMessage.addListener(message=>{if(message.type==='semeko-status'){const status=document.getElementById('semeko-status');if(status&&(!confirmed||message.connected))status.textContent=message.text;if(message.connected){confirmed=true;document.title='Đăng nhập thành công — Semeko';const button=document.getElementById('semeko-pair');if(button){button.textContent='Đã kết nối với Semeko';button.disabled=true;}}}});
if(location.pathname==='/semeko-connect'&&/^#(codeforces|leetcode):[a-f0-9]{64}$/.test(location.hash)){
 const button=document.getElementById('semeko-pair'),status=document.getElementById('semeko-status');
 if(button&&status)chrome.runtime.sendMessage({type:'resume',url:location.href}).then(result=>{if(result?.known&&!confirmed){button.disabled=true;status.textContent='Đang tự kết nối lại Semeko bằng hồ sơ đã ghép nối.';}}).catch(()=>{});
 if(button&&status){status.textContent='Tiện ích đã sẵn sàng.';button.onclick=async()=>{button.disabled=true;try{const result=await chrome.runtime.sendMessage({type:'pair',url:location.href});if(confirmed)return;status.textContent=result?.connected?'Đã kết nối. Quay lại Semeko.':'Đang chờ đăng nhập. Mở liên kết nền tảng bên dưới; phiên sẽ tự chuyển vào app.';}catch(_){status.textContent='Không kết nối được. Bấm đăng nhập trong Semeko để thử lại.';button.disabled=false;}};}
}
