'use strict';
function trusted(event){const frame=event.senderFrame;if(!frame||frame!==event.sender.mainFrame)return false;try{const url=new URL(frame.url);return url.protocol==='app:'&&url.hostname==='app'||url.protocol==='file:'&&url.pathname.replace(/\\/g,'/').endsWith('/src/index.html');}catch{return false;}}
module.exports=event=>{if(!trusted(event))throw Error('Untrusted IPC sender');};
