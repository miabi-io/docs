---
sidebar_position: 7
title: GPUs
description: Run GPU-accelerated workloads on Miabi-managed nodes — enable devices per node, gate access by plan, and request GPUs per app.
---

# GPUs

Miabi can attach **NVIDIA GPUs** to your application containers for inference servers, training
jobs, transcoding, and other CUDA workloads — without giving every workspace unrestricted access to
every card on the host. Access is controlled at three levels that mirror the CPU/memory story: a
platform admin decides **which devices** each node exposes, each **plan** decides whether its
workspaces may request a GPU and how many, and each **app** declares the GPUs it needs. The deploy
attaches exactly those devices to the container.

:::note v1 scope
Version 1 does **whole-device NVIDIA passthrough** with count-based accounting — the common case that
unblocks real workloads. Fractional GPUs (MIG / time-slicing / MPS), VRAM quotas, AMD ROCm, and
fleet-wide GPU-aware scheduling are not yet supported. See [Limitations](#limitations).
:::

## Prerequisites

A node can host GPU workloads when it has:

1. **NVIDIA drivers** installed on the host.
2. The **[NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html)** installed and registered with Docker (this adds the `nvidia` container runtime).
3. Miabi started with **`MIABI_GPU_ENABLED=true`** (see [Configuration](#configuration)).

Miabi detects the toolkit automatically from the node's Docker runtimes — no node-agent change is
needed. A node without the toolkit is shown as such, and GPU deploys to it are refused up front
rather than failing cryptically at container start.

## How it works

```
Admin enables devices  →  Plan allows GPUs + sets a quota  →  App requests N GPUs  →  Deploy attaches them
   (per node)                 (per workspace)                    (per app)
```

Nothing is stored about *which* physical card an app got — devices are resolved fresh at each deploy
from the node's currently-enabled GPUs, so replacing a card or moving the app to another node just
works.

## 1. Enable GPUs on a node (admin)

Open **Admin → Nodes → \<node\> → GPUs**. Miabi inventories the node's physical cards by running a
short probe over the Docker API and lists each one with its model, UUID, memory, and index.

- **Rescan GPUs** re-runs the inventory on demand (it also runs periodically). New cards are
  discovered automatically.
- A newly discovered device arrives **disabled** — discovering a card never exposes it to tenants.
  Toggle **Enabled** to offer it to workloads.
- Set each device's mode:
  - **Shared** — many apps may request the device concurrently (good for inference and dev).
  - **Dedicated** — reserved for one app at a time (good for training).

If the node lacks the NVIDIA Container Toolkit, the page says so and lists no devices until you
install it and rescan.

## 2. Allow GPUs on a plan (admin)

GPU access is off by default. In **Admin → Plans → \<plan\>**:

- **Allow GPU access** — the capability gate. A workspace cannot request any GPU until its plan
  allows it.
- **GPUs** limit — the maximum number of GPU units the workspace's **running** apps may hold at
  once, summed across apps (the same aggregate model as the CPU/memory limits). `0` = none, `-1` =
  unlimited. A stopped app frees its units.

You can also override both per workspace under **Admin → Workspaces → \<workspace\>**.

## 3. Request GPUs for an app

In an app's **Settings → Resources**, set:

- **GPUs** — the number of whole devices to attach (`0` = none).
- **GPU kind** — optionally narrow the request to a vendor or model (e.g. `nvidia`, or a model
  substring like `A100`). Leave empty to use any enabled GPU on the app's node.

The GPU controls are shown **only when the workspace's plan allows GPUs** — there is no dangling
field that always errors. The request also rides the [declarative manifest](/docs/cicd/git-push-deploy)
under `resources.gpu` / `resources.gpuKind`, so a GPU app is reproducible from a manifest.

```yaml
resources:
  cpu: "4"
  memory: 16Gi
  gpu: 1
  gpuKind: nvidia
```

At deploy, Miabi resolves the request to concrete enabled devices on the app's node and attaches
them. Inside the container `nvidia-smi` lists exactly the granted device(s).

## Constraints & enforcement

GPU access means raw device passthrough, which is privileged, so it is gated hard and refused where
it would be unsafe:

- **Plan capability, twice.** A workspace whose plan lacks *Allow GPU access* cannot even save an app
  that requests a GPU (the API returns `403`), and the request is re-checked at deploy.
- **Quota at deploy.** GPU units are counted against the plan's **GPUs** limit across the workspace's
  running apps. Deploying an app that would exceed the limit is rejected with the quota reason;
  stopping another GPU app frees units.
- **Not with the restricted security profile.** A workload with raw device access is not
  "restricted", so a GPU app under the [restricted profile](/docs/workspaces/plans-and-quotas) is
  refused rather than silently downgraded.
- **Single container only (v1).** A GPU app must run as a single container, not a replicated
  (cluster/Swarm) service. Set the app's runtime to *container*.
- **Node must be GPU-capable.** If no enabled device matches the requested kind, or the node lacks
  the toolkit, the deploy fails with a message naming the node and the requested kind.

With `MIABI_PLAN_ENFORCEMENT=false` (single-tenant/homelab), the capability and quota checks are
no-ops, but device attachment still works — so a homelab can use GPUs freely.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `MIABI_GPU_ENABLED` | `false` | Master switch. When off, the control plane never probes nodes for GPUs and the UI hides all GPU controls (a no-GPU fleet pays nothing) |
| `MIABI_NVIDIA_RUNTIME` | `nvidia` | The container runtime name that signals the NVIDIA Container Toolkit is installed |
| `MIABI_GPU_PROBE_IMAGE` | `nvidia/cuda:12.4.1-base-ubuntu22.04` | The one-shot image the inventory probe runs `nvidia-smi` in. Point at a mirror for air-gapped/registry-pinned fleets |
| `MIABI_GPU_INVENTORY_MINUTES` | `30` | How often nodes are re-inventoried for GPUs |

## Metrics

When `MIABI_METRICS_ENABLED=true`, the Prometheus `/metrics` endpoint exposes:

- `miabi_gpu_devices_total` — physical GPU devices discovered across all nodes.
- `miabi_gpu_devices_enabled` — devices enabled (offered to workloads).
- `miabi_gpu_allocated` — GPU units currently held by running apps.

## Limitations

Version 1 is deliberately scoped to the common case:

- **Whole devices only** — no fractional GPUs (MIG, time-slicing, MPS).
- **No VRAM quota** — the limit counts whole devices, not GPU memory.
- **NVIDIA only** — AMD ROCm is not supported.
- **Single-node placement** — an app's GPUs are chosen on the node it's already pinned to;
  GPU-aware node selection across a fleet, dedicated-device exclusivity enforcement across the
  fleet, and clustered (Swarm) GPU services are planned for later phases.

## Related

- [Scaling & Resources](/docs/applications/scaling-and-resources) — CPU and memory limits and replicas.
- [Plans & Quotas](/docs/workspaces/plans-and-quotas) — capability gates and per-workspace quotas.
- [Nodes Overview](/docs/nodes/overview) — how nodes and placement work.
