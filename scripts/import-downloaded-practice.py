"""Reproducible, offline import of the three user-provided exercise archives.
Original archives are read only. All source pages remain in a compressed audit copy.
"""
import argparse, hashlib, html, json, re, zipfile, gzip
from pathlib import Path
import fitz

ARCHIVES = ['drive-download-20261109T171153Z-1-001.zip', 'drive-download-20261109T171156Z-1-001.zip', 'drive-download-20261109T171214Z-1-001.zip']
def digest(b): return hashlib.sha256(b).hexdigest()
def clean(s):
    return re.sub('[\ue000-\uf8ff]', '•', s).replace('\uf0b7', '•').replace('\xad', '')
def book_ranges(text, starts, pages):
    """Only index numbered exercises inside an explicit exercise section.
    Answers and chapter prose cannot start a practice problem.
    """
    ranges=[]; active=None
    events=list(re.finditer(r'(?mi)^[ \t]*(Programming Exercises|Self-Review Exercises|Answers to Self-Review Exercises|Exercises|BÀI TẬP)[ \t]*$',text))
    for n,event in enumerate(events):
        if event[1].startswith('Answers'): continue
        end=events[n+1].start() if n+1<len(events) else len(text)
        # End at a new chapter, not its repeated running header.
        segment=text[event.end():end]
        pat=r'(?m)^[ \t]*([*★]*\d+\.\d+)[ \t]+([^\n]{3,})' if 'BÀI' not in event[1] else r'(?m)^[ \t]*(\d+)\.[ \t]+([^\n]{3,})'
        found=list(re.finditer(pat,segment))
        if not found: continue
        chapter=found[0][1].lstrip('*★').split('.')[0]
        for j,m in enumerate(found):
            if '.' in m[1] and m[1].lstrip('*★').split('.')[0]!=chapter: break
            a=event.end()+m.start(); b=event.end()+(found[j+1].start() if j+1<len(found) else len(segment))
            # A chapter opener ends the final exercise; retain its preceding pages.
            page=max(k for k,s in enumerate(starts) if s<=a)
            for k in range(page+1,len(pages)):
                if starts[k]>=b: break
                heading=re.search(r'(?i)(?:Chapter|Chương)\s+(\d+)',pages[k][:250])
                if heading and heading[1]!=chapter:
                    b=starts[k];break
            if b>a:ranges.append((a,b,m[1],m[2]))
    return ranges
