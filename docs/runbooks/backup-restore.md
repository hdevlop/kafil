# Kafil backup and restore

A local dump alone is not a backup. Kafil requires encrypted off-VPS copies and
an isolated restore rehearsal before demo users are accepted.

## Protected configuration

Install `restic` from the reviewed distribution source. Create
`/opt/kafil/env/backup.env` as mode `0600`, containing the selected off-VPS
repository settings (for example `RESTIC_REPOSITORY` and
`RESTIC_PASSWORD_FILE`) plus provider credentials where required. The password
file must also be protected and must not be stored in GitHub or release bundles.

Initialize and verify the repository manually:

```bash
restic snapshots
```

If no repository exists, initialization is a separately approved operation.

## Automated backup

`scripts/backupVps.sh` creates a PostgreSQL custom-format dump and a consistent
archive of `KAFIL_STORAGE_HOST_PATH`, writes checksums, copies the set to the
configured restic repository, and retains the local set under
`/var/backups/kafil/<UTC timestamp>`. It never stops or resets the database.

After one successful manual run, review and install the committed systemd unit
and timer. Enable only after the offsite destination works:

```bash
systemctl enable --now kafil-backup.timer
systemctl list-timers kafil-backup.timer
journalctl -u kafil-backup.service
```

Define retention at the restic repository (recommended starting policy: seven
daily, five weekly, twelve monthly) and run `restic forget --prune` only after
review; pruning is destructive. Alert if the timer fails or the newest offsite
snapshot is older than 26 hours.

## Restore rehearsal

First restore a selected offsite snapshot to a temporary local directory with
`restic restore`; do not rehearse only from the local copy. Then run:

```bash
/opt/kafil/current/scripts/restoreRehearsalVps.sh \
  /var/backups/kafil/<restored-timestamp>
```

The script verifies checksums, creates a uniquely named isolated database,
restores the dump, extracts storage into a temporary isolated directory, and
requires at least one public-schema table. It removes only those uniquely named
rehearsal targets on exit. Record snapshot ID, backup/checksum result, table
count, storage result, start/end UTC times, and operator. For a full acceptance
test, point an isolated app at the restored targets, revoke restored sessions,
run readiness and seed verification/reconciliation, then destroy only the
explicitly identified rehearsal targets.

## Recovery cases

- **PostgreSQL loss:** stop application writes, restore the matching dump into
  a new database, run only forward migrations, reconcile ledgers/inventory,
  rotate sessions, then switch the protected `DATABASE_URL`.
- **Storage loss:** restore the storage archive matching the database recovery
  point and verify protected document ownership and missing-object reports.
- **Redis loss:** treat cache/session-revocation data as lost; invalidate all
  sessions and rebuild only from authoritative PostgreSQL state. Redis is not
  authoritative financial storage.
- **Failed migration:** leave the old app running, preserve logs, fix forward
  with an additive migration. Never edit or reverse a deployed migration.
- **Unhealthy release:** restore the recorded previous app image/release. The
  previous app must remain compatible with forward migrations.
- **TLS failure:** keep the app private, inspect Caddy logs/DNS/time/ACME rate
  limits, validate config, and restore the prior Caddy config if needed.

Never restore over the active database or storage without explicit approval, a
fresh backup, a maintenance window, and exact target confirmation.
