# Semeko Pro developer documentation

Semeko Pro is the upgraded Semeko C++ edition. The internal package name
`sameko-dev-cpp` and application ID remain stable to preserve existing settings,
history and workspaces. Display names and release artifacts use Semeko Pro.

- [Codebase map](CODEBASE.md)
- [Python, Java and C# setup and workspaces](LANGUAGES.md)
- [Codeforces, LeetCode and HackerRank problem browser](PROBLEMS.md)
- [Bundled MinGW setup](setup-bundled-mingw.md)
- [Contribution guidelines](../../CONTRIBUTING.md)

Run commands from the repository root. Build tools live in `scripts/build/`,
language installers in `scripts/setup/` and maintenance tools in
`scripts/maintenance/`. Tests are separated into `tests/unit/`,
`tests/integration/` and `tests/gui/`.

Common checks:

```sh
npm run test:unit
npm run test:debugger
npm run test:languages
npm run test:gui
npm run test:editor
npm run test:folders
npm run test:collections
npm run test:languages:gui
npm run test:problems
npm run test:problems:gui
```

Local evidence is ignored by Git: `plans/artifacts/gui/`,
`plans/artifacts/languages/`, `plans/diagnostics/` and `plans/backups/`.
The website files under `docs/` keep their existing public paths.
