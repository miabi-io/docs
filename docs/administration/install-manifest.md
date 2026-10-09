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
| `server` | The control plane container: image, the host `/proc` bind, extra environment, and who it believes forwarded headers from (`trustedProxies`). |
| `database`, `cache` | The PostgreSQL and Redis images. |
| `gateway` | Goma Gateway: image, the `goma.yml` beside this file, anything that config interpolates, and the proxies in front of it (`trustedProxies`). |
| `registry` | The built-in OCI registry: whether it runs, its hostname, and its storage driver. |
| `admin` | The first admin account's email. |
| `secrets` | Every credential the install holds, in plaintext — see below. |
| `networking` | The two Docker networks (including their address family — see [IPv6](/docs/networking/networks-and-subnets#ipv6)), the managed subnet pool, the host-port range, one-click app URLs, and the managed-DNS interval. |
| `backup` | The platform's own backup destination, schedule, encryption and retention (Enterprise). |
| `license` | Path to a signed Enterprise license on disk, installed only while the database holds none. |
| `runnerImage` | The build-runner image shown in runner enrollment commands (`MIABI_RUNNER_IMAGE`). The stack does not run it. |

Every field's type and description is published as a JSON Schema at
`https://docs.miabi.io/schema/install.miabi.io-v1.schema.json`, generated from the same types the
installer parses — so an editor pointed at it completes and validates exactly what the CLI accepts.

## Behind a CDN or load balancer

When Cloudflare, a cloud load balancer or another reverse proxy terminates TLS in front of the
gateway, list its addresses in `gateway.trustedProxies`:

```yaml
spec:
  gateway:
    trustedProxies:
      - "173.245.48.0/20"   # Cloudflare publishes its ranges at https://www.cloudflare.com/ips/
      - "2400:cb00::/32"
      - "10.0.0.5"          # or your load balancer's address
```

The gateway then believes the client IP and scheme those proxies forward, and from nobody else.
Without it, every request carries the proxy's address — so IP allowlists, rate limits and request
logs all see one client — and plaintext hops from a TLS terminator make HTTPS redirects loop.
Leave it unset when the gateway faces the internet directly.

Entries must be IPs or CIDRs; a catch-all such as `0.0.0.0/0` is refused, since it would let any
client choose its own IP. The list reaches the gateway as `GOMA_PROXY_ENABLED` and
`GOMA_PROXY_TRUSTED_PROXIES`, so your `goma.yml` stays untouched. To change which headers carry the
client IP, set `GOMA_PROXY_IP_HEADERS` in `gateway.env` (for Cloudflare,
`CF-Connecting-IP,X-Forwarded-For`).

The control plane has its own list, `server.trustedProxies`. It defaults to the private network, the
only one the gateway reaches it on, and the installer writes that default into the file so you can
see it:

```yaml
spec:
  server:
    trustedProxies:
      - "10.62.0.0/16"      # networking.internal.subnet — update both together
```

You rarely need to change it. If you change `networking.internal.subnet`, change this list with it,
or the control plane records the gateway's address as every client's IP. It compiles to
`MIABI_TRUSTED_PROXIES`, so that variable is refused in `server.env`.

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
moved. The error names where the value lives when a variable is refused:

- **Always refused:** anything Miabi derives from the manifest (domain, secrets, images, networks),
  every `MIABI_REGISTRY_*` variable, and `GOMA_CONFIG_ENCRYPTION_KEY`, whose only home is
  `spec.secrets.gomaConfigEncryptionKey`.
- **Refused while the manifest states it:** a variable an install section compiles to — the host-port
  range, subnet pool, external domain, DNS interval, license file or a backup field. Leave the
  section field out and the raw variable is available again as an escape hatch.

## Converting an older manifest

An install created before this release has a flat file starting `version: 1`. Both shapes load, and
`miabi setup` writes back whichever it read — it never converts a file underneath you.

**A whole-stack `miabi upgrade` converts it** (not one that names a single component), keeping the
original as `/etc/miabi/miabi.yaml.bak`. Every value is
carried across and none is regenerated. Keep the copy: a converted file cannot be read by an older
CLI, so rolling the CLI back means restoring it.

```bash
sudo miabi upgrade          # converts, then rolls the stack forward
```

## Where to go next

- [Installation](/docs/getting-started/installation) — creating the install this file describes.
- [Upgrades](/docs/upgrades/upgrading) — rolling it forward, and the conversion.
- [Configuration](/docs/getting-started/configuration) — the full environment-variable reference.
