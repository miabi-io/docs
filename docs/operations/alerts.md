---
sidebar_position: 3
title: Alerts & Notifications
description: A dashboard bell and inbox that surface what actually matters — crash-loops, failed deploys, expiring certs, offline nodes — deduplicated and auto-resolving.
---

# Alerts & Notifications

The **bell** in the top bar and the **Notifications** page show you the things
that actually matter about your workspaces — *"your app is crash-looping"*,
*"the deploy failed"*, *"this volume is 92% full"*, *"a node went offline"* — as a
short, actionable list, not a firehose of raw events.

The difference is judgement. A crash-looping app emits ~40 Docker events in two
minutes; a naive feed shows 40 red rows. Miabi shows **one** alert that updates
in place (*"crash-looping — 8 restarts"*) and **auto-resolves** to *"recovered"*
when it stabilizes.

![From signals to notifications](/img/alerts-lifecycle.svg)

Three layers make that work:

- **Signals** — raw, factual facts from the platform (container events, deploy
  and backup outcomes, cert/disk/quota scans, node/runner status).
- **Alerts** — the derived, deduplicated, stateful conditions. Workspace-level
  and shared.
- **Notifications** — the per-user delivery. Read/unread is per user.

## What you get — the built-in catalog

Alerts arrive already tuned so a normal deploy is silent and a real problem is
one line. Each links to the resource and, where possible, an action.

| Alert | Severity | Fires on | Auto-resolves when |
|---|---|---|---|
| Deploy failed | critical | a build/deploy fails | the next deploy succeeds |
| App crash-looping | critical | repeated container exits in a window | it stays healthy / a good deploy |
| App OOM-killed | critical | a container is OOM-killed | it recovers |
| App unhealthy | warning | the health check fails | it reports healthy |
| Volume near full | warning → critical | usage ≥ 85% / ≥ 95% | usage drops back |
| Database backup failed | critical | a backup run fails | the next backup succeeds |
| TLS certificate expiring | warning → critical | &lt; 14 days / &lt; 3 days to expiry | it is renewed |
| Certificate issuance failed | critical | ACME issuance/renewal fails | it is issued |
| Approaching quota | warning | a resource passes 90% of the plan limit | usage drops back |
| Node offline | critical | an agent tunnel drops | the node reconnects |
| Runner offline | warning | a runner tunnel drops | the runner reconnects |

:::tip Dedup and auto-resolve are the feature
A repeat signal **folds** into the existing alert (its count climbs) instead of
creating a new one, and it never re-notifies. When the condition clears, the
alert **auto-resolves** and its notification updates to "recovered" — so the bell
never floods and never lies.
:::

## Severity & lifecycle

- **Severities:** *info* (FYI), *warning* (degraded), *critical* (down/failing).
- **Lifecycle:** an alert is `firing` → optionally `acknowledged` (you're on it,
  silence re-notification without hiding it) → `resolved` (auto when the
  condition clears, or manually). Resolved alerts are kept as history.

## Who gets what

Notifications are **workspace- and role-scoped** — you only ever see alerts for a
workspace you belong to:

- **Developers** get their apps' deploy/runtime/backup/TLS/disk alerts.
- **Admins/Owners** additionally get quota alerts.
- **Platform alerts** — a **node** going offline or a **shared runner** dropping —
  aren't tied to any tenant workspace. They are attributed to the built-in
  **Miabi System** workspace and delivered to **platform super-admins**. A
  *workspace-owned* runner, by contrast, notifies that workspace's members.

## Delivery

- **In-app is always on and real-time.** New notifications push to the bell over
  **SSE** — the same mechanism as live deploy logs — so the unread badge updates
  without a refresh. The **Notifications** page is the full, filterable inbox
  (by workspace, severity, read/unread), with mark-read / mark-all-read.
- No configuration is required; the engine runs with the platform and keeps its
  hot state (dedup windows, cooldowns) in Redis so it is correct across replicas.

:::note
This is separate from [webhooks & notification channels](/docs/cicd/webhooks-and-notifications)
(Telegram/Slack/Discord) that fire on application *events*, and from the
[Audit Log](/docs/operations/audit-log) (a compliance record of user actions).
Routing alerts to email/chat channels and escalation policies are on the
roadmap.
:::
