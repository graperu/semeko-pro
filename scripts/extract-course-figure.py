"""Extract a bounded figure region from the original PDF, not a page screenshot."""
import sys, json
from pathlib import Path
import fitz

root = Path(__file__).resolve().parents[1]
request = json.loads(sys.stdin.read())
books = json.loads((root / 'app/config/book-courses/catalog.json').read_text(encoding='utf8'))['courses']
book = next(b for b in books if b['id'] == request['bookId'])
page_number = request['page']
assert isinstance(page_number, int) and 1 <= page_number <= book['pageCount']
box = request['box']
assert len(box) == 4 and all(isinstance(v, (float, int)) and 0 <= v <= 1 for v in box)
assert box[2] - box[0] >= .05 and box[3] - box[1] >= .025
assert (box[2] - box[0]) * (box[3] - box[1]) <= .75
asset = request['assetId']
assert len(asset) == 24 and all(c in '0123456789abcdef' for c in asset)
output = Path(request['directory']) / (asset + '.png')
output.parent.mkdir(parents=True, exist_ok=True)
with fitz.open(root / 'app/config/book-courses' / (book['id'] + '.pdf')) as document:
    page = document[page_number - 1]
    rect = page.rect
    clip = fitz.Rect(rect.x0 + box[0] * rect.width, rect.y0 + box[1] * rect.height,
                     rect.x0 + box[2] * rect.width, rect.y0 + box[3] * rect.height)
    pix = page.get_pixmap(matrix=fitz.Matrix(2.5, 2.5), clip=clip, alpha=False)
    assert pix.width >= 50 and pix.height >= 30
    temporary = output.with_suffix('.tmp.png')
    pix.save(temporary)
    temporary.replace(output)
print(json.dumps({'width': pix.width, 'height': pix.height}))
