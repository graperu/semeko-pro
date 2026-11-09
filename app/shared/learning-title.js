'use strict';
module.exports=function title(name){
    return String(name).replace(/\.(?:pdf|cpp|py|java|c|h|md|txt)$/i,'')
        .replace(/^\d+\.\s*(?=\[28\s*TECH)/i,'').replace(/\[28\s*TECH[^\]]*\]\.?\s*/ig,'')
        .replace(/^([a-z0-9]+)[-_]bai[-_](\d+)[-_]/i,(_,topic,n)=>'Bài '+Number(n)+' · '+topic+' · ')
        .replace(/[_]+/g,' ').replace(/-+/g,' ').replace(/\s+/g,' ').trim();
};
