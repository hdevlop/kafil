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

## Bounded public security acceptance

A fresh non-destructive probe set ran against the healthy production container
at revision `43e2ad43367e9a4eb8762d4b626a18d441b1f67e`, image digest
`sha256:6c8ce3e199cc030912fad5c5f80c336ee59658e1a244d8be5a577761976581e5`:

- Anonymous access to auth identity, family self-service, sponsor self-service,
  and user administration APIs returned `401`.
- Forged session, refresh, and bearer values remained `401`; protected dashboard,
  family, operator, and sponsor pages redirected to `/login`.
- `/.env` and `/.git/config` returned `404`.
- The repository security-header verifier passed `/` and the health endpoint,
  including the enforced nonce CSP, HSTS, frame/content-type/referrer/permissions
  controls, and absence of framework/server disclosure headers.
- GitHub client configuration was absent from the runtime, its start endpoint
  returned `404 oauth_provider_disabled`, and its link endpoint returned `401`
  anonymously. Google client configuration was present; its start endpoint
  redirected only to Google's OAuth origin, an external return path returned
  `400 oauth_redirect_invalid`, an invalid callback state redirected safely to
  Kafil's login page, and anonymous linking returned `401`. No external OAuth
  redirect was followed and no identity was authorized.
- The live login limiter was enabled at eight attempts with the deployment's
  documented one-minute acceptance window and one trusted proxy hop. One
  nonexistent identity returned `401` for attempts one through eight and `429`
  on attempt nine even though attempts two through nine supplied different
  spoofed leftmost forwarding addresses.
- One new non-deliverable `example.invalid` reset identity returned `200` three
  times, then `429` twice. Each blocked request supplied a different ignored
  `identifier`, proving that undeclared input no longer restores allowance. No
  real user identity or mailbox was used.

Read-only runtime inspection also confirmed healthy, internal, volume-backed
Redis with AOF enabled, `maxmemory` set to zero, and `noeviction`.

## Redis counter persistence across application restart

After explicit authorization for a brief live restart, a second unique
nonexistent login identity consumed three of the configured eight attempts.
Only the Kafil application container was restarted; Redis was not restarted.
The application recovered healthy in 10 seconds on the same revision and image,
the Redis container ID and start time remained unchanged, and public readiness
returned `200`.

The same hidden synthetic identity then received `401` for attempts four through
eight and `429` on attempt nine. Had the application used process-local counters,
the post-restart requests would have started a fresh allowance and attempt nine
would not have been blocked. This closes the production app-restart persistence
gate without restarting or disrupting Redis. The synthetic counter expires under
the configured one-minute acceptance window.

At this checkpoint, the evidence closed the guarded production auth lifecycle,
bounded public security matrix, AUTH-03 live probe, and Redis-counter
app-restart persistence. It did not yet claim an authorized Google OAuth round
trip, an actual production upload, or the complete authenticated locale/route
browser matrix. The focused run below supersedes the upload limitation only.

## Focused managed-image upload acceptance

After separate authorization, the state-neutral production upload test ran once
with passive diagnostics. The guarded runner passed all boolean and service
preflight checks, selected exactly two tests, used one worker and zero retries,
and ended with native exit code 0:

```text
remote upload - generated product image round trip and cleanup (3.6s)
remote diagnostics - final context assertions (17ms)
2 passed (5.3s)
NO MANAGED MAILBOX TRANSPORT
```

The authenticated Admin browser generated a PNG in memory and uploaded it
through the operator-guarded product-image endpoint. The response returned the
canonical protected path; reading it returned `200`, exact `image/webp`, and a
positive byte count. Cleanup deleted that exact generated WebP and asserted
`deleted: true`, then the test signed out and closed its page. Passive
diagnostics found no unexpected HTTP, page, console, or request failures.

This focused test created no application or mailbox fixture and retained no
generated image. Its source provenance is the uncommitted worktree based on
Kafil `030f3c4`; the invocation did not publish or deploy the test-only change.
It closes the actual production managed-image upload boundary, while the
authorized Google OAuth round trip and broader authenticated locale/CSP route
matrix remain open.

## Authenticated CSP matrix failed attempt and correction

The first guarded matrix attempt passed preflight, selected exactly the matrix
and passive diagnostics with one worker and zero retries, then failed after
38.4 seconds on a test-only readiness assumption: the helper required a generic
`main` element that was absent. The preceding document status, final route,
route API status, language, and direction assertions had passed. Passive
diagnostics did not run, the command exited 1, and the runner reported
`NO MANAGED MAILBOX TRANSPORT`. No matrix acceptance claim is based on that run.

The corrected source removes the generic element assumption and adds
locale/route labels to every document, API, locale, direction, framework-script,
and CSP nonce assertion. The source regression requires both the labelled
contract and absence of `locator("main")`; it passes as part of 22 focused tests
with 474 assertions. Web lint and typecheck also pass. The matrix remains open
until a guarded production run and passive diagnostics both pass.

The fresh corrected invocation then passed its guarded preflight and selected
exactly two tests with one worker and zero retries:

```text
remote CSP matrix - authenticated routes, locales, branding, PWA, and hydration (22.8s)
remote diagnostics - final context assertions (10ms)
2 passed (24.3s)
NO MANAGED MAILBOX TRANSPORT
```

Every `/dashboard`, `/products`, `/applicants`, and `/settings` document/API
pair passed under English, French, Arabic, and Spanish. Each document carried
the expected language and direction, enforced a nonce-bearing `script-src` with
`strict-dynamic` and without `unsafe-inline`, and rendered framework scripts
whose nonces matched the response. The same run proved hydrated language-menu
interaction, decoded protected branding, production service-worker
registration, and Arabic phone-width RTL without horizontal overflow. Passive
diagnostics found no unexpected HTTP, page, console, or request failures. The
test made no application-data or theme mutation and retained no fixture.

After the correction, the full root lint, typecheck, test, and production-build
gate passed, and `bun run db:generate` reported no schema changes. This closes
the authenticated locale/CSP matrix. At that checkpoint, the authorized Google
OAuth round trip was the only remaining acceptance boundary.

## Manual Google OAuth round-trip acceptance

Following the documented manual production checklist, the user reported that
Google authentication completed easily and returned successfully to the
authenticated Kafil application. No credentials, OAuth codes, state values,
cookies, identity values, or callback query parameters were collected or added
to this evidence.

This is user-performed manual acceptance. It has no Playwright terminal summary
or passive-diagnostics artifact and is not presented as automated evidence. It
complements the automated checks that already proved the Google start origin,
invalid-return status, invalid-state handling, enforced CSP, authenticated route
behavior, logout lifecycle, and protected-route denial. The successful manual
round trip closes the final acceptance boundary in the auth security plan.
