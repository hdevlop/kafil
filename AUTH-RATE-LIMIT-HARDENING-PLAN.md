# Auth and rate-limit hardening plan

Status: **READY FOR IMPLEMENTATION**

Scope note: this task-specific root plan was created by explicit user request.
It does not replace the completed guarded browser journey in
`CONNECTED-FOUR-ACCOUNT-ACCEPTANCE-PLAN.md`, reopen that journey, or claim a
new product roadmap.

## 1. Goal

Close both remaining authentication-throttling gaps without adding a Kafil-only
header parser or a second rate-limit implementation:

1. Stop treating the leftmost `X-Forwarded-For` value as trustworthy. Resolve
   the client address from an explicitly configured number of trusted proxy
   hops, and make every Najm rate-limit key use the same resolver.
2. Store production rate-limit counters in required Redis storage so counters
   survive application replacement and are shared by every application
   instance.
3. Retain PostgreSQL account lockout as a separate durable control and prove it
   still works. Redis throttling complements account lockout; it does not
   replace it.

This plan includes shared package work in `C:\Users\hdevlop\Desktop\najm`, the
Kafil consumer update, deployment configuration, and live acceptance. Package
publication, Kafil Git publication, and production deployment remain separate
authorization boundaries.

## 2. Proven starting point

- [ ] Reconfirm this baseline immediately before implementation; versions and
      live infrastructure can drift.
- Kafil pins `najm-auth@3.2.1`. Its installed
  `authIdentityRateLimitKey`, cookie fingerprint, and OAuth callback key read
  `x-forwarded-for`, split on commas, and take element zero.
- `najm-rate@2.0.3` repeats the same leftmost-value behavior for the built-in
  `ip` and `user+ip` strategies. A custom key receives only the Hono context,
  so `najm-auth` currently parses the header itself.
- `najm-core`'s generic `HRequest.ip` also trusts several client-controlled
  forwarding headers. This plan must not use `request.ip` as the supposedly
  safe fallback for rate limiting.
- `auth()` auto-registers `cache()` and `rateLimit()`. With no cache
  configuration, `najm-cache@2.0.2` selects `MemoryDriver`.
- The current Redis driver performs `INCR` and `PTTL` in a transaction but
  applies `PEXPIRE` afterward. A process failure between those operations can
  leave a counter without a TTL; this must be corrected before Redis becomes a
  required production security control.
- Kafil's root override installs `najm-rate@2.0.3`, while
  `packages/server/package.json` still directly declares `2.0.2`. Align the
  direct declaration when consuming the fixed package.
- `compose.production.yml` already defines password-protected Redis with AOF
  and a named volume, but Redis is behind the optional `redis` profile. The app
  neither depends on it nor receives a Redis URL.
- Kafil readiness checks only PostgreSQL. The production environment template
  explicitly says Redis is not wired.
- PostgreSQL already persists `users.failed_login_attempts` and
  `users.lockout_until`; the auth service uses them for the five-attempt,
  fifteen-minute default account lockout.
- Read-only live evidence on 2026-09-03 found Dokploy Traefik `v3.6.7`, no
  explicit `forwardedHeaders` override, and no host port published for the
  application container. Traefik therefore uses its secure default for
  canonical forwarded headers on the public route. Treat this as a current
  observation, not a permanent guarantee.

## 3. Fixed design decisions

### 3.1 One client-address resolver in `najm-rate`

`najm-rate` owns the address used for rate-limit keys. Do not add another
resolver to Kafil or leave raw header parsing in `najm-auth`.

Add a public client-address configuration to `RateLimitPluginConfig` with these
semantics:

- `trustedProxyHops` is a non-negative integer.
- `0` means forwarded headers are not trusted.
- A positive value walks the normalized `X-Forwarded-For` chain from the right.
  The count represents the known proxies between the application and the
  client; Kafil's current direct Traefik topology is exactly `1`.
- Empty elements, malformed IP literals, ports masquerading as IPs, and a chain
  shorter than the configured boundary are rejected. They must not become
  attacker-selected cache keys.
- IPv4 and IPv6 are normalized to stable key material.
- `X-Real-IP` is not a silent substitute when an explicit forwarded chain is
  required.
- The legacy behavior may remain only as an unconfigured compatibility path
  for other consumers. Kafil must opt into the explicit secure contract. Mark
  the legacy path deprecated and schedule its removal in the next major
  `najm-rate` release.

Extend functional key strategies with a second, package-supplied argument:

```ts
interface RateLimitKeyContext {
  clientIp: string;
}

type CustomRateLimitKey = (
  context: Context,
  keyContext: RateLimitKeyContext,
) => string | Promise<string>;
```

