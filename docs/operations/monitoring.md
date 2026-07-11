---
sidebar_position: 1
title: Monitoring
description: Container metrics, retained history, health, and Prometheus integration.
---

# Monitoring

Miabi continuously samples resource usage for your containers and rolls it up into per-workspace
health, so you can see how apps are behaving without wiring up external tooling — though you can
plug into Prometheus when you want to.

![Monitoring](/img/screenshots/monitoring.png)

## Metrics

For every running container Miabi collects:

- **CPU** usage
- **Memory** usage
- **Disk** usage

These are aggregated into a **workspace health** view so you can spot a struggling app at a
glance, then drill into the individual container that's under pressure.

## Retained history

Samples are stored as **retained history**, not just live readings, so you can look back at trends
— a memory leak creeping up over hours, a CPU spike that lined up with a deploy, or disk filling
toward a limit. Charts in the console render this history per app and per workspace.

Two settings control the data:

| Setting | Controls |
|---------|----------|
| `MIABI_METRICS_SCRAPE_SECONDS` | How often metrics are sampled |
| `MIABI_METRICS_RETENTION_HOURS` | How long history is kept |

Tune the scrape interval down for finer resolution, or up to reduce overhead; tune retention to
match how far back you need to investigate. See
[Configuration](/docs/getting-started/configuration) for how to set these.

:::tip
Shorter scrape intervals give sharper charts but generate more data. Pick a retention window that
covers your typical incident-investigation timeframe (often 24–72 hours) without storing more than
you need.
:::

## Live workspace usage

Beyond per-container charts, Miabi shows **live, aggregated resource usage for a whole workspace** —
actual CPU, memory, and network summed across all its running app and database containers, updating
in real time (not a page refresh).

- The **dashboard** carries a compact *Resources* card: live CPU cores, memory, network RX/TX, and
  the number of containers being sampled.
- The workspace **Usage** tab shows the same live figures alongside your [plan quotas](/docs/workspaces/plans-and-quotas).

Both are seeded from retained history and then track live, so each metric renders a small sparkline
of its recent trend. This is distinct from the *quota* view, which reports declared reservations and
counts rather than live consumption.

## Prometheus integration

Miabi exposes a built-in **Prometheus client**. Point a Prometheus server at the instance's
`/metrics` endpoint to scrape Miabi's metrics into your own monitoring stack, then build
dashboards (for example in Grafana) and alerting rules on top of them.

This is the path to use when you want long-term retention beyond Miabi's own history, cross-host
aggregation, or alerting that ties into your existing on-call tooling. Alongside build/runtime
metrics, Miabi exports **network subnet-pool utilization** (`miabi_network_subnet_pool_used` /
`miabi_network_subnet_pool_total`) so you can alert before the pool nears exhaustion — see
[Networks & Subnets](/docs/networking/networks-and-subnets).

:::note
The console's built-in charts and the Prometheus endpoint are complementary: the console is for
quick, in-product visibility; Prometheus is for long-term storage, custom dashboards, and alerts.
:::

## Health

Workspace and application health summarize the underlying metrics and container state into a simple
status, giving you a fast answer to "is everything okay?" before you dig into individual charts.
