---
sidebar_position: 3
title: Configuration
description: Configure Miabi through environment variables and secrets
---

# Configuration

Miabi is configured entirely through **environment variables**, loaded from the `.env` file in the
Compose directory (or the process environment). This page covers the variables you are most likely
to set; the official image ships with sensible defaults for the rest.

The control plane (and the optional worker) in the shipped Compose files reads that single `.env`
via Docker Compose's `env_file` directive, and the gateway and PostgreSQL interpolate what they need
from it, so the workflow is: **rename `.env.example` → `.env`, fill in the values, and
`docker compose up`** — no per-service edits.

:::caution If you installed with the installer, there is no `.env`
A stack install (the [one-liner](/docs/getting-started/installation) or `docker run … install`)
keeps its configuration in the manifest at **`/etc/miabi/miabi.yaml`**, and passes it to the
containers itself. Creating a `.env` file there changes nothing — nothing reads it.

Set these variables under the manifest's `spec.server.env` instead, then apply them — either with
one command, or by editing the file and converging:

```bash
sudo miabi stack env set MIABI_LOG_LEVEL=debug   # writes the value, shows the change, converges

sudo vi /etc/miabi/miabi.yaml     # spec: { server: { env: { MIABI_LOG_LEVEL: debug, … } } }
sudo miabi setup                  # re-converges; recreates only what actually changed
```

Use `setup` (`install` on the `docker run` path), **not** `restart`. An env var is part of a
container's spec, and a spec can only be changed by recreating the container — `restart` restarts
the ones you already have, so an edited manifest would appear to do nothing (it prints a note when it
spots this). Re-running `setup` on a live stack is safe and idempotent: it leaves containers whose
spec is unchanged alone.

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
| `MIABI_ENCRYPTION_KEY` | — | **Required in production.** AES key for secrets at rest (env vars, DB passwords, custom certs). Miabi refuses to start outside dev without it; in dev, those values are then only base64-encoded |
| `MIABI_WEB_URL` | — | Public URL of your instance (used for links, OAuth callbacks, invitations). Also the CORS allowlist, so it must be a concrete origin |
| `MIABI_CORS_ORIGINS` | `MIABI_WEB_URL`, else `*` | Comma-separated allowed origins; a `*` wildcard is rejected in production |
| `MIABI_LOGIN_TOKEN_TTL_HOURS` | `24` | Lifetime of the API key minted by `miabi login` and **Copy login command** — see [Signing in from the CLI](/docs/security/authentication) |
| `MIABI_LOGIN_TOKEN_MAX_TTL_HOURS` | `168` | Longest lifetime a caller may request for that key |
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
| `MIABI_UPDATE_CHECK` | `true` | Daily check for a newer Miabi release, surfaced as an admin notice. Notify-only — Miabi never upgrades itself. See [Upgrades](/docs/upgrades/upgrading) |
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
| `MIABI_INTERNAL_NETWORK` | *(unset)* | The platform's [private network](/docs/networking/networks-and-subnets#the-platforms-private-network), where the control-plane database and cache live. Set by `miabi setup` (`spec.networking.internal`); on a Compose stack `.env.example` sets it to `miabi-internal`, the network `compose.yaml` creates |
| `MIABI_GOMA_PROVIDER_DIR` | `/etc/goma/providers` | Directory where Miabi writes per-route Goma config files that the gateway hot-reloads |
| `MIABI_WEB_DIR` | — | Directory of the built web UI; when set, Miabi serves it as an SPA at `/`. The official image serves the UI from the embedded binary |
| `DOCKER_HOST` | `unix:///var/run/docker.sock` | Docker Engine endpoint |
| `MIABI_WORKER_HEALTH_ENABLED` | `true` | A dedicated `miabi worker` serves `/healthz` and `/readyz` on `MIABI_PORT`. Set `false` when a worker runs beside the server on one host, where both would bind the same port |
| `MIABI_CONTROL_MANAGER_MODE` | — | How far [reconciliation](/docs/operations/reconciliation) goes when a workload disappears: `observe` reports it, `enforce` also redeploys it in place, `off` stops watching. Unset leaves it to **Platform Settings → Control manager** (default `observe`); set here it is pinned |

:::note On a managed install, the manifest sets these for you
Many of the variables on this page have a field in the [install manifest](/docs/administration/install-manifest)
— `spec.networking.pool`, `spec.networking.hostPorts`, `spec.backup`, `spec.license` and others.
`miabi setup` compiles those into the control plane's environment, so you configure them in one place
rather than exporting variables by hand. A field stated there also **pins** the matching console
setting read-only, which is what keeps an infrastructure-as-code install authoritative.
:::

## Public app URLs

Miabi can hand every app a ready-to-use public URL under a wildcard domain (the "one-click URL"
feature). Each cluster has its own **external domain**, set under **Clusters → Edit**, and `*.<domain>`
DNS points at that cluster's gateway. The default cluster's can also come from the environment:

