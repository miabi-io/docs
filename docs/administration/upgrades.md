---
sidebar_position: 3
title: Upgrades
description: How to upgrade a Miabi instance — automatic migrations, the stack and Compose procedures, rollback, and why downgrades aren't supported.
---

# Upgrades

Upgrading Miabi is intentionally simple: **pull a newer image and recreate the containers.** Miabi handles the rest on startup.

## Automatic migrations

On every startup, Miabi brings the database in line with the running binary:

- **Schema migrations** are applied automatically (GORM `AutoMigrate`).
- **Ordered data `upgrade` steps** run in sequence, with each applied step recorded in the `upgrade_steps` table so it never runs twice.

Because both happen automatically, upgrading is just a matter of starting the new version. You watch the logs to confirm migrations completed before the instance serves traffic.

## Update notifications

Once a day, Miabi asks GitHub whether a newer release exists and shows platform admins a dismissible
notice with a link to the release notes. **The check only notifies — nothing upgrades on its own.**
An upgrade is always something you ask for, whether by re-running the installer (Compose) or by
running `miabi update` (stack).

The check is channel-aware: a pre-release build is offered newer pre-releases and stable releases; a
stable build is never nudged onto a pre-release. Dismissing a notice hides it until the *next*
version appears.

| Variable | Default | Purpose |
|----------|---------|---------|
| `MIABI_UPDATE_CHECK` | `true` | Set `false` to disable the check entirely (air-gapped hosts, or to avoid the outbound call) |

Nothing about your install is sent: it is an unauthenticated `GET` to `api.github.com` identified
only by `User-Agent: miabi/<version>`. No install id, no telemetry. A `dev` build never checks.
Admins can read the cached result at `GET /api/v1/admin/update`.

## Back up first

:::caution
**Always back up your database before upgrading**, and especially before a major-version upgrade. Migrations modify your schema and data in place. A backup is your only way back if something goes wrong — see [Backups](/docs/storage/backups).
:::

## Upgrade procedure

How you upgrade depends on who owns the containers. Miabi labels every one of them, so it always
knows — and refuses to act on a stack it does not own.

- **Installer / `docker run`** (what `get.miabi.io` builds) → `miabi update`. Miabi replaces its own
  container, rolling back if the new one does not come up.
- **Compose**, if you set it up yourself → `docker compose pull && docker compose up -d`.

If you are not sure which you have, ask:

```bash
docker inspect miabi --format '{{index .Config.Labels "io.miabi.managed-by"}}'
# miabi   → stack install
# compose → compose install
```

## Upgrading

```bash
MIABI_TAG=1.4.0 miabi-stack update
```

…or, without the wrapper:

```bash
docker run --rm -it \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /etc/miabi:/etc/miabi \
  miabi/miabi:1.4.0 update
```

The tag you invoke is the version you get. Miabi pulls the image, replaces the running control plane
and waits for it to come back healthy.

**It can replace its own container** because the updater is a *different* container — an ephemeral
one that exits when it is done. That is the whole reason Miabi owns its containers rather than
letting Compose own them.

### If the new version does not come up

The rollout is not a blind cutover:

1. For components that can safely run a second copy (the gateway), the new image is started under a
   throwaway name first, watched, and only promoted once it is **healthy** — a gateway that boots but
   serves nothing never reaches the live one.
2. The previous image is remembered before anything is replaced.
3. If the new container never becomes healthy, the previous image is **restored automatically** and
   the manifest is reverted, so `stack.yaml` never claims a version that is not running.

```
verifying
rolling-back  miabi did not become healthy within 1m30s
rolled-back   … rolled back to miabi/miabi:1.3.0, which is running
```

:::caution A rollback is recovery, not undo
Restoring the previous **image** does not undo a schema **migration** the new version already
applied. Miabi's migrations are additive, so an older binary against a newer schema generally works —
but the supported recovery path for a genuinely bad upgrade is still to restore the pre-upgrade
backup. See [Downgrades](#downgrades-are-not-supported) below.
:::

### Restarting without upgrading

A restart re-reads what is on disk — most usefully the gateway's `goma.yml`, which Goma does **not**
hot-reload (it watches its providers directory, not its base config):

```bash
miabi-stack restart miabi-gateway     # or `miabi-stack restart` for the whole stack
```

The config is validated before anything is stopped, so a broken edit cannot take the gateway down.
A restart cannot apply a *manifest* change — that needs `miabi install`, which recreates — and it
says so rather than leaving the edit looking ignored.

### Changing anything else

Everything else — the gateway version, the registry, `TZ`, the log level — lives in
`/etc/miabi/stack.yaml`. Edit it and re-run:

```bash
miabi-stack install
```

The converge is idempotent: components whose configuration did not change are left alone, and only
what actually changed is recreated. Bumping PostgreSQL is therefore something you ask for by name,
not a side effect of upgrading the panel.

## Upgrading a Compose install (if you set one up yourself)

The supported path is to **re-run the installer**: it stamps the release's exact image tags into
`.env` and brings the stack up.

```bash
# 1. Back up first (see /docs/storage/backups)

# 2. Re-run the installer — it rewrites MIABI_IMAGE / GOMA_IMAGE / RUNNER_IMAGE
curl -fsSL https://get.miabi.io | sudo bash

# ...or pin an exact release
curl -fsSL https://get.miabi.io \
  | sudo MIABI_VERSION=v1.4.0 bash

# 3. Watch the logs for the migration confirmation
cd /opt/miabi && docker compose logs -f miabi
```

To upgrade by hand instead, edit `.env` and set the **image**, then recreate:

```bash
# .env
MIABI_IMAGE=miabi/miabi:1.4.0

docker compose pull && docker compose up -d
```

:::caution
`MIABI_VERSION` is an **installer** variable (a git tag, e.g. `v1.4.0`) — the server and
`compose.yaml` never read it. Setting `MIABI_VERSION` in `.env` does nothing. The variable compose
reads is `MIABI_IMAGE` (an image reference, e.g. `miabi/miabi:1.4.0`, with no leading `v`).
:::

Wait for a line similar to **`database migrations applied`** in the logs. Once it appears, the schema and data steps are complete and the instance is running the new version.

## Downgrades are not supported

Miabi rolls **forward** only. The `upgrade_steps` table tracks which steps have been applied, and there are no reverse steps — once a migration has run, the previous binary may no longer understand the schema.

:::caution
`MIABI_ALLOW_DOWNGRADE=true` exists as an escape hatch, but it does **not** undo migrations. Only set it if you fully understand the schema implications of running an older binary against an already-migrated database. The supported recovery path for a bad upgrade is to **restore the pre-upgrade backup**.
:::

## Where to go next

- [Backups](/docs/storage/backups) — take a backup before every upgrade.
- [Configuration](/docs/getting-started/configuration) — pinning the image version and other `.env` settings.
- [Platform Settings](/docs/operations/platform-settings) — instance-wide configuration.
