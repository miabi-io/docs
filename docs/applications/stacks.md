---
sidebar_position: 8
title: Stacks
description: Group related applications compose-style within a workspace and manage them as one unit.
---

# Stacks

A **stack** groups related applications that make up a single system — a web frontend, an API, a worker, a cache — so you can manage them together, compose-style, within a [workspace](/docs/workspaces/overview).

![A stack grouping several related applications](/img/screenshots/stacks.png)

## What a stack is

Many real systems are more than one process. A typical app might be a web service plus a background worker, talking to a database and a cache. A stack lets you treat those related applications as one logical group instead of a loose collection of separate apps. It's the Miabi equivalent of a Compose file: the pieces are defined together and belong together.

Each application in a stack is still a full Miabi application — it has its own [releases](/docs/applications/releases-and-rollbacks), [environment](/docs/applications/environment-variables), [scaling](/docs/applications/scaling-and-resources), and [logs](/docs/applications/logs-and-timeline). The stack is the grouping that ties them together.

## When to use a stack

Use a stack when several apps:

- **Belong to the same system** — they're deployed, versioned, and reasoned about together.
- **Share configuration** — they reference the same [secrets](/docs/applications/environment-variables) and database credentials.
- **Depend on each other** — a worker and the web app it supports, for example.

If an application is genuinely standalone, it doesn't need a stack — create it on its own.

| Scenario | Stack? |
|----------|--------|
| Web + API + worker for one product | Yes — group them |
| A self-contained marketing site | No — standalone app |
| Two unrelated apps that happen to share a server | No — keep separate |

:::tip
Stacks pair naturally with [Environments](/docs/applications/environments): promote a whole system from dev to staging to production as a unit, rather than moving each app one at a time.
:::

:::note
A stack is a grouping within a single workspace. To isolate entirely separate projects or teams, use separate [workspaces](/docs/workspaces/overview) instead.
:::
