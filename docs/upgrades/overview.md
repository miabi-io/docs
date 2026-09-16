---
sidebar_position: 1
title: Overview
description: What happens when you upgrade Miabi — automatic migrations, update notifications, and why downgrades are not supported.
---

# Upgrades

Upgrading Miabi is intentionally simple: **pull a newer image and recreate the containers.** Miabi handles the rest on startup.

## Automatic migrations

On every startup, Miabi brings the database in line with the running binary:

- **Schema migrations** are applied automatically (GORM `AutoMigrate`).
- **Ordered data `upgrade` steps** run in sequence, with each applied step recorded in the `upgrade_steps` table so it never runs twice.

Because both happen automatically, upgrading is just a matter of starting the new version. You watch the logs to confirm migrations completed before the instance serves traffic.

## Update notifications

![The update-available notice shown to platform admins](/img/screenshots/update-available.png)

Once a day, Miabi asks GitHub whether a newer release exists and shows platform admins a dismissible
notice with a link to the release notes. **The check only notifies — nothing upgrades on its own.**
An upgrade is always something you ask for, whether by running `miabi upgrade` (stack) or
bumping the image and running `docker compose pull && docker compose up -d` (Compose).

The check is channel-aware: a pre-release build is offered newer pre-releases and stable releases; a
stable build is never nudged onto a pre-release. Dismissing a notice hides it until the *next*
version appears.

| Variable | Default | Purpose |
|----------|---------|---------|
| `MIABI_UPDATE_CHECK` | `true` | Set `false` to disable the check entirely (air-gapped hosts, or to avoid the outbound call) |

Nothing about your install is sent: it is an unauthenticated `GET` to `api.github.com` identified
only by `User-Agent: miabi/<version>`. No install id, no telemetry. A `dev` build never checks.
Admins can read the cached result at `GET /api/v1/admin/update`.

## Downgrades are not supported

Miabi rolls **forward** only. The `upgrade_steps` table tracks which steps have been applied, and there are no reverse steps — once a migration has run, the previous binary may no longer understand the schema.

:::caution
`MIABI_ALLOW_DOWNGRADE=true` exists as an escape hatch, but it does **not** undo migrations. Only set it if you fully understand the schema implications of running an older binary against an already-migrated database. The supported recovery path for a bad upgrade is to **restore the pre-upgrade backup**.
:::

## Where to go next

- [Upgrading](/docs/upgrades/upgrading) — the procedure, for both install methods.
- [Backups](/docs/storage/backups) — take one before every upgrade.
- [Configuration](/docs/getting-started/configuration) — pinning the image version.
