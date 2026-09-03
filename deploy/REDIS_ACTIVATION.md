# Activating the required Redis rate-limit store

Login throttling counters live in Redis. Until this change they lived in the
application process, which meant every deploy reset them and no two application
instances shared a bucket. Redis is therefore a **required** production
dependency, not an optional Compose profile.

PostgreSQL account lockout is unchanged and remains a separate durable control.
Redis throttling complements it; it does not replace it.

## What changed in the repository

- `compose.production.yml` no longer puts `redis` behind a profile, and `app`
  now waits on Redis health as well as PostgreSQL health.
- `deploy/env/app.env.example` gains `REDIS_URL` and `KAFIL_TRUSTED_PROXY_HOPS`.
- `scripts/bootstrapVpsSecrets.sh` writes the generated Redis password into
  both protected contracts for a brand-new installation.
- `scripts/verifyVpsDeployment.sh` fails when Redis is missing or unhealthy,
  when Redis publishes a host port, or when the application is bound to
  anything but loopback.

`migrate` and the auth seed deliberately do **not** depend on Redis. Neither
boots the full application server, so adding the dependency would only slow
deployment down.

## Existing VPS: one-time activation

The live deployment is managed as raw Compose. A repository push, a green CI
run, or a webhook response is **not** proof that the running topology changed —
verify against the host.

```bash
sudo bash /opt/kafil/current/scripts/activateVpsRedis.sh
```

The script is value-preserving and prints no secret. In order it:

1. backs up both protected environment files with a UTC timestamp suffix;
2. derives `REDIS_URL` from the `REDIS_PASSWORD` already in the infrastructure
   contract and appends it to the application contract, skipping the write if
   the key is already present;
3. adds `KAFIL_TRUSTED_PROXY_HOPS=1`;
4. validates the Compose definition;
5. starts Redis **alone** and waits for an authenticated `PING`;
6. only then recreates the application;
7. runs the full deployment verification.

Any failure before the application is recreated restores both environment
backups. The backups are retained either way — remove them yourself once the
deployment is accepted.

## Trusted proxy hops

`KAFIL_TRUSTED_PROXY_HOPS=1` states that exactly one known proxy sits between
the application and the client. The rate limiter reads the `X-Forwarded-For`
chain from the right using that count, so a value a client prepends falls
outside the boundary and cannot rotate its own rate-limit bucket.

This number is part of the ingress topology, not a tuning knob:

- Adding a CDN or a load balancer in front of Traefik means incrementing it in
  the same reviewed deployment.
- Publishing the application on a non-loopback address invalidates it entirely,
  because a client could then reach the app directly and supply its own
  forwarding headers. `verifyVpsDeployment.sh` fails the deployment if that
  happens.
- Traefik must keep `forwardedHeaders.insecure=false` and an empty
  `trustedIPs` for the current direct topology. See
  [TRAEFIK_SECURITY.md](TRAEFIK_SECURITY.md).

## Rotating the Redis password

The password appears in two places that must agree: `REDIS_PASSWORD` in the
infrastructure contract and the credentials embedded in `REDIS_URL` in the
application contract. Rotate both together, then recreate `redis` before `app`.
Counters are throwaway state — losing them on rotation is acceptable, and
account lockout is unaffected because it lives in PostgreSQL.
