---
sidebar_position: 1
title: Platform Admin
description: Who the platform admin is, the first-user rule, and what they manage across the whole instance.
---

# Platform Admin

The **platform admin** (super-admin) is the account responsible for the Miabi instance as a whole — the parts of the system that sit *above* any single workspace.

![Platform admin console](/img/screenshots/platform-admin.png)

## How the platform admin is created

The platform admin is **seeded from configuration on first boot** — not by the first person to sign
up. Miabi creates it from `MIABI_ADMIN_EMAIL` and `MIABI_ADMIN_PASSWORD` before anyone can register,
so an admin always already exists.

| Variable | Default | Purpose |
|----------|---------|---------|
| `MIABI_ADMIN_EMAIL` | `admin@example.com` | Login of the seeded platform admin |
| `MIABI_ADMIN_PASSWORD` | — | **Required in production.** Miabi refuses to start outside dev while this is empty or left at its built-in default |

The one-line installer generates a password, prints it once at the end of the run, and stores it in
`/etc/miabi/stack.yaml` — the **only** copy, so back that file up. Sign in with those credentials;
every self-service sign-up afterwards is an ordinary user until invited into a workspace.

On a stack install you never set those two variables yourself: Miabi derives them and writes them
into the manifest, which is what it feeds the container. The login is whichever email you installed
with — `admin_email` and `acme_email` fall back to each other, so supplying either is enough, and
only if you supply neither does it become `admin@<domain>` (see
[Installation](/docs/getting-started/installation#install-options)). The `admin@example.com` default
above is what the *container* falls back to when nothing sets it, which is the Compose path.

:::tip
Treat this account as a privileged operations identity. Change the generated password after first
sign-in, enable any available SSO/MFA, and reserve it for platform tasks rather than day-to-day app work.
:::

## What the platform admin manages

Platform admins handle cross-workspace, instance-level concerns:

| Area | Responsibility |
|------|----------------|
| **Nodes** | View the fleet, check node status and health, and assign capacity. See [Nodes & Capacity](/docs/administration/nodes-and-capacity). |
| **Platform settings** | Manage the typed, cached key-value configuration that governs instance-wide behavior. See [Platform Settings](/docs/operations/platform-settings). |
| **Capacity** | Understand how much compute is available across the fleet and how workspaces consume it. |
| **Upgrades** | Roll the instance forward to a newer image. See [Upgrades](/docs/administration/upgrades). |

These responsibilities are global. A platform admin is concerned with *the server, the fleet, and the configuration that everything else runs on* — not with the contents of any one workspace.

## Managed containers are protected

The node view lists every container on a node, including the ones Miabi manages (apps, databases,
gateways). By default a platform admin **cannot stop or remove a Miabi-managed container** from that
list — those are operated through the resource that owns them, so the platform can't be
desynchronised from what is actually running.

| Variable | Default | Purpose |
|----------|---------|---------|
| `MIABI_SECURITY_ENFORCEMENT` | `true` | Blocks raw stop/remove of managed containers in the admin node view. Set `false` as a break-glass escape hatch |

This is unrelated to `MIABI_PLAN_ENFORCEMENT`, despite the similar name: that one gates per-workspace
[quotas and capability gates](/docs/workspaces/plans-and-quotas). Both default to `true`.

## Platform admin vs workspace roles

Platform administration is **separate** from the per-workspace permission model. Inside a workspace, access is governed by the **Owner, Admin, Developer, and Viewer** roles, which control who can create apps, deploy, manage domains, and so on. Those roles are scoped to a single workspace and do not grant any platform-level access.

A user can be a platform admin *and* hold a workspace role — the two layers are independent and enforced separately.

:::note
For the full breakdown of workspace-level capabilities, see [Roles & Permissions](/docs/workspaces/roles-and-permissions).
:::

## Where to go next

- [Nodes & Capacity](/docs/administration/nodes-and-capacity) — the operational view of your fleet.
- [Platform Settings](/docs/operations/platform-settings) — instance-wide configuration.
- [Upgrades](/docs/administration/upgrades) — moving to a newer release.
