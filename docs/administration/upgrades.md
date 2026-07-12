---
sidebar_position: 3
title: Upgrades
description: How to upgrade a Miabi instance — automatic migrations, the docker compose procedure, and why downgrades aren't supported.
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
notice with a link to the release notes. **It only notifies — Miabi never upgrades itself.**

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

1. **Back up the database** (and any volumes you care about).
2. *(Optional)* Pin the new image version in your `.env` so the upgrade is explicit and repeatable.
3. Pull the new image and recreate the containers.
4. Watch the logs until you see the migrations confirmation.

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
