---
sidebar_position: 2
title: Provisioning a Database
description: Create a managed database — pick an engine, version, and size.
---

# Provisioning a Database

Creating a database in Miabi takes a few choices and a click. Miabi handles the
container, credentials, and networking for you.

![Database detail](/img/screenshots/database-detail.png)

## Creating a database

From **Databases → New database**:

1. **Name** — a human-friendly label, unique within the workspace.
2. **Engine** — PostgreSQL, MySQL, MariaDB, Redis, MongoDB, or libSQL. See the
   [overview](/docs/databases/overview) for what each is good for.
3. **Version** — choose the engine version. You can perform an in-place
   [version upgrade](/docs/databases/version-upgrades) later.
4. **Resource sizing** — set CPU and memory limits, and the size of the persistent
   volume that stores the data.

Click **Create**, and Miabi pulls the image, starts the container on the workspace's
internal network, and provisions credentials.

## Resource sizing

| Setting | What it controls |
|---------|------------------|
| **CPU** | CPU limit for the container. |
| **Memory** | RAM limit; the engine is tuned within this budget. |
| **Disk / volume** | Persistent storage for the data directory. |

:::tip
Start modest. CPU and memory can be adjusted later, and you can grow the volume as your
data does — so there's no need to over-provision on day one.
:::

## What gets generated

After provisioning, Miabi creates and stores (encrypted at rest):

- A **database / default user** as appropriate for the engine.
- A generated **password** and a ready-to-use **connection string**.
- An entry in the workspace's secret vault so apps can consume the credentials.

See [Access & credentials](/docs/databases/access-and-credentials) for how apps connect,
and [port forwarding](/docs/networking/port-forwarding) for temporary access from your own
machine.

:::caution
The database is reachable on the **internal network only** — no port is published on the
host. This is intentional; expose it temporarily via port forwarding when you need direct
access.
:::

:::note
Provisioning is available to Owners, Admins, and Developers. Viewers see the database list
but cannot create one.
:::
