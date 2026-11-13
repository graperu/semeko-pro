# Cập nhật tài liệu độc lập với bộ cài

Thông báo nổi trong app nêu tên gói có bản mới, có **Xem cập nhật** và **Để sau**. Cùng một tổ hợp phiên bản chỉ nhắc một lần; nút trên thanh công cụ vẫn giữ số gói cần cập nhật. Bấm xem tự chọn các gói mới và đóng lời nhắc để không che nút tải. Khi tải có trạng thái/tiến độ, khi xong nhắc lưu công việc và mở lại app; lỗi tải có thông báo đỏ và nút thử lại. Không ép đóng ứng dụng hay tự tải khi chưa chọn. Thông báo hỗ trợ Anh/Việt và trình đọc màn hình.

Trong **Cài đặt → Giới thiệu → Quản lý và cập nhật tài liệu**, người dùng kiểm tra, chọn tải hoặc cập nhật từng gói. Khi mở app, app kiểm tra sau khoảng 15 giây và lặp lại mỗi bốn giờ. Có bản mới cho gói đã tải thì hiện nút thông báo ở thanh trên. Không tự tải lượng dữ liệu lớn khi người dùng chưa bấm tải.

Các gói: sách/mục lục, bài học C++, bài luyện, Codeforces, LeetCode và HackerRank. Bài học phụ thuộc mục lục sách và bài luyện; bộ cài cập nhật dữ liệu tự lấy các gói phụ thuộc. Gói chỉ chứa dữ liệu JSON, gzip, PNG và PDF; không tải mã JavaScript hay chương trình từ nguồn cập nhật.

## Cách lưu và kích hoạt

- Tệp tải về ở `content-library/objects` trong userData, định danh bằng SHA-256; không ghi vào thư mục cài app hoặc thư mục code của người học.
- `active.json` chỉ chuyển phiên bản sau khi toàn bộ gói được xác thực. Tải lỗi giữ nguyên bản đang dùng; tải lại tái sử dụng các tệp hoàn chỉnh đã có.
- `previous.json` giữ chỉ mục trước đó. Tệp cũ không bị xóa trong lượt cập nhật, để phục hồi và tránh mất dữ liệu khi tải gián đoạn.
- Lưu công việc rồi mở lại app để dùng phiên bản mới. Một phiên app và tiến trình PDF của nó đọc cùng một chỉ mục, tránh trộn bài học mới với mục lục cũ.
- Bài làm, bookmark, ghi chú, tiến độ, sổ tay, phiên đăng nhập và khóa API nằm ngoài các gói này và không bị ghi đè.
- Manifest có chữ ký Ed25519, mỗi tệp và cụm nén có SHA-256; từ chối đường dẫn thoát thư mục, chữ ký sai, tệp thiếu/hỏng, nén quá giới hạn và phiên bản app không tương thích.

## Chuẩn bị phát hành

Chỉ có khóa công khai ở `app/config/content-signing-public.pem`. Khóa ký riêng nằm ngoài repo tại `%LOCALAPPDATA%/SemekoBuild/content-signing-private.pem`; cần sao lưu riêng và tuyệt đối không đưa vào bộ cài hoặc kho tải. Giữ nguyên cặp khóa này để các app đã cài tiếp tục xác minh được bản mới.

```powershell
node scripts/build/build-content-release.cjs
node scripts/build/verify-content-release.cjs
```

Lệnh đầu chuẩn bị manifest và các cụm `.pack.gz` trong `%LOCALAPPDATA%/SemekoBuild/content-release`; không upload. Lệnh sau xác minh chữ ký, giải nén và kiểm tra hash toàn bộ tệp. Nhóm tệp theo bucket ổn định giúp thay một bài chỉ ảnh hưởng một cụm nhỏ. Cụm không đổi giữ nguyên URL/hash nên app không tải lại. Dung lượng hiển thị cho gói là dung lượng dữ liệu sau giải nén.

Nguồn mặc định của client và builder: `https://graperu.github.io/semeko-pro-downloads/content/`. Cần xuất bản **các cụm nén trước, manifest sau** vào thư mục `content` của website tải; giữ các cụm cũ để người đang tải không gặp 404. Website dữ liệu riêng không thay đổi GitHub Release mà trình cập nhật bộ cài đang sử dụng. Có thể đổi nguồn tại thời điểm build bằng `--base-url`, đồng thời sửa feed cố định trong app trước khi phát hành bộ cài.

**Chưa xuất bản kho dữ liệu hay bộ cài mới trong thay đổi này.** Người đang dùng bộ cài cũ cần nhận một phiên bản app có tính năng này trước; các lần bổ sung tài liệu sau đó không cần phát hành lại app. Chỉ xuất bản tài liệu bạn có quyền phân phối. Hệ thống tải riêng không cung cấp chống sao chép hoặc phân quyền tài liệu trả phí.

## Kiểm tra

- `node tests/integration/test-content-updates.js`: máy chủ HTTP cục bộ + manifest ký thật; tải lần đầu, cập nhật phần thay đổi, tệp hỏng không thay bản đang dùng, retry, dữ liệu cá nhân còn nguyên, cụm nén, xác thực chữ ký/đường dẫn và reader thật sau khởi động lại.
- `node tests/gui/test-content-updates.js`: Electron thật, tải/cài qua UI, hiển thị yêu cầu mở lại, cửa sổ nhỏ và đọc đề HackerRank từ gói đã tải sau restart.

Các địa chỉ HTTP/khóa thử chỉ được chấp nhận khi bật rõ `SEMEKO_CONTENT_TEST_MODE=1`; ứng dụng bình thường chỉ dùng HTTPS và khóa công khai đi kèm.
