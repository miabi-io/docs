---
sidebar_position: 5
title: Node Placement
description: Pin volumes, apps, databases and scheduled jobs to one node of a location, so node-local data and the workloads that use it stay together.
---

# Node Placement

A [location](/docs/nodes/cluster-mode#locations) decides which cluster a resource runs in. Inside a
location with several nodes, Miabi picks the node, unless you pin one. Pinning matters most for
**node-local storage**: a local volume or a database's data lives on one node's disk, and everything
that reads it has to run there.

## The volume is the anchor

Pin the data, and the workloads follow it:

| Resource | Without a pin | With `node` |
|---|---|---|
| Volume | Miabi picks a node of the location | Created on that node, and stays there |
| Database instance | Miabi picks a node | Created on that node with its data volume, and stays there |
| Container app | Runs on the node of a node-local volume it mounts, else where Miabi placed it | Runs on that node |
| Service app | Swarm schedules it; a node-local volume it mounts keeps it on that volume's node | Every task runs on that node, from the next deploy |
| Job and CronJob runs | Follow the app: its pin, else the node of its node-local volumes, else its node | Run on that node (manifest only) |

So in most setups you pin the volume or the database and nothing else: the app and its jobs land on
the same node by themselves.

```yaml
apiVersion: miabi.io/v1
kind: Volume
metadata:
  name: uploads
spec:
  placement:
    location: eu-central
    node: worker-2
---
apiVersion: miabi.io/v1
kind: Application
metadata:
  name: cms
spec:
  image: ghcr.io/acme/cms
  placement:
    location: eu-central   # no node: it follows the volume
  deployment:
    runtime: service
  mounts:
    - volume: uploads
      path: /var/www/uploads
---
apiVersion: miabi.io/v1
kind: CronJob
metadata:
  name: cms-thumbnails
spec:
  app: cms
  schedule: "0 * * * *"
  command: ["./cms", "thumbnails"]   # runs on worker-2, next to the uploads
```

Shared storage is the exception. A volume or database on a
[shared storage class](/docs/storage/storage-classes) is reachable from every node, so `node` is
refused there: a pin would only undo its failover.

## Node names

`node` takes a node's **name**: the handle Miabi gives the node when it is added, such as
`worker-2`. It never changes. The **display name**, which admins can edit, is what forms show, so a
manifest written today keeps working after a node is relabelled.

You can see a node's name:

- in the response of `GET /api/v1/workspaces/{workspace}/location-nodes?location=<location>`, as
  `name`, next to `display_name` and a `pinnable` flag;
- on a volume's or database's page, next to the display name when the two differ;
- on a node's page under **Admin → Nodes**, for platform admins.

Only the nodes of the resource's location count, and only those the workspace's plan may use. A name
outside them reads as unknown, so a workspace can't probe for other nodes.

## Where you can pin

| | Console | API | Manifest | Terraform | CLI |
|---|---|---|---|---|---|
| Volume | Create form | `node` on create | `placement.node` | `node` | `--node` |
| Application | Create form, **Settings → Node** | `node` on create and update | `placement.node` | `node` | `--node` |
| Database instance | Create form | `node` on create | `placement.node` on `Database` and `DatabaseInstance` | `node` | `--node` |
| Job, CronJob | — | — | `placement.node` | — | — |

Job placement is manifest-only on purpose: a run started from the console follows its app, and
editing a cron job in the console keeps the node a manifest set.

## What can change

- **Volumes and databases** never move. Their node is fixed once created; a manifest naming another
  node fails the apply. Migrate the data, or delete and recreate the resource.
- **Services** can change node at any time; the new pin applies at the next deploy.
- **Container apps** can change node only before their first deploy. Moving a deployed container app
  is refused for now.
- **Jobs**: changing a `Job`'s node moves its next runs without running it again.
- In a manifest, leaving `node` out never counts as a change, and exports drop it, since node names
  belong to one install.

## Who can choose a node

Platform admins can always pin. Workspace members with the **Developer** role or above can pin to the
nodes their location lists, when allowed:

- `MIABI_NODE_PINNING` (default `true`) is the platform-wide setting. Set it to `false` to leave node
  choice to platform admins.
- A plan can override it under **Admin → Plans → Placement → Node choice** (Enterprise). Hosting
  providers can keep customers on shared plans off node choice this way.

When pinning is off, the node picker is hidden and a `node` in a request or manifest is refused.
Cordoned and offline nodes are listed but not selectable.

## Errors

| Message | Why |
|---|---|
| `node not found in this location: "worker-9" in "eu-central"` | Not a node of that location, or outside the plan's node pool. |
| `that node is cordoned and accepts no new resources` | The node is cordoned. Existing resources on it keep running. |
| `choosing a node is turned off for this workspace; choose a location instead` | `MIABI_NODE_PINNING` or the plan turns it off. |
| `a shared volume is reachable from every node; node does not apply to it` | The volume or database uses NFS, CIFS, a host path or a shared storage class. |
| `NODE_VOLUME_CONFLICT: volume "uploads" lives on worker-2; …` | An app or job pinned away from a node-local volume it uses would see an empty volume. Pin it to the volume's node, or detach the volume. |
| `… lives on node "worker-2" and cannot move to "worker-3"` | A volume or database changed node in a manifest. |
| `moving a deployed container app to another node is not supported yet` | Pin a container app before its first deploy, or run it as a service. |
| `placement.node and a node.id or node.hostname constraint both choose the node` | Keep one of the two. |

## Related

- [Cluster mode](/docs/nodes/cluster-mode): locations, node pools and runtimes.
- [Manifest reference](/docs/cicd/manifest-reference#pinning-to-a-node): `placement.node` per kind.
- [Storage classes](/docs/storage/storage-classes): which classes are shared.
