---
sidebar_position: 1
title: Applications Overview
description: What an application is in Miabi, the three deployment sources, and how to create one from the web console.
---

# Applications Overview

An **application** is the deployable unit in Miabi. It is owned by a [workspace](/docs/workspaces/overview) and represents a long-running service — a web app, an API, a worker — that Miabi builds, runs, routes, and keeps online for you. You never touch Docker commands; the console handles the full lifecycle.

![The application overview page showing deployment status and recent activity](/img/screenshots/app-overview.png)

## The three sources

An application runs from one of three sources:

| Source | What Miabi does | Best for |
|--------|-----------------|----------|
| **Git repository** | Builds an image from your repo on a [build runner](/docs/cicd/runners), with buildpacks or a Dockerfile | Apps you build from source on GitHub, GitLab, or Bitbucket |
| **Docker image** | Pulls a prebuilt image from a registry | Off-the-shelf images, CI-built artifacts, internal registries |
| **Marketplace template** | Provisions a curated, versioned template (WordPress, Ghost, n8n, …) | One-click installs of common software |

See [Deploy from Git](/docs/applications/deploy-from-git), [Deploy from a Docker image](/docs/applications/deploy-from-image), and the [Marketplace](/docs/marketplace/overview) for each path.

## Creating an application

From **Applications** (or the workspace dashboard), click **New application**, give it a name, and
choose a source. Marketplace templates are installed from the [Marketplace](/docs/marketplace/overview)
page instead.

![The create-application dialog with the source selector](/img/screenshots/app-create.png)

1. **Name** your app — this becomes its identifier within the workspace.
2. **Pick a source** — Docker image or Git repository.
3. **Configure** the source (image, tag and registry credential, or repository, branch and build
   method), and optionally its container ports, networks and stack.
4. **Create application**.
5. **Deploy** — creating an app does not start it. Set [environment
   variables](/docs/applications/environment-variables) and resource limits if needed, then deploy
   from the app's page.

:::tip
You can create an app with minimal configuration and refine it later. Most settings can be changed and applied on the next deploy.
:::

## Application tabs

Once created, each application has a set of tabs in the console:

- **Overview** — status, recent activity and live resource usage.
- **Events** — the app's [timeline](/docs/applications/logs-and-timeline#application-timeline) of lifecycle events.
- **Logs** — live, streaming [container logs](/docs/applications/logs-and-timeline).
- **Deployments** — each deploy with its live log, and the controls of a running [canary](/docs/applications/canary-deployments).
- **Environment** — [environment variables and secrets](/docs/applications/environment-variables).
- **Network** — internal hostname, [external access](/docs/applications/exposing-your-app#method-1--one-click-external-access) and networks.
- **Routes** — the [routes](/docs/applications/exposing-your-app#method-2--your-own-domain) that serve the app on your domains.
- **Ports** — declared container ports and [host port bindings](/docs/applications/exposing-your-app#method-3--a-published-host-port).
- **Volumes** — attached volumes and mounted config files.
- **Databases** — linked [databases](/docs/databases/overview) and their connection details.
- **Releases** — every release, with **Activate** to [roll back](/docs/applications/releases-and-rollbacks).
- **Access** — Enterprise [per-resource policies](/docs/workspaces/roles-and-permissions#per-resource-policies) for this app.
- **Settings** — source, configuration, deployment strategy, [resources](/docs/applications/scaling-and-resources), container labels, healthcheck, GitOps manifest, and the danger zone.

## If the app disappears

Miabi watches for an application whose container — or swarm service — has gone missing from under
it, for example removed by hand on the node. What happens then is the platform's
[reconciliation](/docs/operations/reconciliation) mode, which an app can
[override](/docs/operations/reconciliation#per-app-override) in **Settings → Resources → If this app
disappears**. While the platform mode is `off`, no app is watched.

| Option | What it does |
|---|---|
| **Platform default** | Follows the platform-wide mode. The default. |
| **Leave this app alone** | The app is not watched, reported or touched. |
| **Report only** | The disappearance is reported (app event, alert, metrics) but never acted on — even while the platform redeploys. |
| **Redeploy in place** | The app is redeployed on the node or cluster it already ran on, even while the platform only reports. |

Whatever you choose, a missing **data volume** always stops a redeploy: Docker would hand the app a
new, empty volume, so the data has to be restored from a backup first.

## What this section covers

The rest of the Applications section walks through each capability: deploying from [Git](/docs/applications/deploy-from-git) or an [image](/docs/applications/deploy-from-image), **[exposing the app to the internet](/docs/applications/exposing-your-app)**, managing [environment variables](/docs/applications/environment-variables), [releases and rollbacks](/docs/applications/releases-and-rollbacks), [scaling](/docs/applications/scaling-and-resources), running [one-off jobs](/docs/applications/jobs), grouping apps into [stacks](/docs/applications/stacks), promoting through [environments](/docs/applications/environments), and watching [logs and the timeline](/docs/applications/logs-and-timeline).
