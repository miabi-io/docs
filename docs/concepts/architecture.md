---
sidebar_position: 1
title: Architecture
description: How the Miabi control plane, worker, agent, gateway, and datastores fit together
---

# Architecture

Miabi is built to stay simple on a single node while scaling out to many. This page explains the
moving parts and how they interact.

## The big picture

```
Browser / CLI / API clients
        │
        ▼
Goma Gateway (routing, TLS/ACME) ─▶ Miabi control plane (Go / Okapi) ─▶ Docker Engine (local)
                                          │  serves API + web UI (single binary)        │
                                          │  └─ asynq worker (deploys, provisioning,     ▼
                                          │     backups, housekeeping)            Remote nodes
                                          └─ PostgreSQL (GORM) · Redis (cache / queue)  (via agent)
```

## Components

### Control plane

A single Go binary built on the [Okapi](https://github.com/jkaninda/okapi) framework. It serves the
REST API **and** the embedded Vue web console (the console is compiled into the binary and served as
a static SPA at `/`), so a deployment is a single image. It talks to the local Docker Engine through
the Docker SDK and to remote nodes through the agent.

### Background worker

Long-running operations — image builds, deploys, database provisioning, backups, housekeeping — run
asynchronously on an [asynq](https://github.com/hibiken/asynq) worker backed by Redis. The worker is
**embedded** in the control plane by default, and can be split into a dedicated process for
production. See [Configuration](/docs/getting-started/configuration#the-background-worker).

### Goma Gateway

[Goma Gateway](https://github.com/jkaninda/goma-gateway) sits in front of everything as the reverse
proxy. It handles HTTP routing, TLS termination, and default HTTP-01 ACME issuance. Miabi writes
per-route configuration files that Goma hot-reloads, so app and database containers are never
exposed directly to the host. See [Routing & Middlewares](/docs/networking/routing-and-middlewares).

### Node agent

Remote Docker hosts join the platform by running the [node agent](/docs/nodes/agent) — a thin Docker
proxy that dials the control plane over an **outbound** WebSocket tunnel (NAT- and firewall-friendly)
and exposes only the local Docker socket. See [Multi-node](/docs/nodes/overview).

### Datastores

- **PostgreSQL** (via GORM) is the system of record for every resource. Schema migrations run
  automatically on startup, with a versioned upgrade-step system for data migrations.
- **Redis** powers caching, rate limiting, JWT-session revocation, and the asynq job queue.

## Design principles

- **API first.** Every feature is a REST + OpenAPI endpoint. The web console is just a consumer; no
  business logic lives only in the frontend.
- **Docker first.** Docker is the primary runtime. Cluster mode adds Docker Swarm without
  complicating the single-node path.
- **Multi-tenant.** Every resource belongs to a workspace, with `workspace_id` scoping enforced in
  the repository layer (not just middleware). See [Resource Model](/docs/concepts/resource-model).
- **Self-hosted first.** Single-node on a plain VPS is a first-class experience.
- **Secure by default.** Secrets are encrypted at rest with per-workspace keys, and every mutation
  is recorded in an [audit log](/docs/operations/audit-log).

## Single-node vs. multi-node

Out of the box, Miabi manages the local Docker Engine — that's the entire platform on one host. When
you [add nodes](/docs/nodes/adding-a-node), the control plane schedules containers onto remote hosts
through their agents. Enabling [cluster mode](/docs/nodes/cluster-mode) promotes the fleet to a
Docker Swarm with encrypted overlay networking. The `Server`/node entity and `workspace_id` scoping
exist from the start, so growing from one node to many needs no destructive migration.

## Technology stack

| Layer | Choice |
|-------|--------|
| Backend | Go 1.25+, Okapi framework, REST + OpenAPI |
| ORM / DB | GORM over PostgreSQL |
| Cache / queue | Redis — cache, rate limiting, asynq queue |
| Scheduler | robfig/cron via a cron manager |
| Runtime | Docker Engine via the Docker SDK for Go (optional Swarm cluster mode) |
| Reverse proxy / TLS | Goma Gateway (routing + ACME); managed DNS-01 certs via go-acme/lego |
| Object storage | S3 (`aws-sdk-go-v2`) or filesystem |
| Metrics / logging | Prometheus client · `jkaninda/logger` |
| Frontend | Vue 3 + Pinia + Vite + TypeScript |
