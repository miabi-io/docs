---
sidebar_position: 2
title: One server
description: Run the whole platform on a single VPS, dedicated server or homelab box, and what to do about the risks of one machine.
---

# One server

The whole platform on one machine: the control plane, the gateway, your apps and your databases. It
is how every install starts, and for many it is where they stay.

**Good for:** side projects and homelabs, a small business's websites and tools, a team's staging
platform, demos and workshops, and any workload that fits one server and can be down while that
server is.

![One Linux server running Goma Gateway, the miabi control plane with PostgreSQL and Redis, a build runner, and two workspaces on their own networks, with backups to off-site S3 storage](/img/diagrams/uc-single-node.png)

Each workspace gets its own private network, so the shop's app cannot reach the blog's database even
though both run on the same Docker engine. Only the gateway listens on the public ports.

## Setting it up

1. **[Install Miabi](/docs/getting-started/installation)** on a Linux host with ports 80 and 443 open
   and a domain pointing at it. A 2 vCPU / 2 GB server runs the platform itself; size up for the apps
   and databases you plan to host. It does not need to be a fresh server: Miabi runs beside the
   containers already there, and can [import them](/docs/nodes/docker-import).
2. **Register a [build runner](/docs/cicd/runners)** on the same host. Every build from Git runs on a
   runner, and there is no built-in fallback, so a Git-source app waits until one exists. Apps
   deployed from an image or a marketplace template need no runner.
3. **Point a wildcard record at the server** and set it as the default cluster's
   [external domain](/docs/applications/exposing-your-app), so new apps get a working HTTPS address
   with one click.
4. **Configure an off-site [backup target](/docs/storage/backup-targets)** and schedule
   [database backups](/docs/storage/backups). On one server, the backups are your only copy of the
   data somewhere else.

If the server has more disks than the system one, register each as a
[storage class](/docs/storage/storage-classes) so volumes and databases land on the fast or the large
disk instead of the operating-system drive.

## What one server gives you

Everything in the core platform: Git and image deploys, zero-downtime rolling updates, canary
releases, rollbacks, custom domains with automatic TLS, managed databases, the marketplace, the
built-in registry, GitOps, monitoring and analytics. One server is not a reduced edition of Miabi.

## What it does not

**There is no failover.** When the server reboots, every app on it is down until it is back. Plan for
it rather than around it:

| Risk | What helps |
|---|---|
| A reboot or kernel update | Schedule it; containers come back with Docker |
| A broken disk or a lost server | Off-site backups, restored on a new host. [Platform backup](/docs/administration/platform-backup) (Enterprise) also restores the control plane itself |
| Outgrowing the machine | Add a second node and [form a cluster](/docs/use-cases/swarm-cluster), or move a workspace to a bigger install with [migration](/docs/operations/migration) |

## Where to go next

- [One cluster, several servers](/docs/use-cases/swarm-cluster) — the next step when one machine is
  not enough, or when apps must survive a node failure.
- [Teams and companies](/docs/use-cases/teams) — organizing workspaces, members and environments.
