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
| Shown in console | Value visible | Masked; a workspace **Admin** can reveal it |
| In logs / audit | Value may appear | Never shown |

Use plain variables for non-sensitive configuration and secrets for anything that grants access or must stay private.

## The workspace secret vault

Secrets live in a **workspace secret vault**, shared across the apps in that [workspace](/docs/workspaces/overview). Define a secret once and reference it from any application with `${{ secrets.NAME }}` — rotate it in one place and every consumer picks up the new value on its next deploy. See [Secrets](/docs/secrets/overview) for managing the vault, including custom vs. managed secrets.

All secret values are **encrypted at rest** and are never logged. They are returned in plain text
only to a workspace **Admin** or **Owner** who explicitly reveals one — every other role sees a
masked value. See [Encryption](/docs/security/encryption) for how Miabi protects them.

:::caution
Once a value is stored as a secret, the console masks it. For anyone below Admin a secret is
write-only — to change it, set a new value rather than expecting to read the old one back.
:::

## Referencing database credentials

When you provision a [database](/docs/databases/overview), Miabi generates its credentials and stores them as secrets. Reference these from your application's environment instead of copying connection strings by hand. This keeps credentials in the vault, encrypted, and rotatable without editing each app manually.

## Pointing one application at another

Applications in a workspace share a network and reach each other by **name**, so the API at `api`
is `http://api:8080` to every sibling — no IP, no generated hostname, and nothing to update when
either side is redeployed.

Set it as a plain variable:

| Variable | Value |
|---|---|
| `API_URL` | `http://api:8080` |

In a [manifest](/docs/cicd/manifest-reference#addressing-another-application) you can have Miabi
build that address for you, so the port follows the app it belongs to:

```yaml
env:
  API_URL: "{{ .applications.api }}"     # http://api:8080
```

:::note
Both applications must be on the same node unless [cluster mode](/docs/nodes/cluster-mode) is on — a
workspace network is node-local otherwise. Apps deployed before Miabi 1.10 answer to their name only
after their next deploy.
:::

## An application's public address

Some apps need their own public URL at startup: OAuth callbacks, links in emails, a "public mode"
that refuses to start without it. Reference it instead of copying the hostname:

| Variable | Value |
|---|---|
| `PUBLIC_URL` | `${{ applications.web.public_url }}` |
| `OAUTH_CALLBACK` | `${{ applications.web.public_url }}/auth/callback` |

`apps.` works as a short alias of `applications.`. An app can reference itself or any other app in the
workspace, and the reference can sit inside longer text.

| Field | Resolves to |
|---|---|
| `public_url` | The app's custom domain if it has one, else its [external-access](/docs/applications/exposing-your-app) URL, e.g. `https://shop.example.com` |
| `public_host` | The same, without `https://` |
| `external_url` | The generated external-access URL only, ignoring custom domains |

The custom domain is the oldest enabled route on the app's port with path `/`. Routes on other ports,
or on a sub-path, never count.

Miabi fills the value in **each time the referencing app deploys**, so it follows a base-domain change
or a move to another location without editing anything. When the address changes, apps that use it
are marked **redeploy required**; they are not restarted on their own.

:::note A missing address fails the deploy
If the app has neither a route nor external access, the deploy fails with *app "web" has no public
URL: turn on external access or add a route on its port*, rather than starting with an empty value.
Deleting an app that others reference warns you first, naming them.
:::

## Variables Miabi sets

Every app container and job run also gets a set of `MIABI_*` variables, filled in at each deploy, so
an app can tag errors with its release, build its own links or tell its replicas apart without
copying values by hand.

| Variable | Value |
|---|---|
| `MIABI_APP_NAME` / `MIABI_APP_ID` | The application |
| `MIABI_WORKSPACE_NAME` / `MIABI_WORKSPACE_ID` | Its workspace |
| `MIABI_STACK` | Its [stack](/docs/applications/stacks), when it is in one |
| `MIABI_KIND` | `app`, `job` or `cronjob` |
| `MIABI_JOB_NAME` / `MIABI_JOB_RUN_ID` | The job and this run; jobs and cron jobs only |
| `MIABI_DEPLOYMENT_ID` | The deployment that started the container |
| `MIABI_RELEASE` | The [release](/docs/applications/releases-and-rollbacks) number, e.g. `12` |
| `MIABI_VERSION` / `MIABI_IMAGE_TAG` | The [version](/docs/cicd/versioning) (`1.4.2`) and its tag (`v1.4.2`), when a version policy produced the image |
| `MIABI_COMMIT` / `MIABI_BRANCH` | Source commit and branch, for apps built from Git |
| `MIABI_IMAGE` / `MIABI_IMAGE_DIGEST` | The image reference and its `sha256:…` digest |
| `MIABI_PORT` | The app's main container port |
| `MIABI_INTERNAL_URL` | `http://<app>:<port>`, how other apps in the workspace reach it |
| `MIABI_PUBLIC_URL` / `MIABI_PUBLIC_HOST` | The app's [public address](#an-applications-public-address) |
| `MIABI_LOCATION` | The [location](/docs/nodes/cluster-mode#locations) it runs in |
| `MIABI_NODE` | The [node](/docs/nodes/node-placement#node-names) it runs on |
| `MIABI_NODE_ID` | Swarm services only: the Swarm node ID of the task |
| `MIABI_REPLICA` | Replica slot, `1` to `n`; always `1` for a container |
| `MIABI_CPU_LIMIT` | CPU limit in cores, e.g. `1.5` |
| `MIABI_MEMORY_LIMIT_MB` | Memory limit in MiB |

A variable without a value is left out, never set empty: an app with no route has no
`MIABI_PUBLIC_URL`, and an app without limits has no `MIABI_CPU_LIMIT`. These names are a stable
contract: new ones may be added, none are renamed or removed.

A [Swarm service](/docs/nodes/cluster-mode) shares one environment across its tasks, so
`MIABI_REPLICA` and `MIABI_NODE_ID` are expanded by Docker in each task. A service gets `MIABI_NODE`
only when it is [pinned to a node](/docs/nodes/node-placement); otherwise read `MIABI_NODE_ID`.

**Your variables win.** A variable of the same name set on the app or its stack replaces Miabi's, and
the **Environment** tab marks it *Replaces a Miabi variable*. The tab also lists, under **Set by
Miabi**, the values the next deploy sets.

**Turning them off.** Clear **Set MIABI_\* variables** in the **Environment** tab, or set
`miabiEnv: false` in the app's [manifest](/docs/cicd/manifest-reference#application). Jobs follow
their app. The change applies at the next deploy.

Values change only at a deploy. When the app's public address changes or its workspace is renamed, the
app is marked **redeploy required** instead of being restarted.

:::note Not the pipeline set
[Pipeline steps](/docs/cicd/pipelines#provided-by-the-runner) get their own `MIABI_*` variables. Some
names are shared, but the sets differ: a running app gets no registry credentials and no
`MIABI_ENV` file, and its `MIABI_IMAGE_DIGEST` is the bare `sha256:…` digest.
:::

## Redeploy on change

Environment variables and secrets are baked into the running container, so **changes take effect on the next deploy**. After editing a variable:

1. Save your changes in the **Environment** tab.
2. Trigger a deploy (or let your pipeline do it).
3. Miabi brings up a new [release](/docs/applications/releases-and-rollbacks) with the updated configuration, with zero downtime.

:::tip
Group related apps and share secrets across them with [Stacks](/docs/applications/stacks). To keep dev, staging, and production values separate, give each stage its own application — variables belong to an application, not to a promotion stage. See [Environments](/docs/applications/environments).
:::
