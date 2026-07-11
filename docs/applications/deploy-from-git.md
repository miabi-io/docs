---
sidebar_position: 2
title: Deploy from Git
description: Connect a GitHub, GitLab, or Bitbucket repository and let Miabi clone, build, and deploy your application.
---

# Deploy from Git

Deploying from Git is the most common way to run an application in Miabi. You connect a repository, pick a branch, and Miabi clones the code and builds an image — automatically detecting how to build it.

![The deploy-from-Git configuration screen](/img/screenshots/deploy-from-git.png)

## Connecting a repository

When creating an application, choose **Git repository** as the source. Any Git host reachable over
HTTPS or SSH works — GitHub, GitLab, and Bitbucket are simply the common cases; there is no
provider to select.

1. **Repository URL** — paste the clone URL (HTTPS or SSH).
2. **Auth type** — `public`, an HTTPS **token**, or an **SSH** key.
3. **Branch** — choose the branch to deploy (for example `main` or `production`).

Miabi builds from the repository root. There is currently no per-application build-context or
subdirectory setting, so monorepos need a `Dockerfile` at the root.

## Git credentials

For private repositories, Miabi needs access. Stored **Git credentials** (a personal access token or deploy key) are saved per workspace, encrypted at rest, and reused across applications. Add them once and Miabi can clone any private repo you have access to.

:::caution
Use scoped, read-only deploy keys or tokens where possible. Credentials are never logged and are stored encrypted — see [Encryption](/docs/security/encryption).
:::

## How builds work

Miabi inspects the cloned repository and chooses a build strategy:

- **Dockerfile** — if a `Dockerfile` is detected, Miabi builds the image from it directly. This gives you full control over the runtime.
- **Buildpacks** — if there is no Dockerfile, Miabi uses buildpacks to detect the language and produce a runnable image without you writing any Docker configuration.

The result of either path is an immutable image that becomes a new [release](/docs/applications/releases-and-rollbacks).

## Build limits

Builds run under a **platform-wide** time limit so a runaway build can't occupy a runner forever:

| Limit | Where it is set | Default |
|-------|-----------------|---------|
| **Build time** | `MIABI_BUILD_TIMEOUT_MINUTES` (operator env) | 30 minutes |

These are platform settings, not per-application ones — an app has no build-memory or build-time
field. The `CPU` and `Memory` limits on an application cap its **running container**, not its build.

## Redeploying

Trigger a new build manually from the **Deployments** tab at any time, or set up automatic deploys so a push to your branch builds and ships a release with no manual step. See [Git push-to-deploy](/docs/cicd/git-push-deploy) and [Pipelines](/docs/cicd/pipelines).

:::tip
Every Git deploy produces a tracked release. If a build ships a regression, roll back instantly from the [Releases](/docs/applications/releases-and-rollbacks) tab.
:::
