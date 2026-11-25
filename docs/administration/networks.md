---
sidebar_position: 5
title: Networks
description: The platform admin's view of networking — the address configuration, a check of every node's networks, orphan removal and the subnet ledger.
---

# Networks

**Admin → Networks** is where a platform admin sees how Miabi addresses its networks across every
node: what the configuration says, what each node's engine actually holds, and which subnet went to
which network. Workspace members see their own networks under
[Workspace networks](/docs/networking/workspace-networks); this page covers all of them.

## Configuration

Read-only: the values come from the environment or the
[install manifest](/docs/administration/install-manifest) and apply at boot.

| Row | Set by | Meaning |
|---|---|---|
| **Subnet pool** | `MIABI_NETWORK_POOL_CIDR`, `MIABI_NETWORK_SUBNET_PREFIX` | The range workspace, stack and overlay networks are carved from, and the size of each slice. **Not in use** means the allocator could not start, so networks fall back to Docker's own pool |
| **Pool usage** | | Subnets allocated or reserved, out of the pool's capacity. The bar turns orange at 85% |
| **Shared proxy network** | `MIABI_PROXY_NETWORK` | The network the gateway shares with routed apps, normally `miabi-proxy` |
| **Proxy network subnet** | `MIABI_PROXY_SUBNET` | The subnet every node creates the proxy network with, and where it came from (see below) |
| **IPv6** | `MIABI_NETWORK_IPV6` | **enabled**, or **requested** when the engine cannot honour it, with the reason underneath |
| **IPv6 addressing** | `MIABI_NETWORK_IPV6_ULA_PREFIX` | Whether each `/64` is derived from the IPv4 subnet or assigned by Docker |

The proxy subnet badge says which source won:

- **configured**: `MIABI_PROXY_SUBNET`, which `miabi setup` fills from `spec.networking.proxy.subnet`.
- **copied from the control plane**: the variable is unset, so remote nodes copy the subnet of the
  control plane's own proxy network. This covers installs whose manifest predates the setting.
- **default**: neither exists, so nodes use `10.63.0.0/16`. A node where that range overlaps another
  network falls back to Docker's pool and logs a warning. A configured subnet never falls back.

See [Networks overview](/docs/networking/networks-and-subnets#changing-the-subnets) to change them.

## Node network check

**Run check** (then **Check again**) asks every node's engine for its networks and compares them with the configuration and
the pool. It runs on demand, because it contacts each node. Results are grouped by cluster, and each
node shows **as configured**, **unreachable**, or a list of findings:

| Finding | Severity | What it means | What to do |
|---|---|---|---|
| Proxy network on another subnet | warning | The node's `miabi-proxy` does not use the configured subnet | Recreate it: Docker cannot change a network's subnet |
| Proxy network missing | warning | The node runs a gateway but has no proxy network | Nothing: the next gateway deploy creates it |
| Proxy IPv6 differs | note | The proxy network's IPv6 setting differs from the platform's | Recreate it to apply |
| Legacy proxy network | warning | The `miabi` network from before the rename still exists | Remove it once nothing uses it. Apps still attached are unreachable from the gateway until redeployed |
| Bridge shadowing an overlay | error | A local bridge has the name of a swarm overlay, so containers may attach to the wrong one | Remove the bridge |
| Orphan | warning | No workspace or stack uses the network any more | [Remove it](#removing-orphaned-networks) |
| Subnet differs from the pool | warning | The node's copy is not on the subnet the pool pinned the network to | Recreate it, so it matches the other nodes |
| Outside the pool | note | Created on Docker's address pool rather than Miabi's | Recreate it to move it into the pool |
| Ingress overlay missing | note | A swarm cluster's `miabi-ingress` does not exist yet | Nothing: it is created with the first routed app or gateway attach |
| Ingress overlay outside the pool, or on another subnet | warning | The overlay was not taken from the pool, or differs from its allocation | Recreate it |
| Manager unreachable | note | The swarm manager did not answer, so the ingress overlay was not checked | Bring the manager back and run the check again |

Recreating a network means detaching its containers. For a workspace network, a redeploy of its apps
puts them back; for `miabi-proxy` on the control-plane host, see
[Turning IPv6 on](/docs/networking/networks-and-subnets#turning-ipv6-on-for-an-existing-install),
which does the same in place.

### Removing orphaned networks

An orphan is a network Miabi created that no workspace or stack uses any more, typically the copy of a
deleted network on a node that was offline at the time. **Remove** sits next to each orphan, and
**Remove N orphans** next to a node with several.

Miabi checks each network again first: one that a workspace, a stack or any container (running or
stopped) still uses is left alone, and the result names it. Removed networks return their subnets to
the pool. Networks Miabi did not create are never offered for removal.

## Subnet allocations

Every subnet handed out from the pool, searchable by subnet, network, workspace or node, with a filter
per kind:

| Kind | Network |
|---|---|
| **Workspace network** | A workspace's default or custom network |
| **Stack network** | A stack's private network |
| **Swarm overlay** | A workspace network in a swarm cluster |
| **Ingress overlay** | A swarm cluster's `miabi-ingress`, shared by its gateways and routed apps |
| **Reserved** | A subnet found on a host without an allocation, such as a network created before the pool existed. The allocator never hands it out. The node check names the network that holds it |

A subnet is pinned to a network, not to a node, so the same network gets the same range on every node:
the **Node** column reads *every node*.

## Related

- [Networks overview](/docs/networking/networks-and-subnets): every network Miabi creates.
- [Platform settings](/docs/operations/platform-settings): the **Networking** card links here.
- [Cluster mode → Network check](/docs/nodes/cluster-mode#network-check): probing the overlay between
  nodes, which this page does not do.
