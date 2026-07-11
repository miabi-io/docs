---
sidebar_position: 3
title: Platform Settings
description: Typed, cached key/value configuration managed by the platform admin.
---

# Platform Settings

Platform settings are the instance-wide configuration knobs that control how Miabi behaves across
every workspace. They're stored as **typed, cached key/value** entries and managed centrally by the
platform administrator.

![Platform settings](/img/screenshots/platform-settings.png)

## Typed and cached

Each setting is **typed** — a value is a string, number, boolean, or structured value, and Miabi
validates it against its expected type. That prevents an invalid value (a word where a number
belongs) from being saved and silently breaking behavior at runtime.

Settings are also **cached** in memory, so they're read on the hot path without a database lookup
every time. When an admin changes a setting, the cache is refreshed so the new value takes effect
without a restart.

| Property | Meaning |
|----------|---------|
| Typed | Each key has a declared type and is validated on save |
| Cached | Values are served from memory for fast, low-overhead reads |
| Key/value | Simple, addressable configuration entries |

## Who can change them

Platform settings are **instance-wide**, not workspace-scoped, so they are managed by the
**platform administrator** rather than by individual workspace members. This keeps cross-tenant
configuration in one trusted place. See [Platform administration](/docs/administration/platform-admin)
for the full admin surface and who holds that role.

:::note
Platform settings differ from a workspace's own configuration. A workspace member (Owner, Admin,
Developer, Viewer) manages resources inside their workspace; platform settings sit above
workspaces and apply to the whole instance.
:::

## Notable settings

A few platform settings act as instance-wide feature switches, for example:

- **Registration enabled** / **Require email verification** — control how new accounts sign up.
- **Maintenance mode** — put the instance into read-only maintenance.
- **Default workspace role** — the role new members receive.
- **Allow custom container labels** — a fleet-wide kill-switch for
  [custom container labels](/docs/applications/container-labels). When off, the feature is disabled
  everywhere regardless of any plan capability; when on, the per-plan capability decides.

## Settings vs. environment variables

Some configuration is supplied at boot through environment variables (for example the metrics
scrape interval and retention covered in [Configuration](/docs/getting-started/configuration)),
while platform settings are managed live in the console.

- **Environment variables** — set at startup; good for deployment-level and infrastructure values.
- **Platform settings** — changed at runtime through the admin UI; good for operational values you
  want to adjust without redeploying.

:::tip
Prefer platform settings for values you expect to tune over time, and environment variables for
values that belong to how the instance is deployed.
:::
