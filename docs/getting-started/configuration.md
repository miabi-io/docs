---
sidebar_position: 3
title: Configuration
description: Configure Miabi through environment variables and secrets
---

# Configuration

Miabi is configured entirely through **environment variables**, loaded from the `.env` file in the
Compose directory (or the process environment). This page covers the variables you are most likely
to set; the official image ships with sensible defaults for the rest.

Every service in the shipped Compose files reads that single `.env` via Docker Compose's `env_file`
directive, so the workflow is: **rename `.env.example` → `.env`, fill in the values, and
`docker compose up`** — no per-service edits.

:::caution If you installed with the installer, there is no `.env`
A stack install (the [one-liner](/docs/getting-started/installation) or `docker run … install`)
keeps its configuration in the manifest at **`/etc/miabi/stack.yaml`**, and passes it to the
containers itself. Creating a `.env` file there changes nothing — nothing reads it.

Set these variables under the manifest's `env:` block instead, then apply them:

```bash
sudo vi /etc/miabi/stack.yaml     # env: { MIABI_LOG_LEVEL: debug, … }
miabi-stack install               # re-converges; recreates only what actually changed
```

Use `install`, **not** `restart`. An env var is part of a container's spec, and a spec can only be
changed by recreating the container — `restart` restarts the ones you already have, so an edited
manifest would appear to do nothing (it prints a note when it spots this). Re-running `install` on a
live stack is safe and idempotent: it leaves containers whose spec is unchanged alone.

