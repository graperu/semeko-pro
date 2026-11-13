'use strict';
const fs=require('fs'),path=require('path');
const dir=path.resolve(process.argv[2]||path.join(process.env.LOCALAPPDATA,'SemekoBuild/content-release')),service=require('../../app/services/content-updates'),bundle=require('../../app/shared/content-bundle');
const manifest=service.verify(fs.readFileSync(path.join(dir,'content-manifest.json'))),groups=new Map();
for(const pack of manifest.packs)for(const f of pack.files){if(!f.bundle)throw Error('Release file missing compressed group');if(!groups.has(f.url))groups.set(f.url,[]);groups.get(f.url).push(f);}
for(const [url,files]of groups){const name=path.basename(new URL(url).pathname),file=path.join(dir,name);bundle.unpack(fs.readFileSync(file),files[0].bundle,files);}
console.log(JSON.stringify({verified:true,packs:manifest.packs.length,files:manifest.packs.reduce((n,p)=>n+p.files.length,0),bundles:groups.size,compressedBytes:[...groups].reduce((n,[,f])=>n+f[0].bundle.size,0)}));
