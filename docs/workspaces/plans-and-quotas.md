---
sidebar_position: 5
title: Plans & Quotas
description: Per-workspace resource quotas and capability gates, and what happens when you hit a limit.
---

# Plans & Quotas

Every workspace is governed by a **plan** that defines its **quotas** (how much of each resource it may use) and **capability gates** (which features it can access). Limits are applied **per workspace**, so one workspace's usage never affects another.

:::note Enforcement is a single switch
Everything on this page is gated by `MIABI_PLAN_ENFORCEMENT`, which defaults to **`true`**. Set it
`false` and nothing here binds: every quota check passes and every capability gate is open, whatever
plan a workspace is on.
:::

![Plans and quotas](/img/screenshots/plans-quotas.png)

## Quotas

A quota is an upper bound on a countable resource. Typical quotas include:

| Quota | Limits the number of… |
|-------|------------------------|
| Applications | Apps deployed in the workspace. |
| Databases | Provisioned database instances. |
| Domains | Custom domains attached. |
| Members | Users invited to the workspace. |
| Volumes & storage | Persistent volumes and total disk used. |
| API tokens | Active workspace-scoped tokens. |

Quotas are checked **at creation time**. If creating a resource would exceed a quota, Miabi **rejects the request** with a clear error rather than silently degrading service.

:::note
Because the check happens at creation, you never end up with a half-provisioned resource. Free up capacity (delete an unused app or database) or raise the workspace's plan, then retry.
:::

## Capability gates

Beyond raw counts, a plan can gate **features**. Examples include custom TLS certificates, privileged host mounts, shell access into containers, shared (NFS/CIFS) storage, connecting DNS providers, [custom container labels](/docs/applications/container-labels), and [GPU access](/docs/applications/gpus) (with a separate **GPUs** quota counting the units a workspace's running apps may hold). Advanced security capabilities such as multiple SSO providers, SAML 2.0, and SCIM provisioning are gated to higher editions. See [Community vs Enterprise](/docs/editions/community-vs-enterprise) for the full breakdown.

When a feature is gated off, the corresponding controls are disabled in the console and the API returns a structured error explaining which capability is required. A platform admin can also override a capability for a single workspace.

## Viewing usage

Open **Settings → Plan & usage** to see current consumption against each quota. Usage bars highlight resources approaching their limit so you can act before a creation request is rejected.

:::tip
Plan your workspace layout early. Splitting workloads across [multiple workspaces](/docs/workspaces/overview) under an [organization](/docs/workspaces/organizations) can keep each workspace comfortably within its quotas.
:::

## When a limit is hit

1. Miabi rejects the creating request at the API boundary.
2. The console surfaces the reason (which quota or capability).
3. You resolve it by freeing capacity or upgrading the plan, then retry.
