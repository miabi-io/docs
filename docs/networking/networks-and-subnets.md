---
sidebar_position: 7
title: Networks & Subnets
description: Workspace Docker networks, the platform-managed default network, and Miabi's own subnet (CIDR) allocation.
---

# Networks & Subnets

Every workspace's containers talk to each other over **Docker networks**. Miabi manages these for
you — you rarely need to think about them — and allocates their IP subnets from its own pool so a
busy host never runs out of address space.

## Workspace networks

Each workspace gets a **default network** the moment it is created. It is fully platform-managed:

- Every **application**, **database**, and **job** in the workspace is automatically attached to it,
  so they can reach each other by name.
- You **cannot detach** a resource from the default network, and you **cannot delete** it — it is
  the shared backbone the workspace relies on.

You can also create **additional networks** to further segment traffic (for example, isolating a
group of apps). Attach apps to them alongside the always-present default. Custom networks count
against your plan's network quota; the default network does not.

:::note
The reverse-proxy (gateway) network is separate: only apps exposed by a [route](/docs/networking/routing-and-middlewares)
join it, keeping unexposed apps off the public path. See
[Reverse proxy](/docs/networking/reverse-proxy-and-traefik).
:::

## The shared gateway network

The gateway and every routed app/database container share one bridge network —
`miabi` by default (`MIABI_PROXY_NETWORK`). Because *all* exposed containers on the host pile onto
this single network, it needs plenty of address space, so it is treated differently from the
per-workspace networks above:

- **Created up front as an external network.** `install.sh` runs `docker network create` for it
  before the stack starts, and the Compose files reference it as `external: true`. This gives it a
  **controllable, roomy CIDR** (`MIABI_NETWORK_CIDR`, default `10.63.0.0/16` — ~65k addresses)
  instead of a slice of Docker's small default pool, and it **survives `docker compose down`**
  rather than being recreated.
- **Distinct from the workspace pool.** Its CIDR must not overlap `MIABI_NETWORK_POOL_CIDR` (the
  `10.64.0.0/12` pool below) or your LAN. The default `10.63.0.0/16` sits just outside the pool.

If you run Compose by hand instead of `install.sh`, create it first:

```bash
docker network create --driver bridge --subnet 10.63.0.0/16 miabi
```

## Managed subnet allocation

Docker's built-in address pools are small and shared across every network on a host. A platform
that creates many networks — one default per workspace, plus stack, custom, and cluster overlay
networks — can exhaust them, and Docker then fails network creation with:

```
all predefined address pools have been fully subnetted
```

To avoid this, Miabi manages the IP space itself: it carves a unique subnet out of a configurable
**network pool** for every network it creates and hands Docker an explicit subnet, instead of
relying on Docker's defaults.

| Setting | Default | Controls |
|---------|---------|----------|
| `MIABI_NETWORK_POOL_CIDR` | `10.64.0.0/12` | The private supernet subnets are carved from. |
| `MIABI_NETWORK_SUBNET_PREFIX` | `24` | The size of each per-network subnet. |

The default `/12` pool split into `/24`s yields **4096 networks**, each with 254 usable addresses.
The base `10.64.0.0/12` is chosen to steer clear of ranges you're likely to already be using —
common Kubernetes CNI ranges, Docker's own `172.16.0.0/12` and `192.168.0.0/16` pools, and typical
LAN/VPN/Tailscale ranges. Shrink the pool (e.g. a `/16`, 256 networks) or move the base if it
doesn't suit your environment.

How it behaves:

- **Unique & durable** — allocations are recorded so they survive restarts and never overlap.
- **Overlap-safe** — at start-up Miabi reserves the subnets of any pre-existing Docker networks so
  it never hands out a colliding one; if a chosen subnet still collides it is skipped automatically.
- **Reclaimed** — deleting a network returns its subnet to the pool.
- **Consistent across nodes** — a workspace network keeps the same subnet on every node it is
  recreated on.

:::tip
Pick a pool CIDR that doesn't overlap your LAN, VPN, or other private ranges on the host. The
default `10.64.0.0/12` is chosen to avoid the usual suspects (common Kubernetes CNI ranges,
Docker's own pools, and Tailscale's `100.64.0.0/10`), but if it collides with something in your
environment,
set `MIABI_NETWORK_POOL_CIDR` to a free range — for example a spare `/16` like `10.99.0.0/16`.
:::

## Monitoring the pool

Pool utilization is visible on the **admin dashboard** (a *Network pool* panel showing used vs.
total subnets, with a warning as it nears capacity) and via Prometheus:

| Metric | Meaning |
|--------|---------|
| `miabi_network_subnet_pool_used` | Subnets allocated or reserved. |
| `miabi_network_subnet_pool_total` | Pool capacity. |

If the pool approaches exhaustion, enlarge `MIABI_NETWORK_POOL_CIDR`. See
[Monitoring](/docs/operations/monitoring) and [Configuration](/docs/getting-started/configuration).
