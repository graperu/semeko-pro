# Cấu trúc thư mục Semeko

| Vị trí | Nội dung |
| --- | --- |
| `app/` | Electron main process, IPC và các dịch vụ phía máy tính |
| `src/` | Giao diện, trình soạn thảo, tính năng và tài nguyên hiển thị |
| `scripts/setup/` | Chuẩn bị công cụ và môi trường ngôn ngữ |
| `scripts/build/` | Build giao diện, runtime và bộ cài |
| `scripts/maintenance/` | Công cụ bảo trì; đọc kỹ phạm vi trước khi chạy |
| `tests/` | Kiểm thử unit, integration, GUI và dữ liệu mẫu |
| `docs/development/` | Tài liệu kỹ thuật, hướng dẫn và báo cáo kiểm thử |
| `docs/assets/` | Tài nguyên dùng trong tài liệu |
| `installer/` | Tài nguyên thiết kế bộ cài |
| `plans/` | Chẩn đoán, ảnh kiểm thử và bản sao cục bộ; không đưa lên Git |
| `node_modules/` | Thư viện do npm quản lý; không di chuyển thủ công |
| `.sameko-tools/`, `Sameko-GCC/` | Công cụ ngôn ngữ cục bộ; giữ đường dẫn hiện tại |
| `samekodevcpp/` | Thư mục đầu ra build mặc định, có thể được tạo lại |

Các tệp `package.json`, `package-lock.json`, `preload.js`, `dev-app-update.yml`, giấy phép và tài liệu giới thiệu ở thư mục gốc vì công cụ hoặc cấu hình hiện tại dùng vị trí này.

## Dữ liệu ngoài mã nguồn

- `%APPDATA%/sameko-dev-cpp/`: dữ liệu người dùng, kho đề, bản dịch, ảnh và trạng thái làm bài. Không coi các thư mục này là rác.
- `%LOCALAPPDATA%/SemekoBuild/release/`: bộ cài phát hành cục bộ.
- `E:/Sameko-Cleanup/CHO_XOA_2026-11-09/`: các bản build dư và cache đã gom; có danh sách để kiểm tra hoặc khôi phục.

## Quy ước

Đặt log, ảnh, kết quả JSON và dữ liệu thử nghiệm trong `plans/artifacts/<nhóm>/`. Giữ các script đang được tiến trình nền gọi ở nguyên đường dẫn. Không chạy lại script sửa đổi hàng loạt chỉ vì chúng nằm trong thư mục chẩn đoán.