def run(downloads, output):
    output.mkdir(parents=True, exist_ok=True)
    sources=[]; items=[]; retained={}; seen={}
    try:
        with gzip.open(output/'source-pages.json.gz','rt',encoding='utf8') as f: previous=json.load(f)
    except (OSError,ValueError): previous={}
    for archive in ARCHIVES:
        with zipfile.ZipFile(downloads/archive) as z:
            for entry in z.infolist():
                if entry.is_dir(): continue
                raw=z.read(entry); sha=digest(raw); sid='local-'+sha[:24]
                source={'archive':archive,'name':entry.filename,'bytes':len(raw),'sha256':sha,'id':sid}
                sources.append(source)
                if sha in seen:
                    source['duplicateOf']=seen[sha]; continue
                seen[sha]=entry.filename
                if not entry.filename.lower().endswith('.pdf'): continue
                if sid in previous: pages=previous[sid]['pages']
                else:
                    with fitz.open(stream=raw,filetype='pdf') as doc: pages=[clean(p.get_text(sort=True)) for p in doc]
                source.update(pages=len(pages),blankPages=[i+1 for i,p in enumerate(pages) if len(p.strip())<20])
                retained[sid]={'name':entry.filename,'pages':pages}
                # Keep page provenance in every span; TOC entries are never exercises.
                text=''; starts=[]
                for p in pages: starts.append(len(text)); text+=p+'\n'
                book=len(pages)>100
                pattern=r'(?m)^[ \t]*(?:\[[^\n\]]+\]\.[ \t]*)?(?:Bài[ \t]*|\[OOP\]\.[ \t]*)(\d+)(?:[ \t]*[.:][ \t]*([^\n]*)|[ \t]*$)'
                matches=[m for m in re.finditer(pattern,text,re.I) if not re.search(r'\.{3,}|…{2,}',m[0])]
                if not matches and not book:
                    matches=list(re.finditer(r'(?m)^\s*(\d+)\s*\.\s*([A-ZÀ-ỸĐ][^\n]{4,})',text))
                source['detectedExercises']=len(matches)
                source['needsReview']=book or bool(source['blankPages']) or not matches
                group=re.sub(r'\[28Tech\]\.\s*','',Path(entry.filename).stem,flags=re.I)
                spans=book_ranges(text,starts,pages) if book else [(m.start(),matches[i+1].start() if i+1<len(matches) else len(text),m[1],m[2]) for i,m in enumerate(matches)]
                source['detectedExercises']=len(spans)
                for i,(begin,end,number,heading) in enumerate(spans):
                    body=text[begin:end].strip()
                    # Remove repeated page furniture, not mathematical/code lines.
                    body='\n'.join(l for l in body.splitlines() if not re.match(r'^\s*(?:28Tech - Become|Website\s*:|Youtube\s*:|Facebook page\s*:|Hotline\s*:|-{12,})',l))
                    if len(body)<20: continue
                    first=max(j for j,s in enumerate(starts) if s<=begin)+1
                    last=max(j for j,s in enumerate(starts) if s<end)+1
                    title='Bài '+number+'. '+(heading or '').strip()
                    if len(title)<10: title+=' '+next((l.strip() for l in body.splitlines()[1:] if l.strip()),'')
                    tests=[]
                    labels=list(re.finditer(r'(?mi)^\s*Sample (Input|Output)(?:\s+(\d+))?\s*$',body))
                    for k in range(0,len(labels)-1,2):
                        a,b=labels[k:k+2]
                        if a[1]!='Input' or b[1]!='Output' or a[2]!=b[2]: continue
                        inp=body[a.end():b.start()].strip()
                        out=body[b.end():labels[k+2].start() if k+2<len(labels) else len(body)].split('Explanation')[0].strip()
                        if inp and out and not re.search(r'Sample (?:Input|Output)|Input Format|Output Format|Constraints|Bài\s+\d+',inp+'\n'+out,re.I): tests.append({'input':inp+'\n','output':out+'\n'})
                    item={'provider':'28tech','id':sid+'-'+str(i),'title':title[:180], 'number':'','difficulty':'C++','tags':[group], 'paid':False,'mode':'stdin','tests':tests,'url':'semeko://practice/'+sid+'-'+str(i),'source':{'id':sid,'name':entry.filename,'firstPage':first,'lastPage':last},'html':'<article class="native-exercise"><h3>'+html.escape(title)+'</h3><div class="native-exercise-body">'+html.escape(body)+'</div></article>','note':f'Nguồn: {group} · trang {first}–{last}. '+(f'{len(tests)} test mẫu từ tài liệu.' if tests else 'Chưa xác nhận test mẫu; không tự tạo đáp án.')}
                    items.append(item)
    manifest={'version':1,'sources':sources,'pdfCount':sum(s['name'].lower().endswith('.pdf') for s in sources),'exerciseCount':len(items),'pages':sum(s.get('pages',0) for s in sources),'reviewRequired':[s['name'] for s in sources if s.get('needsReview')]}
    (output/'catalog.json').write_text(json.dumps({'version':1,'items':items},ensure_ascii=False),encoding='utf8')
    (output/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
    with gzip.open(output/'source-pages.json.gz','wt',encoding='utf8') as f: json.dump(retained,f,ensure_ascii=False)
    print(json.dumps({k:manifest[k] for k in ['pdfCount','exerciseCount','pages','reviewRequired']},ensure_ascii=False))
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--downloads',type=Path,default=Path.home()/'Downloads');p.add_argument('--output',type=Path,required=True);a=p.parse_args();run(a.downloads,a.output)
