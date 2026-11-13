# Semeko 1.4.1 — Windows x64

- Bộ cài kèm GCC/GDB, Python, JDK và .NET SDK; chương trình tiêu chuẩn dùng được ngoại tuyến, không phải cài riêng công cụ ngôn ngữ.
- Cải thiện quản lý folder/tab, luyện tập và theo dõi kết quả nộp CF/LC.
- Khóa nhập môn C++ có 26 bài học và 24 bài luyện Anh/Việt; thêm sổ tay, chạy ví dụ tại chỗ, tìm kiếm, kiểm tra chương và tiếp tục học.
- Gói tài liệu có chữ ký riêng, chọn tải/cập nhật phần thay đổi, thông báo tiến độ và sao lưu/phục hồi.
- Tối ưu chỉ mục bài luyện để mở danh mục nhanh hơn; mặc định ưu tiên hiệu năng.
- Gia cố sandbox, xác thực IPC, lọc nội dung đề và bảo vệ dữ liệu khi cập nhật.

## Cài đặt

Tải `semeko-pro-setup-1.4.1-x64.exe`, đóng Semeko đang chạy rồi cài. Bộ cài tạo shortcut Desktop. Khi nâng cấp, dữ liệu người dùng được giữ lại; vẫn nên xuất sao lưu workspace quan trọng.

Đây là bản phân phối miễn phí **chưa có chứng thư ký mã Windows**. Windows có thể báo nhà phát hành không xác định hoặc chặn theo chính sách của máy. Không cần tắt antivirus. Chỉ lấy bộ cài từ repo `graperu/semeko-pro-downloads`; `SHA256SUMS.txt` dùng để kiểm tra tệp tải về. Bản app này báo cập nhật và dẫn tới trang tải chính thức, không tự cài bản chưa xác minh nhà phát hành.

## Phạm vi đã kiểm tra

C/C++, Python, Java và C# nhiều file đã chạy đạt với môi trường PATH được cô lập, cache NuGet trống và proxy mạng bị chặn, cả staging lẫn resources của gói. Đã kiểm tra bản app đóng gói và giao diện quản lý/cập nhật tài liệu. Chưa thử cài NSIS trên máy ảo Windows sạch; thư viện bên thứ ba của từng dự án không được mặc nhiên kèm theo.

Nội dung chuyển đổi từ bốn sách và dịch đề vẫn đang bổ sung; bộ đếm trong app thể hiện phần đã có, không cam kết đã xử lý 100%. Tính năng trực tuyến và nộp bài phụ thuộc nền tảng, đăng nhập và kết nối mạng. Các gói tài liệu có thể được bổ sung độc lập với bộ cài.
