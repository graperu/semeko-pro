# Công cụ học tập — 2026-11-12

Trong cửa sổ Khóa học C++, mở **Học tập ⋯** để tìm kiếm, mở sổ tay, kiểm tra chương hoặc báo lỗi nội dung. Giao diện hỗ trợ tiếng Việt và tiếng Anh.

1. **Tiếp tục học:** phục hồi bài, ngôn ngữ, vị trí đọc và mã của tab liên kết. Không tạo thêm tab mẫu khi phục hồi.
2. **Chạy ví dụ tại chỗ:** mở phần chạy dưới mã ví dụ, sửa đầu vào và xem kết quả biên dịch/chạy thực tế. Đầu vào tự nhập không bị so với đáp án mẫu của đầu vào khác.
3. **Kiểm tra chương:** chọn tối đa 10 câu từ các bài đã có trong chương, chấm điểm và chỉ ra bài cần ôn. Lịch sử điểm được lưu; không thay thế kiểm tra thực hành.
4. **Sổ tay:** lưu ghi chú, mã ví dụ và hình minh họa, quay về bài nguồn hoặc xóa từng mục. Hình được sao chép riêng để vẫn đọc được khi tài nguyên nguồn thay đổi.
5. **Tìm kiếm:** tìm bài học và bài tập bằng tiếng Anh/Việt, lọc theo sách và loại nội dung. Chỉ tìm nội dung đã nhập hoặc biên soạn, không giả định phần đang chờ đã hoàn tất.
6. **Báo lỗi:** lưu đoạn được chọn, loại lỗi, mô tả và bản chụp nội dung cũ để đối chiếu với bản hiện tại. Báo cáo lưu trên máy; đánh dấu đã kiểm tra không tự sửa nội dung nguồn.

Dữ liệu cá nhân được ghi nguyên tử vào `course-personal.json` trong thư mục dữ liệu người dùng; hình sổ tay ở `course-note-assets`. Câu trả lời kiểm tra nằm phía dịch vụ, không gửi kèm bộ câu hỏi chưa chấm cho giao diện.

## Kiểm chứng

- `npm run test:cpp:course`: kiểm tra dữ liệu, biên dịch GCC, giao diện khóa học, bố cục, tiến độ và cả sáu công cụ; kiểm tra phục hồi qua lần khởi động lại Electron.
- `node tests/gui/test-course-figures-live.js`: hình nguồn thực, lưu hình vào sổ tay, chú thích hai ngôn ngữ và phóng to/đóng bằng Escape.

Cần lưu công việc và mở lại app đang chạy để nạp các IPC mới. Không phát hành bộ cài trong thay đổi này.
