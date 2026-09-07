# Auth security local evidence - 2026-09-05

This directory contains sanitized evidence for the completed Najm Auth security
remediation adopted by Kafil. The completed implementation plan was removed
after its package, deployment, connected-auth, CSP and OAuth gates closed and
School adopted the same shared Auth and CSP contracts. This record contains
commands and value-free assertions only; no credentials, generated identities,
tokens, cookies, mailbox bodies, database URLs, or cache keys are retained.

## AUTH-03 HTTP, Redis, and Mailpit acceptance

Command, from `C:/Users/hdevlop/Desktop/najm`:

```text
bun packages/najm-auth/integration/mailpit-forgot-password/run.ts
```

Environment:

- real `najm-auth` plugin and controller over a loopback HTTP server;
- ephemeral in-memory SQLite database with two generated fixture accounts;
- checksum-verified MemuraiDeveloper 4.1.7, Redis 7 protocol compatible, bound
  only to `127.0.0.1:6399`;
- Mailpit 1.30.7 (SHA-256
  `2654BF92532C91BDF162CAB8DD35C82EDA3A16D0D3C7682365D3F40614AC1514`)
  bound only to SMTP `127.0.0.1:1025` and HTTP `127.0.0.1:8025`; and
- `trustedProxyHops = 0`, matching the direct local-server boundary.

Assertions, native exit code 0:

```text
AUTH_MAILPIT_ACCEPTANCE PASS
HTTP primary=200,200,200,429,429 secondary=200 unknown=200 generic_body=matched
MAIL primary=3 secondary=1 unknown=0
REDIS isolated_rate_buckets=present
```

Each successful primary request carried a different ignored `identifier` and
a different spoofed `X-Forwarded-For` value. The fourth and fifth requests
remained in the same email-and-resolved-client bucket and returned 429 without
emitting more mail. A different fixture recipient retained an independent
allowance. An unknown recipient returned the same successful HTTP body and
emitted no message.

Post-run cleanup checks:

- Mailpit message count: zero;
- Redis `DBSIZE`: zero;
- ports 1025, 8025, and 6399: free;
- owned processes: stopped; and
- the validated OS-temp directory and compile-check artifact: sent to the
  Recycle Bin.

The normal `najm-auth` suite was rerun afterward: 433 passed, 13 opt-in skips,
0 failed, followed by the React-server invocation with 13 passed, 6 existing
skips, and 0 failed.

## Provenance boundary

The Najm and Kafil worktrees are still uncommitted and dirty. This evidence is
therefore tied to the reviewed local worktree, not an immutable source revision
or registry tarball. Package publication, installed-consumer verification, and
production acceptance remain open.
