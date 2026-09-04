---
sidebar_position: 4
title: Scheduled Jobs & Image Defaults
description: The background jobs Miabi runs on a timer, how to inspect and trigger them, and where platform image versions are pinned.
---

# Scheduled Jobs & Image Defaults

Two parts of the admin console rarely need attention and are invaluable when they do: the
**job scheduler** that keeps the platform consistent in the background, and the **image
catalog** that decides which container images the platform itself pulls.

## Scheduled jobs

**Platform admin → Jobs** lists every recurring task, its schedule, when it last ran, and
whether that run succeeded.

![The scheduled jobs list](/img/screenshots/admin-jobs.png)

These are Miabi's own housekeeping — not to be confused with
[application jobs](/docs/applications/jobs), which are cron workloads *you* define inside
a workspace.

| Job | What it does |
|---|---|
| `update-check` | Checks whether a newer Miabi release exists |
| `certificate_expiry` | Warns before a TLS certificate expires |
| `cert_renew` | Renews managed (DNS-01) certificates before they lapse |
| `dns_reconcile` | Reasserts the DNS records Miabi manages through a connected provider |
| `domain_reverify` | Re-checks ownership of verified domains and un-verifies ones whose record vanished |
| `database_sizes` | Measures database sizes for the console and quota accounting |
| `storage_usage` | Measures real volume disk usage |
| `image_gc` | Prunes the image catalog |
| `registry_gc` | Garbage-collects unreferenced blobs in the built-in registry |
| `audit_prune` | Applies the audit-log retention window |
| `siem_stream` | Streams audit events to a configured SIEM |
| `marketplace` | Syncs the marketplace template registry |
| `gitops_sync` | Sweeps GitOps projects for upstream changes |
| `gpu_inventory` | Refreshes each node's GPU device inventory |
| `key_rotate` | Rotates per-workspace encryption keys on the configured schedule |
| `platform-backup` | Runs the scheduled platform backup |
| `account-purge` | Deletes accounts whose grace period has expired |

### Running one now

Each job can be **triggered manually**, which is the fastest way to answer "is this
broken, or has it just not run yet?" A manual run does not disturb the schedule.

This is the first thing to reach for when something looks stale: a certificate that should
have renewed, a GitOps project that has not picked up a commit, a domain still showing an
old verification state. Trigger the job, then read its result.

### When a job fails

A failed run is recorded with its error. Jobs are independent — one failing does not stop
the others — and each retries on its next tick, so a transient failure usually resolves
itself. A job failing consistently is worth investigating, because most of them exist to
stop something else drifting silently.

Cadence for the DNS and reverification sweeps is set by
`MIABI_DNS_RECONCILE_MINUTES` (default 30). See
[Configuration](/docs/getting-started/configuration).

## Image defaults

**Platform admin → Deployment config** controls the images the *platform* pulls for its
own components — the gateway, helper containers, backup tooling — as opposed to your
application images.

![Platform image defaults and registry mirror](/img/screenshots/admin-deployment-config.png)

| Setting | Purpose |
|---|---|
| **Registry mirror** | A prefix applied to every platform image pull |
| **Image overrides** | Pin an individual catalog entry to a specific reference |

### Why you would change these

**A registry mirror** is the one most installs eventually want. In an air-gapped or
egress-restricted environment, point it at your internal registry and Miabi pulls
everything through it instead of Docker Hub. It also insulates you from upstream rate
limits.

**An override** pins one component while leaving the rest on their defaults — holding the
gateway at a known-good tag while you investigate a regression, or testing a release
candidate on one instance. Clear the override to return to the default.

:::caution
An override survives upgrades. A component pinned to an old tag stays pinned, and it is
easy to forget — a Miabi upgrade then quietly leaves that component behind. Note what you
pin and why, and revisit after upgrading.
:::

Unknown catalog keys are ignored rather than rejected, so a config carried across versions
does not block a save when a component is renamed or removed.

## Where to go next

- [Upgrades](/docs/administration/upgrades) — moving the instance to a newer release.
- [Platform Settings](/docs/operations/platform-settings) — the wider instance configuration.
- [Application jobs](/docs/applications/jobs) — the cron workloads a workspace defines.
