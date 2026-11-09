# Coding regression report - 2026-11-07

Validated the development source on Windows with installed C/C++, Python, Java and C# toolchains. No installer was released.

## Coding corpus

Run `npm run test:code` to repeat the function-judge checks and the real Electron compilation/execution corpus. Each Electron test uses a separate temporary user profile.

- 43 successful program builds and 274 execution/verdict checks passed.
- 16 focused function-judge regressions passed, including exact 64-bit integer comparison beyond JavaScript's safe integer range.
- Six algorithms in each of five languages: sum, sorting, GCD, maximum subarray, first matching index by binary search, factorial modulo a prime.
- Inputs include empty arrays, duplicates, all-negative arrays, 64-bit sums, 50,000 numbers, Unicode and CRLF.
- Negative checks intentionally require WA, compilation failure, nonzero-exit RE and 500 ms TLE. Passing a negative check means the app correctly rejected the program/output.
- C++/Python function runners additionally cover escaped strings, Vietnamese, Unicode surrogate pairs, booleans, nested arrays, floating-point precision, malformed/truncated JSON, trailing data and extra arguments.
- Independent expected values are computed in the test fixtures, including BigInt arithmetic and a brute-force maximum-subarray oracle. The harness checks returned output as well as verdicts.
- Machine-readable result: `plans/artifacts/testing/coding-corpus.json` (local artifact).

## Bugs found and fixed

The initial 213-check corpus found seven failures: C++ JSON strings lost newline/tab escapes, truncated argument JSON was accepted, C++ floating-point serialization lost precision, Python pipe encoding corrupted Vietnamese, and numeric notation differences incorrectly produced WA.

- Replaced the C++ function JSON codec with escape-aware parsing, structural validation and precision-preserving serialization.
- Added semantic JSON comparison only for function tests; ordinary stdin/stdout comparison keeps its existing rules. Integer tokens retain exact BigInt values.
- Enabled Python UTF-8 mode for managed execution.
- Java debugging repeatedly timed out. Java launch now uses command-line argument strings and the selected Java executable. Real breakpoints/evaluation/locals now pass, including JVM/program arguments with spaces, embedded quotes and trailing backslashes.

## Other completed checks

All listed suites completed successfully after the relevant fixes:

- `test:languages`: runtime settings, AC/WA, multiple-file workspaces, C11, legacy C# versions and real Python debugging.
- `test:languages:tools`: Python/Java/C# completion, standalone C# completion, real C#/Java debugging and Java argument preservation.
- `test:languages:gui`: language switching, templates, editor highlighting, real output, folder main files, unsaved dependencies, settings and detected version choices.
- `test:oj:samples`: C++/Python Two Sum 3 AC and 3 WA each; immutable sample guards; legacy file recovery and offline close/reopen; Codeforces extraction and platform locks.
- `test:debugger`: 26 passed, 0 failed, 0 skipped; real GDB breakpoints, locals, STL, stepping, pause and conditions.
- `test:editor`: 19 passed; editor state, drafts, file opening, split layout and fresh application assets.
- `test:gui`: 12 passed; startup, Monaco, resource loading and renderer errors.
- `test:collections`: contest files, collections, Python execution, Java/C# templates, progress persistence and existing-solution preservation.
- `test:folders`: all folder-opening entry points, cancellation and local file icons.

## Scope

These checks validate local development source with installed tools, not a newly packaged installer or every possible user program. Function-style local LeetCode execution currently supports C++ and Python for the supported primitive/array signatures; Java/C# are covered for stdin/stdout programs and multi-file projects. Platform hidden tests and problem-specific custom checkers are not reproduced by this corpus. Passing these checks does not imply every online problem or UI state is defect-free.
