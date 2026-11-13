'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'../..'),dir=path.join(root,'app/config/local-practice');
const sourceFiles=['catalog.json','adapted.json','ai-reviewed.json'];
process.env.SEMEKO_SKIP_PRACTICE_INDEX='1';
const items=require('../../app/services/competitive/local-practice').list();
const hashes=Object.fromEntries(sourceFiles.filter(f=>fs.existsSync(path.join(dir,f))).map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,f))).digest('hex')]));
require('../../app/shared/atomic-json-publish')(path.join(dir,'practice-index.json'),{schema:1,hashes,items});console.log('Prepared fast practice catalog:',items.length,'items');
