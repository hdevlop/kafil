# Shared safety and runtime contract

These rules apply to the [four-account journey](03-four-account-journey.md),
the [auth lifecycle](04-auth-lifecycle.md), and the
[notification suite](05-notification-system.md).

## 3. Safety contract

The runner must fail closed unless all of these are true:

- `KAFIL_E2E_REMOTE_URL` is exactly the target origin;
- `KAFIL_E2E_ALLOW_REMOTE_DESTRUCTIVE=true` is explicit;
- Admin credentials are present only in ignored local environment data;
- all legacy SSH, forwarding, and Tailscale environment names are absent;
- the mailbox URL is exact verified HTTPS on the separately configured API
  hostname, with no credentials, query, fragment, path prefix, or custom port;
- the Kafil gateway bearer token is at least 32 characters and is never the
  Mailpit dashboard password;
- unauthenticated gateway access returns `401`, while authenticated
  `/api/v1/info` identifies exactly the `mail-test-gateway` and `kafil` scope;
- system Chrome exists;
- TLS verification remains enabled;
- `/login`, `/apply`, health, and readiness succeed on the exact origin;
- the runner owns no mailbox transport process or private-network state.

The runner may mutate only disposable demo application records through the
deployed UI or authenticated/public application APIs.

Forbidden:

- PostgreSQL, SQL, seeds, migrations, resets, Docker, Dokploy, or VPS cleanup;
- mocks, `page.route()`, `clearCookies()`, forced clicks, or direct state
  mutation;
- screenshots, traces, or video;
- printing environment values, credentials, OTPs, cookies, mailbox content,
  private household data, generated identities, IDs, or raw sensitive bodies;
- starting, stopping, or killing unrelated VPN, SSH, Docker, Bun, Node, or
  Chrome processes.

## 4. Runtime configuration

The ignored `apps/web/.env.local` provides these names:

```text
KAFIL_E2E_REMOTE_URL
KAFIL_E2E_ALLOW_REMOTE_DESTRUCTIVE
KAFIL_ADMIN_EMAIL
KAFIL_ADMIN_PASSWORD
KAFIL_E2E_MAILBOX_API_HOST
KAFIL_E2E_MAILBOX_API_URL
KAFIL_E2E_MAILBOX_TOKEN
```

Check presence and validated state only. Never echo resolved values.

The standalone deployment is `deploy/mail-test-hub/compose.yml`. Mailpit owns
the existing human dashboard and persistent test-message volume. The gateway
exposes only authenticated info, scoped search, scoped detail, and scoped
delete. Kafil and School use distinct tokens and exclusive recipient domains;
the dashboard password is never distributed to either test runner. SMTP,
Mailpit, and the gateway share the internal `mail-test-hub` Docker network.
Only the dashboard and gateway loopback ports are handed to the existing VPS
HTTPS proxy. The reusable VPS helper is
`scripts/configureMailTestHubVps.sh`.
