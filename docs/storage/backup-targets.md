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

:::tip
Use a dedicated, least-privilege bucket and credential pair for backups (write access to one
bucket), so a leaked key can't reach the rest of your storage.
:::

:::note
Test a new target with a one-off manual backup before relying on it for scheduled runs — that
confirms the endpoint, bucket, and credentials all work end to end.
:::
