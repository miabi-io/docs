---
sidebar_position: 3
title: Resource Model
description: Workspaces, ownership, scoping, and how Miabi resources relate
---

# Resource Model

Everything in Miabi is a **workspace-owned resource**. Understanding this model makes the rest of the
platform fall into place.

## Workspaces own everything

A **workspace** is the unit of multi-tenancy. Every resource — applications, deployments, domains,
certificates, databases, volumes, backups, networks, nodes (when assigned), pipelines, webhooks,
and members — belongs to exactly one workspace. Resources in one workspace are invisible to another.

This isolation is enforced in two places:

1. **Middleware** checks the caller's [role](/docs/workspaces/roles-and-permissions) on the workspace.
2. **The repository layer** scopes every query by `workspace_id`, so a token can never reach another
   workspace's data even if a handler is buggy.

See [Workspaces](/docs/workspaces/overview) for personal spaces, organizations, and membership.

## Core resources

| Resource | Belongs to | Notes |
|----------|-----------|-------|
| **Application** | Workspace | The deployable unit. Has a source (Git / image / template), env vars, limits, and releases. |
| **Deployment / Release** | Application | An immutable record of a build/pull + container creation; the unit of rollback. |
| **Domain** | Workspace | DNS-verified hostname routed to an app. |
| **Certificate** | Workspace | Managed (DNS-01 wildcard) or uploaded custom cert, encrypted at rest. |
| **Database** | Workspace | A managed PostgreSQL/MySQL/MariaDB/Redis/MongoDB/libSQL instance with credentials. |
| **Volume** | Workspace | A persistent Docker volume. |
| **Backup** | Workspace | A database dump or volume archive, local or in object storage. |
| **Network** | Workspace | A Docker network apps can join. |
| **Node** | Platform / Workspace | A Docker host (local or remote via agent). |
| **Member** | Workspace | A user with a role in the workspace. |

## Lifecycle and cascade

Resources have lifecycles surfaced through the [application timeline](/docs/applications/logs-and-timeline)
and the [audit log](/docs/operations/audit-log). When a workspace or a parent resource is deleted,
Miabi cascades the deletion to owned children — containers, volumes, route files, certificates — and
**crypto-shreds** the workspace's encryption keys so encrypted data becomes unrecoverable. See
[Encryption](/docs/security/encryption).

## Identifiers

Resources use integer primary keys internally and expose stable identifiers in the API and UI. The
control plane is the system of record (in PostgreSQL); the actual Docker objects it manages are
labeled so Miabi can [reconcile drift](/docs/nodes/housekeeping) and [adopt existing
containers](/docs/nodes/docker-import).

## Plans and quotas

Each workspace has an effective [plan](/docs/workspaces/plans-and-quotas) that caps how many of each
resource it can create (apps, databases, nodes, members, and so on). Exceeding a quota is rejected
at creation time.
