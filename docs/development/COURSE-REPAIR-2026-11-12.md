# Rà sửa khóa học — 2026-11-12

## Phân loại tại lúc tiếp tục

- 87 bản ghi nội dung chưa đạt đều có lỗi cuối cùng `Study service HTTP 429`. Có 34 bản ghi còn bản nháp có thể tiếp tục đối chiếu. Điều này không có nghĩa nội dung của 87 phần đều đã sai; chúng chưa qua hết quy trình vì dịch vụ giới hạn yêu cầu.
- Lượt rà hình trước còn 44 phần: lỗi vùng hình, hệ tọa độ và nhầm trang PDF với số trang in xuất hiện trong log. Phần đạt kiểm tra được giữ nguyên.

## Sửa quy trình

`study-model-request.js` dùng khóa yêu cầu chung giữa các tiến trình, tôn trọng Retry-After, chờ tăng dần và giới hạn số lần thử. Khóa/checkpoint chỉ giữ PID, thời gian và mã trạng thái; không lưu API key. Lỗi xác thực không được tự thử liên tục. Khi dịch vụ tiếp tục giới hạn, lượt chạy dừng nhận phần mới và bộ giám sát có thể tiếp tục sau mốc chờ với số vòng phục hồi giới hạn.

Luồng nội dung chỉ lấy phần lỗi trong lượt sửa; tái sử dụng bản nháp có cùng dấu vân tay nguồn. Số trang chính được kiểm tra riêng với các trang ngữ cảnh đã cung cấp. Trang không biết hoặc thiếu trang chính vẫn bị từ chối. Không thay kết quả mong đợi chỉ để ép ví dụ đạt.

Hình có hệ tọa độ khai báo rõ: XYXY/YXYX và tỉ lệ 0–1/0–1000; hệ thống chuyển về XYXY chuẩn trước khi trích. Không đoán hệ tọa độ khi giá trị không hợp lệ. Đối chiếu dùng chỉ số trang PDF và thứ tự ảnh, không suy từ số trang in. Gắn hình vào tiểu mục bài tập được chuẩn hóa khoảng trắng và kiểm tra tham chiếu hợp lệ.

Giao diện phân biệt đang xử lý, chờ giới hạn yêu cầu, chờ dịch vụ và đã dừng. Có thời gian chờ thử lại. Luồng hình giữ bản nháp lựa chọn trước đó trong các lần sửa trong cùng phần.

## Kiểm chứng

- `test-study-model-request.js`: chờ Retry-After, khóa chung, giới hạn thử lại, trả lỗi xác thực ngay và không lưu thông tin xác thực.
- `test-authored-course.js`: đủ trang chính, tách ngữ cảnh đúng và từ chối trang lạ/thiếu.
- `test-course-figures.js`: trích PNG thật, chuyển tọa độ khai báo, từ chối số liệu sai và tham chiếu bài tập không tồn tại.
- `test-course-job-status.js` / `test-course-progress.js`: trạng thái hạn mức và dừng được hiển thị đúng.
- `npm run test:cpp:course`: các kiểm tra khóa học, GCC và GUI liên quan.

Luồng sửa đã khởi động lại. Khi ghi báo cáo, bốn phần rà hình đã được chấp nhận; đã xem trực tiếp bảng chân lý ở trang PDF 34 của sách UET, đủ hàng/cột và ký hiệu. Chưa khẳng định toàn bộ phần còn lại đã sửa xong. Chưa phát hành bản cài.
