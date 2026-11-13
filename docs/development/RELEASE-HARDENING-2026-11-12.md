# Phát hành và bảo mật

## 1. Tin cậy bản cập nhật

- Bật xác minh chữ ký electron-updater; bỏ nhánh nhận lỗi chữ ký như tải thành công.
- Cache chỉ có tên bản cài không được coi là đã xác minh; phải kiểm tra qua updater.
- `windows-release.cjs` chặn phát hành khi chưa cấu hình chứng thư ký Windows, chạy kiểm tra dữ liệu riêng và thử môi trường trước/sau đóng gói.
- **Máy hiện chưa có chứng thư ký mã trong CurrentUser/My. Chưa tạo được bản phát hành có chữ ký.** Cần chứng thư hoặc dịch vụ ký được cấu hình cho nhà phát hành thực; không tự tạo chứng thư tự ký rồi coi là được Windows tin cậy.

## 2. Quét dữ liệu phát hành

`node scripts/build/release-security-check.cjs` chặn khóa riêng, mẫu token, file cấu hình tài khoản, cookie, log cá nhân trong app/src. Đây là kiểm tra phòng ngừa, không phải chứng minh không thể có bí mật ở mọi định dạng. Private key ký tài liệu ở ngoài repo; không kèm userData.

## 3. Sao lưu và phục hồi

Trước cập nhật app hoặc kích hoạt tài liệu, chụp các tệp state/recovery/settings, tiến độ và ghi chú sách, sổ tay và hình đã lưu. LocalStorage của IDE được chụp riêng để giữ tiến độ khóa học và trạng thái UI; loại tên khóa có dấu hiệu thông tin xác thực. Sao lưu cục bộ trong `update-backups`; không upload.

Trong **Tài liệu → Dung lượng & phục hồi**, chọn bản cũ để chuẩn bị phục hồi ở lần mở app tiếp theo. Trước phục hồi giữ một bản trạng thái hiện tại. Backup không chứa toàn bộ thư mục code tùy ý trên ổ đĩa; tệp đã lưu bên ngoài userData vẫn do người dùng quản lý hoặc xuất bằng chức năng sao lưu workspace. Các bản backup có thể chứa code riêng, cần bảo vệ tài khoản Windows và ổ đĩa.

## 4. Gia cố nội dung và tài khoản

Main renderer bật sandbox, nodeIntegration=false, contextIsolation=true. DOMPurify loại script, iframe, sự kiện và URL thực thi khỏi đề. IPC tài khoản, nộp bài, quản lý dữ liệu và backup chỉ cho main frame của app gọi. Không mở phiên tài khoản hoặc API key cho nội dung đề.

## 5. Dung lượng

Màn hình Dung lượng & phục hồi hiển thị dung lượng và gỡ từng gói; gói đang bị phụ thuộc không được gỡ trước gói phụ thuộc. Dọn chỉ xóa object không còn được chỉ mục active, phiên app đang đọc hoặc bản previous tham chiếu; không chạm code/ghi chú. Mở lại app sau gỡ để chuyển reader sang dữ liệu còn lại.

## 6. Môi trường dùng ngay và kiểm chứng

Python embedded, JDK, .NET SDK/runtime/reference packs được kèm trong `language-runtimes`; GCC/GDB kèm `Sameko-GCC`. Người dùng không cần cài riêng để chạy chương trình tiêu chuẩn. Thư viện bên thứ ba như numpy, gói NuGet hoặc Maven riêng của dự án không được mặc nhiên coi là đã kèm.

`verify-offline-runtimes.cjs` đã chạy đạt trên cả thư mục staging và resources của bản win-unpacked: C/C++, Python/Java/C# nhiều file, PATH không có các ngôn ngữ từ máy phát triển, cache NuGet mới, proxy mạng không hoạt động, kết quả đầu ra chính xác. Hook afterPack chạy lại bài này trên resources vừa đóng gói, phát hiện tệp bị filter thiếu.

**Chưa kiểm chứng cài mới/nâng cấp bằng NSIS trên máy ảo Windows sạch.** Kiểm tra PATH/caches/mạng được cô lập theo tiến trình, không tương đương máy ảo sạch. Chưa phát hành hoặc upload bản mới. Chứng thư ký và lượt thử installer trên máy sạch vẫn là điều kiện trước khi phát hành công khai.

Lệnh kiểm tra:

```powershell
npm run test:release:safety
node tests/gui/test-release-content-security.js
node tests/unit/test-update-discovery.js
node scripts/build/verify-offline-runtimes.cjs "$env:LOCALAPPDATA/SemekoBuild/release/win-unpacked/resources"
```
