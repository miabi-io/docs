---
sidebar_position: 2
title: Installation
description: Install Miabi on any Linux host — with Docker Compose, or let Miabi manage its own stack
---

# Installation

Miabi runs as four containers: the control plane (API + embedded web console), PostgreSQL, Redis,
and [Goma Gateway](/docs/networking/routing-and-middlewares) (routing + TLS). You can have Docker
Compose create them, or let Miabi create them itself — see [the two modes](#how-miabi-runs).

## Requirements

- A Linux host with a public IP and a domain pointing at it.
- **Docker Engine 25+** (the installer adds Docker if missing). 25.0 is the minimum Miabi
  supports — see [Supported Docker Engine versions](#supported-docker-engine-versions).
  The Compose v2 plugin is needed *only* if you take the
  [manual Compose path](#manual-install-with-docker-compose); the installer script drives the
  Docker API directly and never shells out to `docker compose`.
- Ports **80** and **443** open — Goma terminates TLS and serves ACME challenges.

:::tip
A small VPS (2 vCPU / 2 GB RAM) is enough to get started. Databases and apps you deploy will
consume additional resources on top of the control plane.
:::

:::note No fresh server required
Miabi does **not** need a clean, dedicated host. It runs alongside whatever Docker workloads are
already on the machine — the control plane only manages the containers, volumes, and networks it
creates (plus any you explicitly adopt). If you already have containers running, you can
[import them](/docs/nodes/docker-import) into Miabi and take over their lifecycle **without
downtime** — they keep running and simply start showing up in the console. And you don't have to use
the installer script: the [manual Docker Compose path](#manual-install-with-docker-compose) gives you
the exact same stack.
:::

## Supported Docker Engine versions

Miabi requires **Docker Engine 25.0 or newer** on the control-plane host and on every node.
25.0 is the floor of the versions Miabi tests — its CI runs the engine integration suite on
Docker **25, 26, 27 and 28**.


## How Miabi runs

Miabi is four containers: the control plane (API + embedded web console), PostgreSQL, Redis, and
[Goma Gateway](/docs/networking/routing-and-middlewares) (routing + TLS).

**The installer builds them itself**, straight against the Docker API — it does not use Docker
Compose. Every container is labelled `io.miabi.managed-by=miabi`, which is what lets Miabi update
its own components, including its own container, and roll back a bad image.

:::info Why not Compose?
Compose owns what Compose created. A container Miabi recreated out-of-band would be silently
reverted by the next `docker compose up -d` — so a Compose-managed Miabi could never truthfully
update itself. Changing the owner is what makes `miabi update` possible.

Compose is still fully supported if you want to drive it yourself: see
[Manual install with Docker Compose](#manual-install-with-docker-compose). The installer simply no
longer does it for you.
:::

## One-line install (recommended)

```bash
curl -fsSL https://get.miabi.io | sudo MIABI_DOMAIN=miabi.example.com \
  MIABI_ADMIN_EMAIL=you@example.com bash
```

It installs Docker if missing, then hands off to Miabi, which creates the network, the volumes and
the four containers, writes `/etc/miabi/stack.yaml`, and prints the admin password.

That one address becomes both your admin login *and* your Let's Encrypt contact — see [One email is
enough](#install-options).

Answering prompts over a pipe is unreliable, so pass `MIABI_DOMAIN` and `MIABI_ADMIN_EMAIL` as above
rather than letting it ask.

To pin a release, set `MIABI_VERSION=v1.4.0`.

:::caution An existing Compose install
The installer **refuses** to run on a host that already runs Miabi under Compose, because the two do
not share volumes (`miabi_pgdata` vs `mb-platform-pgdata`) — installing the stack there would create
an *empty* database beside your real one.

To stay on Compose: `cd /opt/miabi && docker compose pull && docker compose up -d`.
To migrate: back up, `docker compose down`, re-run with `MIABI_FORCE_STACK=1`, restore the backup.
:::

## What the installer leaves behind

There is **no new binary to install**. The installer *is* the Miabi image — its entrypoint is the
`miabi` binary — so all it does under the hood is [one `docker run`](#install-with-docker-run-no-script),
which you can just as well run yourself.

It also drops a small `miabi-stack` wrapper so you don't have to retype that command:

```bash
miabi-stack status                     # what is running, and its health
miabi-stack restart                    # restart the stack, or one component
MIABI_TAG=1.5.0 miabi-stack update     # roll forward to a newer release (rolls back on failure)
miabi-stack uninstall                  # keeps your data; add --volumes to destroy it
```

:::note
It is named `miabi-stack`, not `miabi`, because `miabi` is already the [Miabi CLI](/docs/cicd/cli) —
the API client you install with Homebrew, which has its own `status`, `import` and `upgrade`
commands meaning entirely different things.
:::

### Install options

| Env var | Flag | Meaning |
|---|---|---|
| `MIABI_DOMAIN` | `--domain` | Panel hostname. Required. |
| `MIABI_ACME_EMAIL` | `--acme-email` | Let's Encrypt contact. |
| `MIABI_ADMIN_EMAIL` | `--admin-email` | First admin's login. |
| `GOMA_VERSION` | `--gateway-image` | Goma Gateway image. |
| `RUNNER_VERSION` | `--runner-image` | Image shown in the CI runner enrollment command. |
| `MIABI_CONTROL_URL` | `--control-url` | URL remote nodes and agents dial back on. Defaults to the panel's own URL. |
| `MIABI_REGISTRY_ENABLED` | `--registry` | Enable the [built-in registry](/docs/registry/overview). |
| `MIABI_REGISTRY_HOST` | `--registry-host` | Its hostname (default `registry.<domain>`). Needs its own DNS record — it gets its own certificate. |
| — | `--goma-config` | Gateway config file, relative to the manifest's directory (default `goma.yml`). |
| `MIABI_NO_HOST_PROC` | `--no-host-proc` | Do **not** bind the host's `/proc`. See below. |
| `MIABI_ETC` | `--file` | Where the manifest lives (default `/etc/miabi/stack.yaml`). |
| `MIABI_FORCE_STACK` | — | Install even though a Compose stack is present. See the caution above. |

:::tip One email is enough
`acme_email` (the Let's Encrypt contact) and `admin_email` (the platform admin's login) **fall back
to each other**. Give either one and it is used for both. Only if you give neither does Miabi guess
`admin@<domain>`.
:::

### The manifest

Stack mode keeps its desired state in `/etc/miabi/stack.yaml`, mode `0600`. It has to be a file on
the host and not a database table, because PostgreSQL is *itself* part of the stack — the installer
cannot read the database to learn how to start the database.

```yaml
version: 1
domain: miabi.example.com
web_url: https://miabi.example.com
control_url: https://miabi.example.com   # where nodes and agents dial back
acme_email: you@example.com              # Let's Encrypt contact
images:
  miabi: miabi/miabi:1.6.0
  postgres: postgres:17-alpine
  redis: redis:7-alpine
  gateway: jkaninda/goma-gateway:0.12.0
registry:
  enabled: true
  host: registry.miabi.example.com
gateway:
  config: goma.yml          # bind-mounted into Goma, read-only
  env:
    GOMA_LOG_LEVEL: info    # debug | trace | info | warn | error | off
    MY_UPSTREAM: https://internal.example.com
host_proc: true
env:
  TZ: UTC
  MIABI_LOG_LEVEL: info
secrets:
  admin_email: you@example.com   # your panel login
  admin_password: …              # generated, printed once — this is the only copy
  db_password: …
  redis_password: …
  jwt_secret: …
  encryption_key: …
```

Edit it and re-run `miabi install` (or `miabi-stack install`) — the converge is idempotent, so only
what actually changed is recreated.

:::danger Back up this file
It holds the database password, the JWT secret and the encryption key, and it is the **only copy**.
Without it you cannot decrypt the secrets Miabi has stored, and a fresh install onto the existing
data volume will refuse to run: PostgreSQL keeps the password its data directory was created with,
so a newly generated one can never open it.
:::

### The gateway config

`goma.yml` sits beside `stack.yaml` and is **bind-mounted read-only** into the gateway — the same
shape as the Compose install, so you edit one file on the host and restart.

Miabi writes the default on first install and records its digest. After that:

- **you never touched it** → a newer release's default replaces it, so you keep getting upstream fixes;
- **you edited it** → Miabi never overwrites it, and says so on every converge.

It is validated with `goma config check` *before* the gateway is ever started — and before a
`restart` — so a typo fails in seconds with Goma's own line number rather than taking the gateway
down. That matters because the **panel's own route lives in this file**: break it and you would lock
yourself out of the UI you'd use to fix it.

After editing it, restart the gateway to apply it (Goma watches the providers directory, not its
base config):

```bash
miabi-stack restart miabi-gateway
```

`gateway.env` is the gateway's environment: `GOMA_LOG_LEVEL` (seeded), plus anything your config
interpolates. `TZ` is **not** here — it is stack-wide (top-level `env:`) and already reaches the
gateway, so the whole stack's log timestamps agree.

```yaml
gateway:
  config: goma.yml
  env:
    MY_UPSTREAM: https://internal.example.com
    GOMA_CONFIG_ENCRYPTION_KEY: …
```

`GOMA_CONFIG_ENCRYPTION_KEY` belongs here, not in the top-level `env:` — Miabi encrypts the config
that Goma decrypts, so it forwards the key to **both** containers. Set on one side only, routing
breaks with no obvious cause.

:::tip Extra routes don't belong in `goma.yml`
Goma watches `/etc/goma/providers`, where Miabi writes your apps' routes. Additional routes and
middlewares belong there — hot-reloaded, and untouched by upgrades — rather than in a forked base
config you then have to maintain.
:::

`control_url` is separate from `web_url` because it does not have to equal it. A node on a private
network may reach the control plane at an internal address the public panel URL never resolves to —
welding the two together would force that traffic out over the internet and back. Leave it unset and
it follows `web_url`, which is right for a single public hostname.

The `env:` block takes anything Miabi reads that the manifest does not already model — SMTP, OAuth,
`HTTP_PROXY`, and so on. Variables Miabi sets itself (the database password, the domain, the
encryption key, the registry) are **refused** there rather than merged, so a setting can never have
two disagreeing sources of truth. `TZ` applies to the *whole* stack, so every container's log
timestamps agree.

### `--no-host-proc`

By default Miabi binds the host's `/proc` read-only, so the Nodes page can report real host CPU and
memory. Some hosts refuse that bind — a rootless daemon, a hardened host, a socket proxy that
forbids host binds. Pass `--no-host-proc` (or `MIABI_NO_HOST_PROC=1`) and Miabi reads its own
`/proc` instead, which inside a container already reflects host CPU and memory. **Host metrics keep
working** — this is a graceful fallback, not a feature you lose.

## Install with `docker run` (no script)

Don't want to pipe a script into `bash`? You don't have to. The Miabi image *is* the installer — its
entrypoint is the `miabi` binary — so a stack install is a single `docker run`:

```bash
docker run --rm -it \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /etc/miabi:/etc/miabi \
  miabi/miabi:1.4.0 install --domain miabi.example.com --admin-email you@example.com
```

That's the whole install. It creates the network, the volumes, PostgreSQL, Redis, the gateway and
the control plane, writes `/etc/miabi/stack.yaml`, and prints the admin password.

Drop `--admin-email` and Miabi falls back to `admin@miabi.example.com`.

**Docker must already be installed** — this path skips the installer script, and the script is what
installs Docker for you.

### What the two mounts are for

| Mount | Why |
|---|---|
| `/var/run/docker.sock` | The whole job. Miabi creates the containers through it. |
| `/etc/miabi` | Where `stack.yaml` and `goma.yml` are written. The gateway config is **bind-mounted from here** into Goma, so this directory must exist on the host — Miabi refuses to install otherwise. |

:::caution Don't forget `-v /etc/miabi:/etc/miabi`
Miabi refuses to install without it, because the manifest — and the gateway config beside it — would
be written *inside the throwaway container* and lost when it exits:

```
/etc/miabi is not bind-mounted from the host, so the gateway could never read it —
Docker would create an empty directory there instead.
```

Nothing is created when this happens.
:::

Use `-it` for the confirmation prompt; add `--yes` and drop `-it` when scripting it.

### Running the installer container as non-root

The command above runs the installer container as **root** — the simplest thing that works, and the
same privilege level as the `sudo` on the one-line script. If you'd rather not, the image ships a
non-root `miabi` account (uid/gid **10001**); run as it by adding two flags:

```bash
docker run --rm -it \
  --user 10001:10001 \
  --group-add "$(stat -c '%g' /var/run/docker.sock)" \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /etc/miabi:/etc/miabi \
  miabi/miabi:1.4.0 install --domain miabi.example.com --admin-email you@example.com
```

- `--user 10001:10001` runs as the image's non-root account instead of root.
- `--group-add "$(stat -c '%g' /var/run/docker.sock)"` adds the **host's** docker group — the group
  that owns `/var/run/docker.sock`. Without it a non-root user cannot read the socket and the install
  fails at once with a permission error. It is the same reason the Compose path keeps `group_add`.

:::caution The host `/etc/miabi` must be writable by uid 10001
Unlike the Compose path — where a fresh **named volume** inherits `10001:10001` from the image — a
`docker run` bind-mounts a **host directory**, whose ownership Docker does not change. Create it
owned by the non-root account first, or the installer cannot write the manifest:

```bash
sudo install -d -o 10001 -g 10001 /etc/miabi
```
:::

This is the `docker run` equivalent of the Compose [Running unprivileged](#running-unprivileged)
section: both run as uid/gid 10001 and grant the host's Docker GID.

### The tag you invoke is the version you get

The image asks Docker for **its own image reference**, so it installs exactly the image you ran —
registry included. A private registry works the same as Docker Hub:

```bash
docker run --rm -it \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /etc/miabi:/etc/miabi \
  registry.example.com/miabi:1.4.0 install --domain miabi.example.com
```

### Everything else is the same command

`install`, `update`, `status` and `uninstall` all run this way — the image is the tool that manages
what it built:

```bash
alias miabi-stack='docker run --rm -it \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /etc/miabi:/etc/miabi miabi/miabi:1.4.0'

miabi-stack status
miabi-stack uninstall            # keeps your data; add --volumes to destroy it
```

To upgrade, run a **newer** image — that is what makes it an upgrade:

```bash
docker run --rm -it \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /etc/miabi:/etc/miabi \
  miabi/miabi:1.5.0 update
```

:::note
`update` needs an image at least as new as the feature you are using. An older image has no `update`
command at all — you cannot ask a release to install itself with something it never shipped.
:::

## Manual install with Docker Compose

Prefer to skip the installer script? You can bring up the identical stack by hand with plain Docker
Compose — nothing about Miabi requires the one-line installer, and this path runs equally well on a
host that already has other containers on it.

```bash
git clone https://github.com/miabi-io/miabi && cd miabi/examples/compose
cp .env.example .env
# Create the shared app network with a roomy CIDR (Compose references it as
# external; the one-line install.sh does this for you). See Networks & Subnets.
docker network create --driver bridge --subnet 10.63.0.0/16 miabi
docker compose up -d
docker compose logs -f miabi
```

`compose.yaml` refuses to start until these are set in `.env` — `docker compose up` aborts with
`required variable ... is missing a value` rather than starting a half-configured stack:

| Variable | How to produce it |
|----------|-------------------|
| `MIABI_DB_PASSWORD` | `openssl rand -hex 32` |
| `MIABI_REDIS_PASSWORD` | `openssl rand -hex 32` |
| `MIABI_JWT_SECRET` | `openssl rand -hex 32` |
| `MIABI_ENCRYPTION_KEY` | `openssl rand -hex 32` |
| `MIABI_ADMIN_PASSWORD` | The platform admin's password. Miabi **refuses to boot** outside dev on an empty or default value |
| `MIABI_DOMAIN` | Your panel host, e.g. `miabi.example.com` |
| `MIABI_WEB_URL` | `https://<MIABI_DOMAIN>` — also the CORS allowlist, so it must be a concrete origin |

Also set `DOCKER_GID` to the host's docker group id (`stat -c '%g' /var/run/docker.sock`). It is not
required — it defaults to `999` — but a mismatch means the container cannot read the Docker socket.

The one-line installer generates all of these for you; this path is for operators who want to see
every value.

`goma.yml` interpolates `MIABI_DOMAIN` and `MIABI_ACME_EMAIL` from the environment, so a single
`.env` drives the whole stack — no separate gateway edit.

The Miabi container mounts the Docker socket to manage app and database containers, and shares the
`goma-providers` volume with Goma so route files are hot-reloaded.

:::tip Want the optional pieces wired up?
The [`examples/compose/`](https://github.com/miabi-io/miabi/tree/main/examples/compose) stack turns
on the built-in registry, one-click wildcard app URLs, an externalized log volume, and an optional
scaled-out worker — plus a **Traefik** variant. It's the "show me the features" counterpart to the
minimal `deploy/` stack.
:::

:::caution
Mounting the Docker socket is equivalent to root on the host. Run Miabi on a dedicated
host or VM and restrict who can reach the admin API. See [Security](/docs/security/authentication).
:::

### Running unprivileged

By default the Miabi container runs as **root** so it works out of the box — reading the Docker
socket, binding any port, and writing bind-mounted directories. The image also ships a non-root
`miabi` account (uid/gid **10001**) whose data directories are pre-owned, so you can opt into
unprivileged mode by adding one line to the `miabi` service and keeping `group_add` for the host's
Docker GID:

```yaml
    user: "10001:10001"
    group_add:
      - "${DOCKER_GID:-999}"   # gid of the host's docker group
```

A fresh named volume inherits `10001:10001` from the image, so there's no chown dance. For a
purpose-built rootless image, use the Debian variant (`docker/Dockerfile.debian`).

## First run

Open your domain in a browser and sign in as the **platform admin**, seeded into the database on
first boot. The installer generates the password, prints it once at the end of the run, and stores
it in `/etc/miabi/stack.yaml` — which is the only copy, so back that file up. Change the password
from the UI after your first sign-in.

The login is `admin_email` from the manifest — the address you installed with. If you gave only an
ACME contact, that is the login; if you gave neither, it is `admin@<domain>` (see [Install
options](#install-options)).

There is no "first account to register becomes admin" behaviour — Miabi refuses to start outside
dev while the admin password is empty or left at its built-in default.

![Miabi login screen](/img/screenshots/login.png)

From there:

1. Create a [workspace](/docs/workspaces/overview).
2. Deploy an [application](/docs/applications/overview).
3. Attach a [domain](/docs/networking/domains) and get [automatic SSL](/docs/networking/tls-certificates).
4. Provision a [database](/docs/databases/overview) and [back it up](/docs/storage/backups).

See the [Quick Start](/docs/getting-started/quickstart) for a guided walkthrough.

## Verifying the deployment

Once running, the control plane exposes health endpoints:

```bash
# Liveness
curl https://your-domain/healthz

# Readiness (checks DB + Redis)
curl https://your-domain/readyz
```

The interactive API reference is served at `https://your-domain/docs`.

## Upgrading

Miabi applies schema migrations and ordered data-upgrade steps automatically on startup, so
upgrading is just pulling a newer image and recreating the containers. See
[Upgrades](/docs/administration/upgrades) for the full procedure — and always back up first.