The variable names and meanings below are the same either way; only where you write them differs.
Miabi owns a handful of keys in that file (the database URL, the secrets, the domain) and rejects
attempts to override them from `env:` — see [The manifest](/docs/getting-started/installation#the-manifest).
:::

## Core

| Variable | Default | Description |
|----------|---------|-------------|
| `MIABI_PORT` | `9000` | API listen port |
| `MIABI_ENV` | `dev` | `dev` or `production` |
| `MIABI_JWT_SECRET` | — | **Required in production.** Signs access tokens |
| `MIABI_ENCRYPTION_KEY` | — | AES key for secrets at rest (env vars, DB passwords, custom certs). Without it, those values are only base64-encoded |
| `MIABI_WEB_URL` | — | Public URL of your instance (used for links, OAuth callbacks, invitations). Also the CORS allowlist, so it must be a concrete origin |
| `MIABI_CORS_ORIGINS` | `*` | Comma-separated allowed origins; a `*` wildcard is rejected in production |
| `MIABI_ADMIN_EMAIL` | `admin@example.com` | Login of the platform admin seeded on first boot |
| `MIABI_ADMIN_PASSWORD` | — | **Required in production.** Password for the seeded platform admin. Miabi refuses to start outside dev while this is empty or left at its built-in default |
| `MIABI_LOG_LEVEL` | — | How chatty Miabi's own logs are: `debug`, `info`, `warn`, `error`. Empty follows the environment — `debug` in dev, `info` in production |
| `TZ` | `UTC` | Timezone for log timestamps and scheduled jobs. Any zoneinfo name (`Europe/Paris`, `America/New_York`) |

:::caution
Generate strong random values for `MIABI_JWT_SECRET` and `MIABI_ENCRYPTION_KEY` with
`openssl rand -hex 32`. Keep `.env` at `chmod 600` and out of version control. See
[Encryption](/docs/security/encryption) for how secrets are protected at rest.
:::

### Log level

A value Miabi does not recognize is a **startup error**, not a silent fallback to `info` — otherwise
a typo would leave you watching for logs that were never going to appear.

`off` is deliberately not offered. The logging library cannot honour it for the calls Miabi actually
makes: it would silence part of the logging and leave the rest running, which is more confusing than
useful. Use `error` for near-silence.

### Timezone

On a [stack install](/docs/getting-started/installation) `TZ` applies to the **whole** stack — Miabi,
PostgreSQL, Redis and the gateway — so their log timestamps agree. Setting it on the control plane
alone would put Miabi's logs in a different timezone from every container it manages, which is the
worst way to read a timeline across them.

## Enforcement switches

Two similarly named variables that do unrelated things. Both are on by default; turning either off
removes a protection:

| Variable | Default | Description |
|----------|---------|-------------|
| `MIABI_PLAN_ENFORCEMENT` | `true` | Enforce per-workspace [plan quotas and capability gates](/docs/workspaces/plans-and-quotas). Set `false` to make every quota check pass and every gate open |
| `MIABI_SECURITY_ENFORCEMENT` | `true` | Stop a platform admin from raw-stopping or removing a Miabi-managed container from the admin node view. Set `false` only as a break-glass escape hatch |
| `MIABI_UPDATE_CHECK` | `true` | Daily check for a newer Miabi release, surfaced as an admin notice. Notify-only — Miabi never upgrades itself. See [Upgrades](/docs/administration/upgrades) |
| `MIABI_PASSWORD_RESET_ENABLED` | `true` | Allow self-service password reset (the "forgot password" flow). A critical auth control, so it is fixed at boot — set `false` to disable it, and **restart** to apply. Not editable at runtime |

### GPUs

Off by default. See [GPUs](/docs/applications/gpus) for the full workflow.

| Variable | Default | Description |
|----------|---------|-------------|
| `MIABI_GPU_ENABLED` | `false` | Master switch for GPU support. When off, nodes are never probed and the GPU UI is hidden |
| `MIABI_NVIDIA_RUNTIME` | `nvidia` | The container runtime name that signals the NVIDIA Container Toolkit is installed |
| `MIABI_GPU_PROBE_IMAGE` | `nvidia/cuda:12.4.1-base-ubuntu22.04` | One-shot image the device-inventory probe runs `nvidia-smi` in. Point at a mirror for air-gapped fleets |
| `MIABI_GPU_INVENTORY_MINUTES` | `30` | How often nodes are re-inventoried for GPUs |

## Database & cache

| Variable | Default | Description |
|----------|---------|-------------|
| `MIABI_DB_HOST` | `localhost` | PostgreSQL host |
| `MIABI_DB_PORT` | `5432` | PostgreSQL port |
| `MIABI_DB_USER` | `miabi` | PostgreSQL user |
| `MIABI_DB_PASSWORD` | `miabi` | PostgreSQL password |
| `MIABI_DB_NAME` | `miabi` | Database name |
| `MIABI_DB_SSL_MODE` | `disable` | libpq `sslmode` (`disable`, `require`, `verify-full`, …) |
| `MIABI_DB_URL` | — | Full DSN; overrides every `MIABI_DB_*` part above |
| `MIABI_REDIS_ADDR` | `localhost:6379` | Redis address (cache, rate limiting, job queue) |
| `MIABI_REDIS_PASSWORD` | — | Redis password |

## Workers, metrics & proxy

| Variable | Default | Description |
|----------|---------|-------------|
| `MIABI_WORKER_CONCURRENCY` | `10` | Background worker (asynq) concurrency |
| `MIABI_WORKER_MAX_RETRIES` | `5` | Task retry attempts |
| `MIABI_METRICS_ENABLED` | `false` | Prometheus `/metrics` + history scraper. **Off by default** — `/metrics` is not served until you enable it |
| `MIABI_METRICS_SCRAPE_SECONDS` | `60` | Metrics sampling interval |
| `MIABI_METRICS_RETENTION_HOURS` | `24` | Metrics history window |
| `MIABI_PROXY_NETWORK` | `miabi` | Docker network shared by the gateway and app containers so the proxy can reach backends (legacy alias: `MIABI_GOMA_NETWORK`) |
| `MIABI_GOMA_PROVIDER_DIR` | `/etc/goma/providers` | Directory where Miabi writes per-route Goma config files that the gateway hot-reloads |
| `MIABI_WEB_DIR` | — | Directory of the built web UI; when set, Miabi serves it as an SPA at `/`. The official image serves the UI from the embedded binary |
| `DOCKER_HOST` | `unix:///var/run/docker.sock` | Docker Engine endpoint |

## Public app URLs

Miabi can hand every app a ready-to-use public URL under a wildcard base domain (the "one-click URL"
feature). Point `*.<base>` DNS at the gateway and set:

| Variable | Default | Description |
|----------|---------|-------------|
| `MIABI_EXTERNAL_BASE_DOMAIN` | — | Base domain for one-click app URLs, e.g. `apps.example.com` (point `*.apps.example.com` at the gateway) |
| `MIABI_EXTERNAL_BASE_PROVIDER` | — | Goma certManager provider used for those app certs (empty = gateway default) |

## Log store

Deploy, pipeline, job, and backup logs are **externalized out of Postgres** into a filesystem
backend once a run is terminal, keeping only a bounded tail in the database. Mount `MIABI_LOG_DIR`
on a volume so logs survive restarts — and if you run a **separate `worker` service, mount the same
volume there** so the control plane can read the logs the worker writes.

| Variable | Default | Description |
|----------|---------|-------------|
| `MIABI_LOG_BACKEND` | `filesystem` | `filesystem` or `off` (keep only the DB tail) |
| `MIABI_LOG_DIR` | `/var/lib/miabi/logs` | Root directory for externalized logs |
| `MIABI_LOG_RETENTION_DAYS` | `30` | Days to keep externalized logs (`0` = forever) |
| `MIABI_LOG_MAX_BYTES` | `33554432` | Per-log cap (32 MiB); middle-truncated past it |
| `MIABI_LOG_TAIL_BYTES` | `16384` | Bounded tail (16 KiB) kept in the database |
| `MIABI_LOG_COMPRESSION` | `gzip` | `gzip` or `none` |

See [Log storage](/docs/operations/log-storage) for the full model.

## The background worker

Miabi runs an [asynq](https://github.com/hibiken/asynq) worker that executes deploys, database
provisioning, backups, and other long-running jobs. By default the worker is **embedded** in the
control plane process — no separate container required. For production you can run a dedicated
worker process so the API and background processing scale independently:

```bash
# API server
miabi server

# Worker (separate process / container)
miabi worker
```

Multiple worker instances share the same Redis queue, so you can scale them horizontally.

## Reverse proxy & TLS

Routing and TLS termination are handled by [Goma Gateway](/docs/networking/routing-and-middlewares),
configured through `goma/goma.yml`. Miabi drives the **local** gateway purely through the watched
file-provider directory (`MIABI_GOMA_PROVIDER_DIR`) — it writes per-route files there and Goma
hot-reloads them, with no API endpoint or token involved.

Gateways on **remote nodes** work differently: they poll a token-authenticated HTTP provider
endpoint on the control plane for their routes.

`goma.yml` itself supports **`${VAR}` environment-variable substitution** in any field — `hosts`,
`redis.password`, `certManager.acme.email`, and so on — so the shipped config reads your domain and
ACME email straight from the same `.env`. Only the braced `${VAR}` form is expanded; unset variables
are left literal and a bare `$` (bcrypt hashes, regex) is untouched.

Prefer **Traefik** as the edge proxy? Miabi ships a Traefik variant
(`compose.traefik.yaml`) — see [Reverse proxy & Traefik](/docs/networking/reverse-proxy-and-traefik)
for its trade-offs (label-based routing; rolling/canary and the built-in registry require Goma). See
[TLS Certificates](/docs/networking/tls-certificates) for the certificate model.

## Outbound email (SMTP)

Used for invitations, password resets, and welcome mails. Without a host and a from-address those
emails are **silently skipped** — nothing fails, they simply never arrive.

| Variable | Default | Description |
|----------|---------|-------------|
| `MIABI_SMTP_HOST` | — | SMTP server hostname. Unset ⇒ platform email disabled |
| `MIABI_SMTP_PORT` | `587` | SMTP port |
| `MIABI_SMTP_USERNAME` | — | SMTP auth username |
| `MIABI_SMTP_PASSWORD` | — | SMTP auth password |
| `MIABI_SMTP_FROM` | — | From address, e.g. `Miabi <no-reply@example.com>` |
| `MIABI_SMTP_ENCRYPTION` | `starttls` | `starttls`, `tls`, or `none` |
| `MIABI_APP_NAME` | `Miabi` | Product name shown in those emails |

## Certificates & DNS

| Variable | Default | Description |
|----------|---------|-------------|
| `MIABI_ACME_EMAIL` | — | Contact address registered with Let's Encrypt (Goma + node gateways) |
| `MIABI_ACME_DIRECTORY_URL` | — | ACME directory for **managed** DNS-01 certs. Empty = Let's Encrypt production; point at staging while testing to avoid rate limits |
| `MIABI_CERT_RENEW_DAYS` | `30` | Renew a managed certificate this many days before expiry |
| `MIABI_DNS_RECONCILE_MINUTES` | `30` | Cadence of the managed-DNS reconcile sweep |

## Encryption & key rotation

| Variable | Default | Description |
|----------|---------|-------------|
| `MIABI_KEY_AUTO_ROTATE` | `false` | Enable the per-workspace encryption-key rotation cron |
| `MIABI_KEY_ROTATE_MONTHS` | `6` | Max age of an active key before rotation (re-encrypts the workspace's secrets) |
| `GOMA_CONFIG_ENCRYPTION_KEY` | — | Encrypts sensitive gateway config (middleware rules, TLS material) at rest: Miabi encrypts, Goma decrypts. Set the **same value on both** the `miabi` and `gateway` services (Miabi injects it into remote edge gateways automatically). Empty = off. See [Encryption](/docs/security/encryption) |

## Builds & runners

| Variable | Default | Description |
|----------|---------|-------------|
| `MIABI_RUNNER_IMAGE` | `miabi/runner:latest` | Image shown in the runner enrollment command. Versions independently of the panel |
| `MIABI_BUILD_TIMEOUT_MINUTES` | `30` | Platform-wide cap on a single image build |
| `MIABI_RUNNER_WAIT_TIMEOUT_MINUTES` | `30` | How long a build waits for a free runner before failing. There is **no** local-build fallback |
| `MIABI_JOB_API_TOKEN_ENABLED` | `true` | Inject a short-lived `MIABI_JOB_TOKEN` into pipeline steps |

## Built-in registry

Whether the registry runs, what hostname it answers on, and where it stores blobs come **only** from
the environment: the UI shows all of them read-only, and a change takes a **restart**. The registry
hostname is what every stored image reference is anchored to, and matching a reference against it is
how Miabi decides which workspace owns an image; the storage driver is where every pushed blob
physically lives. Neither can move under a running platform. An invalid host refuses to boot.

The `s3` driver requires the `registry_s3` entitlement, checked **at startup** (and before each
garbage collection). Without a license, or with `s3` and no bucket, the registry is **not started**
and the reason is logged and shown on the settings page.

The remaining variables are **one-way overrides**: a non-empty value pins that setting on boot. Only
the per-workspace quota and the delete/GC switch are editable in the UI. See
[Registry](/docs/registry/administration).

| Variable | Default | Description |
|----------|---------|-------------|
| `MIABI_REGISTRY_ENABLED` | `false` | Run the built-in OCI registry. The only on/off switch; restart to change |
| `MIABI_REGISTRY_HOST` | — | Registry hostname; restart to change. Empty ⇒ `registry.<MIABI_EXTERNAL_BASE_DOMAIN>`; with neither, image distribution fails. Must be a bare DNS hostname with an optional port (no scheme, no path, not a single label) |
| `MIABI_REGISTRY_STORAGE` | `filesystem` | `filesystem` or `s3`; restart to change. `s3` is an Enterprise feature, verified at startup |
| `MIABI_REGISTRY_IMAGE` | — | Override the registry image (default `registry:3`) |
| `MIABI_REGISTRY_AUTH_URL` | `http://miabi:9000` | Where the gateway reaches Miabi's registry auth endpoint |
| `MIABI_REGISTRY_PLATFORM_TOKEN` | — | Pin the platform token (otherwise derived from the master encryption key) |
| `MIABI_REGISTRY_S3_ENDPOINT` | — | S3 endpoint URL (set it for MinIO; leave empty for Amazon S3); restart to change |
| `MIABI_REGISTRY_S3_BUCKET` | — | S3 bucket — required when `MIABI_REGISTRY_STORAGE=s3`; restart to change |
| `MIABI_REGISTRY_S3_REGION` | — | S3 region; restart to change |
| `MIABI_REGISTRY_S3_ACCESS_KEY` | — | S3 access key; restart to change |
| `MIABI_REGISTRY_S3_SECRET_KEY` | — | S3 secret key (encrypted at rest); restart to change |
| `MIABI_REGISTRY_S3_FORCE_PATH_STYLE` | `false` | Path-style addressing (MinIO and most S3-compatible stores); restart to change |

## Nodes, networks & port forwarding

| Variable | Default | Description |
|----------|---------|-------------|
| `MIABI_NODE_GATEWAY_IMAGE` | `jkaninda/goma-gateway:latest` | Goma image deployed on edge-gateway nodes. The shipped compose drives this from `GOMA_IMAGE` so it always matches the local gateway |
| `MIABI_CONTROL_URL` | falls back to `MIABI_API_URL` | Public URL remote nodes reach the control plane at |
| `MIABI_NETWORK_CIDR` | `10.63.0.0/16` | CIDR of the shared `miabi` reverse-proxy bridge (gateway + routed app/database containers). `install.sh` pre-creates it as an **external** network with this subnet so it isn't capped by Docker's default pool; must not overlap `MIABI_NETWORK_POOL_CIDR` or your LAN |
| `MIABI_NETWORK_POOL_CIDR` | `10.64.0.0/12` | Address pool workspace networks are carved from |
| `MIABI_NETWORK_SUBNET_PREFIX` | `24` | Prefix length per workspace network (a `/12` pool ⇒ 4096 networks) |
| `MIABI_HOST_PORT_MIN` | `1024` | Lowest host port Miabi may allocate |
| `MIABI_HOST_PORT_MAX` | `65535` | Highest host port Miabi may allocate |
| `MIABI_FORWARD_TTL_MINUTES` | `30` | How long a temporary database port-forward lives |
| `MIABI_FORWARD_BIND_ADDR` | `127.0.0.1` | Address the forward relay binds to |
| `MIABI_FORWARD_ADVERTISE_HOST` | — | Host shown to the user in the forward's connection string |
| `MIABI_FORWARD_RELAY_IMAGE` | `alpine/socat:latest` | Image used for the forward relay container |
| `MIABI_HOST_PROC` | `/host/proc` | procfs path for real host CPU/memory. The compose binds `/proc:/host/proc:ro` |

## Container security profile

| Variable | Default | Description |
|----------|---------|-------------|
| `MIABI_FORCE_NON_ROOT_USER` | `false` | Force every app & job container to a non-root UID regardless of plan |
| `MIABI_RESTRICTED_UID` | `100000` | The UID used by the restricted profile |
| `MIABI_SECURITY_INIT_IMAGE` | `busybox:latest` | Init image used to prepare restricted containers |

## Licensing

| Variable | Default | Description |
|----------|---------|-------------|
| `MIABI_LICENSE_FILE` | — | Path to a signed license token auto-installed on boot (air-gapped / IaC friendly). A newer DB-installed license still wins |
| `MIABI_LICENSE_PUBLIC_KEY` | — | Base64 Ed25519 key used to verify a license offline. Normally baked into the binary; this override is for dev/test |

## Advanced

| Variable | Default | Description |
|----------|---------|-------------|
| `MIABI_DEV_MODE` | `false` | Relax production guards. Never enable on a public instance |
| `MIABI_OPENAPI_DOCS` | `true` | Serve the interactive API reference at `/docs` |
| `MIABI_MARKETPLACE_URL` | the marketplace repo's latest release asset | Where templates are synced from. Set to an explicit empty value to disable syncing (offline kill switch) |
| `MIABI_DELETION_GRACE_DAYS` | `7` | Days an admin-scheduled account deletion waits before the data is purged |
| `MIABI_RESTORE_MAX_MB` | `1024` | Max size of an uploaded database dump for restore |
| `MIABI_STORAGE_USAGE_ENABLED` | `true` | Periodically measure each volume's real on-disk usage (`docker system df`) and cache it, so the UI shows declared-vs-used. Off ⇒ no filesystem walks; the UI shows declared sizes only |
| `MIABI_STORAGE_USAGE_MINUTES` | `30` | Cadence of that measurement sweep. Raise it on nodes with many/large volumes where the `df` walk is heavy |
| `MIABI_WEBHOOK_ALLOW_PRIVATE_TARGETS` | `false` | Allow outbound webhooks to RFC1918/ULA addresses. Loopback and link-local (incl. cloud metadata) are always blocked |
| `MIABI_ALLOW_DOWNGRADE` | `false` | Boot even when the binary is older than the version recorded in the database |
| `MIABI_API_URL` | — | Public base URL of the API, when it differs from `MIABI_WEB_URL` |

## Platform roles

Per-workspace roles are **Owner > Admin > Developer > Viewer**. The **platform admin** is seeded on
first boot from `MIABI_ADMIN_EMAIL` / `MIABI_ADMIN_PASSWORD`; that account manages nodes and
platform-wide settings. See
[Roles & Permissions](/docs/workspaces/roles-and-permissions) and
[Platform Admin](/docs/administration/platform-admin).

## Next steps

- [Quick Start](/docs/getting-started/quickstart) — deploy your first application.
- [Security](/docs/security/authentication) — harden your instance.
