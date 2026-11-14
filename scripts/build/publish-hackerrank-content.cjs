'use strict';
// Prepare a signed HackerRank content update in the existing downloads checkout.
// Does not upload or change other content packs.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),zlib=require('zlib');
const root=path.resolve(__dirname,'../..'),home=path.join(process.env.APPDATA,'sameko-dev-cpp');
const site=path.join(process.env.LOCALAPPDATA,'SemekoBuild/downloads-site'),out=path.join(site,'content');
const service=require('../../app/services/content-updates'),manifestFile=path.join(out,'content-manifest.json');
const manifest=service.verify(fs.readFileSync(manifestFile)),target=manifest.packs.find(p=>p.id==='hackerrank');
if(!target)throw Error('Published HackerRank pack is missing');
const audit=JSON.parse(fs.readFileSync(path.join(root,'plans/artifacts/hackerrank-translation-audit.json'),'utf8'));
const job=JSON.parse(fs.readFileSync(path.join(home,'bulk-translation.json'),'utf8')),items=job.items.filter(i=>i.provider==='hackerrank');
if(!items.length||items.some(i=>i.status!=='done')||audit.checked!==items.length||audit.total!==items.length||audit.issues.length||audit.remainingEnglishArticles||audit.unfinished.length)throw Error('Complete HackerRank audit is required before publication');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const detailKeys=['provider','id','url','title','number','difficulty','paid','html','metadata','examples','snippets','mode','note','englishGenerated'];
const blobs=new Map(),files=[];
for(const item of items){
 if(!/^[a-zA-Z0-9-]+$/.test(item.id))throw Error('Invalid challenge ID');
 const doc=JSON.parse(fs.readFileSync(path.join(home,'translated-articles/hackerrank',item.id+'.json'),'utf8'));
 if(doc.detail?.provider!=='hackerrank'||doc.detail.id!==item.id||typeof doc.original!=='string'||!doc.original||typeof doc.translated!=='string'||!doc.translated||hash(doc.original)!==doc.sourceHash||doc.translatedFromHash!==doc.sourceHash)throw Error('Invalid source pair: '+item.id);
 const value={detail:Object.fromEntries(detailKeys.filter(k=>k in doc.detail).map(k=>[k,doc.detail[k]])),original:doc.original,translated:doc.translated,sourceHash:doc.sourceHash,translatedFromHash:doc.translatedFromHash};
 const bytes=Buffer.from(JSON.stringify(value)),sha256=hash(bytes),logical='translated-articles/hackerrank/'+item.id+'.json';
 blobs.set(sha256+'.json',bytes);files.push({path:logical,sha256,size:bytes.length});
}
files.sort((a,b)=>a.path.localeCompare(b.path));
const old=new Map(target.files.map(f=>[f.path,f.sha256])),changed=files.filter(f=>old.get(f.path)!==f.sha256).length;
if(!changed&&old.size===files.length){console.log('No HackerRank content changes');process.exit(0);}
const buckets=new Map();
for(const f of files){const bucket=parseInt(hash(f.path).slice(0,2),16)%32;if(!buckets.has(bucket))buckets.set(bucket,[]);buckets.get(bucket).push(f);}
let bundles=0,downloadBytes=0;
for(const bucket of buckets.values()){
 let group=[],size=0;
 function emit(){if(!group.length)return;const entries=Object.fromEntries(group.map(f=>[f.sha256+'.json',blobs.get(f.sha256+'.json').toString('base64')]));
  const data=zlib.gzipSync(Buffer.from(JSON.stringify(entries)),{level:6}),sha256=hash(data),name=sha256+'.pack.gz';
  if(!fs.existsSync(path.join(out,name)))fs.writeFileSync(path.join(out,name),data);
  for(const f of group){f.url='https://graperu.github.io/semeko-pro-downloads/content/'+name;f.bundle={sha256,size:data.length};}
  bundles++;downloadBytes+=data.length;group=[];size=0;
 }
 for(const f of bucket){if(size+f.size>8*1024*1024)emit();group.push(f);size+=f.size;}emit();
}
target.files=files;target.version='vi-'+new Date().toISOString();manifest.sequence=Date.now();manifest.createdAt=new Date().toISOString();
const payload=Buffer.from(JSON.stringify(manifest)),key=fs.readFileSync(path.join(process.env.LOCALAPPDATA,'SemekoBuild/content-signing-private.pem'));
const envelope=Buffer.from(JSON.stringify({payload:payload.toString('base64'),signature:crypto.sign(null,payload,key).toString('base64')}));
service.verify(envelope);
fs.writeFileSync(manifestFile,envelope);
console.log(JSON.stringify({provider:'hackerrank',files:files.length,changed,bundles,downloadBytes,version:target.version,published:false}));