| Variable | Default | Description |
|----------|---------|-------------|
| `MIABI_EXTERNAL_BASE_DOMAIN` | — | The default cluster's external domain, e.g. `apps.example.com` (point `*.apps.example.com` at the gateway). Pins the field when set; unset leaves it to the cluster page |
| `MIABI_EXTERNAL_BASE_PROVIDER` | — | Goma certManager provider for the default cluster's generated URLs (empty = gateway default). Pins the field when set |

An install upgraded from a version that kept the domain in **Platform Settings** moves it onto the
default cluster, and generated URLs keep their hostnames.

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

Multiple worker instances share the same Redis queue, so you can scale them horizontally. Scaling
out never runs two deploys of the same application at once: each deploy holds a per-app lock in
Redis, and one cluster may hold at most half of a worker's `MIABI_WORKER_CONCURRENCY` slots, so a
slow region cannot starve the rest.

Scheduled jobs, periodic scans and [reconciliation](/docs/operations/reconciliation) are not queue
work: they run in the **server** process that holds a leader lease in Redis. A second control plane
started against the same Redis stands by instead of running them twice. This is not multi-replica
high availability — agent and runner tunnels still belong to the process they dialled.

A dedicated worker answers `/healthz` and `/readyz` on `MIABI_PORT`; set
`MIABI_WORKER_HEALTH_ENABLED=false` if it shares a host with the server.

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

The registry is configured from **Admin → Container Registry**, or here. A variable set in the
environment **pins** its field: the console shows it read-only with the variable that owns it, and
changing it takes an environment edit and a restart. A variable left unset leaves that field to the
console, so an install that sets none of them is configured entirely from the UI — and one declared
by docker-compose or a Helm chart keeps its values authoritative.

The lock is per field, so pinning the hostname while managing storage from the console is fine.
`MIABI_REGISTRY_ENABLED=false` pins the registry **off**; remove the variable to hand the switch
back to the console. An invalid host refuses to boot.

The `s3` driver requires the `registry_s3` entitlement, checked where the driver is selected **and**
where it is used — at startup and before each garbage collection. Without a license, or with `s3`
and no bucket, the registry is **not started** and the reason is logged and shown on the Overview
tab. See [Registry](/docs/registry/administration).

| Variable | Default | Description |
|----------|---------|-------------|
| `MIABI_REGISTRY_ENABLED` | `false` | Run the built-in OCI registry. Pins the switch when set — `false` pins it *off*; unset leaves it to the console |
| `MIABI_REGISTRY_HOST` | — | Registry hostname; pins the field when set. Unset ⇒ the console's value, else `registry.<domain>` under the default cluster's external domain; with neither, image distribution fails. Must be a bare DNS hostname with an optional port (no scheme, no path, not a single label) |
| `MIABI_REGISTRY_HTTPS_REDIRECT` | `true` | Redirect plaintext registry requests to HTTPS. Set `false` **only** when a TLS terminator (Cloudflare, nginx, a load balancer) sits in front of the gateway and the gateway's `proxy.trustedProxies` is not configured — otherwise the redirect loops and every push and pull fails. Configuring trusted proxies on the gateway is the better fix; see [Running behind a proxy](https://goma.jkaninda.dev/usermanual/running-behind-a-proxy.html) |
| `MIABI_REGISTRY_STORAGE` | `filesystem` | `filesystem` or `s3`; pins the driver when set. `s3` is an Enterprise feature, verified when selected and at startup |
| `MIABI_REGISTRY_IMAGE` | — | Override the registry image (default `registry:3`) |
| `MIABI_REGISTRY_AUTH_URL` | `http://miabi:9000` | Where the gateway reaches Miabi's registry auth endpoint |
| `MIABI_REGISTRY_PLATFORM_TOKEN` | — | Pin the platform token (otherwise derived from the master encryption key) |
| `MIABI_REGISTRY_S3_ENDPOINT` | — | S3 endpoint URL (set it for MinIO; leave empty for Amazon S3) — pins the field when set |
| `MIABI_REGISTRY_S3_BUCKET` | — | S3 bucket — required when `MIABI_REGISTRY_STORAGE=s3` — pins the field when set |
| `MIABI_REGISTRY_S3_REGION` | — | S3 region — pins the field when set |
| `MIABI_REGISTRY_S3_ACCESS_KEY` | — | S3 access key — pins the field when set |
| `MIABI_REGISTRY_S3_SECRET_KEY` | — | S3 secret key (encrypted at rest) — pins the field when set |
| `MIABI_REGISTRY_S3_FORCE_PATH_STYLE` | `false` | Path-style addressing (MinIO and most S3-compatible stores) — pins the field when set |

## Nodes, networks & port forwarding

