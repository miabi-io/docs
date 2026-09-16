---
sidebar_position: 7
title: Reconciliation
description: The control manager notices apps, swarm services, gateways and data volumes that disappeared from under Miabi, reports them, and can redeploy lost workloads in place.
---

# Reconciliation

Miabi records where every workload runs. **Reconciliation** is the part of the control plane — the
**control manager** — that checks, every minute, that those workloads still exist. When something
disappeared outside Miabi (a container removed by hand, a swarm service deleted, a volume wiped), it
reports it, and in **enforce** mode it puts the workload back exactly where it was.

Its scope is restoring what Miabi already decided, where Miabi decided it. It **never places or moves** a
workload, and it **never recreates lost data**.

## What it watches

Each sweep builds the list of what should exist and checks it against the engines:

| Item | Checked on | Missing when |
|---|---|---|
| **Container app** | The app's node | The active release's container no longer exists |
| **Service app** | Its cluster's swarm manager | The swarm service is not found |
| **Data volume** (app volumes and database instance volumes) | The volume's node | The volume is gone, or was deleted and recreated outside Miabi (**replaced**) |
| **Node gateway** (edge-gateway nodes) | The node | The gateway container is gone or not running |

A few rules keep it from crying wolf:

- An item must be seen missing on **two consecutive sweeps** before it is reported, so a container caught
  between remove and start during a deploy never counts.
- Apps that are stopped, not yet deployed, or **mid-deploy** are left out.
- An **exited** container still counts as present — a crash is the restart policy's business, not drift.
- A node that is offline, or whose agent connected less than a minute ago, and a cluster whose manager
  can't be reached, are listed as **Not checked**. Their items are unknown, never missing.
- Host-path volumes are binds to operator-managed paths and are not watched.

## Modes

| Mode | Behaviour |
|---|---|
| `off` | Nothing is watched or reported. |
| `observe` | **Default.** Findings become timeline events, alerts, metrics and the admin report. Nothing is acted on. |
| `enforce` | As observe, plus missing apps are redeployed in place and missing Miabi-deployed node gateways are recreated. |

Set the platform mode under **Admin → Platform Settings → Platform → Control manager**
(`control_manager_mode`). To pin it from the environment, set `MIABI_CONTROL_MANAGER_MODE`
(`off`, `observe` or `enforce`); the setting is then read-only in the console and re-applied on every
boot. An unrecognised value is treated as `observe`.

### Per-app override

An app can opt out of — or into — enforcement without changing the platform. In the app's **Settings** tab,
under **Resources**, **If this app disappears** offers:

| Choice | Effect |
|---|---|
| **Platform default** | Follows `control_manager_mode`. |
| **Leave this app alone** | Not watched, not reported, not touched. |
| **Report only** | Reported but never redeployed, even while the platform enforces. |
| **Redeploy in place** | Redeployed even while the platform only observes. Has no effect when the platform mode is `off`. |

The API field is `reconcile_policy` (`inherit`, `off`, `observe`, `enforce`).

:::tip
Set **Report only** or **Leave this app alone** on an app you are debugging by hand, so an automatic
redeploy doesn't undo your session.
:::

## Enforce: redeploying in place

In enforce mode a confirmed missing app is redeployed through the ordinary deploy path, routed to the app's
own node or cluster. Enforcement is deliberately cautious:

- **Whole apps only.** An app is not redeployed if a volume it mounts has lost its data (see below), if
  its node is cordoned, or if a config it mounts no longer exists. The reason is recorded once as a
  `reconcile.blocked` event.
- **Budgets.** At most 3 control-manager redeploys run per node and 10 across the platform, so a rebooted
  node can't crowd out the deploys people are waiting on.
- **Backoff.** Retries wait 1 minute, doubling up to 30 minutes.
- **Circuit breaker.** After 5 consecutive failed redeploys the control manager gives up on that app,
  emits `reconcile.breaker_open`, and raises a critical **Cannot be brought back** alert. It stays that
  way until the workload is back.

Each redeploy is recorded as a `reconcile.redeploy` event and an `application.reconcile.restore` audit
entry signed by `control-manager`. An imported gateway — including the platform's own on the manager — is
reported but never recreated.

## Lost volume data

