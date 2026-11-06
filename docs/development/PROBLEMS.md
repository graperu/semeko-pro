# Problem browser

Click **Practice** on the toolbar, or **Run → Browse OJ Problems**.
Choose Codeforces, LeetCode or HackerRank, then search by name/ID and filter
by difficulty. HackerRank also has a category selector. Select a result to
preview it, choose the solution language, and click **Start solving**.

Each selection creates a new solution tab and keeps existing drafts. With an
open folder, solutions are placed in its **Fetched Problems** collection without
replacing existing files. The source URL is kept in the code and problem metadata.

## Platform behavior

- **Codeforces:** public API catalog, exact problem IDs such as `4A`, tags and
  rating groups (Easy ≤1200, Medium 1300–2000, Hard >2000). Read the statement on
  the official page; protected statement pages are not scraped. Use the existing
  **Get Tests from OJ** / Competitive Companion flow for sample tests.
- **LeetCode:** public catalog, statement and official function signature for
  C/C++, Python, Java and C#. Function solutions run and submit on LeetCode;
  Sameko does not provide a function-call test harness. Examples are displayed
  in the statement, not treated as console stdin. Premium/locked entries stay
  locked and can be opened on the official website.
- **HackerRank:** searchable category catalogs, public statement, full starter
  (head/body/tail), and recognizable stdin/stdout examples. Annotated
  `STDIN / Function` tables are converted to stdin only. Variable-label examples
  that are not actual stdin are skipped. Known `OUTPUT_PATH` wrappers are adapted
  to console output for local runs. Complete the starter implementation before
  running sample tests.

**Open official page** opens the selected source in the default browser. Running
and submitting against hidden tests still takes place on the original platform.
No login, API key, password or automatic submission is added to Sameko.

Requests have a 15-second timeout. Catalogs/details are cached in memory for ten
minutes. HackerRank text filtering uses a local category index (up to 1,500
entries, with a visible truncation notice); at most three pages load concurrently.
Platform errors are displayed with a retry through Search and the official-page
fallback. Remote statements are sanitized before display, including removal of
scripts, styles, forms, event handlers and untrusted external media.

## Implementation and verification

- `app/services/competitive/problem-browser.js`: provider requests, canonical URLs,
  validation, cache, search and paging.
- `app/ipc/competitive-handlers.js` and `preload.js`: list/detail/open IPC.
- `src/features/problem-browser/`: dialog, statement preview and solution import.
- `src/renderer/app/companion.js`: shared new-tab/test import.

```sh
npm run test:problems
npm run test:problems:gui
```

Both checks use live public platform data; network availability and upstream
changes can affect them. The GUI test uses an isolated profile, preserves an
existing draft, completes/runs a HackerRank Python sample, checks function-mode
session persistence, sanitization, locked entries and recovery from a simulated
platform failure. Screenshots are written to `plans/artifacts/gui/`.
