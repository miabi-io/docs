---
sidebar_position: 3
title: Git Push Deploy
description: Connect a repository and deploy automatically on push, with encrypted Git and registry credentials.
---

# Git Push Deploy

**Git push deploy** is the simplest continuous-delivery path in Miabi: connect a repository to an application, and every push to the tracked branch triggers a deploy. No pipeline definition required — Miabi builds (or pulls) and rolls out the new release automatically.

## Connecting a repository

From an application's settings in the console, connect a Git repository and choose the branch to track. Miabi supports the common hosts (GitHub, GitLab, Bitbucket). Once connected, Miabi can both **read** your code to build it and **listen** for pushes to trigger deploys.

For the full first-deploy walkthrough — choosing a build method, environment variables, and domains — see [Deploy from Git](/docs/applications/deploy-from-git).

## How push-to-deploy works

1. You push a commit to the tracked branch.
2. Your Git host notifies Miabi (via the connection's delivery hook).
3. Miabi fetches the new commit, builds or pulls the image, and creates a new **deployment**.
4. Traffic shifts to the new release once it's healthy; the previous release stays available for rollback.

Because each push produces a standard deployment, you get the usual deployment history and **rollback** for free.

:::tip
Track a stable branch (such as `main`) for production and use a separate app or branch for staging. Combine with [Pipelines](/docs/cicd/pipelines) when you need build/test gates before the deploy.
:::

## Stored credentials

To build from private repositories and deploy private images, Miabi stores two kinds of credentials, **encrypted at rest**:

| Credential | Used for |
|---|---|
| **Git credentials** | Cloning private repositories and authenticating the push delivery hook |
| **Container-registry credentials** | Pulling base images and private application images, and pushing built images to a registry |

Both are managed in the console and are **never stored in plain text and never logged**. See [Encryption](/docs/security/encryption) for how secrets are protected at rest.

:::caution
Grant credentials the least access they need — a deploy key or a scoped token rather than a personal account password — so a single connection can't reach more than it should.
:::

## Roles

Connecting repositories and managing stored credentials are privileged actions. **Owner** and **Admin** can configure connections and credentials; **Developer** can typically trigger deploys; **Viewer** has read-only access.

## Related

- [Deploy from Git](/docs/applications/deploy-from-git)
- [Encryption](/docs/security/encryption)
- [Pipelines](/docs/cicd/pipelines)
- [Webhooks & notifications](/docs/cicd/webhooks-and-notifications)