This addition is backward compatible for existing one-argument functions.
The built-in `ip`, `user+ip`, and custom strategies must all receive the same
resolved address.

### 3.2 `najm-auth` consumes the resolved address

- Change `authIdentityRateLimitKey`, `cookieFingerprint`, and the OAuth callback
  key to use `RateLimitKeyContext.clientIp`.
- Remove all direct `x-forwarded-for` and `x-real-ip` parsing from
  `najm-auth`.
- Preserve normalized identity hashing and cookie hashing; never place an email,
  phone number, cookie, token, or password in Redis keys or logs.
- Forward the configured trusted-hop contract from `AuthPluginConfig.rateLimit`
  into the package-owned `rateLimit()` dependency.
- Add `cache?: CachePluginConfig` to `AuthPluginConfig` and register
  `cache(config?.cache)` before `rateLimit()`. This makes the package's existing
  shared cache dependency configurable without consumer-dependent plugin-order
  tricks.

### 3.3 Redis is mandatory in production and optional locally

Extend `najm-cache` with a strict/required mode while preserving the current
memory default for development and existing consumers:

- Required Redis mode throws a value-free startup error when the URL is absent,
  the Redis implementation is unavailable, or the initial connection/ping
  fails. It never falls back to memory.
- Add a real asynchronous readiness probe (`PING`) and expose it through
  `CacheService` without exposing the URL or credentials.
- Keep transient runtime Redis failures fail-closed for protected endpoints;
  do not silently open a fresh memory bucket.
- Replace the current `INCR`/later-`PEXPIRE` sequence with one atomic Redis
  operation, preferably a small Lua script: increment the key, attach the
  expiry only when the key is new, and return count plus remaining TTL.
- Keep Redis key prefixes namespaced for Kafil and retain TTL cleanup. Do not
  add `FLUSHDB` or `FLUSHALL` to application or test code.

Kafil may use memory only when `NODE_ENV !== "production"` and no Redis URL is
provided. Production configuration must explicitly select required Redis.

### 3.4 Keep the edge as defense in depth

Application hop selection does not authorize bypassing the edge:

- Keep the application unpublished or loopback-only on the host.
- Keep `forwardedHeaders.insecure=false` on the public Traefik entry point.
- Keep `trustedIPs` empty for the current direct-to-Traefik topology. If a CDN
  or load balancer is later added, list only its exact network ranges and
  change `trustedProxyHops` in the same reviewed deployment.
- Do not put this policy in `apps/web/next.config.ts`; the setting belongs to
  the Najm rate plugin and the production edge.
- Add a deployment audit that fails if the app becomes publicly host-bound or
  Traefik starts trusting forwarded headers from arbitrary sources.

## 4. Work units

### Work unit A - Fix `najm-cache`

- [ ] Start from a clean Najm worktree and add red tests for strict Redis
      selection, value-free failures, connection readiness, and no fallback.
- [ ] Add red tests for a new counter receiving its TTL atomically and for an
      existing counter retaining the original window rather than becoming a
      sliding window.
- [ ] Implement required Redis mode, `PING` readiness, and the atomic counter
      operation.
- [ ] Test IPv4/IPv6-independent cache keys only at the rate layer; keep cache
      concerned with opaque keys.
- [ ] Run `bun test packages/najm-cache` and its build.
- [ ] Record the candidate version and exact commit. A compatible additive
      release is expected to be `najm-cache@2.1.x`; choose the actual version
      only after reviewing the final public API.

Acceptance:

- Server initialization fails without leaking the Redis URL when required
  Redis is missing or unreachable.
- A Redis-backed counter survives destruction and recreation of the
  `CacheService` while its TTL is still active.
- No possible successful increment leaves a newly created key without a TTL.

### Work unit B - Fix client-address handling in `najm-rate`

- [ ] Add table-driven parser tests for zero, one, and two trusted hops;
      left-side spoofed values; malformed/empty entries; too-short chains;
      IPv4; and IPv6.
- [ ] Add middleware tests proving `ip`, `user+ip`, and a custom key callback
      all use the identical resolved address.
- [ ] Add a regression proving changing only an untrusted left-side value does
      not create a fresh bucket.
- [ ] Add the typed resolver/configuration and `RateLimitKeyContext` export.
- [ ] Keep old one-argument custom callbacks source-compatible.
- [ ] Update `najm-api` aggregate exports if the new public types are expected
      from that surface.
- [ ] Run `bun test packages/najm-rate`, affected core/API tests, and builds.
- [ ] Record the candidate version and exact commit. An additive release is
      expected to be `najm-rate@2.1.x`.

Acceptance:

- No secure configured path selects `split(",")[0]` directly.
- With Kafil's one-hop contract, attacker-supplied values to the left of the
  trusted boundary cannot rotate rate-limit buckets.
