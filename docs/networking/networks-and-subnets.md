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
  so they can reach each other by name. Each container answers to its resource's own name, which is
  what `{{ .applications.<name>.host }}` resolves to in a
  [manifest](/docs/cicd/manifest-reference#addressing-another-application).
- You **cannot detach** a resource from the default network, and you **cannot delete** it — it is
  the shared backbone the workspace relies on.

You can also create **additional networks** to further segment traffic (for example, isolating a
group of apps). Attach apps to them alongside the always-present default. Custom networks count
against your plan's network quota; the default network does not.

### Bridge on one node, overlay across a cluster

The default network's **driver** depends on whether [cluster mode](/docs/nodes/cluster-mode) is on,
and this is what decides whether a workspace can span hosts at all:

| | Driver | Reach |
|---|---|---|
| **Single node / no cluster** | `bridge` | Node-local. Recreated on each node with the same name and subnet, but as **disconnected islands** — an app on one node cannot reach a database on another, and Miabi refuses to attach them. |
| **Cluster mode** | `overlay` | Spans every node, attachable and **encrypted**. An app on one node reaches a database on another **by name**, with no published ports. |

Because every app and database already joins the workspace default, that one change is the whole
mechanism for cross-node connectivity — nothing else has to be reconfigured, and no connection string
changes (they address a database by its alias, not by its network).

Enabling cluster mode converts existing workspaces for you. Containers are **not** restarted: each is
attached to the overlay, carrying its DNS aliases across, and then detached from the bridge. See
[Applying it to existing workspaces](/docs/nodes/cluster-mode#applying-it-to-existing-workspaces).

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

- **A roomy, explicit CIDR on a managed install.** `install.sh` and `miabi setup` create it with
  `10.63.0.0/16` (~65k addresses) instead of a slice of Docker's small default pool. Choose another
  range with `MIABI_SUBNET` or `--subnet` — see [Changing the subnets](#changing-the-subnets).
- **Distinct from the workspace pool.** Its CIDR must not overlap `MIABI_NETWORK_POOL_CIDR` (the
  `10.64.0.0/12` pool below) or your LAN. The default `10.63.0.0/16` sits just outside the pool.

The [Compose files](https://github.com/miabi-io/miabi/tree/main/examples/compose) declare `miabi` as
an ordinary Compose network, so Compose creates it (and `docker compose down` removes it) with a subnet
from Docker's default address pools. Add an `ipam` block to the network in your Compose file if you
need a specific range.

## The platform's private network

Miabi's own components do **not** sit on the shared gateway network. They get a second, private
bridge — `miabi-internal` — and only the gateway is on both. This is true of every install path: a
managed one (`install.sh`, `miabi setup`) creates it with an explicit `10.62.0.0/16`, and the
[Compose files](https://github.com/miabi-io/miabi/tree/main/examples/compose) declare it alongside
`miabi`.

| Container | `miabi` (shared) | `miabi-internal` (private) |
|---|---|---|
| `miabi-gateway` | ✅ reaches your apps, and the internet for ACME | ✅ reaches Miabi and Redis |
| `miabi` (control plane) | — | ✅ |
| `miabi-postgres` | — | ✅ |
| `miabi-redis` | — | ✅ |
| `mb-registry` (built-in registry) | — | ✅ |
| your routed apps | ✅ | — |

(On the Traefik Compose variant, Traefik takes the gateway's row.)

The reason is that everything on the shared network can dial everything else on it by name. The
control-plane database has a **single superuser password** covering every workspace and every stored
secret, and Redis holds the background job queue — so one exposed application being compromised
should not put them within reach. After the split, the only way into the platform is through the
gateway, where your [routes and middlewares](/docs/networking/routing-and-middlewares) — rate limits,
IP allowlists, security policies — actually apply.

The built-in registry sits on the private network only for the same reason: it relies on the gateway
to authenticate every request, so app containers must not be able to reach it directly. A Compose
stack needs `MIABI_INTERNAL_NETWORK` set for this — see the upgrade note below.

Nothing about deploying, routing, or connecting apps changes: your containers still join `miabi`
when they have a route, exactly as before.

### Changing the subnets

On a managed install both CIDRs must miss each other, the workspace pool (`10.64.0.0/12`, below),
and your LAN or VPN:

```bash
curl -fsSL https://get.miabi.io | sudo \
  MIABI_DOMAIN=miabi.example.com \
  MIABI_SUBNET=10.63.0.0/16 \
  MIABI_INTERNAL_SUBNET=10.62.0.0/16 bash
```

They are also flags on `miabi setup` (`--subnet`, `--internal-subnet`) and are recorded in
`/etc/miabi/miabi.yaml`:

```yaml
spec:
  networking:
    proxy:    { name: miabi,          subnet: 10.63.0.0/16 }
    internal: { name: miabi-internal, subnet: 10.62.0.0/16 }
```

The same block also carries the [managed subnet pool](#managed-subnet-allocation) (`pool`), the host
port range (`hostPorts`), the **default cluster's** wildcard domain for one-click app URLs (`external`
— other clusters set theirs in the cluster's **Edit** dialog, see
[Cluster mode](/docs/nodes/cluster-mode#external-access)) and the managed-DNS
interval (`dns`) — see the [Install Manifest](/docs/administration/install-manifest).

:::note Upgrading an existing install
The split happens on your next `miabi upgrade`. The private network is created, every component is
attached to it **while still running**, and only then are the containers recreated on their final
networks — so there is no window where Miabi cannot reach its database. Expect the same brief
restart any upgrade involves.
:::

:::note Upgrading a Compose stack
Pull the new `compose.yaml`, add `MIABI_INTERNAL_NETWORK=miabi-internal` to your `.env`, and
`docker compose up -d` — Compose creates the network and moves the containers onto it. The variable
matters: Miabi reads it to place the helper containers it runs out of process (platform backups, the
built-in registry), and an empty value leaves them on `miabi` alone, where the database no longer is.

On the Traefik variant the control plane also carries `traefik.docker.network=miabi-internal`, since
Traefik's Docker provider otherwise looks for the panel's address on `miabi` and finds none.
:::

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

Pool utilization is visible on the **admin dashboard** (a *Subnet pool* panel showing used vs.
total subnets, with a warning as it nears capacity) and via Prometheus:

| Metric | Meaning |
|--------|---------|
| `miabi_network_subnet_pool_used` | Subnets allocated or reserved. |
| `miabi_network_subnet_pool_total` | Pool capacity. |

If the pool approaches exhaustion, enlarge `MIABI_NETWORK_POOL_CIDR`. See
[Monitoring](/docs/operations/monitoring) and [Configuration](/docs/getting-started/configuration).
