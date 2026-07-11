---
sidebar_position: 2
title: Backups
description: Schedule and run database backups and volume archives, then restore them.
---

# Backups

Miabi backs up both your **databases** and your **volume data**, on demand or on a schedule, and
ships the result to a [backup target](/docs/storage/backup-targets). Database backups are built on
the proven ecosystem tools `pg-bkup` (PostgreSQL) and `mysql-bkup` (MySQL / MariaDB), each run as
a one-shot container against your database.

![Backups](/img/screenshots/backups.png)

## What you can back up

| Type | Engine / source | Tool |
|------|-----------------|------|
| Database backup | PostgreSQL | `pg-bkup` |
| Database backup | MySQL / MariaDB | `mysql-bkup` |
| Database backup | MongoDB | `mongodb-bkup` |
| Database backup | libSQL | `libsql-bkup` |
| Volume archive | Any workspace volume | `volume-bkup` (S3 only) |

:::caution Redis backups
Redis backups are **not yet supported**. For Redis, rely on persistence and replication for now.
:::

See [Databases overview](/docs/databases/overview) for how databases are provisioned in a
workspace.

## Manual backups

A manual backup runs once, immediately.

1. Go to **Storage → Backups** (or open the database / volume and use its **Backups** tab).
2. Select **Create backup**.
3. Choose the source (a database or a volume) and the **backup target** that receives the result.
4. Run it. Progress and the final status appear in the backup history.

## Scheduled backups

Scheduled backups run automatically on a **cron expression**, so you get hands-off, recurring
protection.

1. Select **Create schedule** on the backup you want to automate.
2. Pick the source and the destination backup target.
3. Enter a cron expression for the cadence, for example:

   | Cron | Runs |
   |------|------|
   | `0 2 * * *` | Every day at 02:00 |
   | `0 */6 * * *` | Every 6 hours |
   | `0 3 * * 0` | Weekly, Sunday 03:00 |

4. Save. Each run is recorded in the backup history with its outcome.

:::tip
Stagger schedules (for example databases at 02:00, volume archives at 03:00) so heavy jobs don't
contend for CPU and I/O at the same moment.
:::

## Volume archives

Volume archives capture the full contents of a [volume](/docs/storage/volumes) as a single
archive and send it to the workspace's backup target.

:::caution Volume archives require S3
There is no local destination for volume archives. Configure an S3 (or S3-compatible, e.g. MinIO)
backup target for the workspace first, or the archive fails with
`workspace S3 backup settings are not configured`. Volume archives also run **on demand only** —
scheduling is available for database backups, not for volumes.
:::

## Restoring

1. Open the backup history and find the backup or archive you want.
2. Select **Restore**.
3. Choose the target database or volume to restore into and confirm.

Restore runs as a one-shot job and reports its status when finished.

:::caution
Restoring overwrites existing data in the selected target. Confirm you have the right backup
before proceeding, and prefer restoring into a fresh database or volume when validating a backup.
:::
