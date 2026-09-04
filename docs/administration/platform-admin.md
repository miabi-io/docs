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
`/etc/miabi/miabi.yaml` — the **only** copy, so back that file up. Sign in with those credentials;
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

Platform administration is global: *the server, the fleet, and the configuration everything
else runs on* — not the contents of any one workspace. The admin console is organised
around that, and this table is the map.

### Tenants

| Section | Responsibility |
|---|---|
| **Users** | Create accounts, reset credentials, revoke sessions, set per-user limits, and schedule deletions. See [Users & Accounts](/docs/administration/users-and-accounts). |
| **Workspaces** | Cross-workspace visibility, privileged workspaces, and key rotation. See [Workspace Oversight](/docs/administration/workspace-oversight). |
| **Plans** | Define what a workspace may consume and which capabilities it unlocks. See [Plans & Quotas](/docs/workspaces/plans-and-quotas). |

### Infrastructure

| Section | Responsibility |
|---|---|
| **Nodes** | The fleet: status, health, capacity, container inventory, housekeeping and Docker import. See [Nodes & Capacity](/docs/administration/nodes-and-capacity). |
| **Runners** | The build machines pipelines execute on. See [Runners](/docs/cicd/runners). |
| **Registry** | The built-in multi-tenant OCI registry. See [Registry administration](/docs/registry/administration). |
| **Platform backup** | Backing up and restoring the platform itself. See [Backups](/docs/storage/backups). |

### Traffic

| Section | Responsibility |
|---|---|
| **Domains** | Verify, force-verify or ban a domain in any workspace. See [Workspace Oversight](/docs/administration/workspace-oversight#moderating-domains). |
| **Routes & ports** | Every route on the instance, and the host-port review queue. See [Workspace Oversight](/docs/administration/workspace-oversight#moderating-routes-and-host-ports). |

### Configuration & operations

| Section | Responsibility |
|---|---|
| **Settings** | The typed, cached key-value configuration governing instance-wide behaviour. See [Platform Settings](/docs/operations/platform-settings). |
| **Deployment config** | Registry mirror and platform image pins. See [Scheduled Jobs & Image Defaults](/docs/administration/scheduled-jobs#image-defaults). |
| **Jobs** | The background sweeps that keep the platform consistent. See [Scheduled Jobs](/docs/administration/scheduled-jobs). |
| **Metrics** | Instance-wide resource and activity overview. |
| **Events** | The platform-wide activity feed. See [Audit log](/docs/operations/audit-log). |
| **Upgrades** | Roll the instance forward to a newer image. See [Upgrades](/docs/administration/upgrades). |

### Identity & compliance

| Section | Responsibility |
|---|---|
| **OAuth providers** | External identity providers for sign-in. See [SSO](/docs/security/sso). |
| **Directory (LDAP)** | Directory-backed authentication. See [SSO](/docs/security/sso). |
| **SIEM** | Streaming audit events to an external SIEM. See [SIEM](/docs/security/siem). |
| **License** | Enterprise entitlement. See [Licensing](/docs/editions/licensing). |

## What a platform admin cannot do

The boundary matters as much as the capability list. Admin visibility is **structural, not
contents**:

- **Workspace secrets stay unreadable.** They are encrypted with per-workspace keys and the
  admin console holds none of them. There is no "view secret" for another tenant.
- **Managed containers are not directly operable** from the node view (see below).
- **The last platform admin cannot be removed**, deactivated or demoted. There is no
  supported route to an instance nobody can administer.

Everything a platform admin *does* do is written to the
[audit log](/docs/operations/audit-log), which is the record you will want when someone
asks why an account was reset or a domain was banned.

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

- [Users & Accounts](/docs/administration/users-and-accounts) — creating accounts and recovering locked-out users.
- [Workspace Oversight](/docs/administration/workspace-oversight) — privileged workspaces, and moderating domains and ports.
- [Nodes & Capacity](/docs/administration/nodes-and-capacity) — the operational view of your fleet.
- [Scheduled Jobs & Image Defaults](/docs/administration/scheduled-jobs) — background sweeps and platform image pins.
- [Platform Settings](/docs/operations/platform-settings) — instance-wide configuration.
- [Upgrades](/docs/administration/upgrades) — moving to a newer release.
