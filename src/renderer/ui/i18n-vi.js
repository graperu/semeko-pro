'use strict';
// UI copy only. Keys are whitespace-normalized by the translation layer.
(function (root) {
const catalog = Object.fromEntries(`
+ expression, Enter…|+ biểu thức, nhấn Enter…
+click: conditional breakpoint ·|+bấm: điểm dừng có điều kiện ·
+click: turn off / on|+bấm: bật / tắt
. No breakpoints needed.|. Không cần đặt điểm dừng.
1. Loop:|1. Vòng lặp:
2. Output / Vector:|2. Xuất dữ liệu / Vector:
3. Quick function:|3. Hàm nhanh:
: Final tab stop (usually placed inside brackets { }).|: Vị trí con trỏ cuối cùng (thường đặt trong dấu ngoặc { }).
: Tab stop #1, press Tab to jump here. Has default content.|: Vị trí Tab thứ nhất, nhấn Tab để chuyển đến. Có nội dung mặc định.
: Tab stop #2, press Tab again to go here.|: Vị trí Tab thứ hai, nhấn Tab lần nữa để chuyển đến.
: a past step you are viewing|: bước trước đó đang được xem lại
: kept but skipped|: được giữ lại nhưng bỏ qua
: next to run, not run yet|: bước sắp chạy, chưa được thực thi
: stops only when its condition is true|: chỉ dừng khi điều kiện đúng
: the program stops here|: chương trình dừng tại đây
ANSI 16 Colors|16 màu ANSI
ANSI 256 Colors|256 màu ANSI
ANSI 16: Show colored output Disabled: Plain text only|ANSI 16: Hiển thị kết quả có màu. Tắt: Chỉ hiển thị văn bản thuần.
Add new test case|Thêm ca kiểm thử
Additional Compile Flags|Cờ biên dịch bổ sung
Algorithms|Thuật toán
Also offer pre-release versions. They get new features first but may be less stable.|Bao gồm các bản phát hành thử nghiệm. Các bản này có tính năng mới sớm hơn nhưng có thể chưa ổn định.
Append new tests|Thêm vào các ca kiểm thử hiện có
Are you sure?|Bạn có chắc chắn không?
Auto (Match Theme)|Tự động (theo chủ đề)
Auto dry run|Tự động chạy từng bước
Auto dry run — walk through the program line by line, hands off|Tự động chạy chương trình từng dòng
Auto-stop after X seconds Disable for games/long-running programs|Tự dừng sau số giây đã đặt. Tắt với trò chơi hoặc chương trình cần chạy lâu.
Automatically save files after you stop typing|Tự động lưu tệp sau khi bạn ngừng gõ
Back|Quay lại
Back & Restart|Quay lại và khởi động lại
Back to live|Về bước hiện tại
Back — replay the previous step from the recorded history|Quay lại — xem bước trước trong lịch sử đã ghi
Backup files automatically when saving to prevent data loss.|Tự động sao lưu tệp khi lưu để tránh mất dữ liệu.
Brace and indentation style used by Format Code|Kiểu dấu ngoặc và thụt dòng dùng khi định dạng mã
Breakpoint|Điểm dừng
Browse OJ Problems...|Duyệt bài tập trực tuyến...
Build & Run|Biên dịch và chạy
Build and run (F11)|Biên dịch và chạy (F11)
C++ and Python|C++ và Python
C++98 (Legacy)|C++98 (phiên bản cũ)
Call Stack|Ngăn xếp lời gọi
Change the speed with the slider.|Điều chỉnh tốc độ bằng thanh trượt.
Check for errors automatically while typing|Tự động kiểm tra lỗi khi gõ
Choose Use Current File as Main first|Trước tiên hãy chọn Dùng tệp hiện tại làm tệp chính
Choose a Codeforces, LeetCode or HackerRank problem|Chọn bài tập từ Codeforces, LeetCode hoặc HackerRank
Choose language: C++, C, Java, Python, C#|Chọn ngôn ngữ: C++, C, Java, Python, C#
Choose what to reopen when the app starts|Chọn nội dung mở lại khi ứng dụng khởi động
Clear|Xóa
Clear All|Xóa tất cả
Clear PCH Cache|Xóa bộ nhớ đệm PCH
Clear Precompiled Header (PCH) cache to fix compile slowness or issues.|Xóa bộ nhớ đệm tiêu đề biên dịch sẵn (PCH) khi biên dịch chậm hoặc gặp lỗi.
Click|Bấm
Click the|Bấm vào
Click the left gutter to add one ·|Bấm lề trái để thêm điểm dừng ·
Click to collapse the range.|Bấm để thu gọn vùng.
Close Split|Đóng vùng chia đôi
Close Tab|Đóng thẻ
Close standard input|Đóng đầu vào chuẩn
Close standard input (EOF), for programs that read until end of input|Đóng đầu vào chuẩn (EOF), dành cho chương trình đọc đến hết dữ liệu
Close this panel|Đóng bảng này
Collapse or expand the panel|Thu gọn hoặc mở rộng bảng
Compile & Run|Biên dịch và chạy
Compile Only|Chỉ biên dịch
Conditional|Có điều kiện
Confirm Action|Xác nhận thao tác
Copy Line Down|Sao chép dòng xuống dưới
Copy Line Up|Sao chép dòng lên trên
Create New|Tạo mới
Create shortcuts for frequently used code. Type the trigger keyword in the editor to insert your snippet.|Tạo phím gõ tắt cho đoạn mã thường dùng. Gõ từ khóa kích hoạt trong trình soạn thảo để chèn đoạn mã.
Current line|Dòng hiện tại
Cursor line and column|Dòng và cột của con trỏ
Custom...|Tùy chỉnh...
Customize Theme|Tùy chỉnh chủ đề
Data structures|Cấu trúc dữ liệu
Debug|Gỡ lỗi
Debug: Step Out|Gỡ lỗi: Bước ra
Debugger|Bộ gỡ lỗi
Default (C++17)|Mặc định (C++17)
Default profile. Vim Mode (Settings › Editor) has its own.|Bộ phím mặc định. Chế độ Vim (Cài đặt › Soạn thảo) có bộ phím riêng.
Delete All|Xóa tất cả
Delete all test cases|Xóa tất cả ca kiểm thử
Disabled (Plain)|Tắt (văn bản thuần)
Double-click|Bấm đúp
Drag to detach|Kéo để tách bảng
Drag to resize · Arrow keys to adjust · Double-click to reset|Kéo để đổi kích thước · Dùng phím mũi tên để điều chỉnh · Bấm đúp để đặt lại
Editor content|Nội dung soạn thảo
Enable -Wall -Wextra for potential issues|Bật -Wall -Wextra để phát hiện vấn đề tiềm ẩn
Enable Neovide-style elastic damped spring cursor trail animation in the editor.|Bật hiệu ứng vệt con trỏ đàn hồi kiểu Neovide trong trình soạn thảo.
Enable smart code completion for C++|Bật gợi ý mã thông minh cho C++
English|Tiếng Anh
Errors and warnings|Lỗi và cảnh báo
Examples:|Ví dụ:
Existing tests|Các ca kiểm thử hiện có
Explorer|Danh sách tệp
Extra flags appended to every compile command, e.g. -DLOCAL -DDEBUG. Also used by IntelliSense.|Cờ bổ sung cho mỗi lệnh biên dịch, ví dụ -DLOCAL -DDEBUG. Đồng thời áp dụng cho gợi ý mã.
Fast (-O2)|Nhanh (-O2)
Fastest (-O3)|Nhanh nhất (-O3)
File Explorer|Danh sách tệp
File Explorer (Ctrl+E)|Danh sách tệp (Ctrl+E)
File name and type|Tên và loại tệp
Filter files…|Lọc tệp…
Font size for Input, Output, and Terminal panels|Cỡ chữ cho các bảng đầu vào, kết quả và dòng lệnh
For low-end machines: turns off the minimap, bracket pair colors and cursor animation. The background and animations stay.|Dành cho máy cấu hình thấp: tắt bản đồ mã thu nhỏ, màu cặp ngoặc và hiệu ứng con trỏ. Giữ nguyên nền và các hiệu ứng khác.
Format C/C++ files when you save with Ctrl+S. Auto Save does not format.|Định dạng tệp C/C++ khi lưu bằng Ctrl+S. Tự động lưu không định dạng mã.
Format Code|Định dạng mã
Full paths|Đường dẫn đầy đủ
Get Tests from OJ|Lấy ca kiểm thử từ nền tảng
Get test cases from Online Judge|Lấy ca kiểm thử từ hệ thống chấm bài
Hide|Ẩn
History|Lịch sử
Idle|Chờ
Import File|Nhập tệp
Import Gist|Nhập từ Gist
Import into current tab|Nhập vào thẻ hiện tại
Input...|Nhập dữ liệu...
Input/Output|Đầu vào/Kết quả
Install|Cài đặt
Install Extension|Cài tiện ích mở rộng
Install the pending update|Cài bản cập nhật đã tải
Interface Scale: Auto|Tỉ lệ giao diện: Tự động
Interface Scale: Larger|Tỉ lệ giao diện: Lớn hơn
Interface Scale: Smaller|Tỉ lệ giao diện: Nhỏ hơn
Its folder name|Tên thư mục
Keys|Phím
Last run: time and peak memory|Lần chạy gần nhất: thời gian và bộ nhớ cao nhất
Later|Để sau
Load a source or text template|Tải mẫu mã nguồn hoặc văn bản
Load input from a file|Tải dữ liệu đầu vào từ tệp
Markdown Preview|Xem trước Markdown
Marks in the gutter|Ký hiệu ở lề
Mathematics|Toán học
Maximize|Phóng to
Menu|Trình đơn
Minimize|Thu nhỏ
More run commands|Các lệnh chạy khác
Mouse|Chuột
Move Line Down|Di chuyển dòng xuống
Move Line Up|Di chuyển dòng lên
Never shared|Không chia sẻ
New File (Ctrl+N) - right-click for other file types|Tệp mới (Ctrl+N) — bấm chuột phải để chọn loại tệp khác
New Tab|Thẻ mới
Next Tab|Thẻ tiếp theo
Next line (F10) — run this line without going inside calls|Dòng tiếp theo (F10) — chạy dòng này mà không đi vào hàm được gọi
Next test|Ca kiểm thử tiếp theo
No folder opened|Chưa mở thư mục
None: Fast build, easy debug Fast: 2-3x faster runtime Fastest: Maximum speed|Không tối ưu: Biên dịch nhanh, dễ gỡ lỗi. Nhanh: Chạy nhanh hơn 2–3 lần. Nhanh nhất: Tốc độ tối đa.
Open CMD window for output. Fixes infinite loop crashes. Disables in-app terminal.|Mở cửa sổ CMD để xuất kết quả. Tránh treo khi lặp vô hạn. Tắt dòng lệnh trong ứng dụng.
Open Folder (Ctrl+Shift+O)|Mở thư mục (Ctrl+Shift+O)
Open Settings|Mở cài đặt
Open a folder to browse its files, or group problems into a collection.|Mở thư mục để duyệt tệp hoặc nhóm các bài tập vào bộ sưu tập.
Open a problem on any OJ website|Mở bài tập trên trang chấm bài trực tuyến
Open in a new tab|Mở trong thẻ mới
Open the preview (Ctrl+Shift+V)|Mở bản xem trước (Ctrl+Shift+V)
Open welcome screen|Mở màn hình chào mừng
Pause|Tạm dừng
Play the theme's background video. It always pauses while you work in another window. Turn it off if screen sharing or recording lags.|Phát video nền của chủ đề. Video tự dừng khi bạn chuyển sang cửa sổ khác. Tắt nếu chia sẻ hoặc ghi màn hình bị giật.
Playing|Đang phát
Previous Tab|Thẻ trước
Previous test|Ca kiểm thử trước
Problem preview|Xem trước bài tập
Problem results|Kết quả bài tập
Recommended for CP. Compile only current file for faster build. Turn off for multi-file projects.|Khuyến nghị khi luyện thi lập trình. Chỉ biên dịch tệp hiện tại để nhanh hơn. Tắt khi làm dự án nhiều tệp.
Release|Phát hành
Reopen saved files only|Chỉ mở lại tệp đã lưu
Replace with new tests|Thay bằng các ca kiểm thử mới
Replace with the built-in template|Thay bằng mã mẫu có sẵn
Resize problem list|Đổi kích thước danh sách bài tập
Restart|Khởi động lại
Restart — build and run the program again from the top|Khởi động lại — biên dịch và chạy lại chương trình từ đầu
Rich Presence is off: Discord shows nothing.|Đã tắt trạng thái hoạt động: Discord không hiển thị thông tin.
Right-click|Bấm chuột phải
Run (F5)|Chạy (F5)
Run Only|Chỉ chạy
Run all tests (Ctrl+Shift+F11)|Chạy tất cả ca kiểm thử (Ctrl+Shift+F11)
Save As...|Lưu thành...
Save File|Lưu tệp
Save File As|Lưu tệp thành
Save Snippet|Lưu đoạn mã
Select All Occurrences|Chọn tất cả vị trí trùng khớp
Select Next Occurrence|Chọn vị trí trùng khớp tiếp theo
Send|Gửi
Set a breakpoint, then F5.|Đặt điểm dừng rồi nhấn F5.
Settings (Ctrl+,)|Cài đặt (Ctrl+,)
Shared|Được chia sẻ
Shortcuts & tips|Phím tắt và mẹo
Show Input/Expected|Hiện đầu vào/kết quả mong đợi
Show Problems (Ctrl+J)|Hiện vấn đề (Ctrl+J)
Show Terminal|Hiện dòng lệnh
Show cout/printf output line-by-line as it happens. Disable for max speed when printing huge amounts (heavy CP output).|Hiển thị kết quả cout/printf theo từng dòng ngay khi xuất. Tắt để tăng tốc khi in lượng dữ liệu lớn.
Show snippet suggestions when typing|Gợi ý đoạn mã khi gõ
Show your current file in Discord status|Hiện tệp đang làm trong trạng thái Discord
Size of the whole interface. Auto enlarges it on 4K screens set to 100% or 125% scaling in Windows. Ctrl+= / Ctrl+- / Ctrl+0|Kích thước toàn bộ giao diện. Tự phóng lớn trên màn hình 4K dùng tỉ lệ Windows 100% hoặc 125%. Phím tắt: Ctrl+= / Ctrl+- / Ctrl+0.
Snippet Content|Nội dung đoạn mã
Snippet Tips (Smart Template)|Hướng dẫn đoạn mã (mẫu thông minh)
Split|Chia đôi
Start / Continue|Bắt đầu / Tiếp tục
Step Into (F11) — go inside the function on this line|Bước vào (F11) — đi vào hàm trên dòng này
Step Out (Shift+F11) — finish this function and return|Bước ra (Shift+F11) — hoàn thành hàm này và quay lại
Step into|Bước vào
Step out|Bước ra
Step over|Bước qua
Steps through the program line by line on its own, starting at|Tự chạy từng dòng của chương trình, bắt đầu từ
Stop (Shift+F5) — end the debug session|Dừng (Shift+F5) — kết thúc phiên gỡ lỗi
Stop Process|Dừng tiến trình
Stop program (Shift+F5)|Dừng chương trình (Shift+F5)
Stopped at a breakpoint|Đã dừng tại điểm dừng
Suggest keywords like vector, cout, int...|Gợi ý từ khóa như vector, cout, int...
Swap|Hoán đổi
Syntax highlighting color scheme|Bảng màu tô sáng cú pháp
Terminal input|Dữ liệu nhập dòng lệnh
Test cases will|Các ca kiểm thử sẽ
The upgraded Semeko C++ · C/C++, Python, Java & C#|Bản nâng cấp từ Semeko C++ · C/C++, Python, Java và C#
Theme Marketplace|Kho chủ đề
Time since you opened the IDE|Thời gian từ khi mở ứng dụng
Tip: Right-click tab to access history|Mẹo: Bấm chuột phải vào thẻ để xem lịch sử
Toggle Line Comment|Bật/tắt chú thích dòng
Toggle Markdown Preview|Bật/tắt bản xem trước Markdown
Toggle Problems|Ẩn/hiện vấn đề
Toggle Split|Bật/tắt chia đôi
Trigger Keyword|Từ khóa kích hoạt
Type the input instead|Nhập dữ liệu trực tiếp
Update Available|Có bản cập nhật
Upgraded from Semeko C++ · Multi-language IDE|Nâng cấp từ Semeko C++ · Môi trường lập trình đa ngôn ngữ
Use LLVM Linker (lld) for much faster linking times. Built into Sameko GCC.|Dùng trình liên kết LLVM (lld) để liên kết nhanh hơn. Được tích hợp trong Sameko GCC.
Variables|Biến
Vim Mode (Settings › Editor)|Chế độ Vim (Cài đặt › Soạn thảo)
Vim keybindings in the editor. Uses its own keyboard shortcut profile (Settings › Keybindings), which leaves Ctrl+D, Ctrl+O, Ctrl+W, Ctrl+E, Ctrl+T and Ctrl+J to Vim. :w saves, :q closes the tab.|Dùng phím Vim trong trình soạn thảo. Có bộ phím riêng (Cài đặt › Phím tắt), dành Ctrl+D, Ctrl+O, Ctrl+W, Ctrl+E, Ctrl+T và Ctrl+J cho Vim. :w để lưu, :q để đóng thẻ.
Watch|Theo dõi biểu thức
When tests arrive|Khi nhận được ca kiểm thử
You|Bạn
Your code and test data|Mã nguồn và dữ liệu kiểm thử của bạn
a line: Run to Cursor|một dòng: chạy đến con trỏ
a value: switch hex / decimal|một giá trị: chuyển hệ thập lục phân / thập phân
automatically load|tự động tải
dark|tối
light|sáng
idle|chờ
online|trực tuyến
or|hoặc
or any manual step stops it.|hoặc thao tác bước thủ công sẽ dừng chế độ này.
preview|xem trước
replays steps you already took. The program does not run backwards. Press|phát lại các bước đã thực hiện. Chương trình không chạy ngược. Nhấn
runs|chạy
runs the program again from the start.|chạy lại chương trình từ đầu.
sec|giây
the gutter: add or remove a breakpoint|lề soạn thảo: thêm hoặc xóa điểm dừng
to return.|để quay lại.
© 2025 Sameko Project. All rights reserved.|© 2025 Sameko Project. Bảo lưu mọi quyền.
Workspace ready|Không gian làm việc đã sẵn sàng
Cannot open workspace|Không thể mở không gian làm việc
Folder run failed|Không chạy được thư mục
A workspace operation is in progress. Try again when it finishes.|Đang xử lý không gian làm việc. Vui lòng thử lại khi hoàn tất.
Build in progress. Wait for it to finish before switching language.|Đang biên dịch. Vui lòng đợi hoàn tất trước khi đổi ngôn ngữ.
Stop the running program before switching language.|Hãy dừng chương trình trước khi đổi ngôn ngữ.
Open a saved source file inside this folder first.|Trước tiên hãy mở tệp mã nguồn đã lưu trong thư mục này.
Problem opened. Import samples with Get Tests from OJ or add your own.|Đã mở bài tập. Lấy ca mẫu từ nền tảng hoặc thêm ca kiểm thử của bạn.
Markdown preview is for .md files|Bản xem trước Markdown dành cho tệp .md
Compile Error|Lỗi biên dịch
Warming up...|Đang khởi động chương trình...
Test Error|Lỗi kiểm thử
Single Test Error|Lỗi chạy ca kiểm thử
Debug session active|Đang có phiên gỡ lỗi
Save failed|Lưu thất bại
Build failed|Biên dịch thất bại
Run failed|Chạy thất bại
External run...|Đang chạy trong cửa sổ ngoài...
Done|Hoàn tất
Stopped|Đã dừng
Typing…|Đang gõ…
Checking syntax...|Đang kiểm tra cú pháp...
No issues|Không có vấn đề
Interface scale: Auto|Tỉ lệ giao diện: Tự động
Formatting code...|Đang định dạng mã...
Format unavailable|Không thể định dạng
Code is already formatted|Mã đã được định dạng
Format successful!|Định dạng thành công!
Format failed|Định dạng thất bại
Format error|Lỗi định dạng
Path copied to clipboard|Đã sao chép đường dẫn
Vim Mode could not be loaded|Không tải được chế độ Vim
Bundled compiler not found. Using system g++ from PATH.|Không tìm thấy trình biên dịch đi kèm. Đang dùng g++ trong PATH của hệ thống.
Checking saved runtime settings…|Đang kiểm tra cấu hình công cụ đã lưu…
Loading...|Đang tải...
Loading…|Đang tải…
No results|Không có kết quả
No output yet|Chưa có kết quả
NOT STARTED|CHƯA BẮT ĐẦU
ACCEPTED|THÀNH CÔNG
WRONG ANSWER|SAI KẾT QUẢ
RUNTIME ERROR|LỖI KHI CHẠY
TIME LIMIT EXCEEDED|QUÁ THỜI GIAN
COMPILATION ERROR|LỖI BIÊN DỊCH
Fetched Problems|Bài tập đã tải
Running|Đang chạy
Starting|Đang khởi động
Waiting|Đang chờ
Missing expected output|Thiếu kết quả mong đợi
Not run|Chưa chạy
Pending|Đang chờ
Close Other Tabs|Đóng các thẻ khác
Close Tabs to the Right|Đóng các thẻ bên phải
Close All Tabs|Đóng tất cả thẻ
Copy Path|Sao chép đường dẫn
Rename|Đổi tên
Reveal in Explorer|Mở vị trí tệp
New Folder|Thư mục mới
Add File|Thêm tệp
Remove|Gỡ bỏ
No files found|Không tìm thấy tệp
No problems found|Không tìm thấy bài tập
Retry|Thử lại
Copy|Sao chép
Paste|Dán
Cut|Cắt
Select All|Chọn tất cả
Download failed|Tải xuống thất bại
Checking for updates...|Đang kiểm tra cập nhật...
Checking for updates…|Đang kiểm tra cập nhật…
Up to date|Đang dùng bản mới nhất
Update downloaded|Đã tải bản cập nhật
Read only|Chỉ đọc
Official samples|Ca kiểm thử mẫu chính thức
Custom tests|Ca kiểm thử tùy chỉnh
Reset to Defaults|Khôi phục mặc định
extension for Chrome/Firefox|tiện ích mở rộng cho Chrome/Firefox
icon of the extension in your browser|biểu tượng tiện ích trong trình duyệt
into the IDE!|vào ứng dụng!
e.g. 'Source Code Pro', monospace|ví dụ: 'Source Code Pro', monospace
e.g. -DLOCAL|ví dụ: -DLOCAL
e.g., fori, bfs, dfs...|ví dụ: fori, bfs, dfs...
Theme Customizer|Trình tùy chỉnh chủ đề
Name|Tên
Variant|Kiểu giao diện
Dark|Tối
Light|Sáng
Close theme customizer|Đóng trình tùy chỉnh chủ đề
Customizer sections|Các phần tùy chỉnh
UI Colors|Màu giao diện
Syntax|Cú pháp
Backgrounds|Hình nền
Advanced|Nâng cao
Search colors|Tìm màu
Search syntax|Tìm cú pháp
Clear search|Xóa tìm kiếm
Live preview|Xem trước trực tiếp
Click any part to edit its color|Bấm vào vùng cần chỉnh màu
Delete theme|Xóa chủ đề
Undo the last change (Ctrl+Z)|Hoàn tác thay đổi gần nhất (Ctrl+Z)
Redo (Ctrl+Y)|Làm lại (Ctrl+Y)
Reset the whole theme|Khôi phục toàn bộ chủ đề
Reset all|Khôi phục tất cả
Save background|Lưu nền
Save as new|Lưu thành chủ đề mới
Opacity|Độ đậm
Brightness|Độ sáng
Blur|Độ mờ
Position|Vị trí
Terminal opacity|Độ đậm dòng lệnh
Panel opacity|Độ đậm các bảng
Terminal blur|Độ mờ dòng lệnh
Welcome card opacity|Độ đậm thẻ chào mừng
No matching color tokens.|Không tìm thấy thành phần màu phù hợp.
No editable color tokens are available.|Chưa có thành phần màu có thể chỉnh sửa.
No matching syntax tokens.|Không tìm thấy thành phần cú pháp phù hợp.
No syntax tokens are available.|Chưa có thành phần cú pháp.
Shared effects|Hiệu ứng chung
Choose file…|Chọn tệp…
Base theme|Chủ đề gốc
Import JSON|Nhập JSON
Export JSON|Xuất JSON
Theme JSON|Dữ liệu JSON của chủ đề
Apply JSON|Áp dụng JSON
● Unsaved changes|● Thay đổi chưa lưu
Saved|Đã lưu
Draft changes previewed|Đang xem trước thay đổi chưa lưu
Saving…|Đang lưu…
Files|Tệp
Filter files|Lọc tệp
Tests|Kiểm thử
Background|Nền
Surface|Bề mặt
Main|Chính
Text|Chữ
Border|Đường viền
Status|Trạng thái
Editor background|Nền soạn thảo
App background|Nền ứng dụng
Keyword|Từ khóa
String|Chuỗi
Number|Số
Type|Kiểu dữ liệu
Function|Hàm
Variable|Biến
Comment|Chú thích
Operator|Toán tử
Bracket|Dấu ngoặc
Bold|Đậm
Italic|Nghiêng
Underline|Gạch chân
Color|Màu
Locked / Premium|Bị khóa / Trả phí
Loading statement and starter code…|Đang tải đề bài và mã mẫu…
This problem is locked or Premium. Open it on the official website with your own account.|Bài này bị khóa hoặc yêu cầu trả phí. Hãy mở trang chính thức bằng tài khoản của bạn.
Use Open official page to read the complete problem statement.|Chọn Mở trang gốc để đọc toàn bộ đề bài.
Create file (no samples)|Tạo tệp (chưa có ca mẫu)
Loading problems…|Đang tải bài tập…
Loading problems...|Đang tải bài tập...
Loading problem…|Đang tải bài tập…
Unrated|Chưa xếp hạng
Easy|Dễ
Medium|Trung bình
Hard|Khó
Search problems|Tìm bài tập
Edit header island color|Đổi màu nhóm đầu trang
Edit accent color|Đổi màu nhấn
Edit secondary text color|Đổi màu chữ phụ
Edit tab island color|Đổi màu nhóm thẻ
Edit active tab color|Đổi màu thẻ đang chọn
Edit primary button color|Đổi màu nút chính
Edit explorer color|Đổi màu danh sách tệp
Edit selected file color|Đổi màu tệp đang chọn
Edit editor background color|Đổi màu nền soạn thảo
Edit bottom panel color|Đổi màu bảng dưới
Edit terminal color|Đổi màu dòng lệnh
Edit input panel color|Đổi màu bảng đầu vào
Edit output panel color|Đổi màu bảng kết quả
Edit expected panel color|Đổi màu bảng kết quả mong đợi
Edit status bar color|Đổi màu thanh trạng thái
New Theme|Chủ đề mới
My Themes|Chủ đề của tôi
Built-in Themes|Chủ đề có sẵn
Community Themes|Chủ đề cộng đồng
Theme name|Tên chủ đề
Search themes...|Tìm chủ đề...
No themes found|Không tìm thấy chủ đề
Apply|Áp dụng
Edit theme|Chỉnh sửa chủ đề
Duplicate|Nhân bản
Duplicate theme|Nhân bản chủ đề
Delete Theme|Xóa chủ đề
Unsaved changes|Thay đổi chưa lưu
Discard|Bỏ thay đổi
Discard changes|Bỏ thay đổi
Keep editing|Tiếp tục chỉnh sửa
Cancel changes|Hủy thay đổi
New collection|Bộ sưu tập mới
New contest|Kỳ thi mới
Add problem|Thêm bài tập
Add current file|Thêm tệp hiện tại
Remove from collection|Gỡ khỏi bộ sưu tập
Remove from list|Gỡ khỏi danh sách
Open containing folder|Mở thư mục chứa
Copy full path|Sao chép đường dẫn đầy đủ
Reveal in File Explorer|Hiện trong trình quản lý tệp
Recent files|Tệp gần đây
Clear recent files|Xóa danh sách tệp gần đây
No recent files|Chưa có tệp gần đây
No breakpoints|Chưa có điểm dừng
No variables|Chưa có biến
No watch expressions|Chưa có biểu thức theo dõi
No call stack|Chưa có ngăn xếp lời gọi
Continue|Tiếp tục
Enable breakpoint|Bật điểm dừng
Disable breakpoint|Tắt điểm dừng
Remove breakpoint|Xóa điểm dừng
Edit condition|Sửa điều kiện
Remove all breakpoints|Xóa tất cả điểm dừng
Run to Cursor|Chạy đến con trỏ
Breakpoint condition|Điều kiện điểm dừng
Enter expression|Nhập biểu thức
Stop debugging|Dừng gỡ lỗi
No file is currently open!|Chưa mở tệp nào!
Choose a source file to run tests.|Chọn tệp mã nguồn để chạy kiểm thử.
Compiling solution…|Đang biên dịch lời giải…
Sample tests are read only.|Các ca kiểm thử mẫu chỉ được phép đọc.
All tests passed|Tất cả ca kiểm thử đều thành công
Some tests failed|Có ca kiểm thử thất bại
No tests|Chưa có ca kiểm thử
Test results|Kết quả kiểm thử
Actual output|Kết quả thực tế
Expected output|Kết quả mong đợi
Missing|Còn thiếu
Run completed|Đã chạy xong
Build succeeded|Biên dịch thành công
Compilation successful|Biên dịch thành công
Compile succeeded|Biên dịch thành công
Compile failed|Biên dịch thất bại
Output limit exceeded|Vượt giới hạn kết quả
Memory limit exceeded|Vượt giới hạn bộ nhớ
No expected output|Chưa có kết quả mong đợi
Compare output|So sánh kết quả
Open|Mở
All Files|Tất cả tệp
Source Files|Tệp mã nguồn
Code, Text & Test Data|Mã nguồn, văn bản và dữ liệu kiểm thử
Text & Test Data (.txt .md .inp .out …)|Văn bản và dữ liệu kiểm thử (.txt .md .inp .out …)
Cannot open file|Không thể mở tệp
Open File|Mở tệp
Save File|Lưu tệp
Select Folder|Chọn thư mục
Select a folder|Chọn thư mục
Select files|Chọn tệp
Image Files|Tệp hình ảnh
Video Files|Tệp video
JSON Files|Tệp JSON
C++ Source|Mã nguồn C++
C Source|Mã nguồn C
Header|Tệp tiêu đề
Test Data|Dữ liệu kiểm thử
Official samples · read only|Ca mẫu chính thức · chỉ đọc
No test cases to run. Get test cases from OJ first!|Chưa có ca kiểm thử. Hãy lấy ca mẫu từ nền tảng trước!
Tests are already running...|Đang chạy kiểm thử...
=== Run All Tests ===|=== Chạy tất cả ca kiểm thử ===
Compile Error!|Lỗi biên dịch!
Source unchanged: reused the last build|Mã nguồn không đổi: dùng lại bản biên dịch gần nhất
Test case does not exist.|Ca kiểm thử không tồn tại.
Batch tests are running. Please wait.|Đang chạy cả bộ kiểm thử. Vui lòng đợi.
External process finished|Tiến trình ngoài đã hoàn tất
Continue debugging|Tiếp tục gỡ lỗi
Find|Tìm
Replace|Thay thế
Find in Files|Tìm trong các tệp
Go to Definition|Đi đến định nghĩa
Go to References|Đi đến tham chiếu
Peek Definition|Xem nhanh định nghĩa
Peek References|Xem nhanh tham chiếu
Go to Symbol...|Đi đến ký hiệu...
Go to Line/Column...|Đi đến dòng/cột...
Format Document|Định dạng tài liệu
Format Selection|Định dạng vùng chọn
Command Palette|Bảng lệnh
Change All Occurrences|Thay đổi tất cả vị trí trùng khớp
Rename Symbol|Đổi tên ký hiệu
Quick Fix...|Sửa nhanh...
Cut|Cắt
Match Case|Phân biệt chữ hoa/thường
Match Whole Word|Khớp cả từ
Use Regular Expression|Dùng biểu thức chính quy
Find Previous|Tìm trước
Find Next|Tìm tiếp
Replace All|Thay thế tất cả
Toggle Replace|Bật/tắt thay thế
Find in Selection|Tìm trong vùng chọn
No Results|Không có kết quả
Main background|Nền chính
Secondary background|Nền phụ
Panels|Các bảng
Problems panel|Bảng vấn đề
Status bar|Thanh trạng thái
Input fields|Các ô nhập
Accent|Màu nhấn
Accent hover|Màu nhấn khi trỏ chuột
Primary text|Chữ chính
Secondary text|Chữ phụ
Muted text|Chữ mờ
Borders|Các đường viền
Glass surfaces|Bề mặt kính
Heavy glass|Kính đậm
Buttons|Các nút
Button hover|Nút khi trỏ chuột
Success|Thành công
Error|Lỗi
Warning|Cảnh báo
Edit Snippet|Sửa đoạn mã
Confirm|Xác nhận
Welcome|Chào mừng
Application background|Nền ứng dụng
Apply the JSON to the draft (Ctrl+Enter). Invalid values are rejected.|Áp dụng JSON vào bản nháp (Ctrl+Enter). Giá trị không hợp lệ sẽ bị từ chối.
Colors of surfaces, text and states. Click a part of the preview to jump to its color. ↺ on a row puts that color back; Ctrl+Z / Ctrl+Y undo and redo. Edits show in the preview only until you save.|Màu của bề mặt, chữ và trạng thái. Bấm vào vùng xem trước để chọn màu cần chỉnh. Bấm ↺ để khôi phục màu; Ctrl+Z / Ctrl+Y để hoàn tác hoặc làm lại. Thay đổi chỉ xuất hiện trong bản xem trước cho đến khi lưu.
Bg Glass Border|Viền nền kính
Bg Ocean Deep|Nền xanh đậm
Border Glass Edge|Viền cạnh kính
Border Strong|Viền đậm
Btn Bg|Nền nút
Btn Bg Hover|Nền nút khi trỏ chuột
Btn Border|Viền nút
Btn Error Bg|Nền nút lỗi
Btn Error Text|Chữ nút lỗi
Btn Primary Bg|Nền nút chính
Btn Primary Bg Hover|Nền nút chính khi trỏ chuột
Btn Primary Text|Chữ nút chính
Btn Success Bg|Nền nút thành công
Btn Success Text|Chữ nút thành công
Btn Text|Chữ nút
Btn Text Hover|Chữ nút khi trỏ chuột
Button|Nút
Button Text On Accent|Chữ nút trên màu nhấn
Danger|Nguy hiểm
Error Dark|Màu lỗi đậm
Folder Icon Closed|Biểu tượng thư mục đóng
Folder Icon Open|Biểu tượng thư mục mở
Other|Khác
Settings Label Color|Màu nhãn cài đặt
Settings Section Color|Màu tiêu đề phần cài đặt
Success Dark|Màu thành công đậm
Success Hover|Màu thành công khi trỏ chuột
Term Line Error|Dòng thông báo lỗi
Term Line Info|Dòng thông tin
Term Line Input|Dòng nhập liệu
Term Line Success|Dòng thành công
Term Line System|Dòng hệ thống
Term Line Warning|Dòng cảnh báo
Terminal Placeholder|Chữ gợi ý dòng lệnh
Terminal Text|Chữ dòng lệnh
Test Fail|Kiểm thử thất bại
Test Pass|Kiểm thử thành công
Test Pending|Kiểm thử đang chờ
Welcome Box Bg|Nền thẻ chào mừng
Welcome Btn Border|Viền nút chào mừng
Welcome Btn Primary Border|Viền nút chính chào mừng
Revert to the default|Khôi phục mặc định
Discard unsaved theme changes?|Bỏ các thay đổi chủ đề chưa lưu?
Unsaved theme|Chủ đề chưa lưu
Background files must be smaller than 64 MB.|Tệp nền phải nhỏ hơn 64 MB.
Choose a supported image, MP4 or WebM video.|Chọn ảnh được hỗ trợ hoặc video MP4, WebM.
Could not read background file.|Không đọc được tệp nền.
Reset this draft? Changes are saved only when you choose Save.|Khôi phục bản nháp này? Thay đổi chỉ được lưu khi bạn chọn Lưu.
Reset theme|Khôi phục chủ đề
JSON applied to preview.|Đã áp dụng JSON vào bản xem trước.
Theme file is too large.|Tệp chủ đề quá lớn.
Theme imported into the draft. Choose Save As New to create a copy.|Đã nhập chủ đề vào bản nháp. Chọn Lưu thành chủ đề mới để tạo bản sao.
Enter a theme name.|Nhập tên chủ đề.
Could not register theme.|Không đăng ký được chủ đề.
Could not save active theme settings.|Không lưu được cài đặt chủ đề hiện tại.
Background saved.|Đã lưu nền.
Theme saved.|Đã lưu chủ đề.
Theme exported with its background assets.|Đã xuất chủ đề kèm tài nguyên nền.
Delete this custom theme?|Xóa chủ đề tùy chỉnh này?
Could not save settings.|Không lưu được cài đặt.
Cannot save approach - the file could not be read.|Không lưu được cách giải vì không đọc được tệp.
Cannot save approach - editor content is empty.|Không lưu được cách giải vì vùng soạn thảo đang trống.
Enter new name:|Nhập tên mới:
Reset all problem statuses to "Not Started"?|Đặt lại trạng thái mọi bài tập về Chưa bắt đầu?
Unknown error|Lỗi không xác định
Loading statement...|Đang tải đề bài...
No matching problems. Try another name, ID or difficulty.|Không có bài tập phù hợp. Thử tên, mã bài hoặc độ khó khác.
Find Next (Enter)|Tìm tiếp (Enter)
Find Previous (Shift+Enter)|Tìm trước (Shift+Enter)
Replace (Enter)|Thay thế (Enter)
Replace All (Ctrl+Alt+Enter)|Thay thế tất cả (Ctrl+Alt+Enter)
Search extensions|Tìm tiện ích mở rộng
Built-in|Có sẵn
Custom|Tùy chỉnh
Author|Tác giả
Installed|Đã cài
Not installed|Chưa cài
Create theme|Tạo chủ đề
Edit in Customizer|Sửa trong trình tùy chỉnh
ACTIVE|ĐANG CHỌN
Active|Đang chọn
Add Existing File|Thêm tệp có sẵn
Add the currently open file, or browse for a file.|Thêm tệp đang mở hoặc duyệt chọn tệp khác.
Add to Collection|Thêm vào bộ sưu tập
Approaches|Các cách giải
Browse for File...|Duyệt chọn tệp...
C file|Tệp C
C# file|Tệp C#
C++ file|Tệp C++
Cannot delete builtin theme|Không thể xóa chủ đề có sẵn
Cannot override builtin theme|Không thể ghi đè chủ đề có sẵn
Category / Contest Name|Tên danh mục / kỳ thi
Change Color|Đổi màu
Clear Status|Xóa trạng thái
Clearing...|Đang xóa...
Click "Add New Snippet" or "Import from File(s)" to add some.|Bấm Thêm đoạn mã mẫu hoặc Nhập từ tệp để thêm đoạn mã.
Conditional breakpoint|Điểm dừng có điều kiện
Create|Tạo
Create .inp|Tạo tệp .inp
Create .out|Tạo tệp .out
Create a collection to organize problems|Tạo bộ sưu tập để sắp xếp bài tập
Create →|Tạo →
Debug: Run to Cursor|Gỡ lỗi: Chạy đến con trỏ
Debugging in 3 steps|Gỡ lỗi trong 3 bước
Delete All Test Cases|Xóa tất cả ca kiểm thử
Delete Contest Folder|Xóa thư mục kỳ thi
Delete Problem|Xóa bài tập
Delete Test Case|Xóa ca kiểm thử
Delete folder on disk|Xóa thư mục trên ổ đĩa
Display Name|Tên hiển thị
Done!|Hoàn tất!
Downloading Update...|Đang tải bản cập nhật...
Drop files here or|Thả tệp vào đây hoặc
Drop here to add|Thả vào đây để thêm
Empty folder|Thư mục trống
Failed!|Thất bại!
File changed|Tệp đã thay đổi
File has been changed externally. Do you want to reload?|Tệp đã thay đổi bên ngoài ứng dụng. Bạn có muốn tải lại không?
Folder / Contest Name|Tên thư mục / kỳ thi
Got it|Đã hiểu
Ignore|Bỏ qua
In Progress|Đang làm
Invalid theme values|Giá trị chủ đề không hợp lệ
Java file|Tệp Java
Languages — Python, Java, C#|Ngôn ngữ — Python, Java, C#
Last Problem ID|Mã bài cuối cùng
Load this Approach|Tải cách giải này
Mark Status|Đánh dấu trạng thái
Memory Limit|Giới hạn bộ nhớ
Move Down|Di chuyển xuống
Move Up|Di chuyển lên
Move to|Chuyển đến
My Custom Themes|Chủ đề tùy chỉnh của tôi
New File Here|Tạo tệp tại đây
New Problem|Bài tập mới
+ New Problem|+ Bài tập mới
New Subfolder|Thư mục con mới
No contests — click + to create one|Chưa có kỳ thi — bấm + để tạo
No problems yet|Chưa có bài tập
No snippets found.|Chưa có đoạn mã mẫu.
Nothing to preview yet.|Chưa có nội dung xem trước.
Open as Root Folder|Mở làm thư mục gốc
Press|Nhấn
Press a key...|Nhấn một phím...
Preview (Read-only)|Xem trước (chỉ đọc)
Process Running|Chương trình đang chạy
Python file|Tệp Python
Reading…|Đang đọc…
Rebuilding PCH...|Đang tạo lại PCH...
Reload|Tải lại
Remove Contest Marker|Bỏ đánh dấu kỳ thi
Remove collection only|Chỉ gỡ bộ sưu tập
Remove from Collection|Gỡ khỏi bộ sưu tập
Rename / Set Label|Đổi tên / Đặt nhãn
Rename Contest|Đổi tên kỳ thi
Rename Label|Đổi tên nhãn
Reset All Status|Khôi phục tất cả trạng thái
Review|Cần xem lại
Running...|Đang chạy...
Set Platform|Chọn nền tảng
Set Status|Đặt trạng thái
Set as Active Contest|Đặt làm kỳ thi hiện tại
Show in Explorer|Hiện trong danh sách tệp
Stuck|Đang vướng
Switch to this Approach|Chuyển sang cách giải này
Test Cases|Các ca kiểm thử
Test Files|Tệp kiểm thử
The Markdown renderer could not be loaded.|Không tải được bộ hiển thị Markdown.
Theme colors must be an object|Màu chủ đề phải là một đối tượng
Theme deleted|Đã xóa chủ đề
Theme id must be a string|Mã chủ đề phải là chuỗi
Theme id values disagree|Các giá trị mã chủ đề không khớp
Theme meta.id must be a string|Trường meta.id của chủ đề phải là chuỗi
Theme meta.name must be a string|Trường meta.name của chủ đề phải là chuỗi
Theme must be an object|Chủ đề phải là một đối tượng
Theme must have a name|Chủ đề phải có tên
Theme must have an id|Chủ đề phải có mã
Theme name must be a string|Tên chủ đề phải là chuỗi
Theme name values disagree|Các giá trị tên chủ đề không khớp
Theme not found|Không tìm thấy chủ đề
Unable to apply change|Không áp dụng được thay đổi
Unsaved Changes|Thay đổi chưa lưu
Verifying update package...|Đang xác minh gói cập nhật...
Verifying...|Đang xác minh...
Working|Đang xử lý
all|tất cả
at the breakpoint|tại điểm dừng
continue · hover a variable to see its value|tiếp tục · trỏ vào biến để xem giá trị
formatting|đang định dạng
left gutter|lề trái
no frames|chưa có khung lời gọi
no locals recorded here|chưa ghi nhận biến cục bộ tại đây
pauses|tạm dừng
ready|sẵn sàng
running|đang chạy
starting|đang khởi động
step|bước
step into ·|bước vào ·
step over ·|bước qua ·
stopped|đã dừng
… more elements (showing first 200)|… còn phần tử khác (hiện 200 phần tử đầu)
Export theme|Xuất chủ đề
Unknown|Chưa rõ
Adapted from nonylene/vscode-dark-molokai-theme (MIT); see assets/licenses/dark-molokai.txt.|Dựa trên nonylene/vscode-dark-molokai-theme (MIT); xem assets/licenses/dark-molokai.txt.
Close Others|Đóng các thẻ khác
No file selected|Chưa chọn tệp
No history available for this file|Chưa có lịch sử của tệp này
History is created when you save changes|Lịch sử được tạo khi bạn lưu thay đổi
No checkpoints for this untitled tab|Chưa có phiên bản lưu cho thẻ chưa đặt tên này
A snapshot is saved automatically while you type|Bản chụp được lưu tự động khi bạn gõ
Could not find checkpoint content|Không tìm thấy nội dung phiên bản lưu
Open the file in a tab to restore this checkpoint|Mở tệp trong thẻ để khôi phục phiên bản lưu này
Restore|Khôi phục
Restore this version|Khôi phục phiên bản này
No history yet|Chưa có lịch sử
Account|Tài khoản
Semeko account|Tài khoản Semeko
Sign in with GitHub|Đăng nhập bằng GitHub
Sign out|Đăng xuất
Signed out|Đã đăng xuất
Sign in with GitHub to link your practice profiles.|Đăng nhập GitHub để liên kết hồ sơ luyện tập.
GitHub login is not configured for this build|Bản app này chưa cấu hình đăng nhập GitHub
Enter this code on GitHub:|Nhập mã này trên GitHub:
GitHub sign-in successful|Đăng nhập GitHub thành công
Platform username|Tên người dùng trên nền tảng
Link profile|Liên kết hồ sơ
Sync results|Đồng bộ kết quả
Unlink|Gỡ liên kết
Public profile linked. Ownership is not verified.|Đã liên kết hồ sơ công khai. Chưa xác minh quyền sở hữu.
Public results synced|Đã đồng bộ kết quả công khai
Public profile link; ownership not verified. Recent submissions only.|Hồ sơ công khai; chưa xác minh quyền sở hữu. Chỉ gồm các bài nộp gần đây.
Rating|Điểm xếp hạng
Rank|Thứ hạng
Solved|Đã giải
Accepted on linked profile|Được chấp nhận trên hồ sơ liên kết
GitHub identifies your local Semeko profile. Linking a public username does not sign you in to Codeforces or LeetCode.|GitHub xác định hồ sơ Semeko trên máy này. Liên kết tên người dùng công khai không đăng nhập vào Codeforces hay LeetCode.
Submit online|Nộp bài đang mở
Submit in browser|Nộp qua trình duyệt
Open an online problem first|Hãy mở một bài tập trực tuyến trước
Submit on official platform|Nộp trên nền tảng chính thức
Your solution will be copied. Sign in on the official page, paste the code, choose the language and confirm Submit yourself. Local test results do not count as online acceptance.|Lời giải sẽ được sao chép. Đăng nhập trên trang chính thức, dán mã, chọn ngôn ngữ rồi tự xác nhận nộp. Kết quả test trên máy không tính là Accepted trên web.
Open submission page|Mở trang nộp bài
Solution copied. Confirm submission on the official page.|Đã sao chép lời giải. Hãy xác nhận nộp trên trang chính thức.
Sign in with GitHub first|Hãy đăng nhập GitHub trước
GitHub login expired. Start again.|Đăng nhập GitHub hết hạn. Hãy bắt đầu lại.
GitHub authorization denied|Bạn đã từ chối cấp quyền GitHub
GitHub login cancelled|Đã hủy đăng nhập GitHub
GitHub device login is unavailable. Enable Device Flow for the OAuth App.|Chưa dùng được mã đăng nhập GitHub. Hãy bật Device Flow cho OAuth App.
GitHub returned an invalid identity|GitHub trả về danh tính không hợp lệ
Could not connect to account provider|Không kết nối được nhà cung cấp tài khoản
Account provider returned invalid data|Nhà cung cấp tài khoản trả về dữ liệu không hợp lệ
Could not read account settings|Không đọc được cài đặt tài khoản
Unsupported account platform|Nền tảng tài khoản chưa được hỗ trợ
Invalid platform username|Tên người dùng nền tảng không hợp lệ
Codeforces profile not found|Không tìm thấy hồ sơ Codeforces
LeetCode profile not found or unavailable|Không tìm thấy hoặc chưa truy cập được hồ sơ LeetCode
Link a platform profile first|Hãy liên kết hồ sơ nền tảng trước
Account changed. Try again.|Tài khoản đã thay đổi. Vui lòng thử lại.
Could not load Codeforces submissions|Không tải được bài nộp Codeforces
Could not load LeetCode public submissions|Không tải được bài nộp công khai LeetCode
Unsupported submission URL|Địa chỉ nộp bài chưa được hỗ trợ
Invalid solution source|Mã lời giải không hợp lệ
Could not open official submission page. Try the browser option.|Không mở được trang nộp chính thức. Hãy thử tùy chọn trình duyệt.
Statement translation API|API dịch đề bài
OpenAI-compatible Chat Completions API. Only statement text is sent when you press Translate. Your provider may charge for usage.|API Chat Completions tương thích OpenAI. Chỉ gửi văn bản đề bài khi bạn bấm Dịch. Dịch vụ có thể tính phí sử dụng.
Base URL|Địa chỉ API
Model name|Tên model
API key|Khóa API
Enter your provider model ID|Nhập mã model của dịch vụ
Enter API key|Nhập khóa API
Key saved. Leave blank to keep it.|Đã lưu khóa. Để trống để giữ nguyên.
Save translation settings|Lưu cấu hình dịch
Test translation connection|Kiểm tra kết nối dịch
Remove saved API key|Xóa khóa API đã lưu
Translate to Vietnamese|Dịch sang tiếng Việt
Show original|Xem bản gốc
Show Vietnamese|Xem tiếng Việt
Translation settings|Cấu hình dịch
Translating statement…|Đang dịch đề bài…
Machine translation. Check the original for precise meaning.|Bản dịch tự động. Đối chiếu bản gốc để hiểu chính xác.
Translation settings saved|Đã lưu cấu hình dịch
Translation connection successful|Kết nối dịch thành công
Translation API key removed|Đã xóa khóa API dịch
Enter a valid translation Base URL|Nhập địa chỉ API dịch hợp lệ
Translation Base URL must use HTTPS without credentials or query parameters|Địa chỉ API phải dùng HTTPS, không chứa thông tin đăng nhập hoặc tham số truy vấn
Enter a translation model name|Nhập tên model dịch
Invalid translation API key|Khóa API dịch không hợp lệ
Secure key storage is not available on this computer|Máy này chưa hỗ trợ lưu khóa an toàn
Enter the API key again when changing the translation endpoint|Nhập lại khóa API khi đổi địa chỉ dịch vụ
Enter a translation API key|Nhập khóa API dịch
Statement is too large to translate|Đề bài quá lớn để dịch
Configure the translation API in Settings first|Hãy cấu hình API dịch trong Cài đặt trước
A statement translation is already running|Đang có một đề bài được dịch
Could not unlock translation API key. Save the key again.|Không giải mã được khóa API. Hãy lưu lại khóa.
Could not connect to translation service. Check Base URL and network.|Không kết nối được dịch vụ dịch. Kiểm tra địa chỉ API và mạng.
Translation service returned an invalid response|Dịch vụ dịch trả về dữ liệu không hợp lệ
Translation service did not return valid JSON|Dịch vụ dịch không trả về JSON hợp lệ
Translation response does not match the statement|Kết quả dịch không khớp cấu trúc đề bài
Translation changed protected formulas or numbers. Original statement kept.|Bản dịch làm thay đổi công thức hoặc số đã bảo vệ. Đã giữ nguyên đề gốc.
Could not read translation settings|Không đọc được cấu hình dịch
Browse by|Duyệt theo
Contests|Kỳ thi
Archive|Kho bài
Practice archive|Kho bài đã luyện
Search saved practice|Tìm bài đã lưu
Filter practice status|Lọc trạng thái luyện tập
Practice status|Trạng thái luyện tập
All practice|Tất cả bài
Practiced|Đã luyện
Solved locally|Đạt kiểm thử trên máy
Open solution|Mở lời giải
Remove from archive|Gỡ khỏi kho
Save current solution|Lưu lời giải hiện tại
No archived practice yet|Chưa có bài đã lưu
Local sample results do not include platform hidden tests.|Kết quả kiểm thử trên máy không bao gồm ca ẩn của nền tảng.
Remove this saved practice? Your source files will be kept.|Gỡ bài đã lưu này khỏi kho? Các tệp mã nguồn vẫn được giữ nguyên.
Practice saved to archive|Đã lưu bài vào kho
Could not save practice archive|Không lưu được kho bài
Stop the running program before opening an archived solution.|Hãy dừng chương trình trước khi mở lời giải trong kho.
Type input and press Enter (Shift+Enter for a new line)|Nhập dữ liệu rồi nhấn Enter (Shift+Enter để xuống dòng)
Run a program to enter input|Chạy chương trình để nhập dữ liệu
Could not load backup content|Không tải được nội dung bản sao lưu
File restored successfully!|Đã khôi phục tệp!
History cleared|Đã xóa lịch sử
Save|Lưu
Cancel|Hủy
Open Folder|Mở thư mục
Close|Đóng
Colors of the C++ code in the editor. ↺ on a row puts that color back.|Màu mã C++ trong vùng soạn thảo. Bấm ↺ trên mỗi dòng để khôi phục màu.
Images, videos and their effects. Undo and Reset restore them too.|Hình ảnh, video và hiệu ứng. Hoàn tác và Khôi phục cũng áp dụng cho các mục này.
Base theme, import, export and the theme JSON. Ctrl+Enter applies the JSON.|Chủ đề gốc, nhập, xuất và dữ liệu JSON của chủ đề. Nhấn Ctrl+Enter để áp dụng JSON.

Connect|Kết nối
Reconnect|Kết nối lại
Connected|Đã kết nối
Not connected|Chưa kết nối
Connection interrupted|Kết nối bị ngắt
Ready to submit from Semeko|Sẵn sàng nộp bài trong Semeko
Connect once to submit from the app.|Kết nối một lần để nộp bài ngay trong app.
Reconnect the browser before submitting.|Kết nối lại trình duyệt trước khi nộp bài.
Public profile|Hồ sơ công khai
Public profile statistics are separate from the browser account used to submit.|Thống kê hồ sơ công khai độc lập với tài khoản trình duyệt dùng để nộp bài.
Disconnect|Ngắt kết nối
Account connections|Kết nối tài khoản
Connect Codeforces or LeetCode once, then submit your current solution from Semeko.|Kết nối Codeforces hoặc LeetCode một lần, rồi nộp lời giải đang mở ngay trong Semeko.
More actions|Thao tác khác
Submit current file|Nộp tệp đang mở
Submit the currently open file, not the selected preview problem.|Nộp lời giải của tệp đang mở, không phải đề đang xem trước.
Write code, run tests and practice in one place.|Viết code, chạy kiểm thử và luyện bài ngay tại đây.
Keyboard shortcuts|Phím tắt
Find tab|Tìm tab
Find tab (Ctrl+P)|Tìm tab (Ctrl+P)
Pin tab|Ghim tab
Unpin tab|Bỏ ghim tab
Reopen closed tab|Mở lại tab vừa đóng
Loading statement…|Đang tải đề bài…
`.trim().split('\n').map(line => { const index=line.indexOf('|'); return [line.slice(0,index),line.slice(index+1)]; }));
if (typeof module === 'object' && module.exports) module.exports = catalog;
else root.UIVietnamese = catalog;
})(typeof window === 'undefined' ? globalThis : window);
