import sys,json
from pathlib import Path
import fitz
root=Path(__file__).resolve().parents[1]
book_id,page,out=sys.argv[1],int(sys.argv[2]),Path(sys.argv[3])
catalog=json.loads((root/'app/config/book-courses/catalog.json').read_text(encoding='utf8'))
book=next((b for b in catalog['courses'] if b['id']==book_id),None)
if not book or page<1 or page>book['pageCount']:raise ValueError('Invalid source page')
with fitz.open(root/'app/config/book-courses'/(book_id+'.pdf')) as doc:
    p=doc[page-1];pix=p.get_pixmap(matrix=fitz.Matrix(min(2,1800/p.rect.width),min(2,1800/p.rect.width)),alpha=False)
    out.parent.mkdir(parents=True,exist_ok=True);pix.save(out)
