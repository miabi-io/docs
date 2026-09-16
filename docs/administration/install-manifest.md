---
sidebar_position: 7
title: Install Manifest
description: The install.miabi.io/v1 ControlPlane document — the desired state of a Miabi host, what each section configures, and how an older flat manifest is converted.
---

# Install Manifest

A managed install keeps its desired state in `/etc/miabi/miabi.yaml`, mode `0600`. It has to be a
file on the host rather than a database table, because PostgreSQL is *itself* part of the stack — the
installer cannot read the database to learn how to start the database.

`miabi setup` converges the stack to whatever this file says, and is safe to re-run.

## Document shape

```yaml
apiVersion: install.miabi.io/v1   # the only accepted value
kind: ControlPlane                # the only kind
metadata:
  name: miabi                     # names the install in `stack status`; nothing else
spec: {}
```

This is a **different dialect** from the `miabi.io/v1` used for
[application manifests](/docs/cicd/manifest-reference). That one describes resources inside a
workspace and is applied through the API; this one describes the host itself and is applied by the
CLI, as root. They are versioned separately and validated by different code.

Unknown fields are **refused**, so a misspelled key is an error rather than a setting that silently
does nothing.

## What each section configures

| Section | Configures |
|---|---|
| `domain`, `endpoints` | The panel's hostname, its browser URL, and the URL nodes, agents and runners dial back on. |
| `acme` | The certificate authority and the contact address for every acme-managed host. |
| `server` | The control plane container: image, the host `/proc` bind, and extra environment. |
| `database`, `cache` | The PostgreSQL and Redis images. |
| `gateway` | Goma Gateway: image, the `goma.yml` beside this file, and anything that config interpolates. |
| `registry` | The built-in OCI registry: whether it runs, its hostname, and its storage driver. |
| `admin` | The first admin account's email. |
| `secrets` | Every credential the install holds, in plaintext — see below. |
| `networking` | The two Docker networks, the managed subnet pool, the host-port range, one-click app URLs, and the managed-DNS interval. |
| `backup` | The platform's own backup destination, schedule, encryption and retention (Enterprise). |
| `license` | Path to a signed Enterprise license on disk. |

Every field's type and description is published as a JSON Schema at
`https://docs.miabi.io/schema/install.miabi.io-v1.schema.json`, generated from the same types the
installer parses — so an editor pointed at it completes and validates exactly what the CLI accepts.

## Settings the manifest pins

Most of `networking`, `backup`, `registry.storage` and `license` describe things the **console** can
also configure. Stating one in the manifest makes it **read-only in the console**, shown with the
variable that decides it. That is the point: an install described by infrastructure-as-code stays
authoritative, and nobody can edit a value out from under your configuration management.

Removing the field and converging hands the setting back to the console.

:::caution A backup destination is all-or-nothing
`backup.destination` is applied only when `bucket`, `accessKey` and `secretKey` are all present. With
any one missing, the whole block is ignored and the console stays in charge — so the manifest is
refused at converge rather than appearing to work.
:::

## Secrets

They live in this file, in plaintext. The file is `0600` on a root-owned host, and anyone who can
read it already has the Docker socket, which is root — so the file's mode, not obfuscation, is the
boundary.

Two of them cannot be rotated in place:

- **`dbPassword`** — PostgreSQL keeps the password its data directory was created with. Changing it
  here does not migrate anything.
- **`encryptionKey`** — it decrypts every secret Miabi has stored.

**`gomaConfigEncryptionKey` is the opposite** and worth knowing apart from the other two: the gateway
config it protects is rendered from the database on every sync, so rotating it costs a converge and a
re-sync, not data. A fresh install generates it and turns config encryption on; an upgrade never
does, because a host may run an imported gateway Miabi cannot hand the key to. See
[Encryption](/docs/security/encryption).

:::danger Back up this file
It holds the database password, the JWT secret and the encryption key, and it is the only copy.
Without it you cannot decrypt the secrets Miabi has stored, and a fresh install onto the existing
data volume will refuse to run.
:::

## Fields Miabi writes

Two fields are derived state, not settings:

- **`gateway.configSha`** — the digest of the *default* gateway config Miabi last wrote. It is what
  lets an untouched `goma.yml` keep receiving upstream improvements while one you customised is never
  clobbered. Editing it by hand is how that protection is lost.
- **`server.dockerGid`** — the host's docker group, read from the Docker socket.

## Changing it

Edit the file and re-run `sudo miabi setup`. For environment variables, don't edit by hand:

```bash
sudo miabi stack env ls
sudo miabi stack env set MIABI_SMTP_HOST=smtp.example.com
sudo miabi stack env set GOMA_LOG_LEVEL=debug --gateway
sudo miabi stack env unset MIABI_SMTP_HOST
```

Each shows what changes, asks, then converges — recreating only the component whose environment
moved. Settings with their own section (the registry, the networks, the backup destination) are
refused there, and the error names where the value lives.

## Converting an older manifest

An install created before this release has a flat file starting `version: 1`. Both shapes load, and
`miabi setup` writes back whichever it read — it never converts a file underneath you.

**`miabi upgrade` converts it**, keeping the original as `/etc/miabi/miabi.yaml.bak`. Every value is
carried across and none is regenerated. Keep the copy: a converted file cannot be read by an older
CLI, so rolling the CLI back means restoring it.

```bash
sudo miabi upgrade          # converts, then rolls the stack forward
```

## Where to go next

- [Installation](/docs/getting-started/installation) — creating the install this file describes.
- [Upgrades](/docs/upgrades/upgrading) — rolling it forward, and the conversion.
- [Configuration](/docs/getting-started/configuration) — the full environment-variable reference.
