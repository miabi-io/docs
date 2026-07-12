---
sidebar_position: 1
title: Volumes
description: Create persistent Docker volumes and mount them in your applications.
---

# Volumes

Volumes give your applications **persistent storage** that survives container restarts,
redeploys, and image updates. A volume is a Docker volume owned by a workspace; every volume
belongs to exactly one workspace and can only be mounted by applications in that workspace.

![Volumes](/img/screenshots/volumes.png)

## Why volumes

Containers are ephemeral — anything written inside a container's writable layer is lost when the
container is recreated (which happens on every deploy). Volumes solve this: data written to a
mounted volume path lives independently of the container and is reattached to each new release.

Use a volume whenever an app needs to keep data between deployments, for example:

- Uploaded files and user media
- SQLite / libSQL database files
- Application caches you want to warm once and reuse
- Generated assets, search indexes, or content stores

## Creating a volume

1. Open your workspace and go to **Storage → Volumes**.
2. Select **Create volume**.
3. Give it a clear, descriptive name (for example `wordpress-uploads`).
4. Confirm. The volume is provisioned immediately and ready to mount.

:::tip
Name volumes after the data they hold, not the app — it keeps things readable when one app uses
several volumes, or when you later reuse a volume.
:::

## Volume types & shared storage

When you create a volume you pick its **type**, which decides where the data lives and whether a
replicated [cluster](/docs/nodes/cluster-mode) app can share it across nodes:

| Type | Access | Backed by | Use for |
|------|--------|-----------|---------|
| **Local** (default) | Node-local (RWO) | A Docker volume on one node | Single-container / single-node apps |
| **NFS** | Shared (RWX) | An NFS export, via Docker's built-in driver | Storage shared by a replicated service across nodes |
| **CIFS / SMB** | Shared (RWX) | A CIFS/SMB share (credentials encrypted at rest) | The same, on Windows / NAS shares |
| **Host path** | Shared (RWX) | A bind to an operator-managed path under `/mnt/*` | A NAS you've mounted at the same path on every node |

- **Local** volumes live on one node. A replicated service is refused above one replica on a local
  volume (each node would otherwise get its own empty copy) — Miabi instead keeps such an app as a
  single node-pinned container.
- **NFS / CIFS** let Miabi mount a network share with no external plugin (it uses Docker's local
  driver with mount options). Provide the server + export (NFS) or share + credentials (CIFS); the
  swarm mounts the **same share on every node** a task lands on. Shared storage is a plan capability.
- **Host path** binds a directory you (the operator) have mounted at the **same path on every
  node** — e.g. a NAS at `/mnt/nas/app`. Nothing is stored in Miabi (no credentials), and a
  replicated service binds it on each node. The path must be under `/mnt/`, and creating one
  requires a **privileged** workspace.

:::tip
For a replicated service, back it with a **shared (RWX)** volume or a cluster-wide host path — a
plain local volume can't follow a task that Swarm reschedules onto another node.
:::

## Mounting a volume in an app

Volumes are attached to applications through a **mount path** — the directory inside the
container where the volume's contents appear.

1. Open the application and go to its **Volumes** (or **Storage**) section.
2. Select **Mount volume** and choose an existing workspace volume.
3. Enter the **container mount path**, such as `/var/www/html/wp-content` or `/data`.
4. Save and redeploy the application so the new mount takes effect.

After redeploy, anything the app reads or writes under that path is backed by the persistent
volume. See [Applications overview](/docs/applications/overview) for the full deploy lifecycle.

:::caution
Choose the correct mount path for the software you run. Mounting over a directory that the image
populates at build time can hide the image's files behind the (initially empty) volume.
:::

## Persistence and lifecycle

- Volumes persist across redeploys, container restarts, and image upgrades.
- Detaching a volume from an app does **not** delete the volume — its data remains in the
  workspace until you explicitly delete the volume.
- Deleting a volume is permanent. Make sure no application still depends on it first.

## Backing up volume data

Volume contents can be captured as **volume archives** and shipped to a backup target. See
[Backups](/docs/storage/backups) for scheduled and manual archives.
