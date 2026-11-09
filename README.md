# Semeko

The upgraded Semeko C++ edition: an Electron + Monaco IDE for C/C++, Python,
Java and C#, based on [Sameko Dev C++](https://github.com/QuangquyNguyenvo/Sameko-Dev-CPP).

Download the Windows installer from [Semeko Downloads](https://github.com/graperu/semeko-pro-downloads/releases/latest).
Run setup once to install for your Windows account and create Desktop and Start Menu shortcuts.
The full x64 installer includes GCC, Python, a JDK and .NET SDK for local build/run.
Optional Python packages and language servers/debug adapters are configured separately.

This private repository contains the source; the public downloads repository contains release files and installation instructions.

## Features

Development changes after 1.4.0 (not released yet): Vietnamese/English interface selection,
accent-insensitive Settings search, detected Python interpreter choices, compiler-supported
Java/C# version dropdowns, and a separate C language standard selector. The public installer
remains 1.4.0 until the next release is explicitly approved.

The 1.4.1 candidate also adds verified platform login, a dedicated official-submit
action and server-result tracking. This integration has passed simulated provider/UI
checks; real authentication/submission still needs user verification. Local sample
AC is separate from official Accepted. See [internal validation](docs/development/RELEASE-1.4.1-VALIDATION.md).

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
