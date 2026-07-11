---
sidebar_position: 1
title: Databases Overview
description: Managed PostgreSQL, MySQL, MariaDB, Redis, MongoDB, and libSQL owned by your workspace.
---

# Databases Overview

Miabi can provision and run **managed databases** as Docker containers, owned by a
workspace and ready for your apps to consume — no manual container wrangling required.

![Databases](/img/screenshots/databases.png)

## Supported engines

| Engine | Typical use |
|--------|-------------|
| **PostgreSQL** | General-purpose relational database. |
| **MySQL** | Relational database, broad app compatibility. |
| **MariaDB** | MySQL-compatible relational database. |
| **Redis** | In-memory cache, queues, sessions. |
| **MongoDB** | Document database. |
| **libSQL** | SQLite-compatible edge/embedded database (Turso `sqld`), accessed over HTTP. |

:::note
**libSQL** behaves a little differently from the other engines: an instance hosts a
**single** database (you can't create additional logical databases on it), clients speak
**HTTP/Hrana** rather than a wire protocol (so there's no `psql`-style shell), and it
authenticates with a **JWT auth token** instead of a username/password. See
[Access & Credentials](/docs/databases/access-and-credentials#libsql-token-auth).
:::

## What "managed" means

When you provision a database, Miabi:

- Runs the engine in a container scoped to your workspace.
- Generates and stores **managed credentials**, encrypted at rest.
- Connects it to the workspace's internal network so apps can reach it — **without**
  exposing any port on the host.
- Tracks its engine, version, and resource sizing so you can upgrade or scale later.

You don't get root over the host's Docker; you get a database that Miabi keeps wired up
to the rest of your workspace.

## Lifecycle

1. **Provision** — pick an engine, version, and size. See
   [Provisioning](/docs/databases/provisioning).
2. **Connect** — apps consume the [credentials](/docs/databases/access-and-credentials)
   over the internal network.
3. **Operate** — monitor, back up, and upgrade over time.
4. **Decommission** — delete when no longer needed (take a backup first).

## Where related features live

- **Access from your machine** — databases aren't exposed to the host by default; use
  [port forwarding](/docs/networking/port-forwarding) for temporary external access.
- **Backups** — scheduled and manual backups are covered in
  [Storage & Backups](/docs/storage/backups).
- **Upgrades** — in-place engine [version upgrades](/docs/databases/version-upgrades).

:::note
Redis backups are **not yet supported**. Treat Redis as a cache/queue you can rebuild,
not as your source of truth, until backup support lands.
:::
