---
sidebar_position: 9
title: Environments
description: Promote applications through dev, staging, and production stages with isolated configuration.
---

# Environments

**Environments** are promotion stages for your application — typically **dev → staging → production**. They let you run the same app at multiple maturity levels, each with its own configuration, so you can validate changes before they reach users.

![The environments view showing dev, staging, and production stages](/img/screenshots/environments.png)

## Why environments

A change that looks fine in development should be tested before it serves real traffic. Environments give you a clear path:

- **Dev** — where you iterate quickly and changes are expected to break.
- **Staging** — a production-like stage for final verification.
- **Production** — what your users actually hit.

Each stage runs the same application but with its own [environment variables and secrets](/docs/applications/environment-variables), its own [domains](/docs/networking/domains), and its own [scaling](/docs/applications/scaling-and-resources). Database credentials, API keys, and resource limits differ per stage, so a dev deploy never touches production data.

## Promoting between stages

Promotion moves a verified [release](/docs/applications/releases-and-rollbacks) forward — for example, taking the exact build that passed in staging and shipping it to production. Because you promote the same immutable release, production runs precisely what you tested; only the per-stage configuration changes.

A typical flow:

1. Deploy a change to **dev** and iterate.
2. **Promote** the resulting release to **staging** and verify against production-like data.
3. **Promote** the same release to **production**.

:::tip
Promote releases rather than rebuilding for each stage. Rebuilding can introduce differences between what you tested and what ships; promoting the same artifact eliminates that risk.
:::

## Environments and the rest of Miabi

- Combine environments with [Stacks](/docs/applications/stacks) to promote a whole multi-app system as a unit.
- Keep stage-specific secrets in the workspace vault; reference them per environment. See [Encryption](/docs/security/encryption).
- Wire promotions into your delivery flow with [Pipelines](/docs/cicd/pipelines).

:::note
Promotion never carries configuration across stages — production keeps its own secrets and limits. Only the immutable release artifact moves forward.
:::
