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

## Re-syncing the repository pipeline

If your repository carries a `pipelines.yaml`, Miabi adopts it when the app is created and deploys
run through it. Two cases leave the app out of step with the file, and **Settings → Source →
Re-sync** fixes both:

- **You added the file after creating the app** (or the app only just became a Git app). Re-sync
  adopts it, and deploys start running through the pipeline.
- **You edited the file.** Miabi re-reads it on each run, so this is only needed to pick the change
  up *now* — for instance to confirm the document still parses before your next deploy.

Re-sync reports what it did: adopted, updated, or already up to date. A repository with no pipeline
file is not an error — the app simply keeps building directly.

From the CLI:

```bash
miabi apps resync-pipeline web
```

## Moving it into GitOps

An app you built here can be described as a manifest and committed alongside your code: **Settings →
GitOps manifest → Generate**. The generated document carries the repository, ref and build settings
under `source`, so applying it elsewhere rebuilds from the same code rather than pulling the image
this install happened to produce. See the
[manifest reference](/docs/cicd/manifest-reference#building-from-source).

## Switching to a prebuilt image

A Git app can switch to pulling a prebuilt image without being recreated — see
[Switching between image and Git](/docs/applications/deploy-from-image#switching-between-image-and-git).
Note that switching away from Git removes any pipeline adopted from the repository.

## Redeploying

Trigger a new build manually from the **Deployments** tab at any time, or set up automatic deploys so a push to your branch builds and ships a release with no manual step. See [Git push-to-deploy](/docs/cicd/git-push-deploy) and [Pipelines](/docs/cicd/pipelines).

:::tip
Every Git deploy produces a tracked release. If a build ships a regression, roll back instantly from the [Releases](/docs/applications/releases-and-rollbacks) tab.
:::
