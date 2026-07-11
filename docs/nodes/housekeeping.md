---
sidebar_position: 5
title: Housekeeping
description: Reconcile drift between Miabi's desired state and real Docker, and reclaim disk by pruning unused resources.
---

# Housekeeping

**Housekeeping** keeps your nodes tidy and consistent. It does two things: it **reconciles drift** between what Miabi expects and what Docker is actually running, and it **reclaims disk** by pruning unused images, containers, and volumes.

![Housekeeping panel](/img/screenshots/housekeeping.png)

## Drift reconciliation

Miabi maintains a **desired state** for every workload — which containers should exist, on which node, with which configuration. Over time the real Docker state can drift from that desired state: a container was stopped by hand, a node restarted, or something was changed outside Miabi.

Reconciliation compares desired state against the live Docker state on each node and reports the differences, such as:

- Containers Miabi expects but that are missing or stopped.
- Containers running with a configuration that no longer matches.
- Resources that exist in Docker but are unknown to Miabi.

You can review the detected drift and let Miabi **reconcile** — recreating or restarting what's missing so the node matches the desired state again.

:::note
Resources that exist in Docker but aren't managed by Miabi are surfaced here too. To bring them under management instead of treating them as drift, use [Docker import](/docs/nodes/docker-import).
:::

## Reclaiming disk

Long-running Docker hosts accumulate dangling images, stopped containers, and orphaned volumes that consume disk. Housekeeping lets you **prune** these to reclaim space:

| Prune target | What it removes |
|---|---|
| Images | Dangling and unused images not referenced by any managed workload |
| Containers | Stopped containers no longer tracked by Miabi |
| Volumes | Orphaned volumes not attached to any managed resource |

:::caution
Volume pruning permanently deletes data in unattached volumes. Review the list before pruning, and make sure anything you still need is either attached to a managed workload or backed up.
:::

## Running housekeeping

Housekeeping is a platform-admin task (see [Platform Administration](/docs/administration/platform-admin)). You can:

- **Run it on demand** per node from the Housekeeping panel.
- **Review before applying** — Miabi shows what it found before you confirm reconciliation or pruning.

:::tip
Run a reconcile after any manual Docker work or node reboot, and prune images periodically on build-heavy nodes to keep disk usage in check.
:::

## Related

- [Docker import](/docs/nodes/docker-import)
- [Nodes overview](/docs/nodes/overview)
