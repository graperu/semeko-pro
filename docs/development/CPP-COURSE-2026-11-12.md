# Khóa học C++ được biên soạn

Nút học trên thanh công cụ mở khóa học bằng chữ, thay cho trang đọc sách. PDF chỉ còn là nguồn tham khảo tùy chọn. Nội dung mới được viết lại thành mục tiêu, kiến thức, ví dụ, câu hỏi và bài luyện; không phải ảnh chụp hoặc văn bản PDF ghép lại.

## Phạm vi đã triển khai

Chương nhập môn có 5 bài Anh/Việt: chương trình đầu tiên, biến/kiểu, nhập/xuất, biểu thức/phép chia và chẩn đoán lỗi. Ví dụ có tô màu và mở vào editor với đầu vào/kết quả cố định. Câu kiểm tra nhanh phải được trả lời đúng trước khi ghi hoàn thành bài. Tiến độ và ngôn ngữ được lưu trên máy.

Ba bài luyện: tổng hai số, chu vi/diện tích hình chữ nhật và đổi phút thành giờ. Mỗi bài có đề song ngữ, ví dụ, bộ test cố định, ba mức gợi ý và lời giải tham khảo sau gợi ý. Chương sau hiển thị rõ đang biên soạn; không được tính là đã hoàn thành nội dung khóa học.

## Kiểm tra

`npm run test:cpp:course`: biên dịch 5 ví dụ và 3 lời giải bằng GCC C++17, kiểm tra 19 trường hợp đầu ra chính xác. GUI Electron kiểm tra Anh/Việt, không có ảnh/PDF/iframe trong bài học, khóa hoàn thành theo câu hỏi, lưu tiến độ, mở bài vào editor, thực thi GCC đạt 5/5 test và bố cục nhỏ. Không có lỗi JavaScript trong luồng này.

Ảnh: `plans/artifacts/gui/cpp-course.png`.

Chưa phát hành bộ cài. Toàn bộ nội dung bốn sách chưa được chuyển thành khóa học; đây là chương mẫu hoạt động đầy đủ để tiếp tục biên soạn trên cùng cấu trúc.

## Chuyển toàn bộ bốn sách

Đã bổ sung quy trình `scripts/build-authored-course.cjs`, danh mục `app/services/competitive/authored-course.js` và bộ giám sát `scripts/supervise-authored-course.cjs`. Danh sách 811 phần phủ đúng 3.096 trang, không trùng và không bỏ khoảng trang nào. Việc có trong danh sách không đồng nghĩa đã hoàn thành biên soạn.

Mỗi phần dùng văn bản và ảnh nguồn nội bộ để đọc bảng/công thức; ảnh không được đưa vào giao diện bài học. AI biên soạn bài học mới song ngữ, mục tiêu, phần giải thích, ví dụ chạy được và câu kiểm tra. Một lượt đối chiếu kiểm tra lại với nguồn; ví dụ phải biên dịch và khớp đầu ra trước khi xuất bản nội dung. Đây là kiểm tra thực nghiệm và đối chiếu tự động, không phải bằng chứng hình thức cho độ chính xác tuyệt đối.

Trang bìa/mục lục/chỉ mục/trang trắng được ghi lý do riêng. Nội dung không đọc rõ, lỗi nguồn hoặc ví dụ chưa chạy đúng ở trạng thái cần rà; không tính là bài đã hoàn thành. Bài tập đã nhập được liên kết theo vị trí nguồn; bài đang kiểm chứng không bị gắn nhãn đã sẵn sàng.

Giao diện có lựa chọn cả bốn sách, tiến độ theo chương và nút cập nhật bài học. Mỗi bài tải riêng qua IPC; chuyển Anh/Việt không cần mở PDF. Vị trí và tiến độ lưu trên máy. Nguồn PDF chỉ là tham khảo tùy chọn.

Kiểm tra bổ sung: `tests/unit/test-authored-course.js` (đủ khoảng trang, schema song ngữ, ID an toàn, bộ đếm), `tests/gui/test-authored-course.js` (bốn danh mục, tải bài riêng, ngôn ngữ, trạng thái chưa xong) và `tests/gui/test-authored-course-live.js` (bài thực tế đã được biên soạn từ nguồn, không phải fixture).

Tệp trạng thái tại `%LOCALAPPDATA%/SemekoPracticeAI/authored-course-status.json`; bản đã hoàn thành ở `app/config/authored-course/`. Tiến trình chạy nền và lưu từng phần. Lỗi xác thực dừng để kiểm tra kết nối; không tự bật tài khoản người dùng đã tắt. Chưa phát hành ứng dụng và chưa tuyên bố toàn bộ nội dung đã xong.

## Giao diện khóa học

Mục lục dùng hàng có số thứ tự/dấu hoàn thành, chương thu/mở và nhóm sắp có/tham khảo riêng. Tiến độ chỉ tính các bài hiện có, không coi nội dung đang biên soạn là đã hoàn tất. Mục tiêu bài học nằm trong ô riêng; chiều dài dòng được giới hạn. Khung ví dụ có tiêu đề, sao chép nguyên mã và mở thực hành. Nút bắt đầu học là hành động chính; thanh bài trước/thực hành/bài tiếp cố định khi đọc cạnh editor. Các nút biểu tượng có nhãn trợ năng và chú thích.

