---
sidebar_position: 2
title: Installation
description: Install Miabi on a fresh Linux host with the one-line installer or Docker Compose
---

# Installation

Miabi runs as a Docker Compose stack: the control plane (API + embedded web console),
PostgreSQL, Redis, and [Goma Gateway](/docs/networking/routing-and-middlewares) (routing + TLS).

## Requirements

- A Linux host with a public IP and a domain pointing at it.
- Docker Engine 24+ and the Docker Compose v2 plugin (the installer adds Docker if missing).
- Ports **80** and **443** open — Goma terminates TLS and serves ACME challenges.

:::tip
A small VPS (2 vCPU / 2 GB RAM) is enough to get started. Databases and apps you deploy will
consume additional resources on top of the control plane.
:::

## One-line install (recommended)

On a fresh host, run:

```bash
curl -fsSL https://github.com/miabi-io/miabi/releases/latest/download/install.sh | sudo bash
```

:::caution During the beta
`releases/latest` skips pre-releases, and every Miabi release so far is one — so the URL above
returns **404** until the first stable release is cut. Until then, use either a specific tag or the
`main` branch (which installs `:latest` images rather than pinned ones):

```bash
curl -fsSL https://github.com/miabi-io/miabi/releases/download/v1.0.0-beta.4/install.sh | sudo bash
# or
curl -fsSL https://raw.githubusercontent.com/miabi-io/miabi/main/deploy/install.sh | sudo bash
```
:::

This installs Docker if needed, fetches the production Compose file and Goma config into
`/opt/miabi`, and generates secrets in `.env`. It prompts for your domain and ACME email and writes
them to `.env` — the gateway config (`goma.yml`) reads those values from the environment, so **you
never hand-edit `goma.yml`**.

The installer published with each release is **stamped**: it pins the exact `MIABI_IMAGE`,
`GOMA_IMAGE`, and `RUNNER_IMAGE` tags that release was tested with, and fetches `compose.yaml` from
the same tag. Re-running it is how you upgrade.

Answering prompts over a pipe is unreliable, so prefer passing the values:

```bash
curl -fsSL https://github.com/miabi-io/miabi/releases/latest/download/install.sh \
  | sudo MIABI_DOMAIN=miabi.example.com MIABI_ACME_EMAIL=you@example.com bash
```

1. `MIABI_DOMAIN` — your panel domain (e.g. `miabi.example.com`).
2. `MIABI_WEB_URL` — the public `https://` URL of the panel (derived from the domain).
3. `MIABI_ACME_EMAIL` — the contact address for Let's Encrypt.

To install or pin a specific release, set `MIABI_VERSION=v1.1.0`. Re-run the installer (or
`docker compose up -d` inside `/opt/miabi`) to bring the stack up.

:::note
An existing `/opt/miabi/.env` is never overwritten — the installer only fills blank secrets. Edit it
directly (or delete it) to change a value you set on a previous run.
:::

## Manual install with Docker Compose

```bash
git clone https://github.com/miabi-io/miabi && cd miabi/deploy
cp .env.example .env
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

Open your domain in a browser and sign in as the **platform admin**, which is seeded into the
database on first boot from `MIABI_ADMIN_EMAIL` and `MIABI_ADMIN_PASSWORD`. The one-line installer
generates that password and prints it once at the end of the run; it is also stored in
`/opt/miabi/.env`. Change it from the UI after your first sign-in.

There is no "first account to register becomes admin" behaviour — Miabi refuses to start outside
dev while `MIABI_ADMIN_PASSWORD` is empty or left at its built-in default.

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
