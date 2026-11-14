"""Apply reviewed prose replacements without touching code, formulas or samples."""
import json
from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]


def prepare(slug, replacements):
    source = json.loads((ROOT / f'plans/artifacts/hr-{slug}-source.json').read_text(encoding='utf8'))
    soup = BeautifulSoup(source['body_html'], 'html.parser')
    original = str(soup)
    nodes = [t for t in soup.find_all(string=True) if str(t).strip() and not any(
        p.name in ['svg', 'style', 'script', 'pre', 'code'] for p in t.parents)]
    assert len(nodes) == len(replacements), (slug, len(nodes), len(replacements))
    for node, value in zip(nodes, replacements):
        raw = str(node)
        leading = raw[:len(raw) - len(raw.lstrip())]
        trailing = raw[len(raw.rstrip()):]
        node.replace_with(leading + value + trailing)
    translated = str(soup)
    before, after = BeautifulSoup(original, 'html.parser'), BeautifulSoup(translated, 'html.parser')
    for tag in ['pre', 'code', 'svg', 'img']:
        assert [str(n) for n in before.find_all(tag)] == [str(n) for n in after.find_all(tag)], (slug, tag)
    result = {'id': slug, 'title': source['name'], 'original': original, 'translated': translated}
    (ROOT / f'plans/artifacts/hr-{slug}-direct.json').write_text(json.dumps(result, ensure_ascii=False), encoding='utf8')
    print(f'{slug}: {len(nodes)} reviewed prose nodes; protected content unchanged')


prepare('ants', [
    'Có N con kiến trên một đường đua hình tròn dài 1000 mét. Ban đầu, con kiến thứ i nằm cách điểm xuất phát (điểm 0) một khoảng Vi mét theo chiều kim đồng hồ. Tất cả các con kiến di chuyển với tốc độ 0.1 mét mỗi giây; một số đi theo chiều kim đồng hồ, số khác đi ngược chiều kim đồng hồ. Khi hai con kiến gặp nhau tại một điểm, chúng nói "Hi" với nhau rồi cả hai lập tức đổi sang hướng ngược lại. Việc chào và đổi hướng không tốn thời gian, tức là diễn ra trong 0 giây.',
    'Bạn được cho vị trí ban đầu của các con kiến nhưng chưa biết hướng di chuyển ban đầu của chúng. Bạn muốn biết tổng số lần chúng nói "Hi" với nhau sau 1000000006 (10^9+6 giây). Hãy chọn hướng di chuyển ban đầu sao cho c1+c2+c3+...+cn lớn nhất, trong đó ci là số lần con kiến thứ i nói "Hi". In ra giá trị lớn nhất này.',
    'Đầu vào:',
    'Dòng đầu tiên chứa số nguyên N, là số con kiến. N không lớn hơn 100.',
    'Dòng tiếp theo chứa n số V1 , V2 , ... , VN. Mọi Vi đều là số nguyên không âm nhỏ hơn 1000. Các Vi đôi một khác nhau.',
    'Đầu ra:',
    'In một số nguyên duy nhất là đáp án của bài toán.',
    'Đầu vào mẫu', '2', '0 500', 'Đầu ra mẫu', '400000', 'Giải thích',
    'Trong ví dụ có hai con kiến. Nếu cùng hướng, chúng không bao giờ chào nhau. Nếu ngược hướng, chúng nói "Hi" với nhau tại các thời điểm 2500, 7500,12500, ... , 999999750. Vì vậy, số lần chào của một con kiến là (999997500 - 2500)/5000+1 = 200000. Do đó, đáp án là 200000*2 = 400000.'
])

prepare('validating-named-email-addresses', [
    'Một địa chỉ email hợp lệ phải thỏa mãn các tiêu chí sau:',
    'Địa chỉ gồm một ', 'tên người dùng', ', ', 'tên miền', ' và ', 'phần mở rộng', ', ghép theo định dạng: ',
    'Phần ', 'tên người dùng', ' bắt đầu bằng một ', 'chữ cái tiếng Anh',
    ', sau đó là một hoặc nhiều ký tự thuộc các loại sau: ', 'chữ cái hoặc chữ số', ', ', ',', ' và ', '.',
    'Phần ', 'tên miền', ' và ', 'phần mở rộng', ' chỉ chứa ', 'các chữ cái tiếng Anh', '.',
    '', 'Phần mở rộng', ' có độ dài ', ', ', ' hoặc ', ' ký tự.',
    'Cho ', ' cặp tên và địa chỉ email làm đầu vào. Hãy in từng cặp có địa chỉ email ', 'hợp lệ', ' trên một dòng riêng.',
    'Gợi ý:', ' Hãy thử dùng ', 'Email.utils()', ' để hoàn thành bài này. Ví dụ, đoạn code sau: ', 'tạo ra kết quả:',
    'Định dạng đầu vào', 'Dòng đầu tiên chứa một số nguyên, ', ', là số địa chỉ email.',
    'Mỗi dòng ', ' trong ', ' dòng tiếp theo chứa một ', 'tên', ' và một ', 'địa chỉ email',
    ', là hai giá trị cách nhau bởi dấu cách theo định dạng:',
    'Giới hạn', 'Định dạng đầu ra', 'Chỉ in các cặp tên và địa chỉ email ', 'hợp lệ',
    ', cách nhau bởi dấu cách. Mỗi cặp được in trên một dòng riêng theo định dạng:',
    'Phải in các địa chỉ email hợp lệ theo đúng thứ tự xuất hiện trong đầu vào.',
    'Đầu vào mẫu', 'Đầu ra mẫu', 'Giải thích', 'dexter@hotmail.com',
    ' là địa chỉ email hợp lệ, nên in cặp tên và địa chỉ email tương ứng từ đầu vào trên một dòng riêng.',
    'virus!@variable.:p', ' không hợp lệ vì tên người dùng chứa dấu chấm than (',
    ') và phần mở rộng chứa dấu hai chấm (', '). Vì địa chỉ email này không hợp lệ nên không in gì.'
])

