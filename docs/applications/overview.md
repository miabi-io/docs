---
sidebar_position: 1
title: Applications Overview
description: What an application is in Miabi, the three deployment sources, and how to create one from the web console.
---

# Applications Overview

An **application** is the deployable unit in Miabi. It is owned by a [workspace](/docs/workspaces/overview) and represents a long-running service — a web app, an API, a worker — that Miabi builds, runs, routes, and keeps online for you. You never touch Docker commands; the console handles the full lifecycle.

![The application overview page showing deployment status and recent activity](/img/screenshots/app-overview.png)

## The three sources

Every application is created from one of three sources:

| Source | What Miabi does | Best for |
|--------|-----------------|----------|
| **Git repository** | Clones your repo and builds an image with buildpacks or a detected Dockerfile | Apps you build from source on GitHub, GitLab, or Bitbucket |
| **Docker image** | Pulls a prebuilt image from a registry | Off-the-shelf images, CI-built artifacts, internal registries |
| **Marketplace template** | Provisions a curated, versioned template (WordPress, Ghost, n8n, …) | One-click installs of common software |

See [Deploy from Git](/docs/applications/deploy-from-git), [Deploy from a Docker image](/docs/applications/deploy-from-image), and the [Marketplace](/docs/marketplace/overview) for each path.

## Creating an application

From the workspace dashboard, click **New Application**, give it a name, and choose a source.

![The create-application dialog with the source selector](/img/screenshots/app-create.png)

1. **Name** your app — this becomes its identifier within the workspace.
2. **Pick a source** — Git repo, Docker image, or marketplace template.
3. **Configure** the source (repository and branch, image and tag, or template options).
4. **Set environment variables** and resource limits if needed.
5. **Create** — Miabi runs the first build and deploy automatically.

:::tip
You can create an app with minimal configuration and refine it later. Most settings can be changed and applied on the next deploy.
:::

## Application tabs

Once created, each application has a set of tabs in the console:

- **Deployments** — build and release history, with one-click [rollback](/docs/applications/releases-and-rollbacks).
- **Environment** — [environment variables and secrets](/docs/applications/environment-variables).
- **Domains** — connected [domains](/docs/networking/domains) and [TLS certificates](/docs/networking/tls-certificates).
- **Logs** — live, streaming [container logs](/docs/applications/logs-and-timeline).
- **Settings** — source, [scaling and resource limits](/docs/applications/scaling-and-resources), and lifecycle controls.

## What this section covers

The rest of the Applications section walks through each capability: deploying from [Git](/docs/applications/deploy-from-git) or an [image](/docs/applications/deploy-from-image), managing [environment variables](/docs/applications/environment-variables), [releases and rollbacks](/docs/applications/releases-and-rollbacks), [scaling](/docs/applications/scaling-and-resources), running [one-off jobs](/docs/applications/jobs), grouping apps into [stacks](/docs/applications/stacks), promoting through [environments](/docs/applications/environments), and watching [logs and the timeline](/docs/applications/logs-and-timeline).