| Variable | Default | Description |
|----------|---------|-------------|
| `MIABI_NODE_GATEWAY_IMAGE` | `jkaninda/goma-gateway:1.0.0` | Goma image deployed on edge-gateway nodes. The default is the gateway version this Miabi build is tested against |
| `MIABI_CONTROL_URL` | falls back to `MIABI_API_URL` | Public URL remote nodes reach the control plane at |
| `MIABI_NETWORK_POOL_CIDR` | `10.64.0.0/12` | Address pool workspace networks are carved from. Must not overlap the shared `miabi` network (`10.63.0.0/16` by default — set with `miabi setup --subnet` or `spec.networking.proxy.subnet`), your LAN or a VPN |
| `MIABI_NETWORK_SUBNET_PREFIX` | `24` | Prefix length per workspace network (a `/12` pool ⇒ 4096 networks) |
| `MIABI_NETWORK_IPV6` | `false` | Give every Miabi-created network a dual-stack address space. Needs Docker Engine 26+ unless `MIABI_NETWORK_IPV6_ULA_PREFIX` is set; on an older engine Miabi logs why and leaves it off rather than failing every network |
| `MIABI_NETWORK_IPV6_ULA_PREFIX` | *(unset)* | Pin each network's `/64` under this ULA prefix (`/48` or shorter, e.g. `fd42:6d69:6162::/48`), derived from its IPv4 subnet. Unset lets Docker assign one |
| `MIABI_HOST_PORT_MIN` | `1024` | Lowest host port Miabi may allocate |
| `MIABI_HOST_PORT_MAX` | `65535` | Highest host port Miabi may allocate |
| `MIABI_FORWARD_TTL_MINUTES` | `30` | How long a temporary database port-forward lives |
| `MIABI_FORWARD_BIND_ADDR` | `127.0.0.1` | Address the database forward listener binds to on the control plane. On a non-loopback address, only the IP that opened the forward may connect |
| `MIABI_FORWARD_ADVERTISE_HOST` | — | Host shown to the user in the forward's connection string |
| `MIABI_FORWARD_RELAY_IMAGE` | `alpine/socat:latest` | Image used for the forward relay container |
| `MIABI_HOST_PROC` | `/host/proc` | procfs path for real host CPU/memory. The compose binds `/proc:/host/proc:ro` |

## Container security profile

| Variable | Default | Description |
|----------|---------|-------------|
| `MIABI_FORCE_NON_ROOT_USER` | `false` | Force every app & job container to a non-root UID regardless of plan |
| `MIABI_RESTRICTED_UID` | `100000` | The UID used by the restricted profile |
| `MIABI_SECURITY_INIT_IMAGE` | `busybox:latest` | Init image used to prepare restricted containers |
| `MIABI_CONTAINER_GRANTS_ENABLED` | `false` | Allow applications to be granted Linux capabilities and host devices. Off, nothing may be granted in **any** workspace — the system workspace included — and the console offers neither. See [Capabilities & devices](/docs/applications/capabilities-and-devices) |

## Registration

Self-service sign-up is off until you turn it on. See [Authentication](/docs/security/authentication).

| Variable | Default | Description |
|----------|---------|-------------|
| `MIABI_REGISTRATION_ENABLED` | `false` | Open the `/register` page. Fixed at boot — **restart** to apply, and it is shown read-only in Platform Settings |
| `MIABI_REQUIRE_EMAIL_VERIFICATION` | — | Require a new account to confirm its address before it can sign in. Unset leaves it editable in Platform Settings; set here it is pinned read-only. Sign-up refuses to open if this is on with no SMTP configured |
| `MIABI_ALLOWED_SIGNUP_DOMAINS` | — | Comma-separated domain allow-list (`acme.com,acme.co.uk`); a subdomain matches its parent. Blank admits any domain. Same pinning rule as above |

## Licensing

| Variable | Default | Description |
|----------|---------|-------------|
| `MIABI_LICENSE_FILE` | — | Path to a signed license token auto-installed on boot (air-gapped / IaC friendly). A newer DB-installed license still wins |

## Advanced

| Variable | Default | Description |
|----------|---------|-------------|
| `MIABI_DEV_MODE` | `false` | Relax production guards. Never enable on a public instance |
| `MIABI_OPENAPI_DOCS` | `true` | Serve the interactive API reference at `/docs` |
| `MIABI_MARKETPLACE_URL` | `https://marketplace.miabi.io` | Where templates are synced from. A server base URL fetches `/v1/export`; a `.json` URL (e.g. a release asset) is fetched as-is. Set to an explicit empty value to disable syncing (offline kill switch). Pointing it at **your own** catalog requires an Enterprise license — see [private template registry](/docs/marketplace/overview#running-your-own-catalog) |
| `MIABI_DELETION_GRACE_DAYS` | `7` | Days an admin-scheduled account deletion waits before the data is purged |
| `MIABI_RESTORE_MAX_MB` | `1024` | Max size of an uploaded database dump for restore |
| `MIABI_STORAGE_USAGE_ENABLED` | `true` | Periodically measure each volume's real on-disk usage (`docker system df`) and cache it, so the UI shows declared-vs-used. Off ⇒ no filesystem walks; the UI shows declared sizes only |
| `MIABI_STORAGE_USAGE_MINUTES` | `60` | Cadence of that measurement sweep. Raise it on nodes with many/large volumes where the `df` walk is heavy |
| `MIABI_DATABASE_SIZE_CRON` | `20 2 * * *` | Cron schedule (platform timezone) for the nightly sweep that measures every **running** database instance's on-disk size. Without it, sizes refresh only when a detail page is opened and the value is over a day old — so a database nobody looks at is never measured. Set to an empty value to disable |
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
