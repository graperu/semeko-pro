"""Copy unchanged source books and build a page-complete course outline."""
import zipfile,hashlib,json,re
from pathlib import Path
import fitz
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'app/config/book-courses'
OUT.mkdir(parents=True,exist_ok=True)
archive=Path.home()/'Downloads/drive-download-20261109T171156Z-1-001.zip'
courses=[]
with zipfile.ZipFile(archive) as z:
    for entry in z.infolist():
        raw=z.read(entry);sha=hashlib.sha256(raw).hexdigest();sid='local-'+sha[:24]
        (OUT/(sid+'.pdf')).write_bytes(raw)
        with fitz.open(stream=raw,filetype='pdf') as doc:
            outline=doc.get_toc();boundaries={1:'Bìa và phần mở đầu'}
            for level,title,page in outline:
                if level==1 and 1<=page<=len(doc):boundaries[page]=title.strip()
            ordered=sorted(boundaries.items());chapters=[]
            for i,(page,title) in enumerate(ordered):
                end=ordered[i+1][0]-1 if i+1<len(ordered) else len(doc)
                chapters.append({'id':str(i),'title':title,'firstPage':page,'lastPage':end,'sections':[{'title':t.strip(),'page':p,'level':l} for l,t,p in outline if l>1 and page<=p<=end]})
            title=re.sub(r'\s*\(z-lib.org\)','',Path(entry.filename).stem).replace('_',' ')
            courses.append({'id':sid,'title':title,'sourceName':entry.filename,'sha256':sha,'pageCount':len(doc),'chapters':chapters})
(OUT/'catalog.json').write_text(json.dumps({'version':1,'courses':courses},ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps([{'title':c['title'],'pages':c['pageCount'],'groups':len(c['chapters'])} for c in courses],ensure_ascii=False))
