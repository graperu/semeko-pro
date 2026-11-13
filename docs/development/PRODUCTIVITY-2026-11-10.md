# Tự lưu, công cụ ngôn ngữ, gợi ý, luyện thi và sao lưu

Mở **Hiển thị → Công cụ & dữ liệu** hoặc nút tương ứng trong Cài đặt → Soạn thảo. Thay đổi nằm trong source phát triển; chưa phát hành bộ cài mới.

## Tự lưu và phục hồi

- Session có cả test/results và input theo tab. Debounce 1,2 giây; bản recovery riêng lưu sau khoảng 1 giây ngừng nhập hoặc tối đa 5 giây khi gõ liên tục, thêm chu kỳ 15 giây.
- Ghi chú có bản nháp riêng dù đã thu gọn/lọc bài, tự ghi vào Kho bài; đóng bình thường có flush đồng bộ. Snapshot gồm code, test, results, input, ghi chú đang nhập, thời gian luyện và lượt thi; nằm trong userData/recovery. Giữ một bản trước; đọc dự phòng khi JSON mới hỏng. Session, kho bài và lượt thi có `.bak` riêng.
- Tắt đột ngột để lại `clean=false`; lần mở sau có thông báo phục hồi. Khôi phục code thành buffer chưa lưu, không ghi ngược vào source cũ. Đóng bình thường ghi checkpoint đồng bộ có `clean=true`.
- Đây là chốt dữ liệu định kỳ; ký tự chưa kịp tới checkpoint trước khi mất điện vẫn có thể chưa được giữ. Lỗi lưu được báo, không coi ghi thất bại là đã lưu.

## Công cụ ngôn ngữ

Phát hiện runtime thực tế, hiển thị version/path, khóa nút Cài khi công cụ đã hoạt động. Nút chạy thử biên dịch/chạy chương trình riêng trong temp bằng GCC, Python, javac/java và .NET SDK.

Cài thiếu dùng package ID cố định, gọi không qua shell: `Python.Python.3.14`, `Microsoft.OpenJDK.21`, `Microsoft.DotNet.SDK.10`, `BrechtSanders.WinLibs.POSIX.UCRT`. Có trạng thái/log tiến độ, single-flight, timeout theo dõi và dò lại executable sau cài. Cài tự động dành cho Windows có winget; máy khác hiện lỗi rõ. Có thể cần mở lại Semeko để nhận đường dẫn mới.

Theo [tài liệu WinGet của Microsoft](https://learn.microsoft.com/windows/package-manager/winget/install), cài dùng exact ID, nguồn winget và không chạy shell ghép chuỗi. UI cho biết nút Cài chấp nhận giấy phép nhà cung cấp và có thể có yêu cầu quyền quản trị. Các ID đã kiểm tra trong kho microsoft/winget-pkgs.

## Gợi ý lỗi

C/C++ giữ cơ chế live check hiện hữu. Python, Java, C# có kiểm tra native sau khi dừng gõ, cả với buffer chưa lưu; giới hạn một lượt đang chạy. Kết quả cũ bị bỏ nếu version đổi/tab đóng/tắt kiểm tra. Tooltip thêm giải thích tiếng Việt, giữ thông báo gốc. Quick Fix Ctrl+. cung cấp phép sửa dấu `:`/`;` khi nhận dạng được, có Undo; không tự sửa code.

## Luyện thi

Chọn 1–100 bài có test mẫu trong Kho bài, thời gian 1–360 phút. Đếm giờ giữ qua khởi động lại, có tạm dừng/tiếp tục/kết thúc, badge truy cập nhanh và tự tổng kết khi hết giờ. Tổng kết phân biệt bài đạt toàn bộ test mẫu và bài cần ôn; không gán thứ hạng chính thức CF/LeetCode.

## Sao lưu và chuyển máy

Gói `.semeko-backup` nén gzip và checksum SHA-256. Gồm các tab, code, test/results, input, archive/notes/tags/progress, lượt thi và cài đặt UI/editor cơ bản theo allowlist. Tệp nguồn trong folder đã lưu vào Kho bài được đóng kèm; bỏ symlink và thư mục build/cache/dependency. Không xuất kho thông tin đăng nhập/translation key của Semeko. Mã nguồn được giữ nguyên, không tự sửa nội dung tệp.

Nhập có bước xem trước với ticket hết hạn. Source tabs mở thành bản sao; folder vào userData/imported-workspaces/UUID, không ghi đè folder gốc. Cấu hình UI/editor chỉ nhập khi đánh dấu. Chặn traversal/đường dẫn tuyệt đối/trùng tên file, schema sai, checksum hỏng và gói vượt giới hạn. Giới hạn dữ liệu gói 60 MiB, giải nén tối đa 100 MiB, 300 tab và 3.000 file/folder; không chứa toàn bộ dependency hay bản dịch catalog hàng chục nghìn đề.

## Kiểm tra

Chạy `npm run test:productivity`:

- Unit: roundtrip gói, loại credentials, checksum/schema/prototype/traversal, recovery fallback, .bak/delete/sync, package allowlist và installer progress mô phỏng.
- GUI: cưỡng bức dừng **chỉ process tree của hồ sơ test riêng**, mở lại, phục hồi code/test/results/input/ghi chú chưa lưu; đóng bình thường không báo crash.
- Export/preview/import dùng serializer/checksum/disk thật, chỉ giả dialog chọn đường dẫn. Kiểm tra source folder được copy và file nguồn gốc giữ nguyên; `.env` không được đóng kèm.
- Luyện thi start/pause/resume/manual finish/expiry và lưu summary; test expiry dịch đồng hồ của lượt thử để không chờ cả giờ.
- Chạy Hello World thật bằng GCC, Python, JDK và .NET đang có trên máy. Không cài lại toolchain đang dùng; luồng tải/cài WinGet được kiểm tra bằng process mô phỏng, chưa gỡ công cụ để thử cài sạch.
- Marker tự động Python/Java/C# native khi chưa lưu, gợi ý tiếng Việt, Quick Fix thật trong editor, Undo và xóa marker khi tắt. Layout 760×520 và phóng đại 125%.

Không có nộp CF/LeetCode thật trong đợt này. Những test online khác vẫn dùng nền tảng mô phỏng. Không phát hành hoặc thay bộ cài.


## Kết quả cuối

16 bộ kiểm tra khác nhau có log cuối thành công (3 unit và 13 GUI). Danh sách/log: `plans/artifacts/testing/productivity-2026-11-10/suites.json`. Kiểm tra cú pháp 136 tệp nguồn JS và git diff --check qua. Gợi ý sửa dấu hai chấm được bấm bằng Quick Fix thật của Monaco, có Undo; ghi chú được kiểm tra cả sau khi thu gọn/lọc và sau khi đóng app ngay lập tức.

Một lượt regression bảng đề chạm timeout 30 giây khi tải tài nguyên; chạy riêng và lượt cuối qua. Chưa xác định chắc nguyên nhân; bổ sung giới hạn chờ 20 giây cho tải/định dạng đề trong dock, báo lỗi và Retry thay vì spinner vô hạn. Những lỗi test ban đầu do taskkill trả mã lỗi khi process tree đã kết thúc hoặc test nhắm vào nút header bị responsive ẩn đã được sửa bằng xác nhận process thực sự thoát và thao tác qua menu. Không dùng các lần thất bại đó làm kết quả thành công.
