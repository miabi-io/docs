---
sidebar_position: 9
title: Miabi Console
description: Connect an instance to Miabi Console, lock the connection, and let the console manage sign-in, workspace creation and plans (Enterprise, Billing add-on).
---

# Miabi Console

Miabi Console is the commercial control plane that sells Miabi: customers buy a package there, and
the console creates and bills their workspaces on an instance. It talks to the instance through the
**Billing API**, with a billing-only key the instance hands it when you connect them.

:::info Enterprise
The Billing API needs an Enterprise licence with the **Billing** add-on, and it stays off until the
operator sets `MIABI_BILLING_API_ENABLED=true` and restarts.
:::

## Connect

1. In the console, open the instance and copy its **enrolment code** (`mce1.…`).
2. In Miabi, open **Platform admin → Billing**, paste the code and select **Connect**.

Miabi creates the billing key, gives it to that console, and shows the connection. Codes work once
and expire after 24 hours.

## Lock the connection

On an instance you operate for a customer (a dedicated instance), the customer's admin must not be
able to cut the instance off from billing. Set:

```bash
MIABI_BILLING_CONNECTION_LOCKED=true
```

Once the instance is connected, Miabi then refuses, with `409 BILLING_CONNECTION_LOCKED`:

- **Disconnect** on the Billing page, which shows the connection as managed by the variable;
- connecting to another console;
- suspending, deactivating or deleting the billing service account, whose key *is* the connection.

If the instance is not connected yet, an admin can still connect it once. To unlock, remove the
variable and restart. Miabi refuses to start with the lock on and `MIABI_BILLING_API_ENABLED` off.

:::caution What the lock protects against
The lock stops Miabi's own admins. It cannot stop someone with root on the server, who can change
the environment. Use it on instances you run, not as protection on a customer's own server.
:::

## Sign-in with Miabi Console

After you connect, the console configures itself as a sign-in provider on the instance: a generic
OIDC provider named `miabi-console`, shown on the login page as **Miabi Console**. It carries group
sync, so customer members join their workspaces with their role and console staff sign in as
platform admins. Group sync needs the Enterprise **SSO group mapping** entitlement; without it the
provider is still configured, for sign-in only.

If you had already added the console as a provider by hand, it is taken over rather than duplicated,
and its users stay linked. On **Platform admin → SSO** the provider carries a **Miabi Console**
badge: you can turn it off or hide its button, but its client, issuer and group settings belong to
the console, and it cannot be deleted here.

Disconnecting the console removes the provider. Miabi refuses to disconnect when your own account
can sign in only through it; set a password or link another provider first.

## Workspaces created only in the console

To make sure every workspace is sold and billed, set:

```bash
MIABI_WORKSPACE_CREATION=console
```

Nobody can then create a workspace in Miabi itself, admins included: the console, the CLI, the API,
operator controls and restoring a backup into a new workspace all refuse with
`403 WORKSPACE_CREATION_CONSOLE`. The **New workspace** button becomes **Create in Miabi Console**,
which opens the console. Workspaces the console bills cannot be deleted from Miabi either
(`409 WORKSPACE_MANAGED_BY_CONSOLE`); other workspaces can.

This mode is set only by the environment, never from Platform Settings or an organization, and needs
`MIABI_BILLING_API_ENABLED=true`. When a billed workspace is deleted by any other route, Miabi tells
the console (`billing.workspace.deleted`) so it stops billing it.

## Plans from the console

The console can define plans once and push them to its instances. Plans it pushes appear on
**Platform admin → Plans** with a **Miabi Console** badge:

- their name, limits, capabilities, database sizes and resource defaults come from the console, and
  edits to those fields here are discarded;
- placement, storage classes and runners name things of this instance, so they stay editable here
  and a push never overwrites them;
- they cannot be deleted here. When the console withdraws one, Miabi deletes it, or deactivates it
  while workspaces still use it.

A plan made in Miabi with the same name as a console plan is taken over by the first push. Fields a
Miabi version does not know are skipped and reported back to the console.
