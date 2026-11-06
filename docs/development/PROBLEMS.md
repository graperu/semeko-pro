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
  C/C++, Python, Java and C#.
  C++ and Python scalar/array function samples run locally with generated wrappers.
  Sample arguments and expected JSON outputs are filled automatically. Tree/list/design
  types and C/Java/C# function wrappers are not supported yet; full judging stays on LeetCode. Premium/locked entries stay
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

## Sample judging

The Tests panel updates live: blue spinner/Running while executing, yellow for
unrun or incomplete tests, red for WA/RE/TLE/CE, and green for AC. Compilation
and runner warmup have explicit progress labels. Every finished case appears as
soon as its worker finishes; the summary stays active until the full run ends.

Imported platform samples are fixed to their problem: Input/Expected are read-only,
and add/delete controls are removed. A separate original-sample snapshot is kept in
the session so reloading cannot replace it with edited test data. Manual source
tabs still support creating and editing personal tests. Companion imports from
Codeforces, LeetCode and HackerRank receive the same protection.

Press Run on an imported LeetCode C++/Python function to run all loaded samples.
The Tests panel reports AC/WA/RE/TLE for each case and shows expected/actual output.
Only public samples are tested, not hidden platform cases. Output comparison is exact
after whitespace normalization; problems with custom checkers or multiple valid output
orders may require manual review. Codeforces imports samples automatically when its
public statement is accessible, otherwise use Competitive Companion.
# Reopening saved problem files (unreleased fix)

Imported problem metadata is stored in userData/state as `oj-problem-<SHA256 of normalized file path>.json`. It includes official tests and function metadata, not solution source. Explorer opens and session restoration recover this file-owned context independently of the tab checkpoint.

Legacy LeetCode function files can recover metadata and samples from their original comment URL. A known function solution never falls back to plain C++ compilation when recovery fails. New C++ starters include the standard headers and namespace needed for editor diagnostics. Recovery does not rewrite the user's solution.

Regression coverage closes/reopens a legacy Two Sum source and restores a session checkpoint lacking test metadata, with platform fetching disabled after the first successful recovery. All three samples pass and remain read only. The user's existing Two Sum file was separately backed up, given the missing C++ headers, and verified in the running app after closing/reopening: 3 AC, zero errors.

The app refreshes its HTTP asset cache on installed-version changes (and development starts). HTML, JavaScript and CSS responses require revalidation. This does not clear localStorage, workspaces, sessions or settings. An editor regression test verifies changed script contents are returned on the next request.

