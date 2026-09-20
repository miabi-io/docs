---
sidebar_position: 3
title: Organizations
description: Tenant realms that own workspaces, users and locations — with an owner, a workspace cap, and their own SSO.
---

# Organizations

An organization is a **tenant realm**. It owns workspaces, the user accounts that belong to them,
and — on Enterprise — the locations their workloads run on. Where a workspace is the isolation
boundary for one project's apps and data, an organization is the boundary for a *customer*: the
people, their workspaces, their hardware, and the identity provider they sign in through.

Every install has one. Community keeps the single built-in `default` organization it has always
had, and every workspace and user belongs to it. **Creating a second organization is an
[Enterprise](/docs/editions/community-vs-enterprise) feature** — it is the point at which one Miabi
instance starts serving more than one customer.

![The organizations list](/img/screenshots/admin-organizations.png)

## When you need one

You do not need organizations to separate projects, environments, or teams — use
[workspaces](/docs/workspaces/overview), which already isolate data, secrets, networking and
members. Reach for an organization when the tenants are **different customers**, and one of these
is true:

- They sign in through **their own SSO provider**, and accounts from it must never land in someone
  else's realm.
- They are capped: this customer may create **at most five workspaces**.
- They run on **their own nodes** — hardware nobody else shares.
- Someone is **accountable** for them, and you want that recorded rather than remembered.

## Creating one

**Platform admin → Tenants → Organizations → New organization.**

| Field | Meaning |
|---|---|
| **Display name** | The label shown throughout the console. Free text, editable at any time. |
| **Handle** | The URL-safe identifier, e.g. `acme`. Derived from the display name if you leave it blank, lowercase letters, digits and hyphens. |
| **Owner** | The user accountable for the organization. Optional here — see [Ownership](#ownership). |
| **Workspace cap** | How many workspaces the organization may hold. Unlimited by default; `0` allows none. |

The handle is **immutable** after creation: it is what admins and the API address the organization
by. Rename the display name instead.

![An organization's detail page](/img/screenshots/admin-organization-detail.png)

## Ownership

Every organization has an **owner** — the user accountable for it. The owner is recorded on the
organization, shown on its detail page, and set in one of three ways:

1. **Named when you create it.** An admin picks the owner in the New organization form, or later in
   **Settings**. This is the explicit case, and it always wins.
2. **Adopted by the first user.** An organization created without an owner takes the first user who
   joins it — including one provisioned by SSO. This fills a gap so that a realm is never
   accountable to nobody; it never overrides an owner an admin named, and once taken it does not
   move when a second user arrives.
3. **The default organization takes the first platform admin.** It is seeded before any user
   exists, so it cannot take an owner at creation the way a later one can.

:::note
Deleting a user **releases** the organizations they owned, which then show no owner until an admin
names one or a new user adopts them. An organization is never left pointing at an account that no
longer exists.
:::

Ownership here is **accountability, not permission**. It records who answers for the tenant; it
grants nothing on its own. What a person may do is still decided by their
[platform-admin status and per-workspace role](/docs/workspaces/roles-and-permissions).

## Signing in: attaching an SSO provider

An [OAuth 2.0 / OIDC provider](/docs/security/sso) can be attached to an organization. Every account
**registered through that provider** then belongs to it, with no per-user step: the customer's
people sign in with the customer's identity provider and land in the customer's realm.

![The organization field on an SSO provider](/img/screenshots/admin-oauth-provider-organization.png)

Two rules make this safe to rely on:

- **Only registration decides a realm.** Signing in through a provider never moves an account that
  already exists. Somebody who already belongs to one organization stays there, whichever provider
  they authenticate with.
- **A provider's organization is set once**, when the provider is created. Because existing accounts
  are never moved, changing it later would only split that provider's users across two realms — so
  the field is read-only afterwards.

A provider with no organization registers into the default one, which is how every install behaved
before providers could be attached at all.

:::tip
Pair this with the organization's **enforced-SSO** policy (Enterprise) to require that its people
sign in through the provider rather than with a local password.
:::

## Where its workloads run

An organization can be given a **default location** — the [cluster](/docs/nodes/cluster-mode#locations) its new
workspaces place resources in when they name none.

Beyond that, a cluster can be **dedicated** to an organization. A dedicated location is seen only by
that organization, and nothing outside it can be placed there — not even by a platform admin. In
return, an organization that owns any location is **confined** to the ones it owns, so its workloads
never land on shared hardware.

![Locations dedicated to an organization](/img/screenshots/admin-organization-dedicated-locations.png)

Dedicating a location is done from the location itself: **Platform admin → Infrastructure →
Clusters → *cluster* → Belongs to → Change**. It is refused while the location still runs another
organization's workloads — they would keep running somewhere their own workspace could no longer
see, scale, or place beside. Move or delete them first.

See [Cluster mode](/docs/nodes/cluster-mode#locations) for what a location is, and
[Plans & Quotas](/docs/workspaces/plans-and-quotas) for how placement policy interacts with plans.

## Structure

```
Organization: acme            (tenant realm — owner, cap, SSO, locations)
├── Users                     (registered through Acme's SSO provider)
├── Workspace: acme-prod
│   ├── Applications
│   ├── Databases
│   └── Members
└── Workspace: acme-staging

Organization: default         (every install has one)
└── Workspace: internal-tools
```

Members are assigned at the **workspace** level, each with one of the four roles. An organization
groups workspaces and accounts; it does not change the per-workspace
[role enforcement](/docs/workspaces/roles-and-permissions), and it is not a permission scope.

:::note
Plans and quotas are applied **per workspace**, not per organization. The organization's own limit is
the workspace cap. See [Plans & Quotas](/docs/workspaces/plans-and-quotas).
:::

## Deleting one

**Platform admin → Tenants → Organizations → *organization* → Delete.**

An organization must be **empty** first — no workspaces, no users. A delete that still held them is
refused rather than silently orphaning them: move them to another realm deliberately. Any locations
dedicated to it are released back to shared, since a location owned by an organization that no
longer exists would be visible to nobody.

The **default organization cannot be deleted**. If you want a different one to be the fallback that
new workspaces, users and providers attach to, promote it with **Make default** first.

## Multi-tenant isolation

An organization does not replace [workspace isolation](/docs/workspaces/overview#multi-tenant-isolation)
— it stacks on top of it. Data, secrets, networks and members are still scoped per workspace and
enforced by `workspace_id`, whether two workspaces belong to the same organization or not.

What the organization adds is the tenant boundary above that: who the workspaces belong to, which
identity provider creates their accounts, and — when you dedicate a location — which machines their
containers are allowed to run on.

## Next steps

- Manage who belongs to each workspace in [Members & Invitations](/docs/workspaces/members-and-invitations).
- Review what each role can do in [Roles & Permissions](/docs/workspaces/roles-and-permissions).
- Attach an identity provider in [SSO](/docs/security/sso).
- Give a tenant its own hardware in [Cluster mode](/docs/nodes/cluster-mode#locations).
