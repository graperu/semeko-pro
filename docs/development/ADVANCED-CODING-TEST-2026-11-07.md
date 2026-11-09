# Advanced coding validation - 2026-11-07

Run `npm run test:code:advanced` with the C/C++, Python, Java and .NET toolchains installed. This runs the real Electron compiler/executor pipeline and then the editor/Run All Tests UI, using isolated temporary profiles. No source files in the user's workspace are changed by the tests.

## Programs and independent oracles

| Algorithm | Languages | Inputs per implementation | Independent expected-output calculation |
| --- | --- | ---: | --- |
| Dijkstra with a priority queue | C, C++, Python, Java, C# | 27 | Bellman-Ford relaxation |
| 0/1 knapsack with one-dimensional DP | C, C++, Python, Java, C# | 28 | Exhaustive subsets for small inputs; known sum for the large case |
| Lazy segment tree, range addition and range sum | C, C++, Python, Java, C# | 27 | Direct array updates and sums using BigInt |
| Dinic maximum flow | C, C++, Python, Java, C# | 28 | Exhaustive s-t cuts for small graphs; independent sum of path bottlenecks for stress |

Each algorithm includes 24 reproducible random inputs. The generator starts with seed `0x5e4e2026`. Boundary cases include unreachable graph nodes, zero-weight/parallel edges, empty knapsack, zero-weight items, overlapping range updates, negative increments, residual rerouting and sums/capacities beyond 32-bit integers.

## Stress sizes

- Dijkstra: 2,000 vertices, 9,999 directed edges.
- Knapsack: 300 items and capacity 10,000, approximately three million DP updates, with a result of 1,200,000,000,000.
- Segment tree: 20,000 elements, 10,000 mixed range operations, checked against a direct-array oracle.
- Maximum flow: 100 parallel paths, 102 vertices, result 300,000,005,050.

## Negative controls

Twenty additional compilations deliberately alter the solution: wrong source distance, subtraction instead of adding item value, lost lazy propagation, or removed edge capacity. Every mutant must produce WA against the original expected output. The harness also verifies that the output actually differs, rather than trusting the verdict alone.

One initial C++ flow fixture used global names `queue` and `next`, conflicting with `std::queue`/`std::next`. The application correctly reported compiler errors. The fixture was corrected to use `bfsQueue` and `edgeCursor`; this was a test-source error, not an application failure.

## Results and evidence

- 20 correct implementations, plus 20 deliberately incorrect variants.
- Main corpus: 550 correct-solution checks plus 20 mutant rejections, 570 total.
- GUI: each of the 20 implementations is imported into an editor tab and tested through `runAllTests()` with two boundary cases and its large stress case, 60 AC results. Renderer errors are checked separately.
- Full source, input, expected output, actual output, verdict and execution time are saved in `plans/artifacts/testing/advanced/report.json` and adjacent source files.
- GUI report and screenshots: `plans/artifacts/testing/advanced-ui/`.

This validates these algorithms and tested sizes on the current development source. It does not reproduce platform hidden tests, every compiler version, or a newly packaged installer. No release was published.
