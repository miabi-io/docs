---
sidebar_position: 3
title: Creating a Template
description: Author a versioned marketplace template with user inputs and managed databases, and contribute it to the official catalog.
---

# Creating a Template

A marketplace template packages an app (and the databases it needs) into a **versioned, one-click
install** with **user inputs**. Templates use the same `miabi.io/v1` engine as
[GitOps manifests](/docs/cicd/gitops) — the difference is the `Template` wrapper, which adds an
`inputs` form and template variables so a user can install without editing YAML.

## Anatomy of a template

A template is a single `template.yaml` with four parts:

- **`metadata`** — catalog identity: `name` (the lowercase handle, `^[a-z0-9][a-z0-9-]*$`),
  `displayName`, version, description, category, icon, homepage, author, tags, minMiabi. Unknown
  fields are rejected — there is no `slug` key.
- **`inputs`** — the fields the installer prompts for (with validation, defaults, and secret
  generation).
- **`databases`** — managed databases provisioned alongside the app.
- **`applications`** — the app(s) to deploy, with their env, ports, and healthcheck.

## Template variables

Templates can interpolate three sources into application `env` (and other string fields):

| Reference | Resolves to |
|---|---|
| `{{ .inputs.<key> }}` | A value the user entered (or a generated secret) |
| `{{ .databases.<name>.host \| port \| user \| password \| name \| uri }}` | A provisioned database's live connection details |
| `{{ .applications.<name>.alias }}` | A sibling application's network alias |

There is **no `.secrets` namespace** in a marketplace template — referencing one is a hard render
error. Template secrets come from `inputs` with `type: password` and `generate: true`. (`.secrets.*`
exists only in raw [GitOps manifests](/docs/cicd/gitops).)

An input with `generate: true` is **auto-generated** if the user leaves it blank (use `length` to
size it) — ideal for JWT secrets and encryption keys.

## Full example

This template deploys [Posta](https://github.com/goposta/posta) — a self-hosted transactional-email
platform — with a managed PostgreSQL database, a dedicated Redis, and five user inputs (two of them
auto-generated secrets):

```yaml
apiVersion: miabi.io/v1
kind: Template
metadata:
  name: posta
  displayName: Posta
  version: 1.0.0
  description: Self-hosted transactional email & SMTP platform — send, receive, and verify email.
  category: Email
  icon: https://github.com/goposta.png
  homepage: https://github.com/goposta/posta
  author:
    name: Jonas Kaninda
    email: me@jkaninda.dev
    website: https://goposta.org
  tags: [email, smtp, transactional, mail, self-hosted]
  minMiabi: "0.5.0"

inputs:
  - key: web_url
    label: Public URL
    help: The public base URL Posta is served on.
    type: string
    required: true
    pattern: "^https?://"
    placeholder: https://posta.example.com
  - key: admin_email
    label: Admin email
    type: string
    required: true
    default: admin@example.com
    pattern: '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  - key: admin_password
    label: Admin password
    type: password
    required: true
  - key: jwt_secret
    label: JWT secret
    help: Signing key for auth tokens. Leave blank to auto-generate.
    type: password
    generate: true
  - key: encryption_key
    label: Encryption key
    help: AES-256-GCM key. Leave blank to auto-generate.
    type: password
    generate: true
    length: 32

databases:
  - name: db
    engine: postgres
    version: "17-alpine"
    placement: auto
  - name: redis
    engine: redis
    version: "8-alpine"
    placement: dedicated

applications:
  - name: posta
    primary: true
    image: jkaninda/posta
    tag: "0.11.0"
    ports:
      - container: 9000
        scheme: http
    env:
      POSTA_ENV: production
      POSTA_WEB_URL: "{{ .inputs.web_url }}"

      # Database (managed PostgreSQL, resolved by placement).
      POSTA_DB_HOST: "{{ .databases.db.host }}"
      POSTA_DB_PORT: "{{ .databases.db.port }}"
      POSTA_DB_USER: "{{ .databases.db.user }}"
      POSTA_DB_PASSWORD: "{{ .databases.db.password }}"
      POSTA_DB_NAME: "{{ .databases.db.name }}"

      # Redis (dedicated managed instance — Miabi sets a password on it).
      POSTA_REDIS_ADDR: "{{ .databases.redis.host }}:{{ .databases.redis.port }}"
      POSTA_REDIS_PASSWORD: "{{ .databases.redis.password }}"

      # Security — from inputs (jwt/encryption auto-generated when blank).
      POSTA_JWT_SECRET: "{{ .inputs.jwt_secret }}"
      POSTA_ENCRYPTION_KEY: "{{ .inputs.encryption_key }}"
      POSTA_ADMIN_EMAIL: "{{ .inputs.admin_email }}"
      POSTA_ADMIN_PASSWORD: "{{ .inputs.admin_password }}"
    secretEnv:            # stored encrypted at rest
      - POSTA_DB_PASSWORD
      - POSTA_REDIS_PASSWORD
      - POSTA_JWT_SECRET
      - POSTA_ENCRYPTION_KEY
      - POSTA_ADMIN_PASSWORD
    healthcheck:
      type: http
      path: /healthz
      port: 9000
      intervalSeconds: 30
      timeoutSeconds: 5
      retries: 3
      startPeriodSeconds: 10
```

Mark exactly one application `primary: true` — that's the app the catalog links to and the install
surfaces first.

:::tip
A template is a packaged version of a [GitOps project](/docs/cicd/gitops). If you already have a
working `Project` manifest, turning it into a template is mostly a matter of replacing hardcoded
values with `{{ .inputs.* }}` fields and adding the `metadata` block.
:::

## Testing your template

Before contributing, install it into a workspace to confirm the inputs, provisioning, and
healthcheck all work:

- Add it as a **custom template** in your workspace (paste the `template.yaml`), then install it and
  walk through the inputs form.
- Or drive the same resources through a one-shot [apply](/docs/cicd/gitops#one-shot-apply) to verify
  the app boots and connects to its databases.

Fix any validation errors the installer reports, and confirm secrets are generated and stored
encrypted.

## Contributing to the catalog

Official and community templates live in the marketplace repository on GitHub:

**[github.com/miabi-io/marketplace](https://github.com/miabi-io/marketplace)**

To contribute a template:

1. Fork the repository.
2. Add your template at `templates/<slug>/<version>/template.yaml` (one directory per version, so
   older versions stay installable).
3. Register it in the catalog `index.yaml` (slug → versions → path + digest).
4. Test the install locally (previous section).
5. Open a **pull request** describing the app and any required inputs.

See the repository's contributing guide for the review checklist, naming conventions, and how digests
are generated. Once merged and synced, your template appears in every Miabi instance's Marketplace
under the **Community** tab.

:::note
Templates are **versioned and immutable** — publish a new version rather than editing a released one,
so existing installs keep a reproducible definition and users upgrade
[deliberately](/docs/marketplace/using-templates#updating-to-a-newer-template-version).
:::
