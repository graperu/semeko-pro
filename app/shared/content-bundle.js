'use strict';
const zlib=require('zlib'),crypto=require('crypto');
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
function unpack(data,descriptor,files){if(digest(data)!==descriptor.sha256)throw Error('Gói nén không khớp kiểm tra toàn vẹn.');const entries=JSON.parse(zlib.gunzipSync(data,{maxOutputLength:192*1024*1024}).toString('utf8'));const out=[];for(const f of files){const name=f.sha256+'.'+f.path.split('.').at(-1),value=entries[name];if(typeof value!=='string')throw Error('Gói nén thiếu tệp tài liệu.');const bytes=Buffer.from(value,'base64');if(bytes.length!==f.size||digest(bytes)!==f.sha256)throw Error('Tệp trong gói nén không khớp kiểm tra toàn vẹn.');out.push({name,bytes});}return out;}
module.exports={unpack,digest};