Ảnh kiểm tra: `plans/artifacts/gui/course-modal-redesign.png` và `plans/artifacts/gui/course-dock.png`. Kiểm tra GUI bao gồm sao chép mã thực tế, chuyển Anh/Việt, chọn chương/bài, mở editor, giữ code cũ, thay đổi độ rộng, thu gọn và điều hướng bài học.

## Xử lý phần còn lại và sửa lỗi

Luồng biên soạn có 3 tác vụ, luân phiên phần còn thiếu trong cả bốn sách và ưu tiên sửa phần đã báo lỗi. Giữ nguyên phần đã đạt kiểm tra. Lỗi ví dụ trả về đầu vào, đầu ra thực tế và đầu ra dự kiến; lượt sửa nhận cả bản nháp để sửa có căn cứ. Đối chiếu phân biệt metadata bài tập trích chưa đủ với bản biên soạn thực sự thiếu yêu cầu.

Bài tập nguồn mới được khôi phục vào danh mục bằng ID ổn định, kiểm tra trang nguồn, chống trùng và escape nội dung. Bộ biên soạn bài tập chạy riêng để tạo/kiểm chứng lời giải và test; không tự coi câu hỏi lý thuyết là bài stdin đã có test. Các câu hỏi nguồn cũng được giữ trong phần bài học để đối chiếu. Bài đang kiểm chứng có trạng thái riêng.

Mục lục/tham khảo được ghi nhãn riêng, không tính thành lý thuyết đang biên soạn. Khi cửa sổ học mở, danh mục được kiểm tra cập nhật định kỳ, giữ nội dung đang đọc và code hiện tại. Chưa tuyên bố đã hoàn tất mọi chương.

Hàng chờ hiện luân phiên cả bốn sách, ưu tiên sửa phần lỗi trước. Phần văn bản và ảnh của hai trang tiếp theo được cấp làm ngữ cảnh để hoàn chỉnh công thức/câu hỏi kéo dài qua trang; chúng không được cộng trùng vào phạm vi trang chính. Bộ nhập bài tập chấp nhận cả số bài có tiểu mục như `4.35 (c)`, giữ ID ổn định. Phần đã qua kiểm chứng được giữ nguyên khi tiến trình tự khởi động lại để nhận thay đổi.

## Xem tiến trình chạy nền

Trong cửa sổ khóa học, mở dòng **Tiến trình AI** dưới thanh trên. Bảng cập nhật mỗi 5 giây: trạng thái tiến trình, số tác vụ hoạt động, số trang từng sách đã xử lý, trang thành bài học, trang tham khảo và số phần cần sửa. Các tác vụ đang hoạt động nêu đúng sách, khoảng trang và bước đọc nguồn/biên soạn/đối chiếu/biên dịch/lưu.

Backend kiểm tra PID còn sống và thời điểm ghi trạng thái; tiến trình đã dừng không tiếp tục được gắn nhãn đang chạy. Chỉ các trường trạng thái cho phép được trả về renderer. Không hiển thị token hoặc cấu hình dịch vụ. Bảng này tách biệt tiến độ học cá nhân ở mục lục. App đang mở từ trước cần lưu code và khởi động lại một lần để nạp IPC/preload mới.

Kiểm tra: `test-course-job-status.js`, `test-course-progress.js`; ảnh trạng thái thực tế `plans/artifacts/gui/course-progress-live.png`.

## Hình minh họa có liên quan

Luồng biên soạn giữ các hình có giá trị học tập (sơ đồ khối, bộ nhớ, cây/đồ thị, hình học và bảng cần thiết). `course-figures.js` kiểm tra trang, vùng hình và vị trí trong bài; `extract-course-figure.py` trích đúng vùng từ PDF gốc, không tạo ảnh nguyên trang thay bài học. Mỗi hình có chú thích/alt Anh–Việt, giải thích nhãn gốc, số trang và nút phóng to. Hình nằm ngay sau phần giải thích tương ứng; hình thuộc câu hỏi được gắn với câu hỏi đó và bài luyện khi đã liên kết.

Các vùng hình được đối chiếu cùng trang nguồn trước khi xuất bản. Ảnh chỉ tải qua ID tài nguyên PNG đã kiểm tra; không nhận đường dẫn tùy ý hoặc SVG thực thi. Không thêm ảnh trang trí/logo và không tự suy đoán hình nguồn thiếu. Dữ liệu hình được giữ riêng để có thể bổ sung cho bài đã có mà không thay lời giải/test.

`scripts/enrich-course-figures.cjs` đang rà bổ sung cho các phần đã chuyển trước khi có tính năng này. Bảng Tiến trình AI hiển thị riêng số phần đã rà hình. Tình trạng cần rà lại không được coi là thành công.

Kiểm chứng: đã trích sơ đồ cấu trúc tuần tự từ C How to Program, trang PDF 105, đặt đúng bài cấu trúc điều khiển. `test-course-figures.js` kiểm tra PNG/vùng hình/chống đường dẫn sai; `test-course-figures-live.js` kiểm tra hình thật, chú thích và giải thích nhãn Anh–Việt, phóng to và đóng bằng Escape. Ảnh QA: `plans/artifacts/gui/course-figure-live.png`.
