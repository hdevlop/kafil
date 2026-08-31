# Shared VPS mail-test hub

This is a standalone acceptance-mail service. It is not part of the Kafil
application image and can also serve School or another VPS application.

It contains:

- one persistent Mailpit instance and its existing dashboard;
- one narrow bearer-token gateway for automated tests;
- one private Docker network named `mail-test-hub`;
- loopback-only dashboard, gateway, and SMTP bindings.

The dashboard and gateway use different credentials. The dashboard login can
read all captured test messages. Each automated-test token can search, read,
and delete only messages whose complete recipient list belongs to that token's
configured recipient domains. The gateway does not expose Mailpit's send,
relay, tag, bulk-list, or administrative API.

## VPS installation

1. Copy `hub.env.example` to `/opt/mail-test-hub/hub.env` and replace every
   placeholder with an independently generated value. Set ownership to root
   and permissions to `0600`. `openssl rand -hex 32` produces a suitable
   colon-free value; run it separately for the dashboard password and every
   application token.
2. Point a dashboard hostname and an API hostname at the VPS. Merge
   `Caddyfile.host.example` into the existing host Caddy configuration, replace
   both placeholder hostnames, validate it, and reload Caddy.
3. From the repository release directory, run:

   ```bash
   bash scripts/configureMailTestHubVps.sh
   ```

4. Join each application container that sends acceptance mail to the external
   Docker network `mail-test-hub`. Configure SMTP host `mailpit` and port
   `1025`. Do not publish SMTP on a public interface.
5. Configure Kafil's ignored local `.env` with the HTTPS API hostname and only
   the Kafil bearer token. School receives only the School token.

The service is designed to stay running. Mailpit automatically removes old
messages according to `MAIL_TEST_MAX_MESSAGES` and `MAIL_TEST_MAX_AGE`.
Stopping it is optional; no public start/stop endpoint exists.

## Dokploy Traefik edge

When Dokploy Traefik owns ports `80` and `443`, do not install or start Caddy.
First verify that Traefik is attached to the external Docker network configured
by `MAIL_TEST_EDGE_NETWORK` (default `dokploy-network`). Then start the hub with
the committed network override:

```bash
KAFIL_RELEASE_DIR=/opt/mail-test-hub/source \
MAIL_TEST_HUB_COMPOSE_OVERRIDE_FILE=/opt/mail-test-hub/source/deploy/mail-test-hub/compose.dokploy.yml \
bash /opt/mail-test-hub/source/scripts/configureMailTestHubVps.sh
```

The override gives the authenticated dashboard and gateway stable aliases on
the existing edge network. It does not publish any additional host port. Copy
`traefik.dynamic.example.yml` into Dokploy's managed dynamic configuration only
after replacing both hostname placeholders, back up the previous file, and use
the installed Dokploy/Traefik validation path before relying on hot reload.
Alternatively, register the two services through Dokploy's native Compose
domain UI using container ports `8025` and `8080`; use exactly one routing
owner, never both.

Keep application SMTP migration separate. Kafil and School must receive their
own gateway tokens, and their container-to-Mailpit route must be proven without
placing SMTP on a public interface.

The committed recipient scopes are `c4a-sponsor.test` for Kafil and
`school.test` for School. Change a scope only from the application's verified
acceptance-recipient contract, and update both the gateway JSON and Mailpit SMTP
allowlist together.

For the one-time correction from the former `school-e2e.test` proposal, use
`scripts/updateMailTestHubSchoolScopeVps.sh`. It requires exactly the two known
legacy fragments, constructs the expected new file independently, compares the
entire result, preserves the old Mailpit and credentials, validates every app
token through the gateway, and rolls back on any failure.

## Credential boundaries

- Never place the dashboard password in a local browser-test environment.
- Never place application database, SSH, Docker, or VPS credentials in the
  gateway configuration.
- Give every app a unique token and exclusive recipient domain.
- Rotate one app token without changing the dashboard password or another
  app's token.
