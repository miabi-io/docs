---
sidebar_position: 2
title: Members & Invitations
description: Invite users to a workspace by email, accept invitations, assign roles, and remove members.
---

# Members & Invitations

Workspaces are how teams collaborate in Miabi. Each member of a workspace holds exactly one **role** that determines what they can do. This page walks through inviting people, accepting invitations, changing roles, and removing members — all from the web console.

![Workspace members](/img/screenshots/workspace-members.png)

## Inviting a member

1. Open **Workspace → Members** in the sidebar (Admins and Owners only).
2. Under **Invite a member**, enter the person's **email address**.
3. Choose a **role**: owner, admin, developer, or viewer. You can't invite someone above your own role — only an Owner can invite an Owner.
4. Click **Send invite**.

Miabi emails the invitee a link when an [SMTP server](/docs/getting-started/configuration) is configured, and shows an **Invitation token** once so you can share it yourself. The invitation is listed under **Pending invitations** until it is accepted. An email can only have one pending invitation per workspace, and inviting is refused once the workspace reaches its plan's member limit.

:::info A member must have an account
Membership is only ever granted by **accepting** an invitation while signed in, so the invitee needs a Miabi account with the invited email address — there is no way to add someone who has never registered.

Inviting an address that has no account yet is allowed; the invitation simply stays pending until one exists. Self-service sign-up is [off by default](/docs/security/authentication#registration), so a platform admin, or the person's [SSO provider](/docs/security/sso), may need to create the account first. See [Structure](/docs/workspaces/organizations#structure) for how users, workspaces and organizations fit together.
:::

## Accepting an invitation

The invitee signs in with the invited email address. Their dashboard shows a **Workspace invitations** card; clicking **Accept** makes them a member with the invited role. An invitation is single-use and expires after **7 days**. There is no re-send: once it lapses, invite the person again.

## Changing a member's role

On **Workspace → Members**, pick the new role from the member's **Role** dropdown (on Enterprise, [custom roles](/docs/workspaces/roles-and-permissions#custom-roles) appear there too). The new role takes effect on their next request. Role changes are recorded in the [Audit Log](/docs/operations/audit-log).

:::caution
A workspace always keeps **at least one Owner**; the last Owner cannot be demoted or removed. To hand a workspace off, promote another member to Owner, then step down. See [Owners and the rank guard](/docs/workspaces/roles-and-permissions#owners-and-the-rank-guard).
:::

## Removing a member

Click the **Remove** icon on the member's row and confirm. They immediately lose all access to the workspace and its resources. Their [API keys](/docs/security/api-tokens) aren't revoked, but every request is checked against current membership, so the keys can no longer reach this workspace. The console doesn't offer **Remove** for Owners; demote an Owner first.

## Roles at a glance

| Role | Typical use |
|------|-------------|
| **Owner** | Full control, including deleting the workspace. |
| **Admin** | Manage members, settings, and all resources. |
| **Developer** | Create and deploy apps, databases, domains. |
| **Viewer** | Read-only visibility. |

See [Roles & Permissions](/docs/workspaces/roles-and-permissions) for the full cumulative permission matrix.
