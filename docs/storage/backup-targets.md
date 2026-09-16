---
sidebar_position: 3
title: Backup Target
description: Configure the workspace's S3-compatible backup target, its encrypted credentials, and the passphrase that encrypts database backups.
---

# Backup Target

Every workspace has **one backup target**: an S3-compatible bucket, with credentials, shared by
everything that backs up workspace data. You configure it once under **Workspace settings → Backup**,
and every [backup](/docs/storage/backups) uses it. You don't pick a destination per backup or per
schedule.

| Uses the target | Without a target |
|---|---|
| Database backups (manual and scheduled) | Written to a per-workspace Docker volume, `mb-backups-<id>`, on the database's node |
| [Recovery points](/docs/storage/backups#recovery-points) | Not available |
| [Volume archives](/docs/storage/backups#volume-archives) | Not available |
| Portable workspace bundles | Not available |

:::caution Local backups share the host with your data
The `mb-backups-<id>` volume is only a fallback. It lives on the same machine as the databases it
protects, so losing the host loses the backups too. For anything you care about, configure the S3
target.
:::

## Configuring the target

Open **Workspace settings → Backup** (workspace **admins** only), tick **Enable S3 backups for this
workspace**, and fill in:

| Field | Notes |
|---|---|
| **Bucket** | Required. |
| **Region** | For example `us-east-1`. |
| **Endpoint** | Optional, for S3-compatible stores (MinIO, Ceph, Cloudflare R2, …). Leave empty for AWS S3. |
| **Access key** / **Secret key** | The secret is stored encrypted and never shown again. |
| **Database backup path** | Prefix for database backups and recovery points, for example `backups/databases`. |
| **Volume backup path** | Prefix for volume archives, for example `backups/volumes`. |
| **Database backup passphrase** | Optional. Encrypts database backups. See [below](#encrypting-database-backups). |
| **Bundle path** / **Bundle passphrase** | Where portable workspace bundles go, and the passphrase that seals them. |
| **Use SSL (HTTPS)** | Leave on unless your endpoint is plain HTTP. |
| **Force path-style URLs** | Required by MinIO and some S3-compatible stores. |

Select **Save settings**. The target applies to the next backup; nothing already stored is moved.

:::tip MinIO and other S3-compatible stores
There is no separate MinIO type. Set the **Endpoint** to your MinIO URL and tick **Force path-style
URLs**.
:::

### Testing the connection

**Test connection** proves the target works by using it. Under every prefix the workspace writes to,
it writes a small object, reads it back, and deletes it, then reports each prefix separately:

- **written, read back and removed**: backups and retention both work.
- **written and read back, but not deletable**: backups will work, but retention cannot prune old
  ones. Grant the credential delete permission on the bucket.
- An error names what failed for that prefix.

:::tip
Use a dedicated, least-privilege bucket and credential pair for backups (read, write and delete on
one bucket), so a leaked key can't reach the rest of your storage.
:::

## Encrypted credentials

The **secret key is encrypted at rest** and is **never returned** by the API or shown again in the
console. Leave the field blank when saving to keep the stored one; enter a new value to replace it.
This follows Miabi's platform-wide [encryption](/docs/security/encryption) approach for sensitive
data.

## Encrypting database backups

Encrypted credentials protect the *connection* to your bucket. They do not protect the dump once it
is there. By default a database backup is written in plain text, readable by anyone who can list the
bucket or the backup volume.

Set a **Database backup passphrase** under **Workspace settings → Backup** to change that. It must be
at least 12 characters and mix letters with digits or symbols. Every database backup taken afterwards
is GPG-encrypted before it leaves the host, and restores decrypt it with the workspace passphrase.

- **Record it outside Miabi.** A backup cannot be restored without it. There is no recovery path
  and no way to read the stored passphrase back; the API never returns it.
- **Existing backups are not re-encrypted.** Those already taken stay readable exactly as they are,
  and still restore. Encryption applies from the moment you set the passphrase.
- **It applies to manual and scheduled backups and to recovery points**, whether they go to S3 or
  the local backup volume. The safety dumps Miabi takes before a
  [version upgrade](/docs/databases/version-upgrades) are the exception: they stay on the local volume
  unencrypted.
- **A single-database backup is encrypted with the passphrase itself.** After you change it, those
  backups need the passphrase they were taken with, so keep the previous one until they have aged out.
  Recovery points work differently; see [rotating the passphrase](#rotating-the-passphrase).

To go back to unencrypted backups, tick **Turn encryption off — new backups will be stored
unencrypted** and save. Backups taken while the passphrase was set still need it to restore.

Setting a passphrase is optional on every edition. A workspace without one keeps taking
unencrypted backups; encryption is a choice about your own data, not something the platform
requires of you.

### Rotating the passphrase

Each recovery point is encrypted with a random data key of its own, and that key is sealed under your
passphrase. Changing the passphrase re-seals those keys and leaves the stored dumps untouched, so
rotation is quick and every existing recovery point stays readable with the new passphrase.

The passphrase cannot be cleared while recovery points are still sealed with it. Clearing it would
not delete anything. It would make Miabi forget the only secret that opens them, and nothing would
look wrong until a restore was attempted. Delete those recovery points first, or keep the
passphrase.

### The recovery kit

Every recovery point offers a **recovery kit** download: a short document with the sealed key, the
exact encryption parameters, where the artifacts live in your bucket, and the commands to get from
your passphrase to a restorable dump, all without Miabi running.

The kit never contains the key itself, only the sealed form, so it is safe to store alongside the
backups it describes. It is worthless to anyone without the passphrase, and worth a great deal to
you if Miabi is the thing you have lost.

:::warning
Losing the passphrase means losing the backups it protects. Store it in the same place you keep
your other break-glass credentials, not only in Miabi.
:::
