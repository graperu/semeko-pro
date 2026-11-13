# Nhập bài từ ba ZIP tải xuống

Nguồn được đọc tại Downloads, không sửa hoặc xóa ZIP của người dùng.

## Kết quả hiện tại

- Kiểm kê 71 tệp: 49 PDF và 22 DOCX; SHA-256 từng tệp trong `app/config/local-practice/manifest.json`.
- Đã giữ lớp chữ của 3.880 trang trong `source-pages.json.gz` để đối chiếu. Đây không phải bản sao hình ảnh của toàn bộ PDF.
- Bộ tách nhận diện 2.826 mục ứng viên từ tiêu đề/đánh số. Đây không phải số bài hoàn chỉnh: mục lục, câu hỏi kiến thức và các mục tách sai được loại qua bước đọc/kiểm chứng.
- Mỗi mục mở trực tiếp trong Luyện tập, có mã riêng, chủ đề, trang nguồn và đề; không mở một PDF như một bài. Mặc định C++ cho nguồn mới.
- Chỉ nhận test có nhãn Sample Input/Output rõ ràng. Không tự suy ra đáp án. Test dạng bảng hoặc nhãn khác cần bổ sung bộ đọc.
- Người dùng đã yêu cầu dùng OmniRouter để đọc, dịch và biên soạn bổ sung. Worker dùng endpoint localhost:20130 đã cấu hình, giải mã khóa bằng Electron safeStorage; không ghi khóa vào source hoặc log. Dịch vụ router có thể chuyển nội dung tới model được cấu hình.

## Khóa học và chuẩn hóa bài lập trình

- Bốn sách gốc được sao chép nguyên byte vào `app/config/book-courses/`, đối chiếu SHA-256. Tổng 3.096 trang, chia 102 phần/chương theo bookmark PDF, gồm cả mở đầu, phụ lục và chỉ mục; kiểm tra mọi trang xuất hiện đúng một lần trong phạm vi chương.
- Nút biểu tượng sách cạnh Luyện tập mở 4 khóa học. Trang gốc được render trong app để bảo toàn hình, bảng và công thức; mục văn bản chỉ phục vụ chọn/sao chép. Có chuyển chương, nhập số trang và nhớ vị trí đọc.
- Bài tập nằm riêng trong Luyện tập; nhóm theo buổi/chương, sắp số tự nhiên và phân trang theo 10 nhóm, không cắt đôi chương. Không dùng mục lục làm bài. Số trang nguồn hiển thị nhỏ bên phải đề.
- Người dùng đã cho phép bổ sung đặc tả và test. Worker `scripts/build-practice-omni.cjs` đọc yêu cầu gốc, kèm ảnh trang cho sách; tạo bản tiếng Việt với đề, input, output, giới hạn và ít nhất 10 input kiểm thử. Đây là **bản chuẩn hóa từ sách**, không phải chép nguyên văn hoặc test chính thức của CF/LC.
- Mỗi bài cần hai chương trình C++17 khác mã. GCC biên dịch và chạy cả hai trên toàn bộ input, so sánh kết quả và đối chiếu ví dụ gốc nếu có. Chỉ lưu trạng thái `ready` sau khi qua bước này. Đây là kiểm chứng thực nghiệm, không phải chứng minh toán học về độ đúng của hai lời giải.
- Khung Input/Output, Copy, ba ví dụ hiển thị, bộ test cố định và nút chỉ hiện lời giải khi người học chủ động yêu cầu. Bài sách chưa kiểm chứng không nằm trong danh sách bài chạy được; toàn bộ nội dung gốc vẫn có trong khóa học.
- `adapted.json` lưu kết quả từng bài và fingerprint nguồn; thay nội dung nguồn sẽ không dùng lại bản biên soạn cũ. Worker có khóa tiến trình, tiếp tục từ checkpoint, tối đa hai lượt xử lý và ba lần sửa mỗi lượt; tự khởi động lại sau khi hoàn tất lượt đang chạy nếu code worker thay đổi.
- Tiến độ trong app lấy số bài đã kiểm chứng. Trạng thái chi tiết ở `%LOCALAPPDATA%/SemekoPracticeAI/build-status.json`; lỗi ở `build-errors.jsonl`. Quá trình vẫn đang chạy; không công bố rằng toàn bộ ứng viên đã hoàn tất.

## Việc chưa hoàn tất

- Cần hoàn tất hàng đợi biên soạn và xử lý các mục lỗi. Nhận diện ứng viên bằng tiêu đề không đủ để chứng nhận đã tìm hết mọi bài trong sách; cần đối chiếu danh mục bài theo chương với bản gốc.
- 22 DOCX mới được kiểm kê và băm, chưa đối chiếu nội dung với PDF; không được gọi là đã nhập hết nội dung DOCX.
- Lớp chữ vẫn không đủ bảo toàn bố cục phức tạp; trang gốc đầy đủ nằm trong khóa học và ảnh nguồn được dùng trong worker. Không tuyên bố mọi bài chuẩn hóa đã đúng 100%.
- Nguồn gốc vẫn trong metadata để truy vết; không đổi quyền sở hữu nội dung.

## Kiểm tra

`node tests/unit/test-local-practice.js`: ID duy nhất, nguồn/trang hợp lệ, mỗi mục là bài riêng, HTML escaped và test mẫu đã biết.

`node tests/gui/test-local-practice.js`: chạy Electron hồ sơ riêng; tìm và mở trực tiếp bài Đệ Quy / Tính tổng 1, kiểm tra test gốc, nút bắt đầu bật và không có bước chọn tài liệu.

Chưa phát hành bản cài mới.

## Kiểm tra bổ sung

`npm run test:practice:import`: kiểm tra nguồn/chương/ID, hai lời giải đồng ý và từ chối khi khác nhau, không khớp ví dụ gốc, API không phù hợp; chạy giao diện thật của bốn sách và bài đã chuẩn hóa. GUI đã chạy một lời giải qua GCC trong app đạt 12/12 test, kiểm tra Input/Output chỉ đọc và trường hợp kết quả mong đợi rỗng vẫn bị WA nếu chương trình in dữ liệu.

Ảnh: `plans/artifacts/gui/adapted-practice-cf.png`, `adapted-practice-all-tests.png`, `book-course-chapter.png`.
