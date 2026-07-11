---
sidebar_position: 3
title: Organizations
description: The single built-in organization — Miabi's identity realm for SSO, SAML, and SCIM.
---

# Organizations

:::info Not a multi-workspace grouping feature — yet
Miabi seeds **one built-in `default` organization** that every workspace belongs to. You cannot
create organizations, and you cannot group workspaces under separate ones. There are no organization
endpoints in the API today.
:::

Today an organization is an **identity realm**, not a folder. It owns the account-wide identity
configuration:

- **SSO / OAuth 2.0 / OIDC** providers — see [SSO](/docs/security/sso).
- **SAML 2.0** providers and the **enforced-SSO** policy (Enterprise).
- **SCIM 2.0** user provisioning (Enterprise).

Workspaces carry a nullable organization reference so that multi-organization support can arrive
later without a destructive migration. Until it does, use **workspaces** to model environments,
teams, and clients — each keeps its strict
[multi-tenant isolation](/docs/workspaces/overview#multi-tenant-isolation).

## Structure

```
Organization: default        (identity realm — SSO / SAML / SCIM)
├── Workspace: production
│   ├── Applications
│   ├── Databases
│   └── Members
├── Workspace: staging
└── Workspace: client-acme
```

Members are assigned at the **workspace** level, each with one of the four roles. The organization
carries identity configuration only; it does not change the per-workspace
[role enforcement](/docs/workspaces/roles-and-permissions).

:::note
Plans and quotas are applied **per workspace**. See [Plans & Quotas](/docs/workspaces/plans-and-quotas) for how limits and capability gates work.
:::

## Next steps

- Manage who belongs to each workspace in [Members & Invitations](/docs/workspaces/members-and-invitations).
- Review what each role can do in [Roles & Permissions](/docs/workspaces/roles-and-permissions).
