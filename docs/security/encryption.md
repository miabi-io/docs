---
sidebar_position: 5
title: Encryption
description: Per-workspace encryption keys, what's encrypted at rest, MIABI_ENCRYPTION_KEY, GOMA_CONFIG_ENCRYPTION_KEY, key rotation, and crypto-shred.
---

# Encryption

Miabi encrypts sensitive data at rest using a **per-workspace key model**. Secrets are never stored in plain text and never written to logs.

![Encryption](/img/screenshots/encryption.png)

## Per-workspace keyring (DEK model)

Each workspace has its own **keyring** built around a **data-encryption key (DEK)**:

- A workspace's secrets are encrypted with that workspace's DEK.
- The DEK itself is protected by a root key derived from `MIABI_ENCRYPTION_KEY`.
- Because every workspace has distinct keys, the blast radius of any single key is contained to one tenant.

This DEK-per-workspace design keeps tenants cryptographically separated, complementing the [workspace_id isolation](/docs/workspaces/overview#multi-tenant-isolation) at the data layer.

## What is encrypted

Miabi AES-encrypts every secret value at rest, including:

| Secret | Source |
|--------|--------|
| App environment variables marked **secret** | Application configuration |
| Database passwords | Provisioned databases |
| Custom TLS private keys | Uploaded certificates |
| S3 / object-storage keys | Backup & storage backends |
| SSO client secrets | [SSO](/docs/security/sso) configuration |
| Configuration files | [Configs](/docs/secrets/configs) |
| Registry, Git repository and DNS provider credentials | Sources and networking |
| Webhook and notification channel secrets | [Webhooks & notifications](/docs/cicd/webhooks-and-notifications) |

Non-secret values remain readable; only data marked or known to be sensitive is encrypted.

Database **backups** are a separate layer: they are encrypted with a workspace passphrase you set,
not with the keyring, and recovery points are sealed with a rotatable per-point data key. See
[Encrypting database backups](/docs/storage/backup-targets#encrypting-database-backups) and the
[recovery kit](/docs/storage/backup-targets#the-recovery-kit).

## `MIABI_ENCRYPTION_KEY`

The root encryption key is supplied via the **`MIABI_ENCRYPTION_KEY`** environment variable. Miabi uses it to wrap each workspace's DEK.

```bash
export MIABI_ENCRYPTION_KEY="<a-strong-random-key>"
```

Outside a dev environment Miabi **refuses to start** without `MIABI_ENCRYPTION_KEY`, since secrets would
otherwise be stored unencrypted. **Admin → Platform → Platform Settings** shows the current encryption
posture (per-workspace keys, auto-rotation, gateway config encryption) read-only.

:::caution
Treat `MIABI_ENCRYPTION_KEY` as the master secret for the entire instance. Generate it from a strong random source, store it in a secret manager, and back it up securely. **If you lose it, encrypted data cannot be decrypted.** Never commit it to source control or print it in logs.
:::

## `GOMA_CONFIG_ENCRYPTION_KEY`

Separate from the master key. When set, Miabi **encrypts** the sensitive parts of the config it hands to **Goma Gateway** — middleware rules and TLS material — and each gateway **decrypts** it with the same key before applying. Empty leaves that gateway config unencrypted.

**A fresh install generates one and turns this on.** It is written to `spec.secrets.gomaConfigEncryptionKey` in the install manifest and handed to both the control plane and the gateway from that one value, so the two sides cannot disagree. An **existing** install is never switched on by an upgrade: a host may run a gateway you imported, which Miabi does not redeploy and so cannot hand the key to — its routes would fail to decrypt with no visible cause. If config encryption is on while such a gateway is registered, Miabi names those nodes in its logs at boot.

:::note Losing this key costs nothing permanent
Unlike `MIABI_ENCRYPTION_KEY`, the config it protects is rendered from the database on every sync. Rotating or losing it costs a converge and a re-sync, not data. The two sit side by side in the manifest with very different consequences.
:::

Because encryption and decryption happen on opposite sides, the **same value must be set on both** Miabi and the Goma gateway. In the Docker Compose stack that means setting `GOMA_CONFIG_ENCRYPTION_KEY` in your `.env` — it is passed to both the `miabi` and `gateway` services. For the remote edge gateways Miabi provisions on managed nodes, Miabi injects the key automatically, so a mismatch can't happen there.

```bash
export GOMA_CONFIG_ENCRYPTION_KEY="<a-strong-random-key>"
```

This is independent of `MIABI_ENCRYPTION_KEY` (which protects secrets in Miabi's own database). If the key is lost or the two sides disagree, a gateway can't decrypt its config — Miabi re-renders it on the next gateway deploy once the keys match again.

## Key rotation

Rotation replaces a **workspace's DEK**: Miabi creates a new key version, makes it active for new writes,
and re-encrypts the workspace's existing secrets under it. Once every value has moved, the old versions are
deleted. If part of the re-encryption fails, the old versions are kept (inactive) so nothing becomes
unreadable. `MIABI_ENCRYPTION_KEY` itself is not rotated by this.

- **Manually** — a platform admin clicks **Rotate encryption key** on the workspace's page under
  **Admin → Tenants → Workspaces**.
- **Automatically** — set `MIABI_KEY_AUTO_ROTATE=true`. A daily job rotates every workspace key older than
  `MIABI_KEY_ROTATE_MONTHS` (default `6`).

Rotate after a suspected exposure or as routine hygiene.

## Crypto-shred on delete

When a workspace is deleted, Miabi **crypto-shreds** its keys — the workspace's DEK is destroyed. Because the encrypted data can no longer be decrypted, deletion is effectively irreversible for that workspace's secrets, even if encrypted blobs linger in backups.

:::note
Crypto-shredding makes workspace deletion a strong privacy guarantee. Export anything you need before deleting a workspace.
:::

## Related

- [API Tokens](/docs/security/api-tokens) are stored as hashes, a one-way complement to encryption.
- Review encryption and key events in the [Audit Log](/docs/operations/audit-log).
