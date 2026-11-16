---
sidebar_position: 1
title: Choosing a setup
description: The ways Miabi can be deployed and used, from one server to many regions and from one developer to many organizations, and how to pick the right one.
---

# Choosing a setup

Miabi runs the same way on a single VPS and across several regions, for one developer or for
thousands of users. What changes between those setups is not the product but two decisions you make
about it:

1. **Where it runs** — one server, a cluster of servers, or several clusters in different places.
2. **Who uses it** — one team, many teams, students, paying customers, or several organizations.

The two are independent. A university can run on one large server; a two-person startup can run in
three regions. Pick one answer from each column, then read the matching pages.

| Where it runs | Who uses it |
|---|---|
| [One server](/docs/use-cases/single-node) | [Teams and companies](/docs/use-cases/teams) |
| [One cluster, several servers](/docs/use-cases/swarm-cluster) | [Universities and training](/docs/use-cases/education) |
| [Several clusters as regions](/docs/use-cases/multi-region) | [Hosting providers and agencies](/docs/use-cases/hosting-providers) |
| [Highly available apps with replicated storage](/docs/use-cases/replicated-storage) | [Several organizations on one instance](/docs/use-cases/multiple-organizations) |
| [A homelab](/docs/use-cases/homelab) | |

## The building blocks

Every setup on these pages is a combination of the same few pieces.

| Piece | What it is | Read more |
|---|---|---|
| **Control plane** | The `miabi` server, with PostgreSQL and Redis. One per install. It holds the configuration and drives every node | [Architecture](/docs/architecture/overview) |
| **Node** | A server running Docker. The control-plane host is the first one; others join by running the [agent](/docs/nodes/agent), which dials out | [Nodes](/docs/nodes/overview) |
| **Cluster** | A group of nodes that share private networking and a gateway. Either a single node or a Docker Swarm | [Multi-node & clusters](/docs/architecture/multi-node) |
| **Location** | A cluster as tenants see it. Every app, database and volume is created in one | [Locations](/docs/nodes/cluster-mode#locations) |
| **Gateway** | [Goma Gateway](/docs/networking/routing-and-middlewares): TLS, routing and middlewares at the edge of each cluster | [Request lifecycle](/docs/architecture/request-lifecycle) |
| **Workspace** | The unit of isolation: apps, databases, domains, secrets, members and its own network and encryption key | [Workspaces](/docs/workspaces/overview) |
| **Organization** | A tenant realm owning workspaces, users, an SSO provider and optionally its own clusters | [Organizations](/docs/workspaces/organizations) |
| **Plan** | Quotas, capabilities and placement for the workspaces on it | [Plans & quotas](/docs/workspaces/plans-and-quotas) |
| **Storage class** | A disk or a shared filesystem that volumes can be created on, by name | [Storage classes](/docs/storage/storage-classes) |

They connect in one place: **a workspace's resources are placed in a location**. Everything about
"where" hangs below the location; everything about "who" hangs above the workspace.

![Organizations and plans govern workspaces; a workspace places its apps, databases and volumes in a location, which is a cluster driven by the control plane](/img/diagrams/uc-overview.png)

## Which topology?

Start at the top and stop at the first answer that fits. You can always move further down later:
every step adds nodes or clusters to an existing install, and none of them rebuilds what is already
there.

![Decision flow: one server if everything fits and downtime is acceptable; otherwise one cluster, replicated storage when stateful apps must survive a node failure, or several clusters when servers are in different places](/img/diagrams/uc-decision.png)

| | One server | One cluster | Several clusters | Replicated storage |
|---|---|---|---|---|
| Servers | 1 | 2 or more, one site | Any number, any site | 3 or more per cluster |
| Replicas and rolling updates | Rolling updates | ✓ | ✓ per cluster | ✓ |
| An app survives a node failure | — | Stateless apps | Stateless apps, within its cluster | ✓ including its data |
| Regions, providers, on-premises sites | — | — | ✓ | Per cluster |
| Nodes behind NAT | — | — | ✓ as single-node clusters | — |
| Extra software to run | — | — | — | A replicated filesystem |

## Growing without migrating

Nodes, clusters, locations and `workspace_id` scoping exist from the first install. Going from one
server to many, or from one cluster to several, adds rows; it never rewrites the ones you have, and
your workspaces, domains and manifests keep working as they are.

![Growth path from one server to one cluster, several clusters and replicated storage, each step adding nodes without migrating](/img/diagrams/uc-growth.png)

## Combining the two

Some common combinations, each covered by one page from each column:

| You are… | Where it runs | Who uses it |
|---|---|---|
| A developer with side projects | One server | One personal workspace |
| A homelab, with a VPS for public apps | A VPS control plane, home machines as nodes | [Homelab](/docs/use-cases/homelab) |
| A startup with staging and production | One cluster, or two clusters to keep production apart | [Teams and companies](/docs/use-cases/teams) |
| A university course | One large server or one cluster | [Universities and training](/docs/use-cases/education) |
| A hosting provider | Several clusters, with node pools per tier | [Hosting providers](/docs/use-cases/hosting-providers) |
| A group of companies | Several clusters, some dedicated to one company | [Several organizations](/docs/use-cases/multiple-organizations) |

:::tip Editions
Everything on these pages works in the free **Community** edition unless it is marked
**Enterprise**. The Enterprise parts are mostly about governing many tenants: extra organizations,
plan placement, node pools, per-workspace overrides and branding. See
[Community vs Enterprise](/docs/editions/community-vs-enterprise).
:::
