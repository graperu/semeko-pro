# Windows installer release

Run `npm run build:release` on Windows x64 with a distributable Temurin JDK and .NET SDK on PATH. Python 3.13.9 embedded is downloaded from python.org. Runtime license notices are included.

Output and staging use `%LOCALAPPDATA%\SemekoBuild`. The one-click NSIS installer installs per user, creates Desktop and Start Menu shortcuts, and opens the app when finished. User workspaces, settings, installed Python packages and .sameko-tools are excluded.

The bundled tools support basic C/C++, Python, Java and C# build/run. Third-party Python packages, LSP servers and non-C/C++ debug adapters are optional separate tools. Existing csproj target frameworks may need additional targeting packs.

Run `npm run test:release -- "<path to Semeko Pro.exe>"` to check the packaged executable with global language runtimes removed from PATH. Run `check-toolchain-deps.js` against its GCC directory. After testing C#, shut down the staged .NET build server before rebuilding, because Roslyn keeps its executable open.

Publish the setup executable, blockmap, latest.yml and SHA256SUMS.txt to `graperu/semeko-pro-downloads` only after packaged and installer smoke checks pass. Keep the source repository private. The app update feed uses the public downloads repository.

The installer is unsigned unless a certificate is configured. Windows may display a reputation prompt. Local smoke tests do not replace testing on a clean physical Windows PC.

## Verified 1.4.0 build, 2026-11-06

- Setup size: 729,158,961 bytes (about 695 MiB).
- SHA-256: `da7b55ae2ff5f7f73d7363a10177e2066d6ca87be7ebc9214e71c02e9e5f4597`.
- Actual silent install created both Desktop and Start Menu shortcuts pointing at the installed executable.
- Installed C/C++, Python, Java and C# Hello World runs passed with system language runtimes removed from PATH and the working directory outside the source tree.
- Application license included; 97 GCC binary import dependencies resolved.
- Test uninstall returned 0; original source-development shortcuts were restored and the temporary installation was removed.
- Source repository remains private; binaries are published in the separate public downloads repository.
