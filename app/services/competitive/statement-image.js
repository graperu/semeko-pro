'use strict';
const {app,session}=require('electron'),fs=require('fs'),path=require('path'),crypto=require('crypto');
function imageType(buffer,fallback){if(buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return'image/png';if(buffer[0]===255&&buffer[1]===216&&buffer[2]===255)return'image/jpeg';if(buffer.subarray(0,3).toString()==='GIF')return'image/gif';if(buffer.subarray(0,4).toString()==='RIFF'&&buffer.subarray(8,12).toString()==='WEBP')return'image/webp';if(/<svg[\s>]/i.test(buffer.subarray(0,4000).toString('utf8')))return'image/svg+xml';return fallback;}
module.exports=async value=>{
 const url=new URL(value);const cf=['codeforces.com','codeforces.org'].some(h=>url.hostname===h||url.hostname.endsWith('.'+h));const lc=['leetcode.com','assets.leetcode.com','s3-lc-upload.s3.amazonaws.com'].includes(url.hostname);if(url.protocol!=='https:'||!cf&&!lc)throw Error('Invalid statement image host');
 const file=path.join(app.getPath('userData'),'statement-images',crypto.createHash('sha256').update(url.href).digest('hex')+'.json');
 try{const data=JSON.parse(fs.readFileSync(file,'utf8')).data;const match=/^data:([^;]+);base64,(.*)$/.exec(data);if(match){const buffer=Buffer.from(match[2],'base64');if(/<(?:Error|html)\b/i.test(buffer.subarray(0,4000).toString('utf8')))throw Error('Invalid cached image');return'data:'+imageType(buffer,match[1])+';base64,'+match[2];}}catch{}
 const response=await session.defaultSession.fetch(url.href,{headers:{Referer:cf?'https://codeforces.com/':'https://leetcode.com/'},redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('Máy chủ ảnh '+(cf?'Codeforces':'LeetCode')+' trả HTTP '+response.status);
 let type=(response.headers.get('content-type')||'').split(';')[0];
 const chunks=[];let size=0;for await(const chunk of response.body){size+=chunk.length;if(size>10000000)throw Error('Image too large');chunks.push(chunk);}
 const buffer=Buffer.concat(chunks);type=imageType(buffer,type);if(/<(?:Error|html)\b/i.test(buffer.subarray(0,4000).toString('utf8'))||!['image/png','image/jpeg','image/webp','image/gif','image/svg+xml'].includes(type))throw Error('Unsupported image response');
 const data='data:'+type+';base64,'+buffer.toString('base64');fs.mkdirSync(path.dirname(file),{recursive:true});require('../../shared/fs-atomic').writeFileAtomicSync(file,JSON.stringify({data}),'utf8');return data;
};
