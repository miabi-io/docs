---
sidebar_position: 7
title: Jobs
description: Run one-off commands in your application's runtime context — migrations, maintenance tasks, and interactive shells.
---

# Jobs

A **job** runs a one-off command inside your application's runtime context — the same image, environment variables, secrets, and network access as your running app. Jobs are how you perform operational tasks without baking them into the app's normal startup.

![The jobs panel showing a one-off command and its output](/img/screenshots/jobs.png)

## What a job is

When you start a job, Miabi launches a container from your app's current [release](/docs/applications/releases-and-rollbacks) and runs the command you specify. Because it shares the app's [environment variables and secrets](/docs/applications/environment-variables), the command can reach your database, object storage, and other dependencies exactly as the app does — without you handing it any credentials by hand.

## Common use cases

| Task | Example |
|------|---------|
| **Database migrations** | Apply schema changes after a deploy |
| **Maintenance** | Clear a cache, reindex, backfill data |
| **One-off scripts** | Run a data fix or admin command |
| **Diagnostics** | Run a read-only command to inspect state |

Jobs are **not interactive** — they run a fixed command to completion and stream output one way. For
a shell into a running container, use the app's Exec/terminal feature (Admin only) instead.

:::tip
Run migrations as a job right after a deploy, or wire them into your [pipeline](/docs/cicd/pipelines) so they run automatically on the way to production.
:::

## Running a job

1. Open the application and go to its **Jobs** view.
2. Enter the command to run (for example, your framework's migrate command).
3. Start the job — Miabi spins up a container from the current release.

The job runs to completion and then the container is cleaned up. It does not affect your serving containers.

## Viewing output

Job output streams live to the console while the command runs, and the full output is retained afterward so you can review what happened. The exit status tells you whether the command succeeded.

:::caution
Jobs run with your app's real credentials and can modify live data — a migration or maintenance command affects production just as the app would. Review the command before running it, and prefer testing destructive operations in a non-production [environment](/docs/applications/environments) first.
:::

Job runs also appear in the app's [timeline](/docs/applications/logs-and-timeline) and the workspace [audit log](/docs/operations/audit-log).
