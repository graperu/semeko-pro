'use strict';
const assert=require('node:assert/strict');
const service=require('../../app/services/competitive/local-practice');
const manifest=require('../../app/config/local-practice/manifest.json');
const items=service.list();
assert.equal(manifest.sources.length,71);
assert.equal(manifest.pdfCount,49);
assert.ok(items.length<=manifest.exerciseCount);
assert.ok(items.every(i=>!/[.\u2026]{4,}\s*\d*\s*$/.test(i.title)),'No table-of-contents entries');
const sessions=[...new Set(items.filter(i=>/BUOI\s*\d+/i.test(i.tags[0])).map(i=>Number(/BUOI\s*(\d+)/i.exec(i.tags[0])[1])))];
assert.deepEqual(sessions,[...sessions].sort((a,b)=>a-b));
assert.equal(new Set(items.map(i=>i.id)).size,items.length);
const sourceIds=new Set(manifest.sources.map(s=>s.id));
for(const entry of items){
    const item=service.detail(entry.id);
    assert.ok(sourceIds.has(item.source.id));
    assert.ok(item.source.firstPage>0&&item.source.lastPage>=item.source.firstPage);
    assert.ok(item.html.length>80);
    assert.ok(!item.children,'Exercise must be individual, not a PDF collection');
    assert.equal(item.provider,'28tech');
    assert.ok(/^[a-zA-Z0-9-]{1,160}$/.test(item.id));
    assert.ok(!/<script\b|<iframe\b/i.test(item.html));
    for(const test of item.tests){assert.equal(typeof test.input,'string');assert.equal(typeof test.output,'string');if(!item.adapted){assert.ok(test.input.trim());assert.ok(test.output.trim());}assert.ok(!/Sample (Input|Output)|Input Format|Output Format/.test(test.output));}
}
const sum=items.find(i=>i.id==='local-eb6634c0e7416a4c2a212c4f-0');
assert.ok(sum);
assert.ok(service.detail(sum.id).tests.some(t=>t.input.replace(/\r\n/g,'\n')==='773\n'&&t.output.replace(/\r\n/g,'\n')==='299151\n'),'Original sample survives adaptation');
console.log(`PASS: ${items.length} individual exercises, 71 source entries, provenance and known sample`);
const raw=require('../../app/config/local-practice/catalog.json').items;
const time=raw.find(i=>i.title.includes('17.4.')&&i.title.includes('Enhancing Class Time'));
assert.ok(time);
try{const html=service.detail(time.id).html;assert.ok(!/678\s+Chapter\s+17/.test(html));assert.ok(!/local-statement-block">4\s+/.test(html));}
catch(e){assert.match(e.message,/không phải đề bài độc lập/);assert.ok(!items.some(i=>i.id===time.id));}
