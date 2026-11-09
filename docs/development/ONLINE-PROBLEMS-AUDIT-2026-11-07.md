# New online-problem audit - 2026-11-07

This audit uses new problems, rather than the earlier Two Sum / Watermelon checks.

| Platform/problem | Statement and samples | C++ sample runs | Python sample runs |
| --- | --- | --- | --- |
| LeetCode 300 - Longest Increasing Subsequence | Live statement, 3 samples | 3 AC | 3 AC |
| LeetCode 72 - Edit Distance | Live statement, 2 samples | 2 AC | 2 AC |
| LeetCode 322 - Coin Change | Live statement, 3 samples | 3 AC | 3 AC |
| Codeforces 580C - Kefa and Park | Live statement, 2 samples | 2 AC | 2 AC |
| Codeforces 427C - Checkposts | Statement blocked this run | Not tested | Not tested |
| Codeforces 20C - Dijkstra? | Statement blocked this run | Not tested | Not tested |

20 official-sample executions passed through the real Electron editor/build/Run All Tests flow. This is not hidden-test acceptance. The two blocked Codeforces problems remain explicit failures in the local audit report; no placeholder statement is counted as success. Statement length/sample checks and math regressions do not prove every sentence, figure, formula or every platform problem is 100% correct.

## Contest navigation

Codeforces now defaults to contest groups. Its public `contest.list` supplies round names and `problemset.problems` supplies problems; see the [official API methods](https://codeforces.com/apiHelp/methods). Each group sorts A, A1/A2, B, C… naturally. Pagination counts whole contests, so it does not split a contest across pages. Search matches contest names, IDs and problem metadata; difficulty filters show only matching tasks. Flat problem view remains available. Only public problems present in the problemset catalog are included, not private groups/Gym contests or unpublished tasks.

Live GUI verification used contest 1205, Codeforces Round 580 (Div. 1), with A through F. Unit checks verify group pagination, natural ordering, round-name search and exact problem search. `npm run test:contests` repeats those checks.

## Evidence

- `plans/artifacts/testing/new-online-problems.json`: fetched statements, per-language sample verdicts and explicit blocked cases.
- `plans/artifacts/gui/codeforces-contest-groups.png`: rendered contest groups.
- `npm run test:online:new`: live new-problem audit; exits nonzero when a requested statement is blocked.
- `test-kefa-new-samples.js`: runs 580C samples from the statement fetched during this audit; requires that local audit artifact.

## Vietnamese statements

Application UI translation does not translate external problem statements. A faithful Vietnamese statement translation needs a selected translation service or browser translation, with source text available alongside it. The user's service preference is pending. No translation service has been configured, and no machine-translated statement is claimed as available or perfectly accurate.
