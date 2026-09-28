---
sidebar_position: 14
title: Moving Between Locations
description: Move an application with its volumes and databases to another location while it keeps serving, with a short cutover and a rollback window (Enterprise).
---

# Moving Between Locations

A **location migration** moves an application to another [location](/docs/nodes/cluster-mode#locations),
together with its volumes and its databases. The app keeps serving while its data is copied. It stops only
for a short **cutover**: the last changes are copied, the app is deployed at the new location, and its
routes and DNS follow it.

The app keeps its identity. Its settings, environment, routes, domains, secrets and release history stay
the same.

:::info Enterprise
Location migration requires the `live_migration` entitlement (Business and Enterprise). Only workspace
**owners and admins** can plan, start or control a move.
:::

## Starting a move

Open the app, go to **Settings → Location** and choose **Move to another location**. Pick the target, and
Miabi shows a plan before anything happens:

- the **volumes** it will copy, and their size;
- each **database** the app uses, with the strategy it will use (see [Databases](#databases));
- **blockers** that stop the move until you resolve them;
- **warnings** about what will change, such as the app's generated URLs.

Choose the cutover mode, optionally a bandwidth limit, then type the app's name to start. The plan is
checked again when the move starts, so a change made since you opened the dialog cannot slip through.

## How a move runs

| Phase | The app | What happens |
|---|---|---|
| Prepare | serving | Volumes, database data volumes and any new database instance are created at the target. The app's image is pulled there. |
| Copy while live | serving | The data is copied with rsync, pass after pass, until what is left to send stops shrinking. |
| *Waiting for cutover* | serving | Manual cutover only: nothing happens until you choose **Cut over now**. The data is copied once more when you do. |
| Stop | **down** | The app stops, along with any database instance that moves whole. |
| Final copy | down | Only what changed since the last pass is copied. Restored databases are dumped and loaded. |
| Switch and deploy | down | The app, its volumes and databases are switched to the target, and the running release is deployed there. |
| Reroute | serving | Routes, managed DNS records and generated URLs point at the target's gateway. |

The downtime is the final copy plus a normal deploy. While the data is copied, the panel shows the
estimated downtime, based on the last pass.

**Automatic cutover** takes the app down as soon as the data is copied. **Manual cutover** stops at that
point and waits, so you can choose the moment of downtime.

## Volumes

Each volume the app mounts is copied to the target node. If the target does not register the volume's
[storage class](/docs/storage/storage-classes), the copy lands on the node's default storage, and the plan
says so.

A volume on **NFS or CIFS** shared storage is not copied: its data stays on the share. Only the
declaration moves, and the target's nodes must be able to mount the share.

The move is **blocked** when:

- **another application also mounts the volume.** Detach it there first. A volume can only be in one
  location, so it cannot follow one app and stay with another.
- the volume is a **host path** volume. Its data is an operator-managed directory on the node, which
  Miabi does not move.

## Databases

For each database instance the app uses, the plan offers one or more strategies.

| Strategy | When it is offered | What happens |
|---|---|---|
| **Move the instance** | The instance is used only by this app, and both nodes have the same CPU architecture | The instance's data is copied like a volume, live and then as a final delta. The instance keeps its name, host and credentials, so the app's connection settings do not change. |
| **Restore into a new instance** | The instance is a PostgreSQL, MySQL, MariaDB or MongoDB instance | An instance like the source is created at the target. The app's databases are dumped and loaded straight into it during the cutover. The app's connection settings are rewritten to point at it. |
| **Restore into an existing instance** | Same as above | The same, into an instance you choose at the target. It must run the same engine, at the same version or newer, and must not already have a database with the same name. |

An instance **shared** with other apps is never moved: the app's own databases are restored elsewhere,
and the shared instance and the other apps' databases stay where they are.

A Redis or libSQL instance can only move whole. If it is shared with other apps, the move is blocked:
give the app its own instance first.

A restored database is copied while the app is stopped, so the downtime grows with its size. Moving an
instance whole only costs the final delta.

## After the cutover

The old copy is kept for **7 days**. Until then you can:

- **Roll back**. The app goes back to its old location, on the data it had when it moved. **Changes made
  at the new location since the cutover are lost.** A rollback is a return to the state before the
  cutover, not a move back.
- **Delete the old copy** at any time. This removes the app's old container, the copied volumes and
  databases at the previous location, and the databases it was restored from. After that, the move can no
  longer be rolled back.

When the 7 days are over, the old copy is deleted automatically. Until it is, it still counts towards
the workspace's storage.

If the move fails after the switch, for example because the deploy at the target fails, it is rolled
back automatically. If it fails before the app stopped, the target is cleaned up and nothing else
changes.

## What changes, and what you may need to do

- **Generated URLs** are per location, so the app's one-click URL changes to the target location's
  external domain.
- **DNS records Miabi manages** are updated automatically. A custom domain whose DNS is hosted
  elsewhere must be pointed at the target; the move's report gives the address. Lower the record's TTL
  before the move so the switch is quick.
- **Certificates** issued over HTTP-01 are issued again by the target's gateway once DNS points at it.
  Certificates Miabi issues through a connected DNS provider carry over.
- **Private reachability**: locations do not route to each other. The plan warns when another app
  reaches this one by its private name.
- **GitOps**: a manifest that sets `placement.location` must be updated to the new location, or the next
  sync refuses the app. A manifest that does not set it keeps working.

These blockers also stop a move:

- the app is in a **stack** with other apps (a stack lives in one location);
- the app has never been deployed, is deploying, or has a canary rollout in progress;
- another move of the app is still open.

## Transfer and security

Nodes never connect to each other. The data flows from the source node to the target node through the
control plane, over the connections it already holds: the local Docker socket, or the node's agent
tunnel. **The move adds no encryption of its own**, so the data is exactly as protected as those
connections. On each side the copy runs in short-lived helper containers:

- The source volume is mounted read-only.
- The rsync daemon listens only on a temporary internal network, with a one-time password.
- Database dumps receive their credentials through the environment, never on the command line.

The volume helper image is `miabi/sync` (**Volume sync (rsync)** in the platform image catalog). Like
every platform image, it can be overridden or mirrored.

## API

| Method | Path | |
|---|---|---|
| `POST` | `/api/v1/workspaces/{ws}/apps/{app}/migrations/plan` | Dry run: `{location, databases: [{instance_id, strategy, target_instance_id}]}` |
| `POST` | `/api/v1/workspaces/{ws}/apps/{app}/migrations` | Start; adds `cutover_mode` (`auto` or `manual`) and `bandwidth_kbps` |
| `GET` | `/api/v1/workspaces/{ws}/apps/{app}/migrations` | An app's moves |
| `GET` | `/api/v1/workspaces/{ws}/migrations/{id}` | One move, with progress and report |
| `GET` | `/api/v1/workspaces/{ws}/migrations/{id}/events` | Live progress (SSE) |
| `POST` | `/api/v1/workspaces/{ws}/migrations/{id}/cutover` · `cancel` · `rollback` · `finalize` | Controls |

Every control is recorded in the audit log.
