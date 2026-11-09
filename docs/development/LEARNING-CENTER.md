# Học lập trình trong Semeko

Mở **Học lập trình** trên thanh công cụ. Chọn C++ hoặc Python và chuyển giữa Lộ trình học / Thư viện tài liệu.

Mỗi ngôn ngữ hiện có 8 chủ đề: nhập xuất, điều kiện, vòng lặp, mảng, chuỗi, hàm/Euclid, sắp xếp/loại trùng và quy hoạch động nhập môn. Nội dung tiếng Việt được viết cho app; đây là lộ trình nhập môn và bước chuyển sang thuật toán, không phải khóa học bao phủ toàn bộ ngôn ngữ. Chưa có bài về OOP, con trỏ, quản lý bộ nhớ hay dự án lớn.

- Bài học, code ví dụ và test đi kèm dùng ngoại tuyến; thực thi cần runtime/compiler đã thiết lập.
- **Thử code ví dụ** mở lời giải tham khảo với test, không ghi nhận hoàn thành bài tập.
- **Mở bài tập có test** tạo tab mới với khung code. Test cố định không sửa/xóa trong giao diện. Bấm Chạy để chấm; toàn bộ test AC mới ghi nhận hoàn thành. Test hữu hạn không bảo đảm đúng mọi đầu vào.
- **Đánh dấu đã đọc** độc lập với kết quả bài tập. Tiến độ từng ngôn ngữ lưu riêng tại userData/state/learning-progress.json và tồn tại sau khi mở lại app. Không đồng bộ lên GitHub hay nền tảng thi.
- Thư viện liên kết tài liệu ISO C++, Microsoft Learn và Python Software Foundation. Nút tài liệu mở trình duyệt, cần Internet; không sao chép toàn bộ khóa học bên ngoài vào app.

Kiểm tra: `node tests/gui/test-learning.js` chạy mọi ví dụ C++/Python qua compiler/runtime thật và kiểm tra giao diện, khóa test, kết quả sai/đúng cùng tiến độ sau khởi động lại trong profile thử nghiệm riêng.

## Danh mục C++ cộng đồng 28TECH

**Phần tích hợp 801 file bên dưới là phạm vi ban đầu, hiện đã được thay thế bằng toàn bộ 3241 file.** Xem [28TECH-FULL-LIBRARY.md](28TECH-FULL-LIBRARY.md) cho hành vi và giới hạn hiện tại. Lệnh kiểm tra hiện dùng `tests/gui/test-tech-library-full.js`.

Trong Thư viện tài liệu C++, chọn **28TECH — Danh mục 801 bài C++**. Danh mục gồm 801 file `.cpp`, 29 nhóm từ đường dẫn `C++/Source Code C++ Contest` của `Yumi-Miyamoto/28Tech-Full-Source`, ghim commit `d2fea57650cb71559892e18beb7b4ccb191773e1`.

Chỉ tên, đường dẫn và hash Git được đóng gói; mã nguồn được lấy theo nhu cầu từ raw.githubusercontent.com, kiểm tra Git blob SHA-1 và giữ tối đa 30 file trong bộ nhớ. Không chạy code tự động. Nút Mở code tạo bản sao trong tab C++ mới, không ghi đè file hiện tại. Chưa nhập README, đề bài, file khác `.cpp` hay test chuẩn; app hiển thị rõ giới hạn này. Danh mục không đại diện cho khóa học chính thức. Kho chưa khai báo license tại thời điểm kiểm tra; không sao chép toàn bộ nguồn vào bộ cài.

`npm run test:learning:28tech` kiểm tra đủ danh mục/nhóm, tìm kiếm, tải một nguồn thật ở commit cố định, kiểm tra tính toàn vẹn, chuyển code vào editor, không gán test giả và từ chối ID không thuộc danh mục. Không tuyên bố đã chạy/chấm đúng cả 801 chương trình.
