---
sidebar_position: 6
title: Scaling & Resources
description: Set CPU and memory limits, run multiple replicas, and understand scaling on single-node and multi-node deployments.
---

# Scaling & Resources

Miabi lets you size each application precisely — capping CPU and memory per container and running multiple replicas for capacity and resilience.

![The scaling and resource-limits settings](/img/screenshots/scaling.png)

## Resource limits

Each application has per-app **resource limits** you set in its settings:

| Limit | What it controls |
|-------|------------------|
| **CPU** | The maximum CPU share each container may consume |
| **Memory** | The maximum memory each container may use before it's constrained |

Limits protect the host and your other apps from a single noisy service. Set them based on the app's real needs, and leave headroom for the brief overlap during [zero-downtime deploys](/docs/applications/releases-and-rollbacks).

:::tip
Start conservative and watch real usage in [Monitoring](/docs/operations/monitoring), then adjust. Over-allocating memory wastes capacity; under-allocating risks restarts under load.
:::

## Replicas

Increase the **replica count** to run several identical containers of your app at once. More replicas mean:

- **More throughput** — requests are spread across containers.
- **Higher availability** — if one container fails, others keep serving.

Running more than one replica requires [cluster mode](/docs/nodes/cluster-mode), where the app runs
as a replicated service. Inside the cluster, replicas are reachable by the app's service alias on
the workspace overlay network, and Swarm load-balances east-west traffic across them.

:::caution
Public ingress does **not** yet balance across replicas. Goma routes external traffic to a
single-container app; wiring ingress to a replicated service's virtual IP is not implemented.
:::

## Single-node vs. multi-node

How replicas are placed depends on your deployment:

- **Single node** — all replicas run on the one host. You scale up to use that machine's capacity; total CPU and memory are bounded by the server.
- **Multi-node** — replicas can be spread across nodes, giving you more total capacity and tolerance to a whole node failing.

Miabi keeps the `Server`/node model from the start, so an app you scale today on a single host can spread across nodes later with no rework. See [Nodes overview](/docs/nodes/overview) for how multi-node placement works.

:::note
Stateful workloads need care when scaling. Make sure persistent data lives on [volumes](/docs/storage/volumes) and that your app tolerates running as multiple replicas before raising the count.
:::

## Applying changes

Changes to limits and replica count apply on the next deploy, rolled out with zero-downtime switching. Watch the effect afterward in [Monitoring](/docs/operations/monitoring).
