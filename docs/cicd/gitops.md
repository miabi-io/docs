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

Nine kinds are available — `Application`, `Stack`, `Database`, `Volume`, `Secret`, `Registry`,
`Route`, `Domain` and `Project`. The [manifest reference](/docs/cicd/manifest-reference) documents
every field of each; this page covers how they are reconciled.

Ordering is automatic. Dependencies are created before their dependants and torn down after them, so
one bundle can declare a volume, a database, the app that uses both, and the route in front of it,
and converge in a single pass.

## Pull-based reconciliation

In the pull model, you connect a **Git source** (a repository and path holding your manifests). Miabi then **continuously reconciles** desired state from that source:

1. Miabi watches the Git source for changes.
2. On each sync, it compares the manifests against the live state of your resources.
3. It applies whatever changes are needed to converge — creating, updating, or removing resources to match.

This makes Git your single source of truth and your audit log: a commit is a change request, and reverting a commit reverts the cluster. Drift introduced outside Git is reconciled back toward the declared state on the next sync.

:::tip
Keep your manifests in their own repository or a dedicated directory, and protect it with reviews. Every merged change becomes a tracked, revertible deployment.
:::

### Source options

A Git source points at a repository, a **ref** (branch, tag or commit) and a **path** (the
subdirectory holding the manifests — every `.yaml`/`.yml` file under it is parsed into one bundle).
Four switches decide how far reconciliation goes:

| Option | Default | Effect |
|---|---|---|
| **Sync policy** | `manual` | `auto` reconciles on every detected change; `manual` syncs only when you ask. |
| **Prune** | off | Delete managed resources that disappear from Git. Without it, removals are ignored. |
| **Self-heal** | off | Re-apply when live state drifts from Git, not only when Git changes. |
| **Allow empty** | off | Permit a manifest set with no resources to prune everything the source owns. |

Prune only ever deletes resources this engine created, and only those owned by *this* source — so a
hand-created app, a console-provisioned database, or a sibling project's resources can never be
removed by your manifests. A missing path is always an error rather than an empty desired state, so a
wrong path can't be read as "delete everything".

:::warning
An empty manifest set with prune enabled is refused unless **Allow empty** is set. That is the guard
that stops a wiped directory from tearing down a workspace.
:::

Deleting a source can optionally cascade, tearing down exactly the resources that source created and
leaving everything else untouched.

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

    # Miabi generates these on the first apply and stores them encrypted — the
    # values never appear in this file or in Git. They are created before the
    # app that references them, and left untouched on every later apply, so
    # re-applying never rotates a running deployment's keys or locks you out.
    - apiVersion: miabi.io/v1
      kind: Secret
      metadata: { name: posta-jwt }
      spec:
        generate: true
        length: 48
    - apiVersion: miabi.io/v1
      kind: Secret
      metadata: { name: posta-encryption-key }
      spec:
        generate: true
        length: 32               # Posta requires exactly 32 bytes
    - apiVersion: miabi.io/v1
      kind: Secret
      metadata: { name: posta-admin-password }
      spec:
        generate: true
        length: 24               # reveal it in the vault to sign in the first time

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

          # Security — resolved from the generated secrets above, so nothing
          # sensitive is written here.
          POSTA_JWT_SECRET: "{{ .secrets.posta-jwt }}"
          POSTA_ENCRYPTION_KEY: "{{ .secrets.posta-encryption-key }}"

          # The first admin account. Set the email to yours; the password is
          # generated — reveal it once from the vault to sign in.
          POSTA_ADMIN_EMAIL: admin@example.com
          POSTA_ADMIN_PASSWORD: "{{ .secrets.posta-admin-password }}"
        secretEnv:            # these keys are stored encrypted at rest
          - POSTA_DB_PASSWORD
          - POSTA_REDIS_PASSWORD
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

Keys listed under `secretEnv` are stored **encrypted at rest**.

You can also pull values from the [secret vault](/docs/secrets/overview) rather than writing them
into the file — `{{ .secrets.<name> }}` resolves at apply time, and a `Secret` declared in the same
bundle is created first, so a bundle can generate its own credentials:

```yaml
- apiVersion: miabi.io/v1
  kind: Secret
  metadata: { name: posta-jwt }
  spec:
    generate: true        # Miabi generates a strong value; it never appears in the file
    length: 48
# …then, in the application's env:
#   POSTA_JWT_SECRET: "{{ .secrets.posta-jwt }}"
```

(`{{ .inputs.* }}` is [marketplace-template](/docs/marketplace/creating-a-template) only.)

### Apply it

Preview the plan first with a dry run, then converge:

```bash
miabi apply -f posta.yaml --dry-run   # print the plan; change nothing
miabi apply -f posta.yaml             # converge the workspace to it
miabi apply -f posta.yaml --prune     # …and remove managed resources no longer declared
miabi delete -f posta.yaml            # the inverse: delete exactly what the bundle names
```

Or over HTTP:

```http
POST /api/v1/workspaces/{workspace}/apply
{ "manifests": "<the YAML above>", "dry_run": true, "prune": false, "delete": false }
```

Ordering is handled for you: databases come up before the app that references them, and the domain
before its route. After apply, verify the domain's DNS to activate TLS. To keep it in sync, commit
this file to a repository and connect it as a **Git source** — from then on every commit reconciles
the project automatically.

:::tip
Start with `dry_run: true` to read the plan, apply once to bootstrap, then connect the Git source
for continuous reconciliation. The same file drives all three.
:::

## What converges

The plan compares the manifest against a live snapshot, and only fields that can be mapped back
unambiguously take part — so a converged resource never shows phantom drift:

- **Diffed:** image, tag, digest, registry credential, command, resource caps, non-secret env,
  container labels, and per-port exposure.
- **Not diffed:** create-time structure — the ports themselves, mounts, and stack membership.
- **Never diffed:** secret values (an existing `Secret` is always in sync), and `secretEnv` values,
  which appear in a plan as `(secret)`.

The [manifest reference](/docs/cicd/manifest-reference#what-converges-and-what-doesnt) covers this
per kind.

## Related

- [Manifest reference](/docs/cicd/manifest-reference) — every kind and field.
- [Creating a marketplace template](/docs/marketplace/creating-a-template) — the same resources,
  packaged as a versioned, one-click template with user inputs.
- [Pipelines](/docs/cicd/pipelines)
- [Git push deploy](/docs/cicd/git-push-deploy)
