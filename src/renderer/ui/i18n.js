'use strict';

// UI-only translations. Never walk editor models, problem statements, terminal
// output, file names, user notes or form values. Preserve source text for English.
window.UILanguage = (() => {
    const vi = {
        'Settings':'Cài đặt','Editor':'Soạn thảo','Editor Settings':'Cài đặt soạn thảo','Compiler':'Biên dịch','Compiler / Runtime':'Biên dịch / Chạy',
        'Languages':'Ngôn ngữ','Execution & Tests':'Chạy & Kiểm thử','Execution':'Chạy chương trình','Appearance':'Giao diện','Template':'Mã mẫu','Code Template':'Mã mẫu',
        'Keybindings':'Phím tắt','Snippets':'Đoạn mã','About':'Giới thiệu','Save & Close':'Lưu và đóng','Reset to Defaults':'Khôi phục mặc định',
        'Interface language':'Ngôn ngữ giao diện','Search settings':'Tìm cài đặt','File':'Tệp','Edit':'Chỉnh sửa','View':'Hiển thị','Run':'Chạy','Practice':'Luyện tập',
        'Archive & close folder':'Lưu vào kho và đóng thư mục','Open folder':'Mở thư mục','Folder':'Thư mục','files':'tệp','No folder open':'Chưa mở thư mục','Stop the running program before closing a folder.':'Hãy dừng chương trình trước khi đóng thư mục.','Files changed while saving. Save the folder again.':'Tệp đã thay đổi trong lúc lưu. Hãy lưu thư mục lại.','Folder saved to archive and closed':'Đã lưu thư mục vào kho và đóng',
        'New File':'Tệp mới','Open File':'Mở tệp','Open Folder':'Mở thư mục','Open Folder...':'Mở thư mục...','Open File...':'Mở tệp...',
        'Save':'Lưu','Save As':'Lưu thành','Save All':'Lưu tất cả','Close':'Đóng','Close All':'Đóng tất cả','Close Others':'Đóng các tệp khác','Exit':'Thoát',
        'Undo':'Hoàn tác','Redo':'Làm lại','Cut':'Cắt','Copy':'Sao chép','Paste':'Dán','Select All':'Chọn tất cả','Find':'Tìm kiếm','Replace':'Thay thế',
        'Compile':'Biên dịch','Compile only':'Chỉ biên dịch','Run without building':'Chạy bản đã biên dịch','Run Folder':'Chạy thư mục','Use Current File as Main':'Dùng tệp hiện tại làm tệp chính',
        'Stop':'Dừng','Start debugging':'Bắt đầu gỡ lỗi','Start Debugging':'Bắt đầu gỡ lỗi','Debug panel':'Bảng gỡ lỗi','Step Over':'Bước qua','Step Into':'Bước vào','Step Out':'Bước ra','Continue':'Tiếp tục',
        'PROBLEMS':'VẤN ĐỀ','TERMINAL':'DÒNG LỆNH','TESTS':'KIỂM THỬ','INPUT':'ĐẦU VÀO','OUTPUT':'KẾT QUẢ','EXPECTED':'KẾT QUẢ MONG ĐỢI',
        'Problems':'Vấn đề','Terminal':'Dòng lệnh','Tests':'Kiểm thử','Input':'Đầu vào','Output':'Kết quả','Expected':'Kết quả mong đợi',
        'Enter test data...':'Nhập dữ liệu kiểm thử...','No output yet':'Chưa có kết quả','Expected output...':'Nhập kết quả mong đợi...',
        'Ready':'Sẵn sàng','Live off':'Kiểm tra trực tiếp: tắt','Live on':'Kiểm tra trực tiếp: bật','Compiling...':'Đang biên dịch...',
        'Font Size':'Cỡ chữ','Font Family':'Phông chữ','Tab Size':'Độ rộng Tab','Scroll Beyond Last Line':'Cuộn quá dòng cuối','Minimap':'Bản đồ mã thu nhỏ','Word Wrap':'Tự xuống dòng',
        'Vim Mode':'Chế độ Vim','Auto Save':'Tự động lưu','Auto Save Delay':'Thời gian chờ tự lưu','Format on Save':'Định dạng khi lưu','Format Style':'Kiểu định dạng',
        'IntelliSense':'Gợi ý mã IntelliSense','Live Syntax Check':'Kiểm tra cú pháp trực tiếp','Keywords':'Từ khóa','Startup Behavior':'Khi khởi động',
        'C++ Compiler Settings':'Cài đặt biên dịch C++','C Compiler Settings':'Cài đặt biên dịch C','C / C++ Compiler Settings':'Cài đặt biên dịch C/C++',
        'C++ Language Settings':'Cài đặt ngôn ngữ C++','C Language Settings':'Cài đặt ngôn ngữ C','Python Language Settings':'Cài đặt Python','Java Language Settings':'Cài đặt Java','C# Language Settings':'Cài đặt C#',
        'C++ Standard':'Tiêu chuẩn C++','Optimization':'Tối ưu hóa','Warnings':'Cảnh báo','Use LLD Linker':'Dùng trình liên kết LLD','Single-file Compile Mode':'Biên dịch một tệp',
        'Extra Compiler Flags':'Tham số biên dịch bổ sung','Clear Cache':'Xóa bộ nhớ đệm','Clear Compiler Cache':'Xóa bộ nhớ đệm biên dịch',
        'New files and problems':'Ngôn ngữ cho tệp và bài mới','Python interpreter':'Trình thông dịch Python','Java runtime':'Môi trường chạy Java','Java compiler':'Trình biên dịch Java','.NET SDK':'Bộ công cụ .NET SDK',
        'Auto (PATH)':'Tự nhận diện (PATH)','Warnings as errors':'Coi cảnh báo là lỗi','Treat warnings as errors':'Coi cảnh báo là lỗi','Debug information':'Thông tin gỡ lỗi',
        'Enable all compiler warnings':'Bật mọi cảnh báo biên dịch','Additional classpath':'Đường dẫn thư viện bổ sung','Target Java release (empty = installed JDK)':'Phiên bản Java đích (trống = JDK đi kèm)',
        'Do not write .pyc files':'Không tạo tệp .pyc','Development checks':'Kiểm tra dành cho phát triển','Build configuration':'Cấu hình biên dịch',
        'Language version (empty = project default)':'Phiên bản ngôn ngữ (trống = theo dự án)','Nullable analysis':'Phân tích giá trị null','Project default':'Theo dự án',
        'Interpreter arguments (JSON array)':'Tham số thông dịch (mảng JSON)','Compiler arguments (JSON array)':'Tham số biên dịch (mảng JSON)','JVM arguments (JSON array)':'Tham số JVM (mảng JSON)',
        'Build arguments (JSON array)':'Tham số build (mảng JSON)','Program arguments (JSON array)':'Tham số chương trình (mảng JSON)',
        'Reset selected language build options':'Khôi phục tùy chọn ngôn ngữ đang chọn','Check installed runtimes':'Kiểm tra công cụ đã cài','Advanced: language servers and debug adapters':'Nâng cao: gợi ý mã và bộ gỡ lỗi',
        'Execution & Tests':'Chạy & Kiểm thử','Time Limit':'Giới hạn thời gian','Clear Terminal on Run':'Xóa dòng lệnh trước khi chạy','External Terminal':'Cửa sổ dòng lệnh ngoài','Realtime Output':'Hiện kết quả trực tiếp',
        'Auto-send Input':'Tự gửi dữ liệu đầu vào','Terminal Colors':'Màu dòng lệnh','Panel Font Size':'Cỡ chữ các bảng','Test status colors':'Màu trạng thái kiểm thử','LeetCode local runner':'Chạy LeetCode trên máy',
        'Theme':'Chủ đề','Performance Mode':'Chế độ hiệu năng','Cursor Trail':'Vệt con trỏ','Animated Background':'Nền chuyển động','UI Scale':'Tỉ lệ giao diện','Customize':'Tùy chỉnh',
        'Import':'Nhập','Export':'Xuất','Reset':'Khôi phục','Apply':'Áp dụng','Cancel':'Hủy','Confirm':'Xác nhận','Delete':'Xóa','Remove':'Gỡ khỏi danh sách','Add':'Thêm',
        'Choose a problem':'Chọn bài tập','Platform':'Nền tảng','Search':'Tìm kiếm','Difficulty':'Độ khó','All levels':'Tất cả mức độ','Category':'Danh mục',
        'Problem name, ID or topic':'Tên bài, mã bài hoặc chủ đề','Previous':'Trước','Next':'Tiếp','Solution language':'Ngôn ngữ lời giải',
        'Open official page':'Mở trang gốc','Start solving':'Bắt đầu làm bài','Create file (no samples)':'Tạo tệp (chưa có test mẫu)','Select a problem from the list':'Chọn một bài trong danh sách',
        'Loading problems…':'Đang tải danh sách bài…','Loading statement and starter code…':'Đang tải đề và mã mẫu…',
        'Official samples · read only':'Test mẫu chính thức · chỉ đọc','Run All':'Chạy tất cả','Run All Tests':'Chạy tất cả test','Add New Test Case':'Thêm test mới',
        'All tests passed':'Tất cả test thành công','Failed':'Thất bại','Passed':'Thành công','Not run':'Chưa chạy','Running':'Đang chạy','Waiting':'Đang chờ','Compiling solution…':'Đang biên dịch lời giải…',
        'Wrong answer':'Sai kết quả','Runtime error':'Lỗi khi chạy','Time limit exceeded':'Quá thời gian','Compilation error':'Lỗi biên dịch','Not finished — run all tests':'Chưa hoàn tất — hãy chạy tất cả test',
        'NOT STARTED':'CHƯA BẮT ĐẦU','Not Started':'Chưa bắt đầu','ACCEPTED':'THÀNH CÔNG','Accepted':'Thành công','RUNTIME ERROR':'LỖI KHI CHẠY','Runtime Error':'Lỗi khi chạy',
        'WRONG ANSWER':'SAI KẾT QUẢ','Wrong Answer':'Sai kết quả','TIME LIMIT':'QUÁ THỜI GIAN','Time Limit':'Giới hạn thời gian','TESTING':'ĐANG KIỂM THỬ','Testing':'Đang kiểm thử',
        'RECENT':'GẦN ĐÂY','FILES':'TỆP','CONTEST':'KỲ THI','COLLECTIONS':'BỘ SƯU TẬP','Filter files...':'Lọc tệp...',
        'Check for Updates':'Kiểm tra cập nhật','Check for updates':'Kiểm tra cập nhật','Download Update':'Tải bản cập nhật','Restart to Update':'Khởi động lại để cập nhật',
        'Restore previous session':'Khôi phục phiên trước','Restore':'Khôi phục','Dismiss':'Bỏ qua','Reset Settings':'Khôi phục cài đặt','Reset Template':'Khôi phục mã mẫu',
        'Public samples load automatically. Run All Tests reports each sample result.':'Test mẫu được tải tự động. Chạy tất cả test để xem kết quả từng test.',
        'Choose starter code for C++, C, Python, Java and C#. New files use this template; existing workspace files are preserved.':'Chọn mã mẫu cho C++, C, Python, Java và C#. Tệp mới dùng mẫu này; mã đã có trong workspace được giữ nguyên.',
        'Leave runtime paths empty to use PATH. Java also checks JAVA_HOME. C# requires the .NET SDK.':'Để trống đường dẫn để tự nhận công cụ. Java cũng kiểm tra JAVA_HOME. C# cần .NET SDK.',
        'Blue: running':'Xanh dương: đang chạy','Yellow: missing / waiting':'Vàng: thiếu / đang chờ','Red: failed':'Đỏ: thất bại','Green: passed':'Xanh lá: thành công',
        'Startup & Restore':'Khởi động & Khôi phục','Choose what the IDE should reopen when it starts.':'Chọn nội dung app sẽ mở lại khi khởi động.',
        'On Startup':'Khi khởi động','Keyword Suggestions':'Gợi ý từ khóa','Editor Colors':'Màu vùng soạn thảo','Live Code Checking':'Kiểm tra code trực tiếp',
        'Intellisense (Code Suggestions)':'IntelliSense (gợi ý mã)','Checkpoints':'Lịch sử phiên bản','Enable Checkpoints':'Bật lịch sử phiên bản','Max Versions':'Số phiên bản tối đa','Delete After (days)':'Xóa sau (ngày)',
        'Color Theme':'Chủ đề màu','Marketplace':'Kho chủ đề','Interface Scale':'Tỉ lệ giao diện','Keyboard Shortcuts':'Phím tắt',
        'Click on a shortcut to change it. Press Escape to cancel.':'Bấm vào phím tắt để thay đổi. Nhấn Escape để hủy.',
        'Code Snippets':'Đoạn mã mẫu','Enable Snippets':'Bật đoạn mã mẫu','Add New Snippet':'Thêm đoạn mã mẫu','Import from File(s)':'Nhập từ tệp',
        'Discord Rich Presence':'Trạng thái Discord','Show what you\'re working on in Discord with Semeko.':'Hiển thị hoạt động của bạn trong Semeko lên Discord.',
        'Enable Discord RPC':'Bật trạng thái Discord','Preview':'Xem trước','How your profile shows it in Discord':'Cách hiển thị trên hồ sơ Discord',
        'Version':'Phiên bản','Get beta updates':'Nhận bản cập nhật thử nghiệm',
        'Start with a blank workspace':'Bắt đầu với workspace trống','Restore previous session':'Khôi phục phiên trước','Reopen saved files':'Mở lại các tệp đã lưu',
        'Open a new file':'Mở một tệp mới','Restore last session':'Khôi phục phiên gần nhất','None (-O0)':'Không tối ưu (-O0)','Default':'Mặc định','Auto':'Tự động',
        'New Collection':'Bộ sưu tập mới','Create Collection':'Tạo bộ sưu tập','Rename Collection':'Đổi tên bộ sưu tập','Delete Collection':'Xóa bộ sưu tập',
        'New Contest':'Kỳ thi mới','Create Contest':'Tạo kỳ thi','Add Current File':'Thêm tệp hiện tại','Add current file':'Thêm tệp hiện tại','Add Problem':'Thêm bài tập',
        'Rename':'Đổi tên','New Folder':'Thư mục mới','Refresh':'Làm mới','Collapse All':'Thu gọn tất cả','Expand All':'Mở rộng tất cả','Open in Explorer':'Mở trong File Explorer',
        'Close Folder':'Đóng thư mục','Copy Path':'Sao chép đường dẫn','Copy Relative Path':'Sao chép đường dẫn tương đối','Delete File':'Xóa tệp',
        'Split Editor':'Chia đôi vùng soạn thảo','Toggle Terminal':'Ẩn/hiện dòng lệnh','Toggle Explorer':'Ẩn/hiện danh sách tệp','Toggle Input/Output':'Ẩn/hiện đầu vào và kết quả',
        'Toggle Comment':'Bật/tắt chú thích','Format Document':'Định dạng tài liệu','Zoom In':'Phóng to','Zoom Out':'Thu nhỏ','Reset Zoom':'Tỉ lệ mặc định',
        'Name':'Tên','Description':'Mô tả','Prefix':'Từ kích hoạt','Code':'Mã nguồn','No problems detected':'Không phát hiện lỗi','No problems found':'Không tìm thấy lỗi',
        'Use Open official page to read the complete problem statement.':'Mở trang gốc để đọc đề bài đầy đủ.',
        'Codeforces blocked automatic statement loading. Open the official page and use Competitive Companion to import samples.':'Codeforces đang chặn tải đề tự động. Mở trang gốc bằng Chrome và dùng Competitive Companion để nhập test mẫu.',
        'Practice imports problems from Codeforces, LeetCode and HackerRank into a new tab. Official sample inputs and expected outputs are read only: they cannot be edited or deleted. Your own files can use editable custom tests.':'Luyện tập mở bài từ Codeforces, LeetCode và HackerRank trong tab mới. Test mẫu chính thức chỉ đọc, không thể sửa hoặc xóa. Với tệp của riêng bạn, có thể tạo và sửa test tùy chọn.',
        'Run shows compilation and individual test progress. Select a test to compare input, actual output and expected output. Status colors remain consistent across themes. Local sample results do not include the platform\'s hidden tests.':'Khi chạy, app hiển thị tiến trình biên dịch và từng test. Chọn test để so sánh đầu vào, kết quả thực tế và kết quả mong đợi. Màu trạng thái thống nhất giữa các chủ đề. Test mẫu trên máy không bao gồm test ẩn của nền tảng.',
        'Supported function signatures run locally. Tree, linked-list, design and unsupported signatures require the official platform. Choose the solution language in Practice.':'Các kiểu hàm được hỗ trợ có thể chạy trên máy. Bài dùng cây, danh sách liên kết, thiết kế lớp hoặc kiểu hàm chưa hỗ trợ cần chạy trên nền tảng gốc. Chọn ngôn ngữ lời giải trong Luyện tập.',
        'These options apply to C/C++ only. Configure Python, Java and C# in Languages. To run a project, use Run Folder and Use Current File as Main in the Run menu.':'Các tùy chọn này dành cho C/C++. Chọn Python, Java hoặc C# trong mục Biên dịch / Chạy để chỉnh ngôn ngữ tương ứng. Chạy dự án bằng Chạy thư mục và Dùng tệp hiện tại làm tệp chính trong menu Chạy.',
        'Optional IntelliSense and debugger tools: specify an executable and JSON argument array. Changes apply after saving. Python debug defaults to python -m debugpy.adapter; C# to netcoredbg --interpreter=vscode. Java debug uses the JDT LS Java Debug plugin unless an adapter is specified.':'Công cụ gợi ý mã và gỡ lỗi tùy chọn: nhập đường dẫn chương trình và mảng tham số JSON. Thay đổi có hiệu lực sau khi lưu. Python mặc định dùng debugpy; C# dùng netcoredbg; Java dùng plugin Java Debug của JDT LS.',
        'Python language server (JSON)':'Máy chủ gợi ý mã Python (JSON)','Java language server (JSON)':'Máy chủ gợi ý mã Java (JSON)','C# language server (JSON)':'Máy chủ gợi ý mã C# (JSON)',
        'Python debug adapter (JSON)':'Bộ gỡ lỗi Python (JSON)','Java debug adapter (JSON)':'Bộ gỡ lỗi Java (JSON)','C# debug adapter (JSON)':'Bộ gỡ lỗi C# (JSON)',
        'Compile error':'Lỗi biên dịch','Executing your solution…':'Đang chạy lời giải…','Empty input':'Đầu vào trống','Run this test case':'Chạy test này','Delete this test case':'Xóa test này',
        'Reset all settings to defaults? This action cannot be undone.':'Khôi phục toàn bộ cài đặt mặc định? Không thể hoàn tác thao tác này.',
        'Settings saved':'Đã lưu cài đặt','Settings reset to defaults':'Đã khôi phục cài đặt mặc định','Add Note':'Thêm ghi chú','Edit Note':'Sửa ghi chú',
        'Choose programming language':'Chọn ngôn ngữ lập trình','Choose a language workspace':'Chọn workspace theo ngôn ngữ','Close problem browser':'Đóng cửa sổ bài tập',
        'No updates available':'Chưa có bản cập nhật mới','Download':'Tải xuống',
        'Could not load sample tests':'Không tải được test mẫu','No sample tests available':'Chưa có test mẫu',
        'Reset Keybindings':'Khôi phục phím tắt','Reset the Vim profile keybindings to defaults?':'Khôi phục phím tắt Vim về mặc định?','Reset all keybindings to defaults?':'Khôi phục toàn bộ phím tắt mặc định?',
        'default':'Mặc định','error':'Báo lỗi','ignore':'Bỏ qua','always':'Luôn hiển thị',
        'Easy / CF ≤1200':'Dễ / CF ≤1200','Medium / CF 1300–2000':'Trung bình / CF 1300–2000','Hard / CF >2000':'Khó / CF >2000',
        'C Standard':'Tiêu chuẩn C','Installed Python version':'Phiên bản Python đã cài','Automatic (bundled / PATH)':'Tự động (đi kèm / PATH)',
        'Choose runtime executable':'Chọn tệp chương trình chạy','Select runtime executable':'Chọn tệp chương trình chạy',
        'No optimization (keep assertions)':'Không tối ưu (giữ kiểm tra assert)','-O (remove assertions)':'-O (bỏ kiểm tra assert)','-OO (remove assertions and docstrings)':'-OO (bỏ assert và docstring)',
        'Default warnings':'Cảnh báo mặc định','Hide warnings':'Ẩn cảnh báo','Show all warnings':'Hiện mọi cảnh báo','Enabled':'Bật','Disabled':'Tắt',
        'Enable nullable analysis':'Bật phân tích null','Disable nullable analysis':'Tắt phân tích null','Nullable warnings only':'Chỉ cảnh báo null','Nullable annotations only':'Chỉ chú thích null',
        'Detecting installed language versions…':'Đang dò các phiên bản ngôn ngữ…','Could not detect versions. Check runtime paths.':'Chưa dò được phiên bản. Kiểm tra đường dẫn công cụ.',
        'Choose an installed Python interpreter. Python versions are selected by interpreter, not by a C++ standard flag. Optimization and warning settings apply when running your program.':'Chọn trình thông dịch Python đã cài. Phiên bản Python phụ thuộc trình thông dịch, không dùng cờ tiêu chuẩn như C++. Tối ưu và cảnh báo có hiệu lực khi chạy chương trình.',
        'Choose the Java target release supported by the selected javac compiler. The detected JDK determines which releases are available.':'Chọn phiên bản Java đích được javac hỗ trợ. App dò JDK đang dùng để hiển thị các phiên bản có thể chọn.',
        'Choose a C# language version supported by the selected .NET SDK. Build configuration, optimization and nullable analysis are applied to the real build.':'Chọn phiên bản C# được .NET SDK đang dùng hỗ trợ. Cấu hình Debug/Release, tối ưu và phân tích null được áp dụng khi biên dịch.',
        'C++ settings use the bundled compiler or the configured toolchain.':'C++ sử dụng trình biên dịch đi kèm hoặc bộ công cụ bạn đã chọn.',
        'C settings use the bundled compiler or the configured toolchain.':'C sử dụng trình biên dịch đi kèm hoặc bộ công cụ bạn đã chọn.'
    };
    Object.assign(vi, {
        'Default programming language': 'Ngôn ngữ lập trình mặc định',
        'Choose an installed Python interpreter. Its version determines the Python version used to run your program. Optimization and warning settings apply when running your program.': 'Chọn trình thông dịch Python đã cài. Phiên bản của trình thông dịch là phiên bản Python dùng để chạy chương trình. Tối ưu hóa và cảnh báo được áp dụng khi chạy.',
        'Configure Python language tools with an executable and a JSON argument array. The default debugger uses python -m debugpy.adapter. Changes apply after saving.': 'Cấu hình công cụ Python bằng tệp thực thi và mảng tham số JSON. Bộ gỡ lỗi mặc định dùng python -m debugpy.adapter. Thay đổi có hiệu lực sau khi lưu.',
        'Configure Java language tools with an executable and a JSON argument array. The default debugger uses the JDT LS Java Debug plugin. Changes apply after saving.': 'Cấu hình công cụ Java bằng tệp thực thi và mảng tham số JSON. Bộ gỡ lỗi mặc định dùng plugin Java Debug của JDT LS. Thay đổi có hiệu lực sau khi lưu.',
        'Configure C# language tools with an executable and a JSON argument array. The default debugger uses netcoredbg --interpreter=vscode. Changes apply after saving.': 'Cấu hình công cụ C# bằng tệp thực thi và mảng tham số JSON. Bộ gỡ lỗi mặc định dùng netcoredbg --interpreter=vscode. Thay đổi có hiệu lực sau khi lưu.'
    });
    Object.assign(vi, window.UIVietnamese || {});
    const normalizeKey = value => value.replace(/\s+/g, ' ').trim();
    const normalized = Object.fromEntries(Object.entries(vi).map(([key,value]) => [normalizeKey(key),value]));
    const excluded = 'script,style,textarea,input,.monaco-editor,.monaco-aria-container,.xterm,.terminal-output,#terminal-output,#expected-diff,#oj-statement,#oj-problem-title,.oj-result,.tab-name,.explorer-item-name,.cat-list-item-name,.cat-item-name,.cat-name,.cp-contest-name,.snippet-name,.snippet-list-name,.file-note,.markdown-preview,.md-preview,.code-line,.tcf-json-highlight,.sdbg-name,.sdbg-val,[data-i18n-preserve],pre,code';
    const original = new WeakMap(), attributes = new WeakMap();
    let language = 'en', scheduled = false, observer;
    const patterns = [
        [/^(Connect|Reconnect|Connected|Disconnect) (Codeforces|LeetCode)$/, (_, action, provider) => vi[action] + ' ' + provider],
        [/^Account connections · CF: (.*?) · LC: (.*)$/, (_, cf, lc) => {
            const status = text => text.replace(/(^| — )(Connected|Connection interrupted|Not connected)$/, (_, separator, label) => separator + vi[label]);
            return vi['Account connections'] + ' · CF: ' + status(cf) + ' · LC: ' + status(lc);
        }],
        [/^(\d+) (?:tests|test)$/, '$1 ca kiểm thử'],
        [/^(\d+) results$/, '$1 kết quả'],
        [/^(\d+) spaces$/, '$1 dấu cách'],
        [/^([\d.]+)s \/ line$/, '$1 giây / dòng'],
        [/^Downloading: ([\d.]+)%$/, 'Đang tải: $1%'],
        [/^Testing (\d+)\/(\d+)\.\.\.$/, 'Đang kiểm thử $1/$2...'],
        [/^Running test (\d+)\.\.\.$/, 'Đang chạy ca kiểm thử $1...'],
        [/^Re-checking test (\d+) alone\.\.\.$/, 'Đang chạy lại riêng ca kiểm thử $1...'],
        [/^Single test (\d+): compiling\.\.\.$/, 'Ca kiểm thử $1: đang biên dịch...'],
        [/^Test (\d+): (.+)$/, 'Ca kiểm thử $1: $2'],
        [/^Single Test (\d+): (.+)$/, 'Ca kiểm thử $1: $2'],
        [/^Compiled in (.+)ms$/, 'Biên dịch xong trong $1 ms'],
        [/^(?:Build|Compile): (.+)ms$/, 'Biên dịch: $1 ms'],
        [/^Saved (.+)$/, 'Đã lưu $1'],
        [/^Main file: (.+)$/, 'Tệp chính: $1'],
        [/^Auto-save failed: (.+)$/, 'Tự động lưu thất bại: $1'],
        [/^Save failed: (.+)$/, 'Lưu thất bại: $1'],
        [/^Rename failed: (.+)$/, 'Đổi tên thất bại: $1'],
        [/^Could not save settings: (.+)$/, 'Không lưu được cài đặt: $1'],
        [/^Error running tests: (.+)$/, 'Lỗi chạy kiểm thử: $1'],
        [/^Exit: (.+)$/, 'Mã thoát: $1'],
        [/^Interface scale: (\d+)%$/, 'Tỉ lệ giao diện: $1%'],
        [/^(\d+) errors?$/, '$1 lỗi'],
        [/^(\d+) warnings?$/, '$1 cảnh báo'],
        [/^Time: (.+)$/, 'Thời gian: $1'],
        [/^Memory: (.+)$/, 'Bộ nhớ: $1'],
        [/^(\d+) sample tests loaded\. C\+\+\/Python: press Run to test your function\.$/, 'Đã tải $1 ca mẫu. C++/Python: bấm Chạy để kiểm thử hàm.'],
        [/^([\d,\.]+) problems? · (Codeforces|LeetCode|HackerRank) · select one to preview(.*)$/, '$1 bài tập · $2 · chọn bài để xem trước'],
        [/^([\d.]+) tokens?$/, '$1 thành phần'],
        [/^"(.+)" already exists: opened it instead\.$/, '"$1" đã tồn tại: đã mở tệp hiện có.'],
        [/^Revert to (.+)$/, 'Khôi phục về $1'],
        [/^Revert (.+)$/, (_, label) => 'Khôi phục ' + (normalized[normalizeKey(label)] || label)],
        [/^(.+) live preview$/, 'Xem trước trực tiếp $1'],
        [/^Process exited with code (.+)$/, 'Chương trình kết thúc với mã $1'],
        [/^(✓ )?Build succeeded in (.+)$/, '$1Biên dịch thành công trong $2'],
        [/^Delete "(.+)"\?$/, 'Xóa "$1"?'],
        [/^Delete folder "(.+)" and ALL its contents\? This cannot be undone\.$/, 'Xóa thư mục "$1" và TOÀN BỘ nội dung? Không thể hoàn tác thao tác này.'],
        [/^Delete entire contest folder "(.+)" and ALL its files\? This cannot be undone\.$/, 'Xóa thư mục kỳ thi "$1" và TOÀN BỘ tệp? Không thể hoàn tác thao tác này.'],
        [/^Delete approach "(.+)"\?$/, 'Xóa cách giải "$1"?'],
        [/^Will create: (.+)$/, 'Sẽ tạo: $1'],
        [/^Failed to rename file: (.+)$/, 'Đổi tên tệp thất bại: $1'],
        [/^Failed to delete folder: (.+)$/, 'Xóa thư mục thất bại: $1'],
        [/^Failed to delete file: (.+)$/, 'Xóa tệp thất bại: $1'],
        [/^Export failed: (.+)$/, 'Xuất thất bại: $1'],
        [/^Runtime error (.+)$/, 'Lỗi khi chạy $1'],
        [/^(?:Search|Find) (\d+) of (\d+)$/, 'Kết quả $1 / $2'],
        [/^by (.+)$/, (_, author) => 'Tác giả: ' + (normalized[normalizeKey(author)] || author)],
        [/^Download v(.+)$/, 'Tải phiên bản $1'],
        [/^Add to "(.+)"$/, 'Thêm vào "$1"'],
        [/^Action unavailable: (.+)$/, 'Thao tác chưa khả dụng: $1'],
        [/^Checkpoints: (.+)$/, 'Lịch sử phiên bản: $1'],
        [/^Untitled Checkpoints: (.+)$/, 'Lịch sử thẻ chưa đặt tên: $1'],
        [/^Working on (.+)$/, 'Đang làm việc với $1'],
        [/^Semeko - Ln (\d+), Col (\d+)$/, 'Semeko - Dòng $1, Cột $2'],
        [/^([\d:]+) elapsed$/, 'Đã dùng $1'],
        [/^([\d,.]+) contests · ([\d,.]+) problems$/, '$1 kỳ thi · $2 bài tập']
    ];
    function translate(value) {
        if (typeof value !== 'string') return value;
        if (language !== 'vi') return value;
        const trimmed = value.trim();
        let result = normalized[normalizeKey(trimmed)];
        if (!result) for (const [pattern, replacement] of patterns) {
            if (pattern.test(trimmed)) { result = trimmed.replace(pattern, replacement); break; }
        }
        if (!result) {
            result = trimmed.replace(/^Test (\d+)$/, 'Ca kiểm thử $1').replace(/^(\d+) tests$/, '$1 ca kiểm thử')
                .replace(/^(✓\s*)?(\d+) passed$/, '$1$2 thành công').replace(/^(✗\s*)?(\d+) failed$/, '$1$2 thất bại')
                .replace(/^Ln (\d+), Col (\d+)$/, 'Dòng $1, Cột $2')
                .replace(/^(Passed|Wrong answer|Runtime error|Time limit exceeded|Compile error)( · .*)?$/, (_, label, details) => vi[label] + (details || ''))
                .replace(/^Reset the (C\+\+|C|Python|Java|C#) template to default\?$/, 'Khôi phục mã mẫu $1 về mặc định?');
        }
        return value.replace(trimmed, result);
    }
    function update(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            if (!node.data.trim()) return;
            let stored = original.get(node);
            if (!stored || stored.output !== node.data) stored = { source: node.data };
            const output = translate(stored.source); stored.output = output; original.set(node, stored);
            if (node.data !== output) node.data = output;
        } else {
            const values = attributes.get(node) || {};
            for (const name of ['title','placeholder','aria-label','data-placeholder']) {
                const value = node.getAttribute(name); if (!value) continue;
                let stored = values[name]; if (!stored || stored.output !== value) stored = { source: value };
                stored.output = translate(stored.source); values[name] = stored;
                if (value !== stored.output) node.setAttribute(name, stored.output);
            }
            attributes.set(node, values);
        }
    }
    const observedRoots = new WeakSet();
    function applyRoot(root) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
            acceptNode: node => node.nodeType === Node.ELEMENT_NODE && node.matches(excluded) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
        });
        let node; while ((node = walker.nextNode())) {
            update(node);
            if (node.shadowRoot) {
                if (observer && !observedRoots.has(node.shadowRoot)) { observer.observe(node.shadowRoot, observerOptions); observedRoots.add(node.shadowRoot); }
                applyRoot(node.shadowRoot);
            }
        }
        // Translate only placeholder/labels of input fields, never their values.
        for (const input of root.querySelectorAll('input,textarea,[data-placeholder]')) update(input);
    }
    function apply(value = App.settings.appearance.language || 'en') {
        language = value === 'vi' ? 'vi' : 'en'; document.documentElement.lang = language;
        applyRoot(document.body);
        for (const node of document.querySelectorAll('[data-ui-text]')) {
            const text = translate(node.dataset.uiText);
            if (node.textContent !== text) node.textContent = text;
        }
        for (const menu of document.querySelectorAll('.monaco-editor .monaco-menu,.monaco-editor .find-widget')) applyRoot(menu);
    }
    const observerOptions = { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['title','placeholder','aria-label','data-placeholder'] };
    function init() {
        if (observer) return;
        for (const method of ['alert','confirm','prompt']) {
            const native = window[method]?.bind(window);
            if (native) window[method] = (message, ...args) => native(translate(String(message)), ...args);
        }
        observer = new MutationObserver(records => {
            if (scheduled || !records.some(record => {
                const target = record.target.nodeType === 1 ? record.target : record.target.parentElement;
                return !target?.closest(excluded) || target?.closest('.monaco-menu,.find-widget');
            })) return;
            scheduled = true; requestAnimationFrame(() => { scheduled = false; apply(); });
        });
        observer.observe(document.body, observerOptions);
        apply();
    }
    document.addEventListener('DOMContentLoaded', init);
    return { init, apply, translate };
})();
