---
sidebar_position: 2
title: Members & Invitations
description: Invite users to a workspace by email, accept invitations, assign roles, and remove members.
---

# Members & Invitations

Workspaces are how teams collaborate in Miabi. Each member of a workspace holds exactly one **role** that determines what they can do. This page walks through inviting people, accepting invitations, changing roles, and removing members — all from the web console.

![Workspace members](/img/screenshots/workspace-members.png)

## Inviting a member

1. Open your workspace and go to **Settings → Members**.
2. Click **Invite member**.
3. Enter the person's **email address**.
4. Choose a **role**: Admin, Developer, or Viewer. (The **Owner** role is reserved for the workspace creator and cannot be assigned.)
5. Click **Send invitation**.

Miabi emails the invitee a link. Pending invitations appear in the members list with an **Invited** status until they are accepted.

:::tip
You only need an email address. If the person doesn't yet have a Miabi account, accepting the invitation walks them through registration first.
:::

## Accepting an invitation

The invitee clicks the link in the email, signs in (or registers), and confirms. Once accepted, they appear as an active member and gain access according to their assigned role. The invitation link is single-use and expires after a set period; you can re-send it from the members list if it lapses.

## Changing a member's role

From **Settings → Members**, open the menu next to a member and choose **Change role**. The new role takes effect immediately on their next request. Role changes are recorded in the [Audit Log](/docs/operations/audit-log).

:::caution
There is exactly **one Owner** per workspace — the user who created it. The Owner cannot be demoted or removed. To hand off a workspace, transfer ownership before leaving.
:::

## Removing a member

Open the member's menu and choose **Remove**. They immediately lose all access to the workspace and its resources. Any [API tokens](/docs/security/api-tokens) they created in this workspace are revoked along with their membership.

## Roles at a glance

| Role | Typical use |
|------|-------------|
| **Owner** | The creator; full control, billing, deletion. |
| **Admin** | Manage members, settings, and all resources. |
| **Developer** | Create and deploy apps, databases, domains. |
| **Viewer** | Read-only visibility. |

See [Roles & Permissions](/docs/workspaces/roles-and-permissions) for the full cumulative permission matrix.
