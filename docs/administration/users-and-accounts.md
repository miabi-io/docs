---
sidebar_position: 2
title: Users & Accounts
description: Create accounts, reset credentials, set per-user limits, and delete users safely from the platform admin console.
---

# Users & Accounts

Accounts are platform-level: a user exists on the instance, then joins workspaces. This
page covers what a [platform admin](/docs/administration/platform-admin) can do to an
account. Everything here lives under **Platform admin → Users**.

![The platform admin users list](/img/screenshots/admin-users.png)

## Registration is closed by design

There is no public sign-up. The platform admin is seeded at install, and every other
account is **created by an admin** or arrives through
[SSO / a directory](/docs/security/sso). This is deliberate: a self-hosted PaaS with open
registration is an open door to your Docker host.

## Creating an account

**Users → New user.** You set the name, email, username and initial password, and choose
whether the account is a platform admin.

An admin-set password is marked **must change**: the user is sent to a
change-password screen at first sign-in and cannot reach the console until they set their
own. You never need to learn the password they end up with.

## Account actions

Open a user to reach the actions below.

![A user's detail page with account actions](/img/screenshots/admin-user-detail.png)

| Action | What it does | When you need it |
|---|---|---|
| **Reset password** | Issues a new temporary password with the must-change flag set | The user is locked out and self-service reset is disabled or their mail is broken |
| **Verify email** | Marks the address verified without the user clicking a link | Their mail never arrived, and you have confirmed the address another way |
| **Revoke sessions** | Signs the account out everywhere immediately | A laptop was lost, or you suspect a stolen session |
| **Disable two-factor** | Clears the TOTP secret so the user can enrol again | They lost their authenticator *and* their recovery codes |
| **Deactivate** | Blocks sign-in and stops the workspaces they own | Offboarding, or an account under investigation |

:::caution
**Disable two-factor** removes a security control on someone else's account. Confirm the
request out of band — a support ticket asking to disable MFA is exactly what an attacker
sends. Every one of these actions is written to the [audit log](/docs/operations/audit-log).
:::

## Per-user limits

Two limits can be overridden per account, on top of the platform-wide defaults:

| Limit | Meaning |
|---|---|
| **Workspaces owned** | How many workspaces this user may create and own |
| **Workspace memberships** | How many workspaces they may belong to as a non-owner |

Leave both unset to inherit the platform default
(`MIABI_MAX_WORKSPACES_PER_USER` and its membership counterpart). Per-user overrides are
an [Enterprise](/docs/editions/community-vs-enterprise) capability; the platform-wide
limits are always available.

## Deleting an account

Deletion is **scheduled, not immediate**. It runs after a grace period
(`MIABI_DELETION_GRACE_DAYS`), and until then it can be cancelled.

| Step | Effect |
|---|---|
| **Schedule deletion** | The account is disabled, its workspaces are stopped, and a deletion date is set |
| **Cancel deletion** | Reverses the above; the account is usable again |
| **Force deletion** | Skips the grace period and tears down now |

When the deletion runs, the workspaces the user **owns** are torn down with them — apps,
databases, volumes and their data. Workspaces where they were only a member are untouched,
they simply lose the membership.

:::caution
**Force deletion destroys data immediately and cannot be undone.** Take a
[workspace export](/docs/storage/backups) of anything you might need first. The grace
period exists precisely because this decision is often reversed within a day.
:::

## The last admin is protected

Miabi refuses to remove platform-admin rights from, deactivate, or delete the **last**
platform admin. There is no supported path to an instance nobody can administer.

## Where to go next

- [Roles & Permissions](/docs/workspaces/roles-and-permissions) — what a user can do *inside* a workspace, which is a separate layer.
- [Authentication](/docs/security/authentication) and [SSO](/docs/security/sso) — how accounts sign in.
- [Audit log](/docs/operations/audit-log) — the record of every action on this page.
