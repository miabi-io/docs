---
sidebar_position: 2
title: GitOps
description: Declarative miabi.io/v1 manifests reconciled continuously from Git, plus a one-shot imperative apply.
---

# GitOps

**GitOps** lets you manage Miabi resources declaratively. You describe the desired state of your apps, domains, and services as `miabi.io/v1` manifests, and Miabi makes reality match — either by **continuously reconciling** from a Git source or via a one-shot **apply**.

![GitOps source and reconciliation](/img/screenshots/gitops.png)

## Declarative manifests

A manifest describes *what you want*, not the steps to get there. Manifests use the `miabi.io/v1` API version and a `kind` for each resource type, with a `spec` capturing the desired configuration:

```yaml
apiVersion: miabi.io/v1
kind: Application
metadata:
  name: web
spec:
  image: miabi/guestbook
  tag: "1.0.0"
  ports:
    - container: 8080
      scheme: http
```

The workspace isn't part of the manifest — it comes from the apply target
(`/workspaces/{workspace}/apply`). Manifests are **strictly parsed**: unknown keys are rejected, so a
typo surfaces as an error rather than being silently ignored. Each resource kind has its own `spec`
(an Application has no `domains` field, for example — you expose it with a separate `Route`, as shown
in the [full example](#full-example-a-posta-project) below).

Manifests are the source of truth: edit the file, and the change flows into Miabi.

## Pull-based reconciliation

In the pull model, you connect a **Git source** (a repository and path holding your manifests). Miabi then **continuously reconciles** desired state from that source:

1. Miabi watches the Git source for changes.
2. On each sync, it compares the manifests against the live state of your resources.
3. It applies whatever changes are needed to converge — creating, updating, or removing resources to match.

This makes Git your single source of truth and your audit log: a commit is a change request, and reverting a commit reverts the cluster. Drift introduced outside Git is reconciled back toward the declared state on the next sync.

:::tip
Keep your manifests in their own repository or a dedicated directory, and protect it with reviews. Every merged change becomes a tracked, revertible deployment.
:::

## One-shot apply

When you don't want continuous syncing, Miabi also supports an **imperative apply** — submit a manifest (or a set of them) once and Miabi reconciles to it a single time. Apply is useful for:

- One-off changes and quick experiments.
- Bootstrapping resources before wiring up a Git source.
- Scripted, ad-hoc updates from your own tooling.

## Pull reconciliation vs apply

| | Pull-based reconciliation | One-shot apply |
|---|---|---|
| Trigger | Continuous, from a Git source | Once, on demand |
| Source of truth | Git | The manifest you submitted |
| Drift handling | Corrected on every sync | Not re-checked after apply |
| Best for | Production, GitOps workflows | Bootstrapping, ad-hoc changes |

:::note
Both paths use the same `miabi.io/v1` manifests. Start with apply to learn the schema, then connect a Git source when you're ready for continuous reconciliation.
:::

## Full example: a Posta project

A real project usually bundles several resources — an app, its databases, a domain, and a route.
The `Project` kind groups them into one unit you apply or reconcile together. This example deploys
[Posta](https://github.com/goposta/posta) (a self-hosted transactional-email platform) as a managed
PostgreSQL database, a dedicated Redis, the Posta server, and a public HTTPS route with automatic TLS.

```yaml
apiVersion: miabi.io/v1
kind: Project
metadata:
  name: posta
spec:
  description: Self-hosted transactional email platform — Postgres, Redis, server, and route.
  resources:
    # Managed PostgreSQL — Posta's primary datastore.
    - apiVersion: miabi.io/v1
      kind: Database
      metadata: { name: posta-db }
      spec:
        engine: postgres
        version: "17-alpine"
        placement: auto          # auto | dedicated | shared

    # Dedicated Redis — async job queue + caches. Miabi sets a password on the
    # instance, surfaced below as .databases.posta-redis.password.
    - apiVersion: miabi.io/v1
      kind: Database
      metadata: { name: posta-redis }
      spec:
        engine: redis
        version: "8-alpine"
        placement: dedicated

    # The Posta server: HTTP API + web UI on :9000 with the worker embedded.
    - apiVersion: miabi.io/v1
      kind: Application
      metadata: { name: posta }
      spec:
        image: jkaninda/posta
        tag: "0.11.0"
        ports:
          - container: 9000
            scheme: http
        env:
          POSTA_ENV: production
          POSTA_WEB_URL: "https://posta.example.com"    # must match the route host

          # Database — resolved from the managed posta-db instance.
          POSTA_DB_HOST: "{{ .databases.posta-db.host }}"
          POSTA_DB_PORT: "{{ .databases.posta-db.port }}"
          POSTA_DB_USER: "{{ .databases.posta-db.user }}"
          POSTA_DB_PASSWORD: "{{ .databases.posta-db.password }}"
          POSTA_DB_NAME: "{{ .databases.posta-db.name }}"

          # Redis — host:port + password from the dedicated instance.
          POSTA_REDIS_ADDR: "{{ .databases.posta-redis.host }}:{{ .databases.posta-redis.port }}"
          POSTA_REDIS_PASSWORD: "{{ .databases.posta-redis.password }}"

          # Security — CHANGE THESE before applying. Stored encrypted (secretEnv).
          POSTA_JWT_SECRET: "change-me-to-a-long-random-string"
          POSTA_ENCRYPTION_KEY: "change-me-to-a-32-byte-secret!!!"   # exactly 32 bytes
          POSTA_ADMIN_EMAIL: admin@example.com
          POSTA_ADMIN_PASSWORD: "change-me"
        secretEnv:            # these keys are stored encrypted at rest
          - POSTA_DB_PASSWORD
          - POSTA_REDIS_PASSWORD
          - POSTA_JWT_SECRET
          - POSTA_ENCRYPTION_KEY
          - POSTA_ADMIN_PASSWORD
        resources:
          memory: 512Mi
          cpu: "1"

    # The hostname Posta is served on (ownership + default TLS policy). DNS
    # verification is a runtime action after apply.
    - apiVersion: miabi.io/v1
      kind: Domain
      metadata: { name: posta.example.com }
      spec:
        tls: acme                # acme | custom

    # Public HTTPS route for the web UI / API, with automatic Let's Encrypt TLS.
    - apiVersion: miabi.io/v1
      kind: Route
      metadata: { name: posta-web }
      spec:
        hosts: [posta.example.com]
        app: posta
        port: 9000
        tls: acme                # acme | custom | off
```

### Environment interpolation

Notice the `{{ .databases.<name>.* }}` references. In apply and GitOps you can resolve a managed
database's live connection details into an app's environment, so you never hardcode credentials:

```
{{ .databases.<name>.host }}   {{ .databases.<name>.port }}   {{ .databases.<name>.user }}
{{ .databases.<name>.password }}   {{ .databases.<name>.name }}   {{ .databases.<name>.uri }}
```

Keys listed under `secretEnv` are stored **encrypted at rest**. (The `{{ .inputs.* }}` and
`{{ .secrets.* }}` helpers are [marketplace-template](/docs/marketplace/creating-a-template) only —
in raw manifests you provide values directly and mark private ones as `secretEnv`.)

### Apply it

Preview the plan first with a dry run, then converge:

```bash
# Preview — shows what would be created/updated/removed, changes nothing
POST /api/v1/workspaces/{workspace}/apply
{ "manifests": "<the YAML above>", "dry_run": true }

# Converge the workspace to the manifest
POST /api/v1/workspaces/{workspace}/apply
{ "manifests": "<the YAML above>" }
```

Ordering is handled for you: databases come up before the app that references them, and the domain
before its route. After apply, verify the domain's DNS to activate TLS. To keep it in sync, commit
this file to a repository and connect it as a **Git source** — from then on every commit reconciles
the project automatically.

:::tip
Start with `dry_run: true` to read the plan, apply once to bootstrap, then connect the Git source
for continuous reconciliation. The same file drives all three.
:::

## Related

- [Creating a marketplace template](/docs/marketplace/creating-a-template) — the same resources,
  packaged as a versioned, one-click template with user inputs.
- [Pipelines](/docs/cicd/pipelines)
- [Git push deploy](/docs/cicd/git-push-deploy)
