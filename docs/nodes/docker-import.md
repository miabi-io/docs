---
sidebar_position: 6
title: Docker Import
description: Adopt pre-existing, hand-run containers, volumes, and networks into Miabi management.
---

# Docker Import

**Docker import** lets you adopt resources that already exist on a node — containers, volumes, and networks created by hand or by another tool — and bring them under Miabi management. It's the bridge between an existing Docker setup and a Miabi-managed one, with no need to tear anything down.

![Docker import flow](/img/screenshots/docker-import.png)

## Why import

If you're moving an existing host into Miabi, you likely have workloads already running:

- Containers you started with `docker run` or Compose.
- Volumes holding real data you can't recreate.
- User-defined networks wiring services together.

Rather than recreating these from scratch, import lets Miabi **discover** them and take over their lifecycle — so they show up in the console, count toward [drift reconciliation](/docs/nodes/housekeeping), and can be managed like anything else.

## What you can import

| Resource | Result after import |
|---|---|
| Containers | Adopted as managed workloads with their current config |
| Volumes | Tracked by Miabi and protected from accidental pruning |
| Networks | Recognized so connected workloads are wired correctly |

## How import works

1. Open the node's **Import** panel in the console (a platform-admin area — see [Platform Administration](/docs/administration/platform-admin)).
2. Miabi scans the node's Docker engine and lists resources it found that aren't yet managed.
3. Select the containers, volumes, and networks you want to adopt. Miabi reads their existing configuration so it can manage them in place.
4. Confirm. The selected resources become managed and appear alongside everything else Miabi runs.

:::note
Import is **non-destructive**. Your containers keep running and your volume data is untouched — Miabi simply starts tracking and managing the resources you select.
:::

## After importing

Once adopted, imported resources behave like any Miabi workload:

- They appear in the console and are subject to [drift reconciliation](/docs/nodes/housekeeping).
- Their volumes are protected from disk-reclaim pruning.
- You can update, restart, or remove them through Miabi.

:::tip
Import early when onboarding an existing host, then run a [reconcile](/docs/nodes/housekeeping). Anything still flagged as unmanaged drift afterward is a candidate for import or cleanup.
:::

## Related

- [Housekeeping](/docs/nodes/housekeeping)
- [Adding a node](/docs/nodes/adding-a-node)
