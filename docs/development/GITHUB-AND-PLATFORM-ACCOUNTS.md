# Semeko accounts and official platform submissions

## Owner setup: GitHub OAuth App

1. In GitHub Settings → Developer settings → OAuth Apps → New OAuth App, create **Semeko**. Use the project's homepage and a loopback callback URL such as `http://127.0.0.1/` (device login does not use the callback).
2. Enable **Device Flow** for that OAuth App.
3. Copy its public Client ID into `app/config/github-oauth.json` as `clientId`. For development only, `SEMEKO_GITHUB_CLIENT_ID` can override it. Restart the app after configuration changes. Do not put a client secret or token in that file.
4. Build and distribute the app normally. The Client ID is public and can be bundled; no client secret is used by device login.

The implementation follows [GitHub's official device flow](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow): request a code, open GitHub's verification page, and poll at the returned interval, respecting pending/slow-down/expiry/denial/cancellation. It requests `read:user`, not repository access. The GitHub token remains encrypted using Electron safeStorage in the local profile and is never returned to the renderer. Expiring tokens require signing in again; refresh tokens are not retained.

The owner-provided public OAuth Client ID is configured in this source build. Device Flow must be enabled in GitHub's OAuth App settings. Automated tests use fake identities/tokens; real account authorization must still be completed by the user in GitHub. Restart Semeko after changing the configuration.

## Linked public profiles

After GitHub sign-in, enter Codeforces and LeetCode usernames under Account. Profile links belong to that GitHub identity on this computer. Switching GitHub identities uses separate links. This is a local desktop account/profile feature, not a hosted account database or cross-device cloud sync.

Public usernames are **not ownership verification** and do not log in to either platform. No Codeforces/LeetCode password or copied session cookie is requested. The UI labels the link accordingly.

- Codeforces uses official `user.info` and `user.status` endpoints described in the [API methods](https://codeforces.com/apiHelp/methods). Sync reads the last 200 submissions and records only verdict `OK`. Rating/classification are read from the platform.
- LeetCode uses its website GraphQL endpoint to read a public profile, public solved count, contest rating and up to 20 recent accepted submissions. This is not a documented public API contract and can change or be blocked.
- Archive entries display accepted-submission evidence separately from local test results, scoped to the currently linked handle/GitHub identity. A missing result in the recent-submission window is not treated as unsolved.

## Submitting

### Official session and server judging (1.4.1 internal candidate)

The Accounts dialog now has separate **Đăng nhập Codeforces** and **Đăng nhập LeetCode** actions. Complete authentication and any verification on the official page. The app stores browser sessions in per-GitHub/per-platform Electron partitions; passwords and browser cookies are not returned to the renderer. A public username link alone is still not authentication.

**Nộp và nhận kết quả** freezes the current editor source and shows the filename, extension, official problem URL and verified platform handle in a confirmation. It sends only after that dedicated action is confirmed, never from Run. Codeforces uses the authenticated official submission form and the available platform compiler for the source extension. LeetCode uses its authenticated website endpoints, which are not a documented public API and may change or be blocked.

The app tracks an exact server submission ID, not an unrelated recent Accepted. Codeforces verdicts are refreshed through `user.status`; LeetCode uses its authenticated submission check endpoint. Results show the server verdict and available passed/total or failed-test information separately from local samples. Accepted evidence can be attached to the archive without rewriting local test status. The app does not download the platforms' private test suites.

Submission POSTs are never automatically retried after an uncertain response. Such a job is marked unknown, with a warning to check official submission history before sending again. Polling stops after five minutes; **Cập nhật kết quả máy chủ** resumes result checking for a known submission ID without submitting code again. GitHub logout closes official windows and stops tracking; platform logout clears that platform's browser session.

Validation: `tests/unit/test-official-submissions.js` and `tests/gui/test-official-submissions.js` cover mocked authenticated providers, isolation, source/extension transfer, pending→Accepted, WA test number, result UI, archive evidence and duplicate POST prevention. **Live platform authentication and actual server submission have not yet been tested.** They require the user's login and explicit submission action. No 1.4.1 release has been published.

### Manual/browser alternative

Open the source tab associated with an online problem, then choose Submit online (under Practice or Archive). Review the confirmation, which identifies the source filename and problem URL. The app copies the current editor text and opens the official submission page in a sandboxed window with no Node integration. Paste the code, select the platform language/compiler and confirm submission yourself. Sessions are separated by GitHub identity and platform. An external browser option is available if login/verification cannot complete in Electron.

This manual/browser alternative does not submit code automatically. No source is submitted merely by opening its window. Sign into the intended platform account; the linked public username does not control that web session. After the platform judges the submission, press Sync results to refresh accepted results and profile ranking.

Passing local samples does not mark a platform problem accepted or increase rating. Practice submissions do not automatically change contest rating: the platform's own contest participation/rating rules apply.

## Validation

`npm run test:accounts` covers device-code polling/backoff/cancel, encrypted credentials, profile isolation, accepted-only sync, HTTP failures preserving prior data, unlink/logout, explicit official submission routing, GUI profile management, archive evidence and confirmation/source transfer. The tests use simulated OAuth/providers and never submit a real solution.

Separate read-only live checks successfully fetched a Codeforces public profile and a LeetCode public profile. Those checks validate public endpoints, not user authentication, account ownership or real submission. Real GitHub end-to-end login awaits OAuth App registration; real submission remains a user action.
