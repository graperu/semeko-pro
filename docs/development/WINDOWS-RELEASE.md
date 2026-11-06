# Windows installer release

Run `npm run build:release` on Windows x64 with a distributable Temurin JDK and .NET SDK on PATH. Python 3.13.9 embedded is downloaded from python.org. Runtime license notices are included.

Output and staging use `%LOCALAPPDATA%\SemekoBuild`. The one-click NSIS installer installs per user, creates Desktop and Start Menu shortcuts, and opens the app when finished. User workspaces, settings, installed Python packages and .sameko-tools are excluded.

The bundled tools support basic C/C++, Python, Java and C# build/run. Third-party Python packages, LSP servers and non-C/C++ debug adapters are optional separate tools. Existing csproj target frameworks may need additional targeting packs.

Run `npm run test:release -- "<path to Semeko Pro.exe>"` to check the packaged executable with global language runtimes removed from PATH. Run `check-toolchain-deps.js` against its GCC directory. After testing C#, shut down the staged .NET build server before rebuilding, because Roslyn keeps its executable open.

Publish the setup executable, blockmap, latest.yml and SHA256SUMS.txt to `graperu/semeko-pro-downloads` only after packaged and installer smoke checks pass. Keep the source repository private. The app update feed uses the public downloads repository.

The installer is unsigned unless a certificate is configured. Windows may display a reputation prompt. Local smoke tests do not replace testing on a clean physical Windows PC.
