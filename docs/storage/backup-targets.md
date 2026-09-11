---
sidebar_position: 3
title: Backup Targets
description: Configure local, S3, or MinIO destinations for backups with encrypted credentials.
---

# Backup Targets

A **backup target** is the destination where backups and volume archives are stored. You configure
a target once per workspace and reuse it across every backup and schedule — so you set credentials
in one place and point any number of [backups](/docs/storage/backups) at it.

![Backup targets](/img/screenshots/backup-targets.png)

## Target types

| Type | Where backups go |
|------|------------------|
| **Local** (default) | A per-workspace Docker volume named `mb-backups-<id>` on the Miabi host |
| **S3** | An Amazon S3 (or S3-compatible) bucket |
| **MinIO** | A self-hosted MinIO endpoint and bucket |

### Local

The default target needs no configuration. Backups are written to the workspace's dedicated
`mb-backups-<id>` Docker volume on the host. This is the simplest option and a good fit for
single-node setups, but the backups live on the same machine as your data — for true off-site
durability, use S3 or MinIO.

### S3

Provide:

- **Bucket** name
- **Region**
- **Access key ID** and **secret access key**

Works with Amazon S3 and S3-compatible providers.

### MinIO

Provide the MinIO **endpoint URL**, **bucket**, and **access / secret keys**. Ideal when you run
your own object storage and want off-host backups without a public cloud account.

## Creating a target

1. Go to **Storage → Backup targets**.
2. Select **Create target** and choose the type (Local, S3, or MinIO).
3. Fill in the endpoint, bucket, region, and credentials as required.
4. Save. The target is now selectable when you create any backup or schedule.

## Encrypted credentials

S3 and MinIO **secret keys are encrypted at rest** and are **never returned** by the API or shown
again in the console after you save them. When you need to change a key, enter a new value — there
is no way to read the stored secret back. This follows Miabi's platform-wide
[encryption](/docs/security/encryption) approach for sensitive data.

## Encrypting the backups themselves

Encrypted credentials protect the *connection* to your bucket. They do not protect the dump once it
is there — by default a database backup is written to object storage in plain text, readable by
anyone who can list the bucket.

Set a **database backup passphrase** under **Workspace settings → Backups** to change that. Every
database backup taken afterwards is GPG-encrypted before it leaves the host, and restores are
decrypted transparently with the same passphrase.

- **Record it outside Miabi.** A backup cannot be restored without it. There is no recovery path
  and no way to read the stored passphrase back — the API never returns it.
- **Existing backups are not re-encrypted.** Those already taken stay readable exactly as they are,
  and still restore. Encryption applies from the moment you set the passphrase.
- **It applies to manual and scheduled backups alike**, whether they go to S3 or the local backup
  volume.
- **Changing it does not re-encrypt old backups.** Each backup is readable with the passphrase that
  was set when it was taken, so keep the previous one until those backups have aged out.

To go back to unencrypted backups, tick **Turn encryption off** and save. Backups taken while the
passphrase was set still need it to restore.

Setting a passphrase is optional on every edition. A workspace without one keeps taking
unencrypted backups — encryption is a choice about your own data, not something the platform
requires of you.

### Rotating the passphrase

Recovery points are encrypted with a random key of their own, and that key is sealed under your
passphrase. Changing the passphrase re-seals those keys and leaves the stored dumps untouched, so
rotation is quick and every existing recovery point stays readable with the new passphrase.

The passphrase cannot be cleared while recovery points are still sealed with it. Clearing it would
not delete anything — it would make Miabi forget the only secret that opens them, and nothing would
look wrong until a restore was attempted. Delete those recovery points first, or keep the
passphrase.

### The recovery kit

Every recovery point offers a **recovery kit** download: a short document with the sealed key, the
exact encryption parameters, where the artifacts live in your bucket, and the commands to get from
your passphrase to a restorable dump — all without Miabi running.

The kit never contains the key itself, only the sealed form, so it is safe to store alongside the
backups it describes. It is worthless to anyone without the passphrase, and worth a great deal to
you if Miabi is the thing you have lost.

:::warning
Losing the passphrase means losing the backups it protects. Store it in the same place you keep
your other break-glass credentials, not only in Miabi.
:::

:::tip
Use a dedicated, least-privilege bucket and credential pair for backups (write access to one
bucket), so a leaked key can't reach the rest of your storage.
:::

:::note
Test a new target with a one-off manual backup before relying on it for scheduled runs — that
confirms the endpoint, bucket, and credentials all work end to end.
:::
