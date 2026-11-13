# Dịch HackerRank

Hàng đợi dịch hỗ trợ HackerRank cùng Codeforces và LeetCode. Nút **Dịch hàng loạt CF + LC + HR / Tiếp tục** bật HackerRank và ưu tiên nền tảng này; không xóa kết quả CF/LC đã lưu.

Danh mục lấy lần lượt sáu nhóm công khai: C++, Algorithms, Data Structures, Mathematics, Python và Java. Mỗi nhóm lưu con trỏ phân trang riêng để tiếp tục sau khi dừng. Cùng một slug xuất hiện ở nhiều nhóm chỉ tạo một việc dịch. Sau khi lập đủ danh mục, tổng HR là số bài duy nhất, không cộng trùng giữa nhóm. Nguồn bị cắt hoặc tải lỗi không được coi là hoàn thành.

Bản gốc và bản Việt lưu trong `translated-articles/hackerrank` ở thư mục dữ liệu người dùng, kèm hash nguồn. Luồng dịch dùng cơ chế giữ nguyên code, công thức, ảnh và test mẫu hiện có; mở lại dùng bản đã lưu và đổi Anh/Việt. Đề cần quyền truy cập riêng không tự vượt qua yêu cầu đăng nhập.

Tiến độ trong cài đặt có dòng HackerRank: đã dịch/tổng, lỗi nguồn, lỗi dịch và đang thử lại. Tiến trình nền `scripts/run-hackerrank-translation.cjs` tái sử dụng khóa API đã mã hóa, dùng khóa chủ hàng đợi để tránh chạy hai bộ xử lý cùng dữ liệu. Cache trình duyệt riêng để không xung đột app đang mở. Lần khởi chạy này dùng ba luồng dịch.

Kiểm tra:

- `node tests/unit/test-bulk-catalog.js`: sáu nhóm, phân trang và từ chối danh mục thiếu.
- `node tests/gui/test-bulk-hackerrank.js`: pipeline renderer thật với API dịch mô phỏng; kiểm tra loại trùng, lưu cặp Anh/Việt, số tiến độ và giữ code/test/ảnh.
- Bộ kiểm tra hàng đợi CF/LC hiện có vẫn có các assertion về phạm vi, độc lập lỗi và không xử lý trùng.
