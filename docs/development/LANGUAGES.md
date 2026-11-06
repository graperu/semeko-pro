# Python, Java and C#

Sameko selects tooling from each tab's extension: `.py` → Python, `.java` → Java,
`.cs` → C#. C/C++ retains its existing GCC, clangd and GDB integration.

## Start coding

For a folder without browsing your disk, click **C++ ▾** at the top left and
choose a language. Sameko opens a persistent workspace, shows its file tree and
creates a Hello World main file on first use. Add files from Explorer and use
**Run folder** to run the configured main program. Switching languages preserves
existing programs and unsaved tabs. These workspaces live in the application's
user-data directory under `Workspaces`; hover the language button to see the path.
Use **Open Folder** for an existing project elsewhere on disk.

1. Install Python 3, a JDK (not just a JRE), and the .NET SDK for the languages you use.
2. Open **Settings → Languages**. Leave paths empty to discover tools on `PATH`
   (`JAVA_HOME` is also checked), or enter the executable paths. Save before checking runtimes.
3. Right-click the tab bar's **+** to create a Python, Java or C# file. Templates are
   editable under **Settings → Template**. The language default also controls Ctrl+N,
   new Competitive Companion problems and new contest solutions.
   Choosing a different language from the status badge opens
   a built-in Hello World starter. An untouched unsaved starter is replaced in place;
   saved files and edited drafts are kept, with the new starter opened in another tab.
4. **F9** checks/builds, **F11** builds and runs, **F10** runs the last successful build.
   Input, expected-output comparison and batch AC/WA/TLE testing work for all three.
   Use the terminal's **EOF** button after sending input if the program reads until EOF.
5. Save the source before using language server features or debugging. **F5** starts
   debugging; the existing breakpoints, conditional breakpoints, watches, call stack,
   expandable variables, pause, step and Auto dry run controls use the selected adapter.

## Work with a folder (Python, Java, C#)

1. Open **Explorer → Open Folder**. Choose the folder containing one application.
2. Open the saved entry file (`main.py`, `Main.java` or `Program.cs`), then choose
   **Run → Use Current File as Main**. Its language becomes the folder's default
   for new files. The main file and language are remembered per folder on this computer.
3. Choose **Run → Run Folder**, including while editing a helper file. Sameko saves open
   modified files in the folder, builds the main program and runs with the folder
   as the working directory. The ordinary build/run shortcuts still target the active tab.

Python can import local modules. Java compiles `.java` sources recursively, including
packages. C# uses the nearest `.csproj` inside the folder; without one it builds the
folder's `.cs` files together using a temporary project. Generated directories such
as `bin`, `obj`, `build` and `target` are excluded from automatic source collection.
Use a folder containing one application; multiple independent `Main` programs must
be opened as separate folders. Maven/Gradle dependency management is not included.
Existing C# projects keep their own project references and build configuration.

## IntelliSense and debugger tools

From a source checkout, install the optional tool pack:

```sh
npm ci
npm run setup:languages
npm start
```

The setup script needs Python 3, JDK 21+ and .NET SDK 10, plus internet access.
It creates `.sameko-tools/` inside the checkout, a Python virtual environment and
local .NET tools. It does not install global pip packages or alter user settings.
Runtimes are separate prerequisites and are not downloaded or bundled by this script.
The tool pack includes python-lsp-server/autopep8, debugpy, csharp-ls, netcoredbg,
Eclipse JDT LS and Microsoft's Java Debug plugin. It preserves the upstream packages
and their licenses. Re-run setup after moving the checkout, since virtual environments
and `tools.json` contain machine-specific paths.

For an installed application or existing tools, use the advanced fields under
**Settings → Languages**. Each tool accepts JSON with an executable `command` and
an `args` array; arguments are passed directly without a shell. For example:

```json
{ "command": "C:\\Python314\\python.exe", "args": ["-m", "pylsp"] }
```

Python debugging defaults to `python -m debugpy.adapter`, and C# to
`netcoredbg --interpreter=vscode`. Python language features default to
`python -m pylsp`, C# to `csharp-ls`, and Java to `jdtls`. Configure absolute paths
when these executables are not on PATH. Java debugging automatically asks JDT LS
for a debug session; JDT LS must load the Java Debug plugin in its
`initializationOptions.bundles`. The setup script generates that configuration.
An explicit Java DAP adapter can also be configured.

Custom server configurations can include `initializationOptions` and
`configuration`. Adapter configurations can include `launch` overrides.
`${workspaceData}` in server arguments expands to a private workspace cache.
The application also discovers a `tools.json` file under its user-data directory's
`language-tools/`. Tool installation in a packaged release is manual; this change
does not redistribute Python, JDK, .NET or the optional tool pack in installers.

