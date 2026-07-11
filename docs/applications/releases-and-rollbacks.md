---
sidebar_position: 5
title: Releases & Rollbacks
description: Every deploy is an immutable release with full history, one-click rollback, and zero-downtime canary switching.
---

# Releases & Rollbacks

Every time you deploy an application, Miabi creates a **release** — an immutable snapshot of the image and configuration that was shipped. Releases give you a complete, auditable history and the ability to roll back instantly when something goes wrong.

![The deployment history with release list and rollback controls](/img/screenshots/releases.png)

## What a release is

A release captures everything needed to reproduce a running version of your app:

- The **image** that was built or pulled.
- The **environment variables and secrets** in effect at deploy time.
- The **resource limits** and runtime settings.

Because releases are immutable, an older release always represents exactly what ran — nothing is mutated in place.

## Deployment history

The **Deployments** tab lists every release in order, newest first. Each entry shows when it shipped, who triggered it, the source (Git commit, image tag, or template version), and its outcome. This history is your timeline of what changed and when.

## One-click rollback

If a new release misbehaves, click **Rollback** on any earlier release. Miabi redeploys that exact snapshot — same image, same configuration — bringing your app back to a known-good state in seconds. Rolling back creates a new release entry pointing at the old snapshot, so history stays linear and honest.

:::tip
Rollback is the fastest way to recover from a bad deploy. There's no need to rebuild — the prior image is already available.
:::

## Zero-downtime updates

Miabi updates applications without dropping traffic using a **rolling** switch — the default
deploy strategy:

1. The new container is started **alongside** the current one, under the app's stable network alias.
2. Miabi waits for it to come up and pass health checks.
3. The proxy route is **switched** to the new container.
4. The old container is retired.

Weighted **canary** rollout — running the new release beside the stable one and shifting a share of
traffic to it — is a separate, opt-in strategy, not what an ordinary deploy does.

Because the switch happens only after the new version is ready, users never hit a stopped service. The same mechanism applies to rollbacks, so reverting is just as smooth.

:::note
Zero-downtime switching means a deploy briefly runs both the old and new containers. Make sure your app's resource limits leave headroom for this overlap — see [Scaling & Resources](/docs/applications/scaling-and-resources).
:::

For lifecycle events around each release, see the [application timeline](/docs/applications/logs-and-timeline).
