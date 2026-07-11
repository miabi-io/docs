---
sidebar_position: 11
title: Container Labels
description: Attach custom Docker labels to an application's containers so label-driven tools like Traefik can discover them.
---

# Container Labels

Container labels let you attach **custom Docker labels** to an application's container(s). They are
useful for **label-driven ecosystem tools** that run alongside your apps and configure themselves by
reading container labels — most commonly **[Traefik](/docs/networking/reverse-proxy-and-traefik)**,
but also tools like autoheal, Watchtower, and Prometheus/cAdvisor scrape configs.

Labels are edited from an application's **Settings** tab, under **Container labels** (below
Resources).

## When to use them

The canonical case is **routing an app with Traefik** instead of Goma Gateway. Traefik discovers and
configures routes from labels on your container, for example:

```
traefik.enable                                        = true
traefik.http.routers.blog.rule                        = Host(`blog.example.com`)
traefik.http.routers.blog.entrypoints                 = websecure
traefik.http.routers.blog.tls.certresolver            = le
traefik.http.services.blog.loadbalancer.server.port   = 8080
```

You add these labels yourself — Miabi does **not** generate `traefik.*` labels for you. See
[Using Traefik instead of Goma](/docs/networking/reverse-proxy-and-traefik) for the full setup.

:::note
On the default (Goma Gateway) stack you don't need labels for routing at all — Miabi configures
Goma from your [domains](/docs/networking/domains) automatically. Container labels are for **other**
label-aware tools, or for running Miabi behind a proxy that discovers containers by label.
:::

## Adding and removing labels

1. Open your application and go to **Settings → Container labels**.
2. Enter a **key** and **value** and click **Add**.
3. Remove a label with the trash icon on its row.

Changes are validated and saved immediately, but — like [environment
variables](/docs/applications/environment-variables), ports, and volumes — they are stamped onto the
container at deploy time, so **they take effect on the next deploy**. The app shows the usual
"redeploy required" indicator after a change; redeploy (or restart) to apply.

:::caution
Don't put secrets in labels. Labels are visible to anyone who can run `docker inspect` on the node.
Use [environment variables & secrets](/docs/applications/environment-variables) for sensitive values.
:::

## Reserved keys

Miabi uses its own Docker labels to track ownership, workspace scoping, and housekeeping. To protect
that, keys under these prefixes are **reserved** and cannot be set as custom labels:

- `io.miabi.*` — the platform's own labels (app id, workspace, deployment, …)
- `com.docker.*` — Docker Compose grouping keys Miabi manages

Trying to set a reserved key is rejected with a clear error. This protection is always on and is not
affected by the plan capability below — it's a safety invariant, not a feature toggle.

## Availability (plan capability + kill-switch)

Custom container labels are **admin-gated** through two layers:

- **Per-workspace plan capability** — a plan's **Allow custom container labels** capability decides
  whether workspaces on that plan can use the feature. See
  [Plans & Quotas](/docs/workspaces/plans-and-quotas). A platform admin can also override it per
  workspace.
- **Fleet-wide kill-switch** — a platform setting (**Allow custom container labels**) can disable the
  feature for the entire instance regardless of plan. See
  [Platform Settings](/docs/operations/platform-settings).

When the feature is unavailable, the **Container labels** panel is read-only and shows a hint;
existing labels keep working and are re-applied on redeploy — disabling never silently changes a
running app's routing.

## GitOps

Container labels round-trip through the [declarative manifest](/docs/cicd/gitops) as
`containerLabels` on an application spec, so they are covered by export and apply. Reserved keys are
stripped on import.
