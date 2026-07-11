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
