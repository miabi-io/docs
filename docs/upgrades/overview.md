---
sidebar_position: 1
title: Overview
description: What happens when you upgrade Miabi — automatic migrations, update notifications, and why downgrades are not supported.
---

# Upgrades

Upgrading Miabi is intentionally simple: **pull a newer image and recreate the containers.** Miabi handles the rest on startup.

## Automatic migrations

On every startup, Miabi brings the database in line with the running binary:

- **Schema migrations** are applied automatically (GORM `AutoMigrate`).
- **Ordered data `upgrade` steps** run in sequence, with each applied step recorded in the `upgrade_steps` table so it never runs twice.

Because both happen automatically, upgrading is just a matter of starting the new version. You watch the logs to confirm migrations completed before the instance serves traffic.

## Update notifications

![The update-available notice shown to platform admins](/img/screenshots/update-available.png)

Once a day, Miabi asks GitHub whether a newer release exists and shows platform admins a dismissible
notice with a link to the release notes. **The check only notifies — nothing upgrades on its own.**
An upgrade is always something you ask for, whether by re-running the installer (Compose) or by
running `miabi upgrade` (stack).

The check is channel-aware: a pre-release build is offered newer pre-releases and stable releases; a
stable build is never nudged onto a pre-release. Dismissing a notice hides it until the *next*
version appears.

| Variable | Default | Purpose |
|----------|---------|---------|
| `MIABI_UPDATE_CHECK` | `true` | Set `false` to disable the check entirely (air-gapped hosts, or to avoid the outbound call) |

Nothing about your install is sent: it is an unauthenticated `GET` to `api.github.com` identified
only by `User-Agent: miabi/<version>`. No install id, no telemetry. A `dev` build never checks.
Admins can read the cached result at `GET /api/v1/admin/update`.

### Runners and agents

[Build runners](/docs/cicd/runners) and [node agents](/docs/administration/nodes-and-capacity) ship
and version **independently of the panel** — upgrading Miabi does not upgrade them, and a fleet
quietly drifts years behind if nobody looks. The same daily check therefore also reads the newest
release of each, and compares it against the version every instance reports when it connects.

Where it shows up:

- A **banner** for platform admins: *"3 of 5 runners are behind v0.0.9."*
- An **outdated** badge on the runner's page and on the node's agent version, linking to that
  project's release notes.
- `GET /api/v1/admin/update/components` — the newest release of each, and how many instances are
  behind it.

Only the **stable** line is used as the yardstick. A component has no single running version to
infer a channel from — a workspace may run ten runners on ten versions — so a release candidate
never marks a fleet outdated, and an instance running one is not flagged for being ahead.

**Only instances that are up are considered.** An offline runner or an unreachable node is not
something you can upgrade right now — it may be decommissioned, or a laptop that is simply shut —
so it is neither badged nor counted. A runner that is *draining* still counts: its tunnel is live,
it is just finishing its jobs.

An instance that has never reported a version is not counted either way. Silence means *unknown*,
not *current*; a badge that guesses is a badge people learn to ignore.

Upgrading is manual and per component, as it is for Miabi itself: pull the newer runner image and
restart it, or re-run the agent install script on the node. `MIABI_UPDATE_CHECK=false` disables all
of it together.

## Downgrades are not supported

Miabi rolls **forward** only. The `upgrade_steps` table tracks which steps have been applied, and there are no reverse steps — once a migration has run, the previous binary may no longer understand the schema.

:::caution
`MIABI_ALLOW_DOWNGRADE=true` exists as an escape hatch, but it does **not** undo migrations. Only set it if you fully understand the schema implications of running an older binary against an already-migrated database. The supported recovery path for a bad upgrade is to **restore the pre-upgrade backup**.
:::

## Where to go next

- [Upgrading](/docs/upgrades/upgrading) — the procedure, for both install methods.
- [Backups](/docs/storage/backups) — take one before every upgrade.
- [Configuration](/docs/getting-started/configuration) — pinning the image version.
