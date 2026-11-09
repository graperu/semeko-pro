# Sửa hiển thị công thức đề bài — 09/11/2026

## Nguyên nhân và thay đổi

- Bản KaTeX đã lưu bị mất inline style khi lọc HTML, khiến chỉ số, số mũ, phân số và ngoặc lệch vị trí. Bộ lọc nay đọc mã TeX trong annotation trước khi lọc, rồi dựng lại KaTeX sau khi lọc; không cho phép tùy ý CSS từ nguồn ngoài.
- Bộ xử lý công thức chung dùng cho Codeforces, LeetCode, HackerRank, bài luyện tập tách từ tài liệu, đề gốc và bản dịch mới. Bản dịch lưu sẵn của các nền tảng đều qua cùng đường lọc/hiển thị.
- Công thức có dấu phân cách được dựng trước, tránh bỏ sót LaTeX thô cùng đoạn. Bổ sung phục hồi ký hiệu, giới hạn tổng, dấu XOR, số mũ/chỉ số, lệnh so sánh và macro `replacedVerb` của Codeforces.
- Bỏ qua code, pre, kbd, samp và vùng test mẫu khi phục hồi công thức. Chọn bài con bất đồng bộ có kiểm tra lựa chọn hiện tại để tránh hiện nhầm bài khi đổi nhanh.

## Kiểm tra

- Quét tĩnh 14.780 tệp đề lưu cục bộ, cả original và translated; không có tệp JSON không đọc được. Kết quả chi tiết ở `plans/artifacts/testing/statement-math-audit.json` (cục bộ, không commit).
- `node tests/gui/test-statement-math.js`: qua. Có kiểm tra mất style có chủ ý rồi mở lại hai lần trên bốn nền tảng, biểu thức tổng/phân số/ngoặc, macro nguồn, công thức trộn với tiếng Việt, và giữ nguyên code/test mẫu.
- `node tests/gui/test-statement-translation.js`: qua, bảo vệ toán/code/số và chuyển lại đề gốc.
- `node tests/gui/test-saved-cf-statement.js`: qua, đề lưu, nội dung dài, công thức lỗi và ảnh PDF thực tế.
- `node tests/gui/test-native-28tech.js`: qua, bài luyện tập C++/Python có AC/WA, điều hướng bài con và chế độ chỉ đọc.
- Ảnh kiểm tra: `plans/artifacts/gui/statement-math.png`.

## Giới hạn

Quét tĩnh toàn kho không tương đương kiểm tra trực quan từng đề. Những mã như `\cite` và `\bibitem` trong bài về LaTeX là dữ liệu đề, không phải mọi dấu gạch chéo đều là lỗi. Nếu nguồn đã mất hẳn công thức và không còn annotation hoặc TeX, không thể tự suy diễn để khôi phục. Bản sửa không ghi đè đề gốc, bản dịch hay test mẫu và không xử lý lỗi tải HTTP 403.

Cần khởi động lại ứng dụng đang mở để nạp mã mới. Chưa phát hành bộ cài mới.
