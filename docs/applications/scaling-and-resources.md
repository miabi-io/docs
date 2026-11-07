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

## GPUs

An app can also request **NVIDIA GPUs** for accelerated workloads (inference, training, transcoding).
GPU access is gated by the workspace's plan and by which devices a platform admin has enabled on the
node, so the GPU controls appear in an app's settings only when its plan allows them. See
[GPUs](/docs/applications/gpus) for the full setup.

## Replicas

Increase the **replica count** to run several identical containers of your app at once. More replicas mean:

- **More throughput** — requests are spread across containers.
- **Higher availability** — if one container fails, others keep serving.

Running more than one replica requires [cluster mode](/docs/nodes/cluster-mode). When it is on, apps
created through the console, CLI or API deploy as replicated **swarm services** by default (you can opt a specific app
back to a single container); an app applied from a manifest stays a container unless its
`deployment.runtime` says `service`. Swarm load-balances east-west traffic across the replicas by the app's service alias,
and **public ingress reaches them too** — the cluster's gateway reaches the service over a shared
ingress overlay, wherever the scheduler placed the tasks: through its virtual IP, or its replicas'
own addresses in a cluster set to
[DNS round-robin](/docs/nodes/cluster-mode#service-load-balancing). The app's detail page shows the
**real nodes** its replicas are running on.

The service runtime is also a [plan capability](/docs/workspaces/plans-and-quotas#capability-gates):
on a plan that doesn't allow it, new apps are created as containers and an existing container app
can't be switched to a service. Apps that already run as services keep running and stay editable.

### Changing an app's runtime

An existing app can move between the two runtimes from **App → Settings → Runtime**, or with
`POST /workspaces/{ws}/apps/{id}/runtime` (`{"runtime": "service", "replicas": 3}`). The console runs a
**dry run** first (`"dry_run": true` in the API) and lists what would stop the switch and what it changes:

- **Blocked** when the target is a service and cluster mode is off, the plan doesn't allow it, or the
  app has a GPU, devices or a privileged host mount; when a canary is in progress; and when the app is
  managed by a manifest (GitOps or `miabi apply`), whose next sync would undo the switch. Change
  `deployment.runtime` in the manifest instead.
- **Warned** when replicas drop to 1 on the way to a container, when published host ports stop being
  bound by a service, and when a node-local volume keeps a single-replica service on its node.

A deployed app is redeployed to switch. The handover is **rolling**: the new runtime starts, the route
moves to it, then the old container or service is removed. If the app mounts a node-local volume, the
switch uses **recreate** instead, so the two runtimes never hold the volume at once, and the app stops
briefly. If a rolling switch fails, the app stays on its previous runtime, which kept serving. An app
that was never deployed only has its runtime saved. The settings update (`PATCH /apps/{id}`) refuses a
runtime change with `409` and points to this endpoint.

## Single-node vs. multi-node

How replicas are placed depends on your deployment:

- **Single node** — all replicas run on the one host. You scale up to use that machine's capacity; total CPU and memory are bounded by the server.
- **Multi-node** — replicas can be spread across nodes, giving you more total capacity and tolerance to a whole node failing.

Miabi keeps the `Server`/node model from the start, so an app you scale today on a single host can spread across nodes later with no rework. See [Nodes overview](/docs/nodes/overview) for how multi-node placement works.

:::note
Stateful workloads need care when scaling. A replicated service can only safely share storage that
every node can reach — a **shared (RWX) volume** (NFS/CIFS) or a host-path bind present on all nodes;
a node-local volume is refused above one replica. In cluster mode Miabi automatically keeps an app
that holds node-local storage as a single **container** pinned to its node, rather than a migratable
service. See [Volumes](/docs/storage/volumes).
:::

## Applying changes

Changes to limits and replica count apply on the next deploy, rolled out with zero-downtime switching. Watch the effect afterward in [Monitoring](/docs/operations/monitoring).
