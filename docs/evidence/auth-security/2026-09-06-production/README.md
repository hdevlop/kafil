# Production auth acceptance - 2026-09-06

This record contains sanitized, value-free evidence for the guarded Kafil auth
acceptance at `https://kafala360.ma`. It contains no credentials, cookies, OTPs,
tokens, fixture identities, environment values, or mailbox content.

## Publication and deployment

- Application integration commit: `4a584d8547ee581e73d65f7e7fadbc3f11f7f912`.
- OTP polling correction: `939e8c88590d3483b296c8cd9919fadcb954208d`.
- GitHub Actions run `33996369714` verified, built, published, and triggered the
  initial application deployment.
- GitHub Actions run `33997710457` verified, built, published, and triggered the
  polling-correction deployment.
- The final running container reported revision `939e8c88590d3483b296c8cd9919fadcb954208d`,
  digest `sha256:3f3165ac993400394cb67e896dbd118a021236dee1bd4e51205ada17baccb5a9`,
  and healthy status.
- PostgreSQL/cache readiness returned 200. Redis was healthy, required by the
  application, and exposed only on the internal Docker network.
- Linux Sharp native image processing passed inside the application workspace.

## Edge and mail prerequisites

- The persisted Traefik dynamic source was corrected so it no longer overwrites
  the application nonce CSP. A timestamped root-owned pre-change backup remains
  on the VPS.
- The public security-header verifier passed `/` and `/api/system/health`.
- `/`, `/login`, `/api/system/health`, and `/api/system/readiness` returned 200.
- The application used the isolated SMTP test route with the plan-designated
  unique hub alias, port, and non-TLS internal connection. DNS and TCP
  reachability from the application container passed.
- The guarded HTTPS mailbox gateway authenticated as the Kafil application
  scope. The runner owned no SSH tunnel, Docker service, or mailbox transport.

## Auth lifecycle result

The first full attempt passed Admin and Family lifecycle work, then failed the
Sponsor email work because the test compared a VPS message timestamp with the
local runner clock using only a one-second tolerance. SMTP delivery had
succeeded: the gateway later returned exactly one matching message. Direct
clock sampling confirmed the cross-host offset exceeded the tolerance.

The correction snapshots matching message IDs before submission and accepts
only a newly observed ID. It is independent of cross-host clock skew. Its
source regression failed before the correction and passed afterward. The four
focused auth helper tests passed 9 tests with 81 assertions; web lint and
typecheck passed.

With a fresh instruction, the focused production prerequisite range selected
auth tests 01-03 plus passive diagnostics and passed 4/4. The complete serial
production lifecycle then selected and passed 10/10 in 53.9 seconds with one
worker and zero retries:

- Admin logout and relogin;
- Family credential setup, old-credential denial, login, and logout;
- Sponsor email OTP, pre-approval denial, approval, replay denial, and login;
- Sponsor phone login;
- same-context email/phone identity switching;
- cross-tab logout propagation;
- in-flight protected-response/logout overlap;
- stale snapshot denial and clearing;
- supported cleanup; and
- final passive diagnostics.

Cleanup asserted zero retained disposable application rows and zero retained
disposable mailbox messages. An independent post-run scoped mailbox query also
returned zero. Final diagnostics reported no unexpected HTTP, page, console, or
request failures. The runner reported `NO MANAGED MAILBOX TRANSPORT`.

## Verification and remaining scope

After the correction, the root gate passed: lint, typecheck, 360 web tests, 347
server tests with 53 opt-in skips, 85 seed tests, production build, and
`db:generate` with no schema changes. GitHub repeated lint, typecheck, tests,
and the Linux production build successfully.

This evidence closes the guarded production auth lifecycle. It does not claim
the still-unchecked AUTH-03 live reset probe, Redis-counter restart persistence,
GitHub OAuth round-trip, actual production uploads, or the complete broad
public/CSP route matrix.
