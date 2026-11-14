# Semeko 1.4.3 — validation, 2026-11-14

This release distributes the translation queue fixes and content discovery changes to existing users. The signed content feed separately publishes 1,069 HackerRank EN/VI statement pairs from six indexed categories. It does not imply coverage of every HackerRank category or access to Premium LeetCode content.

## Application and content

- `npm run test:content:updates`: passed real Electron new-pack/update notices, selection, dismiss/reopen, download completion, small-window bounds, signed bundles, corruption rollback and preservation of notes.
- `tests/unit/test-update-discovery.js` and `test-release-safety.js`: passed update discovery, manual Windows download behavior, no false download-started event, backup/restore and trusted IPC.
- `tests/gui/test-bulk-translation.js`: passed independent lanes, deduplication, persistence, source HTTP 403 returned/thrown without stopping unrelated items, and real translation-provider authentication errors pausing with an explicit error.
- `tests/gui/test-bulk-hackerrank.js`: passed six-category indexing, scoped/all-provider continuation and saved source/code/image/sample preservation with a mock translation provider.
- Statement translation, saved-pair and translation-audit unit checks: passed.
- Live HackerRank audit: 1,069 checked, no unfinished entries, no changed protected code/sample/image/rendered-math nodes, no unchanged prose recognized by the local English detector. This is structural and heuristic checking, not a guarantee of perfect machine translation.
- Published content manifest signature and all 37 bundles / 1,069 members verified locally. Fetched a live published bundle and confirmed its hash, member hashes and reviewed Vietnamese statement.

## Packaged Windows build

- `npm run build:free`: completed with source credential/session scan and offline runtime checks before/after packing.
- `tests/gui/test-packaged-release.js`: real C, C++, Python, Java and C# Hello World builds/runs passed with isolated PATH. The app uses bundled Python/JDK/.NET paths and recognizes all four complete book records.
- `tests/gui/test-release-performance.js`: packaged ready in 2,133 ms; practice dialog opened in 26.3 ms; first local catalog 414.9 ms; cached catalog 91.8 ms on this machine.
- Installer: `semeko-pro-setup-1.4.3-x64.exe`, 845,842,313 bytes.
- SHA-256: `75b6b9d3b68c966907f727c61d46e40cfda36c531e8ea48d7c364d011bd3a0d6`.
- Generated updater metadata SHA-512 and file size match the installer.

## Download page

- `tests/gui/test-download-counts.cjs`: passed 320/375/768/1440 widths, pagination, duplicate releases, excluded drafts/prereleases/checksums/ZIPs, real zero versus unavailable counts, API failure fallback and rejection of foreign pagination URLs.
- `tests/gui/test-download-neo.cjs`: passed four viewports, no overflow, interaction cleanup and reduced motion. Desktop screenshot inspected with the real GitHub download counts.

## Limits

No clean Windows VM installation was performed. Windows installers are free and unsigned; the app opens the official download page rather than silently installing an unsigned executable. Source verification still blocks 19 Codeforces statements on the publishing machine. Saved code, notes, account credentials and translation keys are not published in the installer or content pack.