- An invalid chain fails closed with a bounded, non-attacker-controlled key or
  a controlled request error; it never disables rate limiting.

### Work unit C - Update `najm-auth`

- [ ] Add red tests showing login, registration, forgot-password, refresh,
      session recovery, profile, credential setup, and OAuth rate keys do not
      parse forwarding headers independently.
- [ ] Update every auth custom key to consume `RateLimitKeyContext.clientIp`.
- [ ] Add the cache configuration pass-through and prove it wins over the
      package's default cache dependency.
- [ ] Preserve normalized Moroccan email/phone identity equivalence and hashed
      key material.
- [ ] Retain and regression-test DB account lockout, including reset after a
      successful login and expiry after the configured duration.
- [ ] Run `bun run test:auth`, `bun run build:auth`, the React-server suite, and
      `bun run --cwd packages/najm-auth test:next16`.
- [ ] Run the full sequential Najm suite after focused gates pass.
- [ ] Record the candidate version and exact commit. An additive release is
      expected to be `najm-auth@3.3.x`.

Acceptance:

- `rg` finds no raw forwarding-header parsing in `packages/najm-auth/src`.
- Auth keys contain only normalized IP text, hashes, and fixed prefixes.
- Account lockout remains PostgreSQL-backed and independent from Redis bucket
  expiry.

### Release boundary - publish shared packages

- [ ] Review the complete Najm diff, public declarations, package manifests,
      lockfile, changelog/release notes, and `git diff --check`.
- [ ] Commit the versioned candidates before packing.
- [ ] With explicit publication authorization, publish in dependency order:
      `najm-cache`, then `najm-rate`, then `najm-auth` (and `najm-api` only if
      its export surface changed).
- [ ] Verify registry versions, integrity, and imports from clean packed
      artifacts. A source test pass is not publication evidence.

Do not update Kafil to an unpublished checkout, file dependency, or temporary
tarball for the final consumer acceptance.

### Work unit D - Configure Kafil

- [ ] Pin the verified published Najm versions in root overrides and direct
      package manifests. Remove the current `najm-rate` `2.0.2`/`2.0.3`
      declaration mismatch and regenerate `bun.lock` with Bun.
- [ ] Add `ioredis` as an explicit runtime dependency if the final
      `najm-cache` package still treats it as optional; do not rely on an
      incidental transitive install in the production image.
- [ ] Extend `packages/server/src/config/envConfig.ts` and
      `packages/server/src/config/authConfig.ts` with typed, validated settings
      for:
      - the Redis URL;
      - required Redis in production;
      - Kafil's exact `trustedProxyHops=1` production topology;
      - an explicit local/test override where necessary.
- [ ] Reject a missing/invalid production Redis URL and invalid hop counts at
      startup without echoing values.
- [ ] Configure the package-owned cache through `auth()`; do not create a
      Kafil cache service or rate-limit store.
- [ ] Extend `/api/system/readiness` to report `database` and `cache` as
      `ok`/`unavailable`, return `503` when either required dependency is down,
      and keep all connection details private. Liveness remains independent.
- [ ] Update README wording so the proxy-hop and durable-store requirements are
      explicit.

Focused tests:

- [ ] Configuration tests: production Redis required, development memory
      allowed, malformed URL rejected, hop count bounded.
- [ ] Installed-contract test: the server resolves `CacheService.type` as
      `redis` under production configuration.
- [ ] Readiness tests: database down, Redis down, and both healthy, with no
      secret-bearing errors.
- [ ] Rate tests: rotating a spoofed leftmost XFF value stays in one bucket;
      different trusted-boundary client addresses use distinct buckets.
- [ ] Account-lockout tests remain green.

### Work unit E - Make Redis part of production

- [ ] Remove Redis from the optional Compose profile and make the application
      depend on Redis health as well as PostgreSQL health. Do not make migration
      or seed jobs depend on Redis unless their boot path genuinely initializes
      the full application server.
- [ ] Keep Redis only on the internal backend network, with no host port.
- [ ] Retain AOF, the named volume, password authentication, restart policy,
      health check, resource-safe logging, and `no-new-privileges`.
- [ ] Add `REDIS_URL` to `deploy/env/app.env.example` using a placeholder; keep
      `REDIS_PASSWORD` in the infrastructure template. Document that both
      values must agree without duplicating a real secret in the repository.
- [ ] Update `scripts/bootstrapVpsSecrets.sh` so a new installation writes the
      generated hex Redis password into both protected environment contracts
      without printing it.
- [ ] Provide a guarded, value-preserving existing-VPS activation procedure.
      It must back up both environment files, add the URL without displaying
      it, validate Compose, start Redis, verify `PING`, and only then recreate
      the app.
