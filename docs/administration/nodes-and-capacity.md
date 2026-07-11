---
sidebar_position: 2
title: Nodes & Capacity
description: The platform-admin view of your node fleet — status, health, and capacity.
---

# Nodes & Capacity

This is the **platform-admin operational view** of your node fleet: where you see every node Miabi can schedule work onto, check that each one is healthy, and understand how much capacity is available.

![Nodes overview](/img/screenshots/nodes.png)

:::note
Adding a node to the fleet is a separate workflow — see [Adding a Node](/docs/nodes/adding-a-node). This page covers monitoring and managing the nodes you already have. For background on what a node is, read the [Nodes Overview](/docs/nodes/overview).
:::

## Viewing the fleet

The Nodes screen lists every node connected to the instance. For each node you can see:

- **Name and address** — how the node is identified and reached.
- **Status** — whether the node is online, draining, or unreachable.
- **Health** — the result of the most recent health check, including the Docker runtime.
- **Capacity** — total versus allocated CPU, memory, and disk.
- **Workloads** — how many containers the node is currently running.

## Status & health

Each node reports its status continuously so the platform admin always sees the live state of the fleet:

| State | Meaning |
|-------|---------|
| **Online** | Healthy and accepting new workloads. |
| **Draining** | Reachable but not accepting new placements (for maintenance). |
| **Unreachable** | The control plane has lost contact; existing workloads may still be running, but the node can't be scheduled. |

When a node turns unreachable, check its network connectivity and the Docker daemon on that host. Health signals also feed into [Monitoring](/docs/operations/monitoring), where you can chart resource usage over time and set up alerts.

## Capacity & assignment

Capacity is the headroom you have for new deployments. The platform view aggregates CPU, memory, and disk across all online nodes and shows how much is already committed to running workloads.

:::tip
Keep some headroom on every node. Running nodes near 100% utilization leaves no room for rolling deploys, image builds, or sudden traffic — and makes a single node failure harder to absorb.
:::

When you deploy an application, Miabi assigns it to a node with available capacity. As a platform admin you can review these assignments and rebalance by draining a node and letting workloads reschedule.

## Where to go next

- [Nodes Overview](/docs/nodes/overview) — concepts and architecture.
- [Adding a Node](/docs/nodes/adding-a-node) — grow the fleet.
- [Monitoring](/docs/operations/monitoring) — usage trends and alerts.
