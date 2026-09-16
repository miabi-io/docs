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

A template is a single `template.yaml`. Besides `apiVersion: miabi.io/v1` and `kind: Template`, it
has these top-level sections, all optional except `metadata`:

- **`metadata`** — catalog identity: `name` (the lowercase handle, `^[a-z0-9][a-z0-9-]*$`),
  `displayName`, `version`, description, category, icon, homepage, author, tags, minMiabi. Unknown
  fields are rejected — there is no `slug` key.
- **`inputs`** — the fields the installer prompts for (with validation, defaults, and secret
  generation). Types are `string`, `password`, `bool`, `select` (with `options`), and `number`.
- **`databases`** — managed databases provisioned alongside the app (see
  [below](#databases)).
- **`volumes`** — managed volumes created before the applications start, each just a `name`. An app
  mounts one with `mounts: [{ volume: <name>, path: /data }]`.
- **`configs`** — configuration files created and mounted into the app (see
  [below](#shipping-configuration-files)).
- **`stack`** — shared `env`, `secretEnv`, `description` and `annotations` for a
  [stack](/docs/applications/stacks). A template with more than one application is always installed
  as a stack; declaring `stack` makes a single-app template one too.
- **`applications`** — the app(s) to deploy, with their image, tag, command, env, secretEnv, ports,
  mounts, resources, and healthcheck.

A template must declare at least one application or database. Resources a template creates are named
after the **install**, not the template: installing it as `shop` creates a volume `shop-data` and a
config `shop-provisioning` (with a numeric suffix if the name is taken).

## Databases

Each entry names a database the apps reference, its `engine` (`postgres`, `mysql`, `mariadb`,
`redis`, `mongodb`, or `libsql`), an optional `version` (image tag), and a `placement`:

| Placement | Behaviour |
|---|---|
| `auto` (default) | Reuses a running instance of that engine in the workspace (creating a logical database with its own user on it), otherwise provisions a new one. |
| `dedicated` | Always provisions a new instance for this install. |
| `shared` | Requires an existing instance. Not allowed for `redis` or `libsql`, which host no logical databases. |

Redis and libSQL are always given an instance of their own. The installer shows each database's
placement and lets the user override it, or pick a specific instance.

A database may also set `resources` (`memory` such as `256Mi` or `1Gi`, `cpu` in cores such as
`0.5`) to size its instance. A sized database always gets an instance of its own: `auto` provisions a
new one instead of reusing, and `shared` with `resources` is rejected. When the workspace's plan caps
[database resources](/docs/databases/provisioning#plan-limits), an unsized database gets the engine's
default size.

:::caution Not yet in the public catalog
Miabi accepts `databases[].resources`, but the [marketplace repository](#contributing-to-the-catalog)'s
validator and JSON Schema don't yet. A template that uses it installs fine as a custom import, but
fails `lint` if you contribute it to the catalog. Leave it out of catalog templates for now.
:::

## Template variables

Templates can interpolate three sources into application `env` (and other string fields):

| Reference | Resolves to |
|---|---|
| `{{ .inputs.<key> }}` | A value the user entered (or a generated secret) |
| `{{ .databases.<name>.host \| port \| user \| password \| name \| uri }}` | A provisioned database's live connection details (`url` is an alias of `uri`) |
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
    website: https://goposta.dev
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
    resources:
      memory: 256Mi

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

Mark at most one application `primary: true` — that's the app the catalog links to and the install
surfaces first. A single-application template's app is primary automatically.

:::tip
A template is a packaged version of a [GitOps project](/docs/cicd/gitops). If you already have a
working `Project` manifest, turning it into a template is mostly a matter of replacing hardcoded
values with `{{ .inputs.* }}` fields and adding the `metadata` block.
:::

## Shipping configuration files

Plenty of apps can't be configured through environment variables alone — nginx wants an `nginx.conf`,
Prometheus a `prometheus.yml`, Grafana a provisioning directory. Declare those under `configs` and
mount them from an application, instead of telling users to build a custom image:

```yaml
configs:
  - name: provisioning
    mode: "0644"                 # default octal mode (0644 when omitted)
    sensitive: true              # content carries credentials: keep it out of plans
    delimiters: ["<<", ">>"]     # render on these, so the file's own {{ }} survives
    files:
      datasources/ds.yml: |
        apiVersion: 1
        datasources:
          - name: Postgres
            type: postgres
            url: << .databases.db.host >>:<< .databases.db.port >>
            user: << .databases.db.user >>
            secureJsonData: { password: "<< .databases.db.password >>" }

applications:
  - name: grafana
    primary: true
    image: grafana/grafana
    tag: "11.5.0"
    mounts:
      - config: provisioning                     # the whole set under a directory
        path: /etc/grafana/provisioning
      - config: provisioning                     # or one file, at an exact path
        key: datasources/ds.yml
        path: /etc/grafana/provisioning/datasources/ds.yml
        mode: "0444"
```

| Field | Notes |
|---|---|
| `name` | Unique within the template, lowercase `[a-z0-9-]`. The workspace config is created as `<install>-<name>`, owned by the install. |
| `files` | **Required**, at least one entry. Keys are relative paths (`ds.yml`, `datasources/ds.yml`) — never absolute, never containing `..`. |
| `mode` / `sensitive` / `delimiters` | As in a [`Config` resource](/docs/cicd/manifest-reference#config). `delimiters` takes exactly two distinct, non-empty markers. |

File contents are interpolated with the **same context as `env`** — `{{ .inputs.* }}`,
`{{ .databases.* }}`, `{{ .applications.*.alias }}` — so a config can carry a rendered database
password without a bootstrap script. (Templates address a sibling by its container alias; the richer
`.host` / `.port` / `.url` form is
[manifest-only](/docs/cicd/manifest-reference#addressing-another-application), because a template's
apps are named by the install rather than by the author.) Configs are created and mounted **before** the applications are
deployed, so the files are in place on first boot, and each mount is read-only. Limits are 256 KB per file and 512 KB total; a mount's `key`/`mode` are valid only
with a `config`, never with a `volume`.

See [Configuration files](/docs/secrets/configs) for how they behave once installed — versioning,
redeploy-on-change, and who can read the content.

## Testing your template

Before contributing, install it into a workspace to confirm the inputs, provisioning, and
healthcheck all work:

- In the console, open **Marketplace → Import**, paste the `template.yaml`, and install it from the
  **Custom** tab, walking through the inputs form.
- Or drive the same resources through a one-shot [apply](/docs/cicd/gitops#one-shot-apply) to verify
  the app boots and connects to its databases.

Fix any validation errors the installer reports, and confirm secrets are generated and stored
encrypted.

## Contributing to the catalog

Official and community templates live in the marketplace repository on GitHub:

**[github.com/miabi-io/marketplace](https://github.com/miabi-io/marketplace)**

To contribute a community template:

1. Fork the repository and create `community/<name>/`:

   ```
   community/<name>/
     metadata.yaml            # optional storefront enrichment (featured, screenshots, sourceRepo)
     README.md                # optional long description, shown on the detail page
     <version>/template.yaml  # the install manifest (apiVersion: miabi.io/v1)
   ```

   `<name>` is the template handle. It must equal the manifest's `metadata.name` and be unique across
   `official/` and `community/`; CI enforces both. One `template.yaml` per version directory, and a
   version is immutable once merged. Point your editor's YAML language server at
   `schema/template.schema.json` for inline validation.

2. Validate locally:

   ```bash
   go run ./cmd/marketplace lint            # parse + validate every template, verify digests
   go run ./cmd/marketplace generate-index  # regenerate registry/index.json
   git diff --exit-code registry/index.json # must be clean (CI runs this)
   ```

   Then install it for real through **Marketplace → Import** ([previous section](#testing-your-template)).

3. Open a **pull request**. CI re-runs the validator and the index drift check, and a maintainer
   reviews and merges.

Merging to `main` redeploys the hosted catalog, so the template is live immediately and Miabi
instances pick it up on their next sync, under the **Community** tab. Changes under `official/`
require core-maintainer review; promoting a community template to official is a maintainer-reviewed
folder move. The validator rejects host binds, privileged flags, unknown fields and malformed values,
so keep templates minimal and pin image tags. See the repository's `CONTRIBUTING.md` for details.

:::note
Templates are **versioned and immutable** — publish a new version rather than editing a released one,
so existing installs keep a reproducible definition and users upgrade
[deliberately](/docs/marketplace/using-templates#upgrading-to-a-newer-template-version).
:::
