---
sidebar_position: 4
title: Environment Variables & Secrets
description: Manage plain environment variables and encrypted secrets with the workspace secret vault, and reference database credentials.
---

# Environment Variables & Secrets

Applications are configured through environment variables. Miabi distinguishes between **plain variables** and **secrets**, and stores secrets in an encrypted workspace vault so sensitive values never sit in plain text.

![The environment variables and secrets editor](/img/screenshots/env-vars.png)

## Plain variables vs. secrets

| | Plain variable | Secret |
|---|----------------|--------|
| Example | `LOG_LEVEL`, `PORT`, `NODE_ENV` | `DATABASE_PASSWORD`, `API_KEY`, `JWT_SECRET` |
| Stored | As written | Encrypted at rest |
| Shown in console | Value visible | Masked |
| In logs / audit | Value may appear | Never shown |

Use plain variables for non-sensitive configuration and secrets for anything that grants access or must stay private.

## The workspace secret vault

Secrets live in a **workspace secret vault**, shared across the apps in that [workspace](/docs/workspaces/overview). Define a secret once and reference it from any application that needs it — rotate it in one place and every consumer picks up the new value on its next deploy.

All secret values are **encrypted at rest** and are never logged or returned in plain text. See [Encryption](/docs/security/encryption) for how Miabi protects them.

:::caution
Once a value is stored as a secret, the console masks it. Treat secrets as write-only — to change a secret, set a new value rather than expecting to read the old one back.
:::

## Referencing database credentials

When you provision a [database](/docs/databases/overview), Miabi generates its credentials and stores them as secrets. Reference these from your application's environment instead of copying connection strings by hand. This keeps credentials in the vault, encrypted, and rotatable without editing each app manually.

## Redeploy on change

Environment variables and secrets are baked into the running container, so **changes take effect on the next deploy**. After editing a variable:

1. Save your changes in the **Environment** tab.
2. Trigger a deploy (or let your pipeline do it).
3. Miabi brings up a new [release](/docs/applications/releases-and-rollbacks) with the updated configuration, with zero downtime.

:::tip
Group related apps and share secrets across them with [Stacks](/docs/applications/stacks), and use [Environments](/docs/applications/environments) to keep dev, staging, and production values separate.
:::
