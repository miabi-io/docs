---
sidebar_position: 1
title: Nodes Overview
description: How Miabi schedules workloads across the local Docker Engine and remote nodes, and the difference between single-node and cluster mode.
---

# Nodes Overview

A **node** in Miabi is a Docker host that runs your workloads. Out of the box, Miabi manages the **local Docker Engine** on the machine where the control plane runs — no extra setup required. As you grow, you can attach **remote Docker hosts** as additional nodes and let Miabi schedule applications, databases, and services across all of them.

![Nodes list in the Miabi console](/img/screenshots/nodes.png)

## Local vs remote nodes

| | Local node | Remote node |
|---|---|---|
| Where it runs | The control-plane host itself | A separate VPS, dedicated server, or homelab box |
| Setup | Automatic | Install the [node agent](/docs/nodes/agent) with a join token |
| Connectivity | Direct to the local Docker socket | Outbound WebSocket tunnel from the node |
| Inbound ports | None | None — the agent dials out |

The local node is always present and is the default scheduling target. Remote nodes appear in the same list once their agent connects, and Miabi treats them as first-class scheduling targets thereafter.

## How scheduling works

When you deploy an application, Miabi places its containers on an eligible node. Placement considers node availability, resource headroom, and any pinning or labels you've configured. Persistent volumes and databases are bound to the node where they live, so stateful workloads stay put unless you explicitly migrate them.

:::note
Because remote nodes connect over an outbound tunnel, a node behind NAT or a firewall works without port-forwarding. The control plane never needs to reach *into* the node.
:::

## Single-node default vs cluster mode

By design, the **plain single-node** experience stays trivial. With one or more nodes running standalone Docker, Miabi deploys plain containers and routes traffic to them — nothing to configure.

Standalone nodes are **islands**: an app can reach a database on the same node, and Miabi refuses to attach it to one on a different node, because the workspace network is node-local and the name would not resolve.

When you want apps and databases to reach each other **across hosts** — over an encrypted overlay, with service-based deployments and rescheduling — opt into **[cluster mode](/docs/nodes/cluster-mode)**, which Miabi builds on auto-detected Docker Swarm. It is entirely optional; standalone nodes remain fully supported.

## Managed and unmanaged nodes

A node is **managed** when Miabi has a Docker connection to it — the local socket, or a connected [agent](/docs/nodes/agent). That connection is what powers metrics, resource stats, the in-console shell, and housekeeping.

In [cluster mode](/docs/nodes/cluster-mode) a node can be in the swarm **without** an agent. It runs tasks perfectly well — Swarm ships them to it directly — but Miabi cannot see inside it:

- **Logs, uptime, status and placement still work** (the manager reports them).
- **Metrics, stats and the shell do not.** Docker offers no manager-side equivalent, so an app scheduled there shows no resource usage and offers no shell.

Miabi labels such nodes **unmanaged** and can install the agent on all of them for you — see [Manage cluster nodes](/docs/nodes/cluster-mode#manage-cluster-nodes).

## Managing nodes

Node management is a **platform-admin** responsibility (Owner or Admin at the platform level). See [Platform Administration](/docs/administration/platform-admin) for who can add, remove, and configure nodes, and the [Architecture](/docs/concepts/architecture) page for how nodes fit into Miabi's overall design.

## Next steps

- [Add a node](/docs/nodes/adding-a-node)
- [Run the node agent](/docs/nodes/agent)
- [Enable cluster mode](/docs/nodes/cluster-mode)
- [Housekeeping & drift reconciliation](/docs/nodes/housekeeping)
- [Import existing Docker resources](/docs/nodes/docker-import)
