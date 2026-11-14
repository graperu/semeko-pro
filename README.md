# Semeko

The upgraded Semeko C++ edition: an Electron + Monaco IDE for C/C++, Python,
Java and C#, based on [Sameko Dev C++](https://github.com/QuangquyNguyenvo/Sameko-Dev-CPP).

Download the Windows installer from [Semeko Downloads](https://github.com/graperu/semeko-pro-downloads/releases/latest).
Run setup once to install for your Windows account and create Desktop and Start Menu shortcuts.
The full x64 installer includes GCC, Python, a JDK and .NET SDK for local build/run.
Optional Python packages and language servers/debug adapters are configured separately.

This private repository contains the source; the public downloads repository contains release files and installation instructions.

## Features

Semeko 1.4.3 includes Vietnamese/English interface selection, accent-insensitive
Settings search, detected Python interpreter choices, Java/C# version dropdowns,
and a separate C language standard selector. Language runtimes are included in
the Windows installer.

The separately downloadable HackerRank content pack contains 1,069 saved bilingual
statements from the six indexed categories. Open **Settings → About → Manage and
update content**, select HackerRank, then download and reopen the app. Reading
saved translations does not require an AI key. App updates are announced in the
app; Windows users follow the official release link and run the installer.

The app also includes verified platform login, a dedicated official-submit
action and server-result tracking. This integration has passed simulated provider/UI
checks; real authentication/submission still needs user verification. Local sample
AC is separate from official Accepted. See [internal validation](docs/development/RELEASE-1.4.1-VALIDATION.md).

The development version includes a resizable statement/sample/submission dock beside
the editor. Use the buttons above the editor to open it; switch English/Vietnamese
inside the statement panel. Right-click a tab to pin it, press Ctrl+P to find an open
tab, or Ctrl+Shift+T to recover a closed tab (up to 20 in the current session).
The practice archive supports platform/topic/status filters, saved notes and time
spent in the focused app. Compiler diagnostics retain their original text and add
a Vietnamese hint; click a diagnostic or press Enter to reach its source line.
Run `npm run test:coding:workspace` for the focused local checks. Platform responses
in these tests are simulated; they do not establish a real online Accepted result.

**View → Công cụ & dữ liệu** opens recovery, language tools, timed practice and
backup/transfer. Recovery checkpoints include source, tests/results, input and
unsaved practice notes; continuous typing is checkpointed within five seconds.
The tool center detects GCC, Python, a JDK and the .NET SDK, offers missing-tool
installation through Windows WinGet, and compiles/runs a small verification program.
Live checks add Vietnamese hints and conservative quick fixes (Ctrl+.) for supported
diagnostics. Timed practice uses selected archived problems and saves its timer and
local-sample summary. `.semeko-backup` packages support preview before importing
copies, including source files in archived folders; application login tokens and
translation credentials are excluded. Run `npm run test:productivity` for checks.

- Switch language workspaces from the top-left language selector; each starts
  with Hello World and keeps its files when switching away.
- Open existing folders, edit multiple files, select a main file and run a folder.
- Browse Codeforces, LeetCode and HackerRank problems from **Practice**.
  HackerRank samples and full starters can run locally; C++/Python LeetCode scalar/array
  functions can run public samples locally. Submit on the original platform for hidden tests.
  Codeforces samples load when accessible, with Competitive Companion as a fallback.
- Build/run C/C++, Python, Java and C#; debug with GDB or configurable debug adapters.
- Manage Contest and Collections, test cases and progress.
- Material Icon Theme file/folder icons, custom themes, split editor and local history.

## Run from source

Install Node.js/npm and Git, then run:

```sh
git clone https://github.com/graperu/semeko-pro.git
cd semeko-pro
npm ci
npm start
```

For C/C++, install a compiler on PATH or place the Windows bundled toolchain in
`Sameko-GCC/`; see [MinGW setup](docs/development/setup-bundled-mingw.md).
For Python, Java and C#, install their runtimes/SDKs and optionally run
`npm run setup:languages` for language servers/debug adapters. These tools are
not included in Git. See [language setup](docs/development/LANGUAGES.md).

## Project layout

| Path | Contents |
| --- | --- |
| `app/` | Electron main process, IPC and compiler/language services |
| `src/` | Renderer UI, features, styles and bundled assets |
| `scripts/build/` | Monaco, icons and installer build tools |
| `scripts/setup/` | Optional language-tool setup |
| `scripts/maintenance/` | Cleanup and toolchain checks |
| `tests/` | Unit, integration and Electron GUI checks |
| `docs/development/` | Project map and developer guides |
| `docs/` | Inherited upstream website/wiki assets |
| `plans/` | Local evidence/backups; ignored by Git |

## Checks and builds

```sh
npm run test:unit
npm run test:debugger
npm run test:languages
npm run setup:runtimes
npm run test:code
npm run test:code:advanced
npm run test:gui
npm run test:problems
npm run test:problems:gui
npm run build:win
```

Language checks require the corresponding SDKs/tools. Problem-browser checks use
live public platform data. See [all developer commands](docs/development/README.md).
Windows release artifacts use the `semeko-pro` prefix. The internal package name
`sameko-dev-cpp` and application ID remain stable to preserve existing user data.

## Credits and license

Original project: **QuangquyNguyenvo and upstream contributors**.
Semeko Pro adaptations are maintained in [graperu/semeko-pro](https://github.com/graperu/semeko-pro).
The original copyright and [MIT license](LICENSE) are preserved, alongside
[upstream acknowledgments and artwork credits](docs/development/UPSTREAM-CREDITS.md).
Third-party notices, including Material Icon Theme, are in `src/assets/licenses/`.
# Học từ sách / Book study

Bốn sách C/C++ có trình đọc trang gốc, bản Anh/Việt lưu trên máy, rà bài theo chương, test biên được kiểm chứng, tiến độ học, ba cấp gợi ý, tìm kiếm, đánh dấu và ghi chú. Nội dung đang tiếp tục được dịch và chuẩn hóa; bộ đếm trong app cho biết phần đã lưu thực tế.

Four C/C++ books support original-page reading, cached English/Vietnamese text, chapter audits, verified edge tests, learning progress, three hint levels, search, bookmarks and notes. Background content processing is ongoing; in-app counters show saved coverage.

Validation: `npm run test:books:study` and `npm run test:practice:import`. Details: [book study report](docs/development/BOOK-STUDY-2026-11-12.md).
