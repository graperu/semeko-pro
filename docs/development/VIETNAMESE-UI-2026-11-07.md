# Vietnamese interface validation - 2026-11-07

The Vietnamese catalog now covers menus, settings for all five source languages, debugger controls and help, test verdicts/progress, file/collection/contest actions, history, theme editing, the marketplace, tooltips and application messages.

`src/renderer/ui/i18n-vi.js` adds a shared catalog for renderer UI and native file dialogs. The existing catalog remains available; normalized whitespace also matches help text split across HTML lines. Dynamic rules cover changing test counts, download percentages, file names and status summaries.

Translation walks theme-preview shadow roots and editor context menus. Code, input/output values, problem statements, file names, user-created theme names/descriptions and debugger variable names/values retain their source data. Application-generated terminal messages are translated separately from raw program stdout/stderr. Native file dialog titles, buttons and filter labels use the saved interface language; paths and file extensions are preserved.

## Validation

- `npm run test:i18n`: native dialog label/filter tests, Vietnamese persistence, accent-insensitive settings search, English round trip, UI layout at 1024/1280 widths and coverage scanning.
- Coverage scan: **857 UI text/tooltip samples, zero missing translations** after excluding named products, key combinations, units, extensions and literal code examples.
- Coverage includes five language panels, theme marketplace, four theme editor panels, shadow preview, local history, new-file menus and the real Monaco context menu.
- Dynamic message checks include test progress, download percentage, per-test status, saved filenames, theme color reset and problem-list summaries.
- Data preservation checks include source code, input/expected values, problem text, filenames, debugger values and theme preview code.
- `test:themes`: 18 GUI checks passed.
- `test:editor`: 19 GUI checks passed.
- `test:fonts`, `test:collections`, `test:folders`: completed successfully.

Evidence: `plans/artifacts/i18n/coverage.json`, `settings-vi.png`, `theme-vi.png`.

These results cover the audited application UI and states. External problem statements, program output, compiler diagnostics, third-party content and operating-system text are separate from application UI copy. The new source is loaded on the next app restart. No installer was released.
