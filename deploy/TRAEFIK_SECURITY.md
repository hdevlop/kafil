# Kafil security headers at the Dokploy edge

Production traffic reaches Kafil through Dokploy Traefik, so the authoritative
header policy belongs on that HTTPS router. Local development stays unchanged,
and `apps/web/next.config.ts` does not need a production-only header branch.

## Install

1. Back up the current Dokploy Traefik configuration.
2. Copy `traefik.security.dynamic.example.yml` into the directory already
   configured for Traefik's dynamic-file provider.
3. Validate the installed Traefik configuration using the VPS's existing
   Dokploy/Traefik validation path.
4. Attach `kafil-security@file` to Kafil's **existing HTTPS router**. Do not
   define a competing router for the same hostname. When attachment is managed
   as a Docker label, the router label has this shape:

   ```text
   traefik.http.routers.<existing-kafil-router>.middlewares=kafil-security@file
   ```

   Preserve any middleware already on the router by listing both names.
5. Reload Traefik, then verify the public origin from a separate machine:

   ```bash
   bash scripts/verifySecurityHeaders.sh https://kafala360.ma
   ```

The middleware enforces a small CSP baseline that blocks framing, plugins, base
URL injection, and cross-origin form submission without constraining Next.js
scripts or styles. A stricter policy is emitted as report-only for browser
iteration before enforcement.

HSTS covers subdomains for one year but does not request browser preload.
Preload is a separate operational decision: audit every present and future
subdomain for permanent HTTPS first, then change `stsPreload` only with the
domain owner's explicit approval.

The optional Caddy deployment carries the same enforced baseline and response
header removals. Caddy is not the production routing owner while Dokploy
Traefik owns ports 80 and 443.

## Deployment gate

`scripts/deployVps.sh` runs the same verifier against `https://$KAFIL_HOSTNAME`
after the readiness check and records the result as `security_headers` in the
deployment state file. A non-compliant origin fails the deployment with exit
code `8` and does **not** roll back the application image: the header policy
belongs to the proxy, so the previous image would be equally non-compliant.
Reattach `kafil-security@file` to the Kafil HTTPS router and redeploy.
