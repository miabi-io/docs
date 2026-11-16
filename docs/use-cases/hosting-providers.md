---
sidebar_position: 8
title: Hosting providers and agencies
description: Run a shared application-hosting platform — plans as products, shared vCPU, premium hardware tiers, isolation between customers, white-label branding, and agencies hosting their clients.
---

# Hosting providers and agencies

Offer application hosting to customers who should never see each other: each gets workspaces with
their own apps, databases, domains, secrets and members, on hardware you share between them or
reserve for those who pay for it. Customers deploy from Git, an image or the marketplace; you sell
plans and keep the platform running.

**Good for:** hosting companies and resellers, managed service providers, web agencies running their
clients' sites and apps, and anyone selling "deploy your app" as a product.

![Customers map to plans you sell — Starter, Business, Dedicated — which map to a shared cluster, a premium pool and a dedicated cluster](/img/diagrams/uc-hosting-providers.png)

## What isolates one customer from another

| Layer | How |
|---|---|
| Data and API | Every resource belongs to one workspace, and every query is scoped to it in the repository layer, not only in middleware. A token for one workspace cannot read another's, even by ID |
| Network | Each workspace has its own Docker network; only the gateway reaches apps from outside |
| Secrets | Encrypted with a per-workspace key; deleting a workspace destroys the key |
| Resources | A plan's quotas cap CPU, memory, storage and counts per workspace, checked before anything is created |
| Host access | Privileged host mounts, shared storage and host-port bindings are off unless a plan or an admin allows them |

## Turning plans into products

A [plan](/docs/workspaces/plans-and-quotas) is a product tier: quotas, capabilities and, with
Enterprise, where its workspaces run.

- **Quotas.** Apps, databases, CPU, memory, storage, members, runners.
- **Shared vCPU.** `MIABI_QUOTA_CPU_OVERCOMMIT` lets a plan's CPU limits add up to a multiple of its
  cores, the way a VPS provider sells shared vCPU. Memory is never overcommitted.
- **Limits on every app.** Default CPU and memory plus **Require limits** make every app count against
  its plan; an app without limits would run unbounded.
- **Capabilities as upsells.** Custom TLS certificates, DNS providers, shell access, the replicated
  service runtime, GPUs and custom container labels are each switched on per plan.
- **Storage tiers.** Offer a fast [storage class](/docs/storage/storage-classes) only on higher plans.
- **Database sizes** (Enterprise): named sizes such as `small` and `large` that a plan offers.

## Premium and dedicated hardware (Enterprise)

| Product | Feature |
|---|---|
| Premium nodes inside a shared cluster | Put them in a [node pool](/docs/nodes/cluster-mode#node-pools) and name the pool on the plan. A plan without a pool never lands on pooled nodes |
| A region as an option | [Plan placement](/docs/workspaces/plans-and-quotas#placement) lists the locations a plan may use |
| A customer's own servers | [Dedicate a location](/docs/workspaces/organizations#where-its-workloads-run) to the customer's organization; nobody else sees it |
| A bigger allowance for one customer | Per-workspace quota overrides |

## Running the platform

- **Sign-up.** Open self-service [registration](/docs/administration/users-and-accounts#opening-self-service-sign-up)
  with email verification, or create accounts from your own system through the API.
- **Holding a workspace.** Set it **read-only** or **suspended** from **Platform admin → Workspaces**,
  for abuse or an unpaid invoice, without deleting anything. See
  [Restricting a workspace](/docs/administration/workspace-oversight#restricting-a-workspace).
- **Billing.** Miabi does not charge customers itself. Drive it from your billing system through the
  API: create workspaces, assign plans, restrict and lift restrictions.
- **Your brand** (Enterprise). [Branding](/docs/administration/branding) replaces Miabi's name, logos
  and accent on the sign-in page and console.
- **Hardening** (Enterprise). The [restricted security profile](/docs/security/container-security-profile)
  runs every customer container as non-root; the [Security Center](/docs/security/security-center)
  sets the host-port policy; [announcements](/docs/administration/announcements) reach every customer's
  inbox before maintenance.
- **Moving a customer.** [Migrate](/docs/operations/migration) a workspace to a dedicated install when a
  customer outgrows shared hosting, or into yours when they arrive.

## Agencies

An agency is a small hosting provider whose customers are its clients:

1. **One workspace per client**, named after the client, with the client's domains, apps and
   databases.
2. **Invite the client** as a Viewer to see their apps, logs and analytics, or as a Developer if
   their own team deploys too. See [Roles & permissions](/docs/workspaces/roles-and-permissions).
3. **Hand over** when the engagement ends: promote the client to Owner, or
   [migrate the workspace](/docs/operations/migration) to the client's own Miabi.

[Workspace analytics](/docs/operations/analytics) gives each client traffic, performance and visitor
numbers for their sites, with nothing to install in the site.

## Where to go next

- [Several organizations](/docs/use-cases/multiple-organizations) — customers with their own users,
  SSO and limits.
- [Several clusters as regions](/docs/use-cases/multi-region) — locations as products.
- [Plans & quotas](/docs/workspaces/plans-and-quotas) — every quota and capability.
