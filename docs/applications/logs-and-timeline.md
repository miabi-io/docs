---
sidebar_position: 10
title: Logs & Timeline
description: Stream live container logs and follow the per-app lifecycle timeline of deploys, scales, jobs, and rollbacks.
---

# Logs & Timeline

Two views give you visibility into what your application is doing: **live logs** stream output from the running containers, and the **timeline** records the lifecycle events of the app itself.

## Live logs

The **Logs** tab streams output from your application's containers in real time, straight to the console — no SSH, no `docker logs`. Watch a deploy come up, debug an error as it happens, or tail steady-state traffic.

![Live streaming container logs in the console](/img/screenshots/app-logs.png)

Logs cover the running [release](/docs/applications/releases-and-rollbacks) and, during a [zero-downtime switch](/docs/applications/releases-and-rollbacks), the new container as it starts. [Job](/docs/applications/jobs) output streams the same way while a one-off command runs.

:::tip
Have your app write to stdout/stderr — that's what Miabi streams. Structured (JSON) log lines are easiest to scan in the console.
:::

## Application timeline

The **timeline** is a per-app record of lifecycle events — what happened to the application and when:

- Deploys and new releases shipping
- [Rollbacks](/docs/applications/releases-and-rollbacks) to a prior release
- [Scaling](/docs/applications/scaling-and-resources) and resource-limit changes
- [Job](/docs/applications/jobs) runs
- Configuration and [environment](/docs/applications/environment-variables) changes

![The application timeline of lifecycle events](/img/screenshots/app-timeline.png)

Where logs tell you what the app is *outputting*, the timeline tells you what *happened to* the app — a quick way to answer "what changed right before this started?"

## Logs vs. timeline vs. audit vs. metrics

Miabi separates these concerns so each view stays focused:

| View | Answers | Scope |
|------|---------|-------|
| **Logs** | What is the app printing right now? | One application's containers |
| **Timeline** | What lifecycle events happened to this app? | One application |
| **[Audit log](/docs/operations/audit-log)** | Who did what across the workspace? | Whole workspace |
| **[Monitoring](/docs/operations/monitoring)** | How much CPU/memory/health? | Metrics over time |

Use the timeline to spot *when* something changed, the logs to see *what the app said* at that moment, the [audit log](/docs/operations/audit-log) to see *who* made the change, and [monitoring](/docs/operations/monitoring) to see the *performance* impact.

:::note
The timeline and the audit log overlap but aren't the same: the timeline is app-scoped and lifecycle-focused, while the audit log is the workspace-wide, security-grade record of every mutation.
:::