## Build behavior

- Python checks syntax with `ast.parse`, then runs the saved source with unbuffered
  output. Imports use the source's working directory and the selected interpreter.
- Java uses `javac -g` and an isolated class output directory, then `java -cp`.
  Package names are supported; the active file must define the intended main class.
  Its filename must match its public class. Maven/Gradle builds and dependency
  resolution are not run automatically.
- C# builds the nearest unambiguous `.csproj`. A standalone `.cs` file gets an
  isolated console project targeting the installed SDK's major version. Standalone
  IntelliSense uses a temporary project too; it never adds project files beside
  the user's source. Multi-target/multiple-startup projects may require a simpler
  console entry project. C# execution requires SDK 6+; the optional current csharp-ls
  tool pack requires SDK 10.
- Untitled files can build/run, but need saving for IntelliSense and debugging.
  Run after restarting the application requires a new build. Failed builds invalidate
  the runnable result. Native runtime memory measurements include the JVM/Python/.NET
  process; short managed runs may finish before the memory sampler observes them.
- Run to Cursor uses a temporary breakpoint and continues normal execution.
  DAP console input is supplied through
  the Input box or attached file when launching; live interactive debug input is
  not currently exposed. Formatting depends on the configured server's formatter.

## Verification

```sh
npm run test:languages        # real runtime builds, stdin, AC/WA/TLE, Python debug
npm run test:languages:tools  # real LSP completions and Java/C# debug adapters
npm run test:languages:gui    # real Electron/Monaco new-file, build/run and Settings
npm run test:gui
node tests/gui/test-editor-state.js
npm run test:debugger
```

Integration tests use isolated profiles and temporary source files. Runtime/tool
tests require the prerequisites above; they fail when a required tool is missing.
Windows was verified during implementation. Linux/macOS code paths require separate
platform testing. Existing GDB end-to-end tests skip when GCC/GDB are not installed.

Protocol and tool references: [LSP](https://microsoft.github.io/language-server-protocol/),
[DAP](https://microsoft.github.io/debug-adapter-protocol/),
[debugpy](https://github.com/microsoft/debugpy),
[netcoredbg](https://github.com/Samsung/netcoredbg),
[JDT LS](https://github.com/eclipse-jdtls/eclipse.jdt.ls),
[Java Debug](https://github.com/microsoft/java-debug).

### Compiler / Runtime settings

Unreleased settings improvements:

- Python versions are discovered from the selected interpreter and installed PATH candidates; choosing one saves its executable path. Optimization and warning choices have descriptive labels.
- Java target releases come from the selected javac `--help` output. C# language versions come from the selected SDK's Roslyn compiler, rather than a hardcoded list.
- Saved custom values remain visible when the selected compiler does not report them. The actual compiler reports incompatibilities; the UI does not silently replace a saved preference.
- Each runtime path has a file picker and version detection refresh. Repeated opens reuse detection results; the explicit check button refreshes the scan.
- C has a separate C89/C99/C11/C17/C23 selector. The C build excludes C++-only standard/library/RTTI flags. Tests verify the C11 `__STDC_VERSION__` value.
- C# versions older than 10 disable SDK-generated implicit global usings; versions older than 8 default nullable analysis off. C# 1 also disables incompatible generated assembly attributes. Tests cover actual C# 1 and 7.3 builds.
- Interface language is stored in `appearance.language` (`en` or `vi`). UI translation excludes code, filenames, problem statements, terminal output and test data. Settings search accepts Vietnamese without accents.

The improvements above are source changes only. Do not publish the 1.4.1 installer until the user requests the completed release.

Settings follows the active file language. The selector can inspect another language without changing the file. Save applies options to the next build; existing project files are never rewritten.

- Python: optimization (0 / -O / -OO), warnings, development checks, bytecode writes, and interpreter arguments. Optimization can remove assertions; -OO also removes docstrings.
- Java: target release (must be supported by the installed JDK), debug information, lint warnings, warnings as errors, additional classpath, javac arguments and JVM arguments.
- C#: Debug/Release configuration, language version, nullable analysis, optimization, warnings as errors and dotnet build arguments. Empty property fields preserve project defaults. Explicit values override the project for this build.

Argument fields use JSON string arrays, for example `["-Xmx512m"]`. Each element is one argument, including paths containing spaces; no shell parsing is performed. Compiler/runtime arguments are separate from stdin test data. Invalid options or unavailable target versions are reported by the toolchain.

References: [Python command line](https://docs.python.org/3/using/cmdline.html), [javac options](https://docs.oracle.com/en/java/javase/25/docs/specs/man/javac.html), [.NET build](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-build).
