# Four-book study upgrades — 2026-11-12

The book reader and individual practice problems support Vietnamese and English. Original PDF pages remain available for comparison, including figures and formulas. AI-authored problem specifications and tests are explicitly presented as adaptations, not original platform judge data.

## Five implemented features

1. Chapter audit: candidates, verified exercises, excluded fragments, pending/failed items, duplicate titles and unmatched source headings. A recovery pass added 104 candidates with new stable IDs; repeating it added zero duplicates.
2. Extended tests: a compiled constraint checker filters proposed inputs before two C++ reference implementations run them. Original samples remain required. Legal counterexamples quarantine the affected exercise and enter the reference repair queue.
3. Chapter progress: read marks, solved counts, difficulty filters and review flags. A local all-AC result records local progress; it does not claim an official platform acceptance.
4. Three progressive bilingual hints, followed by a separately revealed reference solution. Source/reference hashes invalidate stale packs and test suites.
5. Search across original text and saved translations, bookmarks, persistent page notes with draft recovery, and exact-page navigation from each exercise.

## Validation

- `npm run test:books:study`: atomic Windows JSON publication, state persistence, validation/cache behavior, and Electron GUI flows for both languages, hints, extended tests, bookmarks/notes/read/review, search, audit and compact layout. GUI fixtures contain study content only; no API key or private account profile is required.
- `npm run test:practice:import`: source coverage, provenance, reference validation, original samples and native exercise/book GUI integration.
- `node tests/gui/test-coding-workspace.js`: side-panel language switching and stale responses, resizing, Python sample execution, simulated inline official judging, tabs, archive persistence and diagnostic navigation.
- Real GCC execution of the ASCII character exercise passed **49/49 tests**. This is evidence for that exercise, not proof that every generated reference is correct.
- Four unchanged source books cover **3,096 pages**. Original source archives contain additional material beyond these four books.

## Background content processing

The translation/reference jobs use the existing OmniRouter configuration. They checkpoint results, publish atomically, preserve successful work and retry repairable failures. The supervisor has bounded restart recovery; service authorization failures still require a valid provider connection.

Snapshot during validation: 2,930 exercise candidates; 2,057 ready, 840 excluded, 33 failed/retrying. Bilingual enrichment was still running. These counts change as work completes; the UI displays saved page and exercise totals separately. The five features are implemented, but **translation and verification of all book content are not yet complete**.

No installer or release was published.