Docker silently creates an empty named volume when a container starts without one. Redeploying an app whose
volume was deleted would hand it an empty volume, and starting a database on one initializes a new, empty
cluster over the data it should have kept. So Miabi treats lost data differently from a missing container:

- It raises a critical **Data volume lost** alert and a `drift.detected` event on every app that mounts the
  volume, or on the database instance. The message names the newest completed backup or recovery point to
  restore from, or says there is none.
- It **never recreates or restores the volume**. Choosing a restore point is a person's decision.
- Every app mounting the volume is **blocked**: the control manager won't redeploy it.
- Independently of the mode, starting, restarting or deploying an app, and starting, restarting or resizing
  a database instance, is **refused** while its data volume is missing or replaced. This guard skips
  host-path, NFS and CIFS volumes, whose data does not live in a node-local Docker volume.

Restore the data from [Backups](/docs/storage/backups), then start the workload.

## The Reconciliation page

**Admin → Overview → Reconciliation** shows the leading control plane's last sweep. It refreshes every
30 seconds and shows:

- The current **mode**, and counters for **Missing**, **Data lost**, **Blocked apps** and **Not checked**.
- **Data is gone** — lost or replaced volumes, their owner, and the backup to restore.
- **Blocked from starting** — apps held back by a lost volume, with the reason.
- **Missing workloads** — confirmed findings with the recommended action, attempts, next retry, or
  *gave up — needs a look*.
- **Waiting for a second check** and **Not checked**.

Findings live only in the leading process's memory. On a standby process the page says **No check has run
here**. The same report is available from `GET /api/v1/admin/control-manager`.

## Events, alerts and metrics

| Event | When |
|---|---|
| `drift.detected` | A workload or data volume was confirmed missing (label: *Workload missing*) |
| `drift.resolved` | It exists again (*Workload back*) |
| `reconcile.redeploy` | Enforcement started a redeploy (*Redeployed automatically*) |
| `reconcile.blocked` | Enforcement refused to redeploy an app, with the reason |
| `reconcile.breaker_open` | Enforcement gave up after repeated failures (*Automatic redeploy gave up*) |

Events appear on the app or database timeline. You can subscribe [webhooks and notification
channels](/docs/cicd/webhooks-and-notifications) to all of these except `reconcile.blocked`. They also drive the
**Workload missing**, **Data volume lost** and **Cannot be brought back** [alerts](/docs/operations/alerts).
Gateway findings have no workspace timeline and show only on the admin page, in metrics and in the audit
log.

With [`MIABI_METRICS_ENABLED=true`](/docs/operations/monitoring#prometheus-integration), `/metrics` exposes:

| Metric | Meaning |
|---|---|
| `miabi_control_manager_sweep_duration_seconds` | Sweep duration (histogram) |
| `miabi_control_manager_drift_items{class,kind}` | Confirmed findings from the last sweep: `missing` container/service/volume/gateway, `replaced` volume |
| `miabi_control_manager_blocked_apps` | Apps blocked by lost data |
| `miabi_control_manager_unobserved{scope}` | Nodes and clusters the last sweep could not check |
| `miabi_control_manager_actions_total{action,result}` | Enforcement actions (`redeploy`, `gateway_ensure`, `breaker`) by result (`started`, `deferred`, `blocked`, `failed`, `open`) |

## Reconciliation vs Housekeeping

[Housekeeping](/docs/nodes/housekeeping) is an **on-demand, per-node** tool: an admin previews one node's
drift and chooses what to prune or redeploy. Reconciliation is the **continuous, platform-wide** sweep that
runs without anyone asking. Both redeploy through the same deploy path, so the lost-data guard applies to
both.

## Leader election

The control manager's sweep — like scheduled jobs, periodic alert scans, the metrics history scraper and
cluster reconciliation — runs in **one process only**. Control-plane processes sharing a Redis campaign for
the `control-plane` lease; the holder does this work, and any other process **stands by** and logs that it
is doing so. When the holder stops cleanly it releases the lease, so a standby takes over at once;
otherwise the lease expires after 30 seconds. A new leader starts with empty findings and confirms them
again.

This prevents a second control plane, started by mistake, from doubling that work. It is **not** high
availability: agent and runner tunnels still belong to the process they connected to.

`miabi_leader{lease="control-plane"}` is `1` on the process holding the lease and `0` on a standby.
