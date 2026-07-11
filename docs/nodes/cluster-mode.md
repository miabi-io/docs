---
sidebar_position: 4
title: Cluster Mode
description: Optional Docker Swarm cluster mode with encrypted overlay networks and service deployments.
---

# Cluster Mode

**Cluster mode** is Miabi's optional orchestration layer for running workloads across multiple nodes. It is built on **auto-detected Docker Swarm**, and gives you encrypted overlay networking, service-based deployments, and automatic rescheduling — while keeping the [single-node](/docs/nodes/overview) experience trivial for everyone who doesn't need it.

![Cluster mode settings](/img/screenshots/cluster-mode.png)

## Single-node default vs cluster

By default, Miabi runs your nodes as **standalone Docker** hosts and deploys plain containers. This is the right choice for one server or a small set of independent hosts — there's nothing to configure and nothing extra to operate.

**Cluster mode** is for when you want your nodes to act as one fabric: services that span hosts, encrypted communication between them, and the orchestrator handling placement and recovery.

## Enabling cluster mode

Cluster mode is a platform-admin action (see [Platform Administration](/docs/administration/platform-admin)):

1. Open **Nodes → Cluster** in the console.
2. Choose **Enable cluster mode**. Miabi initializes (or detects an existing) Docker Swarm and promotes the control-plane node as a manager.
3. Existing connected nodes join the swarm as workers. New nodes added afterward join automatically.

Miabi **auto-detects** Swarm state, so if a host is already part of a swarm it is recognized rather than reinitialized.

## What cluster mode gives you

- **Encrypted overlay networks.** Cross-node service traffic runs over overlay networks with encryption enabled, so workloads on different hosts communicate securely.
- **Service deployments.** Applications deploy as swarm **services** rather than single containers, enabling replicas, rolling updates, and rescheduling across nodes.
- **Self-healing placement.** If a node goes away, the orchestrator reschedules eligible services onto healthy nodes.

:::note
Stateful workloads (databases, volumes) remain bound to the node holding their data. Cluster mode improves placement and networking for stateless and replicated services; it does not automatically move persistent data.
:::

## When to use it

| Use cluster mode when… | Stay single-node when… |
|---|---|
| You run multiple nodes that should share workloads | You have one server or independent hosts |
| You need replicas and rolling, cross-node updates | Plain containers per host are enough |
| Services on different hosts must talk securely | Workloads don't need cross-host networking |
| You want automatic rescheduling on node failure | Simplicity matters more than orchestration |

:::tip
Start single-node. Adopt cluster mode only when you actually have multiple nodes that need to cooperate — you can enable it later without rebuilding your apps.
:::

## Related

- [Nodes overview](/docs/nodes/overview)
- [Architecture](/docs/concepts/architecture)
- [Housekeeping](/docs/nodes/housekeeping)
