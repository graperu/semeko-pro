# Hoàn thiện các chương nhập môn C++

Các mục từng nằm trong “Sắp có / tham khảo” ở khóa **Nhập môn C++** nay đã mở để học ngoại tuyến. Đây là nội dung Semeko tự biên soạn; không đánh dấu giả rằng toàn bộ nội dung bốn sách đã chuyển đổi xong.

| Chương | Nội dung | Bài luyện |
| --- | --- | --- |
| Bắt đầu viết C++ | 5 bài có sẵn | Tổng, hình chữ nhật, đổi phút |
| Điều kiện và vòng lặp | Rẽ nhánh, vòng lặp/bất biến, vòng lặp lồng/độ phức tạp | Tổng chẵn, phân loại số, tam giác |
| Hàm và kiểm thử | Tham trị, tham chiếu/kiểm thử, đệ quy | GCD, bình phương, đổi chỗ |
| Mảng, vector và chuỗi | Vector, chuỗi/ASCII, tổng tiền tố/ma trận | Đảo dãy, đếm chữ, tổng đoạn |
| Con trỏ và bộ nhớ | Địa chỉ/thời gian sống, RAII, an toàn bộ nhớ | Tổng dữ liệu sở hữu, cập nhật qua địa chỉ, truy cập có kiểm tra |
| Cấu trúc và hướng đối tượng | Struct, đóng gói/constructor, đa hình | Học viên, tài khoản, diện tích |
| STL và thuật toán | Sắp xếp/tìm kiếm, container, DP/đồ thị | Đếm phân biệt, vị trí chèn, đếm cách leo bậc |
| Dự án tổng hợp | Thống kê, bộ xử lý lệnh, đối chiếu/hoàn thiện | Báo cáo thống kê, lệnh, công thức |

Tổng: **26 bài học, 24 bài luyện**, đủ tiêu đề, mục tiêu, giải thích, mã ví dụ và kiểm tra nhanh Anh/Việt. Mỗi chương có ba bài luyện với đặc tả, giới hạn, test cố định, ba mức gợi ý và lời giải tham khảo. Các bài yêu cầu kỹ thuật như con trỏ hoặc đa hình nêu rõ test đầu ra không xác nhận được phong cách triển khai; người học cần tự rà code.

Điều hướng trước/sau đi xuyên chương; chương đang học tự mở. Bài luyện và bộ câu hỏi cuối chương lọc theo `chapterId`, tránh dùng câu hỏi nhập môn cho mọi chương. Nội dung tự biên soạn không gán số trang sách giả.

## Kiểm chứng

- `tests/integration/test-cpp-course-content.js`: biên dịch tất cả 26 ví dụ và 24 lời giải bằng GCC C++17, 122 ca kiểm tra đầu ra; rà các trường Anh/Việt.
- `tests/gui/test-course-chapters.js`: mở từng bài ở cả hai ngôn ngữ, trả lời kiểm tra nhanh, kiểm tra ba bài luyện mỗi chương và câu hỏi chương không lẫn nhau; không còn placeholder trong khóa nhập môn.
- Bộ `npm run test:cpp:course` giữ các kiểm tra bố cục, phục hồi phiên, chạy tại chỗ và sổ tay.

Chưa phát hành bộ cài hoặc thay đổi trạng thái biên soạn các sách riêng.
