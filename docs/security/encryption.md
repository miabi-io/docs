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

Non-secret values remain readable; only data marked or known to be sensitive is encrypted.

## `MIABI_ENCRYPTION_KEY`

The root encryption key is supplied via the **`MIABI_ENCRYPTION_KEY`** environment variable. Miabi uses it to wrap each workspace's DEK.

```bash
export MIABI_ENCRYPTION_KEY="<a-strong-random-key>"
```

:::caution
Treat `MIABI_ENCRYPTION_KEY` as the master secret for the entire instance. Generate it from a strong random source, store it in a secret manager, and back it up securely. **If you lose it, encrypted data cannot be decrypted.** Never commit it to source control or print it in logs.
:::

## `GOMA_CONFIG_ENCRYPTION_KEY`

Separate and optional. When set, Miabi **encrypts** the sensitive parts of the config it hands to **Goma Gateway** — middleware rules and TLS material — and each gateway **decrypts** it with the same key before applying. Empty (the default) leaves that gateway config unencrypted.

Because encryption and decryption happen on opposite sides, the **same value must be set on both** Miabi and the Goma gateway. In the Docker Compose stack that means setting `GOMA_CONFIG_ENCRYPTION_KEY` in your `.env` — it is passed to both the `miabi` and `gateway` services. For the remote edge gateways Miabi provisions on managed nodes, Miabi injects the key automatically, so a mismatch can't happen there.

```bash
export GOMA_CONFIG_ENCRYPTION_KEY="<a-strong-random-key>"
```

This is independent of `MIABI_ENCRYPTION_KEY` (which protects secrets in Miabi's own database). If the key is lost or the two sides disagree, a gateway can't decrypt its config — Miabi re-renders it on the next gateway deploy once the keys match again.

## Key rotation

Miabi supports rotating keys without downtime, both **manually** (on demand) and **automatically** (on a schedule). Rotation re-wraps the workspace DEKs under a new root key version; existing encrypted data is migrated to the new key transparently. Rotate after a suspected exposure or as routine hygiene.

## Crypto-shred on delete

When a workspace is deleted, Miabi **crypto-shreds** its keys — the workspace's DEK is destroyed. Because the encrypted data can no longer be decrypted, deletion is effectively irreversible for that workspace's secrets, even if encrypted blobs linger in backups.

:::note
Crypto-shredding makes workspace deletion a strong privacy guarantee. Export anything you need before deleting a workspace.
:::

## Related

- [API Tokens](/docs/security/api-tokens) are stored as hashes, a one-way complement to encryption.
- Review encryption and key events in the [Audit Log](/docs/operations/audit-log).
