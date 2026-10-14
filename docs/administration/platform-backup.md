---
sidebar_position: 8
title: Platform backup & disaster recovery
description: Back up the Miabi control plane, rebuild a whole platform on a fresh host with `miabi restore`, and recover a locked-out admin.
---

# Platform backup & disaster recovery

[Backups](/docs/storage/backups) protect what runs *inside* a workspace. A **platform backup** protects
Miabi itself: the control-plane database, the platform volumes and, optionally, every workspace's
databases and volumes. It is what lets you rebuild a whole platform on a new host after the old one
is gone.

:::info Enterprise
Platform backup and restore are part of [Miabi Enterprise](/docs/editions/community-vs-enterprise).
The break-glass [admin recovery](#locked-out-admins) commands work in every edition.
:::

## Taking platform backups

Configure it in **Admin → Platform Backup**.

| Setting | What it does |
|---|---|
| **Destination** | An S3-compatible bucket: endpoint (blank for AWS), bucket, region, keys, an optional backup root, and path-style addressing for MinIO. |
| **Encrypt artifacts with a backup passphrase** | Encrypts every file in the recovery point. At least 12 characters, mixing letters with digits or symbols. |
| **Seal the identity envelope** | Stores the platform's encryption key and JWT secret in each recovery point, sealed under the passphrase. Needs a passphrase. |
| **Include tenant data** | Adds every workspace database and volume, turning a control-plane recovery point into a whole-platform one. Expect it to take as long, and as much space, as the data itself. |
| **Run on a schedule** | A standard 5-field cron, with **Keep at most** and **Retention (days)**. Choose which platform volumes the schedule includes. |

**Back up now** takes one immediately. **Recovery points** lists what is in the bucket, with
verify, retry-failed and delete actions; **History** lists the runs.

:::warning Record the passphrase out-of-band
The backup passphrase is **not** `MIABI_ENCRYPTION_KEY`. It is stored in the very database these
backups protect, so keep a copy somewhere else. Without the passphrase *and* the identity envelope, a
recovery point can only be restored onto a host that still has the original `MIABI_ENCRYPTION_KEY` —
never onto a fresh one.
:::

## Which restore do you need?

| Situation | Use |
|---|---|
| The platform is up; you want some tenant databases or volumes back | **Admin → Platform Backup → Restore from the backup target**. Tick the databases and volumes to restore. |
| The control-plane database is damaged, but the host and `/etc/miabi/miabi.yaml` survived | **Admin → Platform Backup** → restore from **History**. The encryption key is already on the host. |
| The host is gone | [`miabi restore`](#rebuilding-on-a-fresh-host) on a clean host. |

## Rebuilding on a fresh host

You need the bucket and credentials that reach it, the backup passphrase, and a clean host with
Docker and no existing Miabi install. The encryption key travels inside the recovery point, in the
identity envelope; the passphrase opens it.

### 1. List the recovery points

```bash
docker run --rm -it \
  -v /var/run/docker.sock:/var/run/docker.sock \
  miabi/miabi:<version> recovery-points \
    --from s3://my-bucket/prod \
    --endpoint https://s3.eu-central-1.amazonaws.com \
    --access-key … --secret-key …
```

For MinIO or another self-hosted store, add `--path-style`, and `--no-ssl` for plain HTTP.

### 2. Dry run

`--dry-run` validates the recovery point and prints the plan without changing anything:

```bash
echo -n 'your-backup-passphrase' > /root/dr.pass && chmod 600 /root/dr.pass

docker run --rm -it \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /etc/miabi:/etc/miabi \
  -v /root/dr.pass:/pass:ro \
  miabi/miabi:<version> restore \
    --from s3://my-bucket/prod \
    --endpoint https://s3.eu-central-1.amazonaws.com \
    --access-key … --secret-key … \
    --passphrase-file /pass \
    --dry-run
```

It refuses on a wrong passphrase, a missing artifact, a recovery point newer than the binary, a host
that already has an install, and an identity envelope whose encryption key is not the one the
recovery point was taken under.

### 3. Restore

Run the same command with `--yes` instead of `--dry-run`. It writes `/etc/miabi/miabi.yaml` with the
recovered encryption key and JWT secret (database and Redis passwords are minted fresh), starts
PostgreSQL and Redis, restores the control-plane database, verifies the key, restores the platform
volumes, then starts the control plane and the gateway.

| Option | Use |
|---|---|
| `--ref <id>` | Restore a specific recovery point instead of the newest. |
| `--domain <host>` | Serve the panel on a different hostname. |
| `--clone --domain <host>` | Restore as a **separate** platform beside the original, with a new install ID. It needs its own license. |
| `--image <image>` | Use a different control-plane image. |

Credentials can come from the environment instead of flags: `MIABI_S3_ACCESS_KEY`,
`MIABI_S3_SECRET_KEY` and `MIABI_BACKUP_PASSPHRASE`.

### 4. Reconcile and complete

The restore brings back **Miabi itself**. Workspaces are listed, but their apps, databases and
volumes do not exist on the new host yet. The platform starts **quiesced** on purpose: DNS still
points at the old machine, and requesting certificates against it would make the outage worse.

1. Sign in. A banner on **Admin → Platform Backup** shows the recovery state.
2. **Reconcile now.** This rebuilds the workloads:

   | | |
   |---|---|
   | Nodes | Stale swarm identity cleared; remote nodes marked awaiting re-enrolment |
   | Networks | Recreated with the same names and subnets |
   | Databases | Containers recreated from their stored spec |
   | Tenant data | Database dumps and volume archives restored into them |
   | Apps | Redeployed by recorded digest, or rebuilt from Git |
   | Routes | Gateway config re-rendered per workspace |

3. **Read the report.** What it lists as unrecoverable is gone.
4. Point DNS at the new host and wait for it to resolve.
5. **Complete recovery.** Schedules and certificate issuance resume.

Reconcile is safe to run again: it converges toward the restored state, so a partial run can simply
be repeated.

### Common refusals

| Message | Meaning |
|---|---|
| `identity envelope did not decrypt: wrong passphrase or corrupt file` | Wrong passphrase. |
| `recovery point … is sealed with a backup passphrase` | Pass `--passphrase-file`, or set `MIABI_BACKUP_PASSPHRASE`. |
| `no recovery point info file for …` | Wrong `--ref` or `--from`; run `recovery-points`. |
| `carries no identity envelope …` | Taken without a passphrase. It restores only onto a host that still has the original `MIABI_ENCRYPTION_KEY`. |
| `the envelope opened, but its encryption key is not the one … was taken under` | The envelope and the artifacts come from different platforms, or from before a key rotation. Do not force it — nothing would decrypt. |
| `this host already has a Miabi install` | Restore onto a clean host, or remove the existing install first. |
| `the recovery point records no domain; pass --domain` | The recovery point recorded no panel URL. |

## Locked-out admins

When a platform admin can't sign in — a lost password, a lost authenticator, a disabled account —
recover them from a shell inside the control-plane container. Access to that shell already means
control of the platform, so it is the trust boundary. Every use is audited and announced to the other
admins.

```bash
docker exec -it <control-plane container> miabi admin recover --email admin@example.com
docker exec -it <control-plane container> miabi admin reset-password --email admin@example.com
docker exec -it <control-plane container> miabi admin reset-2fa --email admin@example.com
```

| Action | Effect |
|---|---|
| `recover` | Replaces the password with a temporary one, turns two-factor off, re-enables a disabled account, and ends every session. |
| `reset-password` | Replaces the password and ends every session. Pass `--password-stdin --yes` to set your own instead of a generated one. |
| `reset-2fa` | Turns two-factor off; it must be set up again at the next admin sign-in. Also available as `miabi reset-2fa`. |

A generated password is shown once and must be changed at the next sign-in. Add `--yes` to skip the
confirmation prompt.
