# Practice archive

Open **Archive / Kho bài** next to Practice. Save the current source manually, mark it In Progress / Practiced / Review, or filter/search saved work. Completing a full test suite automatically saves a snapshot of its problem, source, language and verdicts. All-AC results are labeled Solved locally; they are not an official platform acceptance.

Snapshots are stored in the app profile's `state/practice-library.json`, independently of open tabs and workspace folders. Each problem URL and language has a separate entry. Opening a saved solution creates a source tab with saved tests; subsequent runs update the same entry. Removing an archive entry leaves source files untouched. Manual source snapshots store the current file, not all dependencies of a multi-file project.

Run `npm run test:practice` for real Electron coverage of auto-saving, manual marking, search, restart persistence, restoring and rerunning tests, duplicate prevention and failed-write preservation. `npm run test:i18n` also checks the new UI labels.