prepare('tag-content-extractor', [
    'Trong ngôn ngữ dùng thẻ như ', 'XML', ' hoặc ', 'HTML', ', nội dung được đặt giữa một ', 'thẻ mở',
    ' và một ', 'thẻ đóng', ', chẳng hạn ', '. Lưu ý rằng ', 'thẻ đóng', ' tương ứng bắt đầu bằng ', '.',
    'Cho một chuỗi văn bản viết bằng ngôn ngữ dùng thẻ. Hãy phân tích và lấy nội dung nằm trong các cặp thẻ có cấu trúc hợp lệ, thỏa mãn những điều kiện sau:',
    'Tên của thẻ ', 'mở', ' và ', 'đóng', ' phải giống nhau. Đoạn HTML ', ' là ', 'không hợp lệ',
    ' vì văn bản bắt đầu bằng thẻ ', ' nhưng kết thúc bằng thẻ ', ' không tương ứng.',
    'Các thẻ có thể lồng nhau, nhưng nội dung bao gồm thẻ lồng bên trong được xem là ', 'không hợp lệ',
    '. Ví dụ, trong ', ', ', ' là ', 'hợp lệ', ' nhưng ', ' là ', 'không hợp lệ', '.',
    'Tên thẻ có thể gồm bất kỳ ký tự in được nào.',
    'Định dạng đầu vào', 'Dòng đầu tiên chứa một số nguyên, ', ' (số dòng).',
    'Mỗi dòng trong ', ' dòng tiếp theo chứa một dòng văn bản.',
    'Giới hạn', 'Mỗi dòng chứa tối đa ', ' ký tự in được.', 'Tổng số ký tự trong tất cả các ca kiểm thử không vượt quá ', '.',
    'Định dạng đầu ra', 'Với mỗi dòng, in nội dung nằm trong các thẻ hợp lệ.',
    'Nếu một dòng có nhiều đoạn nội dung hợp lệ, in từng đoạn trên một dòng riêng; nếu không tìm thấy đoạn nào hợp lệ, in ', '.',
    'Đầu vào mẫu', 'Đầu ra mẫu'
])

prepare('java-1d-array', [
    'Hãy chơi một trò chơi trên mảng! Bạn đang đứng tại chỉ số ', ' của mảng có ', ' phần tử, tên là ',
    '. Từ chỉ số ', ' (với ', '), bạn có thể thực hiện một trong các bước di chuyển sau:',
    'Đi lùi:', ' Nếu ô ', ' tồn tại ', 'và', ' chứa giá trị ', ', bạn có thể lùi đến ô ', '.',
    'Đi tới:', 'Nếu ô ', ' chứa số không, bạn có thể đi đến ô ', '.',
    'Nếu ô ', ' chứa số không, bạn có thể nhảy đến ô ', '.',
    'Nếu bạn đang đứng ở ô ', ' hoặc giá trị ', ', bạn có thể đi hoặc nhảy ra khỏi cuối mảng và thắng trò chơi.',
    'Nói cách khác, bạn có thể di chuyển từ chỉ số ', ' đến chỉ số ', ', ', ' hoặc ',
    ' miễn là ô đích chứa giá trị ', '. Nếu chỉ số đích lớn hơn ', ', bạn thắng trò chơi.',
    'Mô tả hàm', 'Hoàn thành hàm ', 'canWin', ' trong trình soạn thảo bên dưới.',
    'canWin', ' có các tham số:', 'int leap:', ' độ dài bước nhảy', 'int game[n]:', ' mảng cần đi qua',
    'Giá trị trả về', 'boolean:', ' true nếu có thể thắng trò chơi, ngược lại là false',
    'Định dạng đầu vào', 'Dòng đầu tiên chứa số nguyên ', ', là số truy vấn (tức số lần gọi hàm).',
    'Mỗi truy vấn trong ', ' truy vấn tiếp theo được mô tả trên hai dòng:',
    'Dòng đầu tiên chứa hai số nguyên cách nhau bởi dấu cách, lần lượt là ', ' và ', '.',
    'Dòng thứ hai chứa ', ' số nguyên nhị phân cách nhau bởi dấu cách (tức các số không và một), lần lượt là các giá trị ', '.',
    'Giới hạn', 'Đảm bảo giá trị của ', ' luôn bằng ', '.',
    'Đầu vào mẫu', 'Đầu ra mẫu', 'Giải thích', 'Ta thực hiện ', ' truy vấn sau:',
    'Với ', ' và ', ', có thể đi và/hoặc nhảy đến cuối mảng vì mọi ô đều chứa giá trị ',
    '. Vì có thể thắng nên trả về ', 'true', '.',
    'Với ', ' và ', ', có thể đi đến chỉ số ', ' rồi nhảy ',
    ' đơn vị để ra khỏi cuối mảng. Vì có thể thắng nên trả về ', 'true', '.',
    'Với ', ' và ', ', không có cách nào vượt qua ba số một liên tiếp. Vì không thể thắng nên trả về ', 'false', '.',
    'Với ', ' và ', ', không có cách nào vượt qua số một tại chỉ số ', '. Vì không thể thắng nên trả về ', 'false', '.'
])
