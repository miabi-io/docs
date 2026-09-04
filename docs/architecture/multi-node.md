---
sidebar_position: 4
title: Multi-node
description: How remote nodes join, how the agent tunnel works, and what changes when you enable cluster mode.
---

# Multi-node

One node is the default and the whole platform. Adding more changes where containers run, not how
you use Miabi.

```mermaid
flowchart TB
    Visitor(["Visitors"])

    subgraph cp["Control-plane node"]
        direction LR
        Server["<b>miabi</b><br/>API · console · worker"]
        Goma["Goma Gateway"]
        Store[("PostgreSQL + Redis")]
    end

    subgraph n1["Node A — behind NAT"]
        direction LR
        A1["agent"] --> App1["apps"]
    end

    subgraph n2["Node B — edge gateway"]
        direction LR
        A2["agent"] --> App2["apps"]
        G2["Goma"] --> App2
    end

    Visitor --> Goma
    Visitor --> G2
    Server <--> Store
    Server --> Goma
    A1 -. outbound tunnel .-> Server
    A2 -. outbound tunnel .-> Server
    Goma -. proxies to .-> App1
```

## The tunnel goes outward

The agent dials the control plane, not the other way round. That single decision is what makes a
homelab box, a NAT'd VPS or a machine behind a corporate firewall usable as a node: **no inbound
port, no exposed Docker socket, no VPN**.

Once connected, the control plane holds a live Docker API client for that node and uses it exactly as
it uses the local engine — the same code path creates a container whether it lands here or three
hops away.

## How traffic reaches an app on a remote node

Two shapes, and which one you get depends on how the node was added:

| Node connectivity | How visitors reach its apps |
|---|---|
| **Port-forward** | The central gateway dials the app at the node's address on an auto-provisioned host port |
| **Edge gateway** | The node runs its own Goma instance and serves its apps directly |

An edge gateway is the one to choose when the node is geographically distant or on its own uplink —
traffic terminates there instead of crossing the network twice. Routing and middleware definitions
stay workspace-level either way; only the gateway rendering them differs. See
[Edge gateways](/docs/nodes/overview).

## Cluster mode

Enabling [cluster mode](/docs/nodes/cluster-mode) promotes the fleet to a Docker Swarm, which adds
encrypted overlay networks spanning nodes, replicated apps, and cross-node service discovery. It is
opt-in and auto-detected: a plain single-node install behaves exactly as it did before, and nothing
in the console asks you to think about Swarm.

:::note Growing is not a migration
The `Server` entity and `workspace_id` scoping exist from the first install, so going from one node
to many adds rows — it never rewrites what is already there.
:::

## Technology stack

| Layer | Choice |
|-------|--------|
| Backend | Go, [Okapi](https://github.com/jkaninda/okapi) framework, REST + OpenAPI |
| ORM / DB | GORM over PostgreSQL |
| Cache / queue | Redis — cache, rate limiting, asynq queue, analytics stream |
| Scheduler | robfig/cron via a cron manager |
| Runtime | Docker Engine via the Docker SDK for Go (optional Swarm cluster mode) |
| Reverse proxy / TLS | Goma Gateway (routing + ACME); managed DNS-01 certs via go-acme/lego |
| Object storage | S3 (`aws-sdk-go-v2`) or filesystem |
| Metrics / logging | Prometheus client · `jkaninda/logger` |
| Frontend | Vue 3 + Pinia + Vite + TypeScript, embedded in the binary |
