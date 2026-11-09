# Vietnamese statement translation

Open Settings → Languages → Statement translation API. Enter your provider's HTTPS Base URL (usually ending in `/v1`), exact model ID and API key. Click Save translation settings, then Test translation connection. The connection test sends one short phrase and may incur provider usage. The main Save & Close button is separate from the explicit translation-settings save button.

In Practice, load a statement and click Translate to Vietnamese. Show original / Show Vietnamese switches between the original and the completed translation. Translation failures leave the original untouched. No statement is sent merely by opening Settings or loading a problem.

Successful Vietnamese text is also saved locally under `userData/statement-translations/` (retained locally without automatic eviction for bulk libraries). Reopening the same statement and pressing Translate reuses saved text without an API request, including after restart. The cache key includes original text, endpoint, model and translation format version: changed statements/configurations do not use stale translations. Only successful complete responses are stored, never the API key. Formulas/code/samples remain from the original article. Keep the provider configured to access this cache; removing the API key does not delete already saved translations. The original/translated toggle remains available after translating; this is original English to Vietnamese, not a second machine translation back into English. Storage is local, not account cloud sync.

The integration uses the [Chat Completions request/response format](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create), posting to `{Base URL}/chat/completions`. It does not assume a model name or send provider-specific generation parameters. The model must support system/user messages and return the instructed JSON object containing a translations array. Compatibility varies across providers; HTTP, invalid JSON, refusal or truncated/misaligned responses are reported without replacing the statement.

## Preserved content

Rendered formulas, code, variables in `var`, sample input/output blocks, SVG and MathML are excluded from translation. Numeric tokens in prose are replaced with protected placeholders and validated before restoration. Translation is inserted as text nodes, never model-generated HTML. Boundary whitespace is preserved. Full translations are applied only after every batch succeeds and only if the selected statement has not changed. The original statement and test data attached to the editor remain independent.

Natural-language translation is machine-generated, not guaranteed to preserve every nuance. The original remains available for checking constraints and meaning.

## Credentials

Local OpenAI-compatible gateways may use HTTP only for exact loopback hosts `localhost`, `127.0.0.1` or `[::1]`. Other HTTP destinations are rejected. Requests explicitly set `stream:false`; this is required by the tested 9Router gateway to return Chat Completions JSON rather than SSE. A live short translation succeeded on the user's local 9Router endpoint with its listed alias `ag/gemini-3.8-flash-high`. This validates the gateway alias, not the identity of its upstream model or whether that upstream is free.

The main process stores the key encrypted with Electron safeStorage in `userData/translation-provider.json`, outside the generic renderer state directory and normal exported Settings. No API key is returned by the config-read API. An empty key preserves the existing encrypted key; changing endpoint requires entering a key again. On systems without secure storage, saving is refused. The key field is cleared after saving and closing Settings. No credentials were configured in the real user profile during development.

## Verification

## Bulk CF/LC translation

Settings → Languages → Translation includes start/resume, pause and progress controls. The bulk worker checkpoints catalog pagination and each item to `userData/bulk-translation.json`, processes one statement at a time and pauses on authentication/rate-limit/connectivity errors or repeated statement failures. Public Codeforces/LeetCode catalogs are indexed; Premium entries are skipped without attempting access. Failed statements are recorded, not reported as translated. Completion means pending entries were processed; check skipped/failed counts separately.

The current worker uses three sandboxed translation lanes, with a three-request limit in the translation service. Item claims and checkpoint merges are synchronous to prevent duplicate selection/lost progress. On restart, unfinished processing/retry items return to pending. Each lane backs off on transient failures (up to three attempts). Pause stops new item claims and lets active requests settle before closing workers. Actual speed depends on the gateway/upstream concurrency and rate limits; three lanes do not guarantee a threefold speedup.

The live owner job currently targets LeetCode exclusively with two lanes. `targetProviders` prevents Codeforces item claims, while preserving those pending items for a later run. `continuous:true` retries connection/429/5xx outages after a 60-second cooldown; manual pause is respected and authentication errors still require intervention. This process must remain running: it is not a Windows service and does not automatically survive shutdown. Premium/skipped and exhausted formatting failures remain distinct from translated items.

Owner speed update: the active LeetCode job now uses four lanes, a 500ms inter-item gap and the owner-selected gateway model alias `ag/gemini-3.8-flash` instead of `ag/gemini-3.8-flash-high`. Existing completed bilingual articles are retained. Model changes affect new translation calls; requests already sent retain their original model. Available lane settings are 1–6, with a six-call limit per translation-service process; throughput still depends on upstream capacity and rate limits.

Each successful article retains its original provider metadata/HTML plus sanitized English and Vietnamese under `userData/translated-articles/<provider>/<id>.json`. The problem browser can reopen these saved articles and the existing language toggle uses the saved Vietnamese without sending another request. Disk translation cache no longer evicts after 100 entries, so a full library can be retained; disk usage grows with the library. No cloud sync or automatic redistribution of translated statements is performed. Closing the process interrupts work; start/resume continues pending items. Failed items are not silently retried. Models/providers may still fail to preserve meaning; inspect translations against the original.

`npm run test:translation:bulk` uses a real sandboxed Electron worker with simulated catalogs/translator to verify checkpoint completion and preserved formulas/samples. It is not evidence that the entire live catalogs have been translated.

`npm run test:translation` covers request formatting, encrypted storage, key removal, secret-free metadata, endpoint validation, placeholder integrity, caching, API/JSON/network failures and the real UI original/translated toggle. Tests use fake keys and a simulated provider; they do not demonstrate a live paid translation or verify any provider account. `test:i18n`, `test:math` and `test:practice` also passed after integration.