- [ ] Update `scripts/verifyVpsDeployment.sh` to require cache-aware readiness,
      verify Redis is healthy/internal/unpublished, and confirm the application
      is not publicly host-bound.
- [ ] Update the Dokploy raw Compose definition as a separate operational step.
      The live Kafil deployment is raw-Compose managed, so a repository push or
      webhook response alone is not proof that the Redis topology changed.

No Drizzle schema change or new migration is expected. If `bun run db:generate`
creates a migration, stop and investigate unrelated schema drift.

## 5. Verification gates

### Najm source gate

Run sequentially where generated output is shared:

```bash
bun test packages/najm-cache
bun test packages/najm-rate
bun run test:auth
bun run build
bun run test
```

Also run `bun run --cwd packages/najm-auth test:next16` and the package publish
dry runs required by the Najm repository instructions.

### Kafil local gate

Run focused server tests first, then the complete repository gate:

```bash
bun run --cwd packages/server typecheck
bun run --cwd packages/server test
bun run lint
bun run typecheck
bun run test
bun run build
bun run db:generate
```

Add an isolated real-Redis integration test that starts with an empty dedicated
test namespace, reaches the configured limit, recreates the app/cache process,
and proves the same bucket remains limited until TTL expiry. It must delete only
its exact test keys and must not use `FLUSHDB`.

### Local proxy acceptance

- [ ] Put a disposable echo/test controller behind the same proxy chain only in
      the test harness; do not ship an endpoint that reveals client addressing.
- [ ] Send requests with distinct spoofed left-side XFF values and prove the
      resolved bucket address is unchanged.
- [ ] Prove malformed and short chains fail closed.
- [ ] Verify the real Next.js 16 production handler, not only direct Hono unit
      tests.

## 6. Production rollout and acceptance

Production work requires explicit deployment authorization.

1. Back up protected environment files and the current Dokploy raw Compose
   definition without printing secrets.
2. Confirm the published image uses the exact Kafil commit and verified Najm
   package versions.
3. Start Redis alone, verify its persistent volume and authenticated `PING`,
   then deploy/recreate the application.
4. Require application readiness to report both database and cache healthy.
5. Verify value-free runtime facts: one healthy app, one healthy Redis,
   `CacheService` selected Redis, Redis has no public binding, and the app is
   unexposed except through the intended edge.
6. Audit the live Traefik entry points: `forwardedHeaders.insecure` must not be
   true and no broad `trustedIPs` range may be present.
7. Run a synthetic unknown-identity login probe through the public origin:
   vary the supplied leftmost `X-Forwarded-For` value on every request and prove
   all requests consume one bucket, ending in the expected `429`. Use an
   `example.invalid` identity so no account row or DB lockout is changed.
8. While that Redis TTL is active, recreate only the application container and
   prove the same request remains `429`. Do not restart or clear Redis.
9. Confirm the exact probe key has a positive bounded TTL using a count/TTL-only
   report, then let it expire naturally or delete only that exact synthetic key.
10. Re-run health, readiness, login success for an authorized test account, and
    the relevant guarded browser preflight. Do not rerun the destructive
    four-account journey unless separately authorized.

## 7. Rollback

- Keep the previous application image and protected environment backups until
  live acceptance passes.
- If the new application fails before replacement, leave the old app running
  and Redis idle.
- If post-replacement readiness fails, restore the previous image and previous
  app environment. Redis may remain running because the previous application
  does not depend on it; do not delete its volume during rollback.
- If forwarded-header acceptance fails, do not weaken the application hop
  policy. Restore the previous image if necessary, then correct the Traefik
  trust boundary or the configured topology count.
- Never roll back by enabling memory fallback in production.

## 8. Definition of done

- [ ] Kafil has no direct forwarding-header parser for rate limiting.
- [ ] `najm-auth` has no direct forwarding-header parser for its custom keys.
- [ ] All Najm rate-limit strategies use one tested trusted-hop resolver.
- [ ] Public spoofed left-side XFF values cannot rotate Kafil login buckets.
- [ ] Production starts only with authenticated, reachable Redis and reports
      Redis failure through readiness without exposing details.
- [ ] Rate-limit counters survive app restart/redeployment and are shared by
      multiple app instances.
- [ ] Redis counter creation and TTL attachment are atomic.
- [ ] PostgreSQL account lockout remains green and durable.
- [ ] Redis and the application have no unintended public host binding.
- [ ] Najm package gates, registry verification, Kafil's full gate, real Redis
      integration, local proxy acceptance, and authorized live acceptance all
      pass with exact evidence.
- [ ] Package publication, Kafil push, image publication, Dokploy configuration,
      deployment, and live acceptance are reported as distinct outcomes.
