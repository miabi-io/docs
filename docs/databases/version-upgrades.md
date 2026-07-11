---
sidebar_position: 4
title: Version Upgrades
description: In-place engine version upgrades for managed databases.
---

# Version Upgrades

Miabi supports **in-place version upgrades** for managed database engines, so you can
move to a newer release without rebuilding the database or rewiring your apps.

![Database upgrade](/img/screenshots/database-upgrade.png)

## Before you upgrade

:::caution
**Take a backup first.** A version upgrade migrates the on-disk data format. Always create
a fresh backup before starting — see [Storage & Backups](/docs/storage/backups). For Redis,
note that backups are not yet supported, so plan accordingly.
:::

Also worth doing ahead of time:

- Check your app's compatibility with the target engine version.
- Pick a low-traffic window — the database is briefly unavailable during the upgrade.

## Performing the upgrade

From the database's detail page, open **Upgrade**, choose the **target version**, and
confirm. Miabi then:

1. Stops the database container cleanly.
2. Migrates the data directory to the new engine version in place.
3. Starts the database on the new version and re-checks health.

Credentials, the connection string, and the attached apps' injected
[environment variables](/docs/applications/environment-variables) stay the same — apps
reconnect once the engine is healthy again.

## What to expect

- **Brief downtime** — the database is offline for the duration of the migration.
- **Same endpoint** — host, port, and credentials are unchanged.
- **One step at a time** — for large version jumps, Miabi may guide you through
  intermediate versions where the engine requires it.

:::tip
If anything looks wrong after the upgrade, your pre-upgrade
[backup](/docs/storage/backups) is the safety net — restore it to roll back to the
previous version.
:::

:::note
Upgrades are available to Owners, Admins, and Developers. Because they involve downtime,
coordinate with anyone relying on the database first.
:::
