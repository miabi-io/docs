---
sidebar_position: 2
title: The Web Console
description: A tour of the Miabi web interface
---

# The Web Console

The Miabi web console is the primary way to operate the platform. It is a Vue 3 single-page app
embedded in the control-plane binary and served at `/`, so it is always in sync with your instance —
nothing extra to deploy.

![Workspace dashboard](/img/screenshots/dashboard.png)

## Anatomy

- **Workspace switcher** — every screen operates in the context of the [active
  workspace](/docs/workspaces/overview). Switch workspaces (or your personal space) from the
  switcher; the rest of the UI re-scopes instantly.
- **Sidebar navigation** — grouped by resource type: Applications, Domains, Databases, Volumes,
  Backups, Marketplace, Nodes, Pipelines, Monitoring, and Settings.
- **Dashboard** — an at-a-glance overview of the workspace, roughly in the order you care about
  it: anything failing (as a banner you can act on), quick actions for the things you start most,
  the app/database/stack counts, a [**Traffic** card](/docs/operations/analytics#on-the-workspace-dashboard)
  with the last 24 hours of requests and who is on the site right now, live CPU/memory/network,
  and then the inventory — applications, stacks, and a running feed of workspace activity.

![Sidebar navigation](/img/screenshots/web-console-nav.png)

## Dark and light mode

The console ships with a polished dark theme (the default) and a light theme. The toggle lives in
the top bar; your preference is remembered per browser.

## Everything is an API

The console never holds business logic of its own — every action it performs is a call to the same
public REST API you can use directly. That means anything you see in the UI is automatable. For
endpoint-level detail, open the interactive API reference at `/docs` on your instance, or browse the
[hosted API reference](https://demo.miabi.io/docs).

:::tip
Working against the API directly? Create an [API token](/docs/security/api-tokens) scoped to a
workspace and call the same endpoints the console uses.
:::

## Real-time updates

Long-running operations — deploys, builds, backups, log streams — push live updates to the console
over server-sent events, so you watch progress without refreshing.
