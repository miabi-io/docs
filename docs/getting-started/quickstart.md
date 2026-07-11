---
sidebar_position: 4
title: Quick Start
description: Deploy your first application with Miabi in minutes
---

# Quick Start

This guide walks you through deploying your first application with Miabi — entirely from the web
console, no Docker commands required.

## 1. Install Miabi

Follow the [Installation](/docs/getting-started/installation) guide to bring up the stack, then
open your domain and sign in as the **platform admin**, seeded on first boot from
`MIABI_ADMIN_EMAIL` / `MIABI_ADMIN_PASSWORD` (the installer generates that password and prints it
once).

## 2. Create a workspace

Workspaces own every resource and provide multi-tenant isolation. After logging in, create your
first workspace (or use your personal space). Everything you deploy lives inside a workspace.

![Workspace dashboard](/img/screenshots/dashboard.png)

See [Workspaces](/docs/workspaces/overview) for the full model.

## 3. Create an application

From the workspace, click **Create application** and choose a source:

- **Git repository** — Miabi clones and builds your code. See [Deploy from Git](/docs/applications/deploy-from-git).
- **Docker image** — Miabi pulls an existing image from a registry. See [Deploy from Image](/docs/applications/deploy-from-image).
- **Marketplace template** — a one-click install of a pre-packaged app. See [Marketplace](/docs/marketplace/overview).

![Create application dialog](/img/screenshots/app-create.png)

For this walkthrough, pick a **Docker image** such as `nginx:latest` — it requires no build and
deploys instantly.

## 4. Configure and deploy

Set any [environment variables](/docs/applications/environment-variables) and
[resource limits](/docs/applications/scaling-and-resources) you need, then click **Deploy**. Miabi
pulls the image, creates the container, and records a [release](/docs/applications/releases-and-rollbacks).

![Application overview](/img/screenshots/app-overview.png)

Watch progress in the [application timeline](/docs/applications/logs-and-timeline) and live logs.

## 5. Connect a domain and get SSL

Open the app's **Domains** tab and add a domain (for example `app.example.com`). Miabi guides you
through [DNS verification](/docs/networking/domains), then routes traffic through Goma Gateway and
issues an SSL certificate automatically via Let's Encrypt.

![Domains with verification status](/img/screenshots/domains.png)

Within a moment your app is reachable at `https://app.example.com` with a valid certificate.

## 6. Add a database (optional)

Need persistence? Provision a managed database — PostgreSQL, MySQL, MariaDB, Redis, MongoDB, or libSQL —
from the **Databases** section. Miabi generates credentials and exposes them to your app.

![Databases](/img/screenshots/databases.png)

See [Databases](/docs/databases/overview) and [Backups](/docs/storage/backups).

## What's next

You now have a deployed app on your own server with automatic SSL. Explore further:

- [Releases & rollbacks](/docs/applications/releases-and-rollbacks) — ship updates and roll back safely.
- [Scaling & resources](/docs/applications/scaling-and-resources) — set limits and replicas.
- [Marketplace](/docs/marketplace/overview) — install WordPress, Ghost, Nextcloud, and more.
- [Multi-node](/docs/nodes/overview) — add remote Docker hosts.
- [CI/CD & pipelines](/docs/cicd/pipelines) — build from Git and deploy via [runners](/docs/cicd/runners).
- [Container registry](/docs/registry/overview) — the built-in registry Git builds push to.
- [API reference](https://demo.miabi.io/docs) — automate everything via REST.
