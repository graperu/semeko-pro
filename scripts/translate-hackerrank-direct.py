"""Reviewed direct translation. Protected formula/code/test nodes are untouched."""
import json,re
from pathlib import Path
from bs4 import BeautifulSoup
root=Path(__file__).resolve().parents[1]
source=json.loads((root/'plans/artifacts/hr-countingsort2-source.json').read_text(encoding='utf8'))
text=[
'Khi sắp xếp một danh sách, các phần tử được sắp thường chỉ là khóa gắn với những giá trị khác. Chẳng hạn, nếu sắp xếp tệp theo kích thước, mỗi kích thước phải luôn đi cùng tệp tương ứng. Bạn không thể chỉ lấy các số biểu thị kích thước rồi in chúng theo thứ tự; cần xuất đủ thông tin tệp được yêu cầu.',
'Thuật toán',
'sắp xếp đếm (counting sort)',
'được dùng khi chỉ cần sắp xếp một danh sách số nguyên. Thay vì so sánh các phần tử, hãy tạo một mảng số nguyên có miền chỉ số bao phủ toàn bộ miền giá trị của mảng cần sắp. Mỗi lần gặp một giá trị trong mảng ban đầu, tăng bộ đếm tại chỉ số tương ứng. Cuối cùng, duyệt mảng đếm; với mỗi chỉ số có bộ đếm khác 0, xuất giá trị của chỉ số đó đúng bằng số lần mà bộ đếm ghi nhận.',
'Ví dụ, xét mảng',
'. Tất cả giá trị đều nằm trong khoảng',
', vì vậy tạo mảng gồm các số 0,',
'. Kết quả sau từng lượt duyệt như sau:',
'Bây giờ có thể xuất mảng đã sắp xếp:',
'.',
'Yêu cầu',
'Cho một danh sách số nguyên chưa được sắp xếp. Hãy dùng phương pháp sắp xếp đếm để sắp danh sách rồi xuất danh sách đã sắp.',
'Gợi ý:',
'Bạn có thể dùng lại đoạn code đếm số lần xuất hiện ở bài trước để xuất các giá trị thực tế theo thứ tự.',
'Mô tả hàm',
'Hoàn thành hàm',
'countingSort',
'trong trình soạn thảo bên dưới. Hàm phải trả về các phần tử của mảng ban đầu theo thứ tự tăng dần, dưới dạng một mảng số nguyên.',
'Các tham số của countingSort:',
'arr',
': một mảng số nguyên',
'Định dạng đầu vào',
'Dòng đầu chứa số nguyên',
', là độ dài của',
'.\nDòng tiếp theo chứa các số nguyên cách nhau bởi dấu cách',
'với',
'.',
'Giới hạn',
'Định dạng đầu ra',
'In danh sách đã sắp xếp trên một dòng, các số nguyên cách nhau bởi dấu cách.',
'Đầu vào mẫu',
'Đầu ra mẫu',
'Giải thích',
'Sau khi điền xong mảng đếm, duyệt từ chỉ số',
'đến cuối, in mỗi giá trị',
'đúng',
'lần.'
]
soup=BeautifulSoup(source['body_html'],'html.parser')
original=str(soup)
nodes=[t for t in soup.find_all(string=True) if str(t).strip() and not any(x.name in ['svg','style','script','pre','code'] for x in t.parents)]
if len(nodes)!=len(text):raise ValueError('Source text changed; review translation again')
for node,translated in zip(nodes,text):
 raw=str(node);leading=raw[:len(raw)-len(raw.lstrip())];trailing=raw[len(raw.rstrip()):];node.replace_with(leading+translated+trailing)
translated=str(soup)
a=BeautifulSoup(original,'html.parser');b=BeautifulSoup(translated,'html.parser')
for tag in ['pre','code','svg']:
 if [str(x) for x in a.find_all(tag)]!=[str(x) for x in b.find_all(tag)]:raise ValueError('Protected content changed: '+tag)
(root/'plans/artifacts/hr-countingsort2-direct.json').write_text(json.dumps({'id':'countingsort2','title':source['name'],'original':original,'translated':translated},ensure_ascii=False),encoding='utf8')
print('Prepared direct Vietnamese translation; all prose covered; code, formulas and samples unchanged')
