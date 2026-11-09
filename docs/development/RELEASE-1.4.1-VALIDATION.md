# Semeko 1.4.1 — kiểm tra nội bộ, 09/11/2026

**Chưa phát hành theo yêu cầu mới nhất của người dùng.** Bản công khai vẫn là v1.4.0. Bộ cài 1.4.1 tạo cục bộ trước khi sửa thêm chức năng nộp bài không được dùng để phát hành; cần build lại sau khi hoàn tất.

## Codeforces và LeetCode

- Chọn ngẫu nhiên 10 bài mỗi nền tảng trong pool 15 lời giải được hỗ trợ/nền tảng. Seed, pool và danh sách chọn được ghi vào `plans/artifacts/testing/release-1.4.1-platform-selection.json`.
- Kết quả cuối: **20 bài, 48 test mẫu công khai, 0 lỗi** qua editor → Run All Tests → bộ chạy C++ của app. Số mẫu đọc được khớp số mẫu nguồn: CF theo cặp sample input/output, LC theo exampleTestcaseList.
- CF: 1201C, 1352C, 189A, 580C, 520B, 977C, 706C, 451B, 455A, 313B.
- LC: Maximal Square, Search in Rotated Sorted Array, Longest Common Subsequence, House Robber, Unique Paths, Partition Equal Subset Sum, Best Time to Buy and Sell Stock, Largest Rectangle in Histogram, Minimum Path Sum, Trapping Rain Water.
- Phát hiện và sửa local checker CF 977C: đáp án 5 và 6 đều hợp lệ ở ví dụ đầu, không được báo WA chỉ vì khác chuỗi kết quả mẫu. Checker chỉ áp dụng đúng URL/mã bài và kiểm tra điều kiện thật, không nới lỏng so sánh cho các bài khác.
- Đây không phải 48 test ẩn hay bằng chứng Accepted chính thức. Chưa nộp các lời giải này lên tài khoản người dùng.

## Các kiểm tra khác đã qua

- Unit theme, cập nhật và tài khoản; dịch, kiểm tra cặp nguồn/bản dịch và cache danh sách ngoại tuyến.
- Python/Java/C# biên dịch, stdin, AC/WA, chương trình nhiều file, cấu hình thật, timeout và stale build. C11 và Python debugpy thực tế.
- 40 bản build thuật toán nâng cao, 570 kiểm tra, 0 lỗi; 20 chương trình GUI qua các ngôn ngữ với 60 AC hiển thị.
- Folder theo contest, lưu/đóng/mở lại kho bài, giữ tab ngoài folder, không mất dữ liệu khi ghi thất bại.
- Terminal tương tác C/C++/Python/Java/C#, khoảng trắng và EOF.
- Công thức đã lưu bị mất style được dựng lại; kiểm tra số mũ/chỉ số, phân số, tổng, ngoặc, macro và dữ liệu code/test không bị sửa.
- Nộp bài chính thức: đã qua mô phỏng service và GUI; **chưa xác nhận live**, cần đăng nhập thật và nộp một bài được người dùng chọn.

Các tệp bằng chứng, profile thử nghiệm và kết quả riêng nằm trong `plans/`, không đưa vào Git hay bộ cài. Token, API key và mã nguồn cá nhân trong AppData không được đóng gói.
