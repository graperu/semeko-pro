# Toàn bộ danh mục 28TECH cộng đồng

Nguồn: https://github.com/Yumi-Miyamoto/28Tech-Full-Source . Snapshot ghim tại commit `d2fea57650cb71559892e18beb7b4ccb191773e1`; GitHub trả `truncated:false`.

Đã đưa vào danh mục đủ **3241 file**, **193 thư mục/nhóm**, không lọc bỏ loại file nào: 1429 CPP, 387 Python, 195 C, 120 Java, 996 PDF và các slide, văn bản, ảnh, âm thanh/video, tài nguyên khác. Sáu môn chính: C++, Python, C, Java, Frontend, Backend. Mục README gốc vẫn có trong nhóm Root. ID theo hash đường dẫn giữ riêng những file khác đường dẫn dù có cùng nội dung.

Vào Học lập trình → Thư viện tài liệu → 28TECH — Toàn bộ đề và bài tập. Có lọc môn, nhóm, loại tài liệu, tìm kiếm và phân trang 50 mục để không tải hàng nghìn nút cùng lúc.

- File code/văn bản tải từ snapshot GitHub khi chọn; kiểm tra Git blob hash trước khi hiển thị. C/C++/Python/Java mở thành bản sao trong tab đúng ngôn ngữ, không chạy tự động và không ghi đè tab cũ.
- PDF được tải và kiểm tra hash/header rồi lưu trong `userData/learning-materials`, đọc bằng PDF viewer trong cửa sổ Electron sandbox, không có Node. Mở lại PDF đã tải dùng bản trên máy. Có nút tạo tab luyện để đối chiếu đề và tự nhập test mẫu.
- Các định dạng khác vẫn xuất hiện đủ trong danh mục và có lối mở file gốc GitHub; không tuyên bố có bộ đọc nội bộ cho mọi định dạng.
- Không sao chép toàn bộ 3241 file vào bộ cài. Kho không khai báo license rõ ràng; app ghi nguồn, chỉ tải tài liệu khi người dùng mở. Đây là thư viện cộng đồng, không phải khóa học chính thức của 28TECH.
- Đầy đủ danh mục không đồng nghĩa đã tách mọi PDF thành bài tập có test. Chưa tự trích test, ghép lời giải với từng đề hoặc kiểm chứng toàn bộ code trong repo. Không tự sinh test và gọi đó là test chuẩn.

`npm run test:learning:28tech`: kiểm tra 3241 ID riêng, đủ sáu môn, tìm/lọc/phân trang, tải source thật, mở bản sao, kiểm tra PDF thật được tải và hiện trong viewer, tạo tab luyện, từ chối ID lạ. PDF mẫu Vector Push/Pop đã được đọc/trích nội dung và xem hình render để kiểm tra hiển thị tiếng Việt/đề/test mẫu.

Thư viện độc lập với hàng đợi dịch CF/LC. Bản dịch thành công tiếp tục lưu ở `userData/translated-articles` cùng bản gốc; không bị thay đổi khi cập nhật danh mục học.

## Bài tập dạng native trong Luyện tập

Luyện tập → Nền tảng → **28TECH — Bài tập** hiện liệt kê 827 tài liệu có đường dẫn contest/exercise/bài tập. Nội dung được trích bằng PDF.js, hiển thị trực tiếp thành đề trong app và lưu ở userData/learning-exercises. Không cần mở cửa sổ PDF cho luồng này. Thư viện cũng có nút Đọc đề và luyện trong app.

Với tài liệu một bài có một mục Input Format và các cặp Sample Input/Output đánh số khớp, app trích test mẫu cố định để Chạy như các nền tảng khác. Tài liệu nhiều bài hoặc marker mơ hồ không được tự ghép/sinh test. PDF dài hơn 100 trang được hướng về bài tập riêng; hình và công thức phức tạp vẫn cần đối chiếu nguồn. 827 là số tài liệu trong danh mục, không phải số bài đã được trích/chấm hoặc bảo đảm đúng toàn bộ.

`npm run test:learning:28tech:native` kiểm tra PDF Vector Push/Pop thật → đề native → test mẫu chính xác → C++/Python AC; lời giải Python sai báo WA. Parser unit test từ chối tài liệu nhiều bài và cặp mẫu không khớp. Tên bài hiển thị được rút gọn; ID/path giữ nguyên bên trong. Tên đầy đủ có tooltip, ô tìm kiếm không hiển thị hash.
