# Kafil security headers at the Dokploy edge

Production traffic reaches Kafil through Dokploy Traefik, so shared non-CSP
security headers belong on that HTTPS router. The Next.js proxy owns CSP because
its script nonce must be unique per navigation. Local development follows the
same application policy, and `apps/web/next.config.ts` does not need a
production-only header branch.

## Install

1. Back up the current Dokploy Traefik configuration.
2. Copy `traefik.security.dynamic.example.yml` into the directory already
   configured for Traefik's dynamic-file provider.
3. Validate the installed Traefik configuration using the VPS's existing
   Dokploy/Traefik validation path.
4. Attach `kafil-security@file` to every Kafil HTTPS domain through Dokploy's
   persisted domain `middlewares` setting. For the current apex and `www`
   domains, both domain records must list `kafil-security@file`. Dokploy then
   emits the corresponding Docker label on each existing HTTPS router:

   ```text
   traefik.http.routers.<existing-kafil-router>.middlewares=kafil-security@file
   ```

   Preserve any middleware already configured for the domain. Do not edit the
   generated file under `/etc/dokploy/compose/<app>/code/docker-compose.yml` as
   the source of truth: Dokploy rewrites that file during deployment.
5. Trigger a normal Dokploy deployment and confirm the regenerated Compose file
   still contains one middleware label for each HTTPS domain.
6. Reload Traefik if the dynamic middleware definition changed, then verify the
   public origin from a separate machine:

   ```bash
   bash scripts/verifySecurityHeaders.sh https://kafala360.ma
   ```

The middleware intentionally does not emit CSP. The application emits an
enforced, request-scoped policy on browser documents, including framing,
plugin, base-URL, form-action, and nonce-bound script restrictions. Adding CSP
to the middleware would overwrite the request nonce and block the framework
scripts it authorizes.

HSTS covers subdomains for one year but does not request browser preload.
Preload is a separate operational decision: audit every present and future
subdomain for permanent HTTPS first, then change `stsPreload` only with the
domain owner's explicit approval.

The optional Caddy deployment carries the same non-CSP security headers and
response-header removals. Caddy is not the production routing owner while
Dokploy Traefik owns ports 80 and 443.

## Deployment gate

`scripts/deployVps.sh` runs the same verifier against `https://$KAFIL_HOSTNAME`
after the readiness check and records the result as `security_headers` in the
deployment state file. A non-compliant origin fails the deployment with exit
code `8` and does **not** roll back the application image: the header policy
belongs to the proxy, so the previous image would be equally non-compliant.
Reattach `kafil-security@file` to the Kafil HTTPS router and redeploy.

The verifier requires the nonce CSP on `/`, where the Next.js proxy applies it,
and checks the shared edge headers on both `/` and `/api/system/health`. API
health responses are not HTML documents and are excluded from the nonce proxy.
