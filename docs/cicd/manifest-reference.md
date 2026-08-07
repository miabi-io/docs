---
sidebar_position: 6
title: Manifest reference
description: Every miabi.io/v1 kind and field accepted by apply and GitOps — Application, Stack, Database, Volume, Secret, Registry, Route, Domain and Project.
---

# Manifest reference

Every resource Miabi can manage declaratively, and every field its `spec` accepts. One schema drives
all four consumers: the [apply API](/docs/cicd/gitops#one-shot-apply), [GitOps
reconciliation](/docs/cicd/gitops), the [`miabi` CLI](/docs/cicd/cli), and the Terraform provider.

Manifests are **strictly parsed** — an unknown key is an error, not a silently ignored typo.

## Document shape

Every document has the same four top-level keys:

```yaml
apiVersion: miabi.io/v1     # the only accepted value
kind: Application           # see the kinds below
metadata:
  name: web                 # identity, unique per kind within the workspace
spec: {}                    # kind-specific
```

A file may hold many documents separated by `---`, and a Git source may spread them over many files
in a directory — they are all parsed into one bundle.

The **workspace is not in the manifest**. It comes from the target you apply to, so the same file
deploys to staging and production unchanged.

### metadata

| Field | Type | Description |
|---|---|---|
| `name` | string | **Required.** Lowercase `[a-z0-9-]`, starting alphanumeric. For a `Domain` it is a real hostname instead (`shop.example.com`). |
| `uid` | string | The resource's portable Miabi uid. Written on export; matched ahead of `name`, so renaming a resource in the manifest updates it instead of replacing it. Omit in hand-written manifests. |
| `labels` | map | Short identifying key/values for selection and grouping. Keys and values follow the Kubernetes rules (optional `prefix/`, max 63 chars). Reserved `miabi.io/` keys are stripped. |
| `annotations` | map | Free-form descriptive metadata — owners, links, tooling hints. Keys are validated; **values are arbitrary text**. |

## Kinds at a glance

| Kind | What it is | Applied |
|---|---|---|
| [`Application`](#application) | A long-running container workload | 3rd |
| [`Stack`](#stack) | Groups applications into one unit and network | 2nd |
| [`Database`](#database) | A managed Postgres / MySQL / MariaDB / Redis database | 2nd |
| [`Volume`](#volume) | Persistent storage | 1st |
| [`Secret`](#secret) | A named encrypted value | 1st |
| [`Registry`](#registry) | A container-registry credential for private images | 2nd |
| [`Route`](#route) | An HTTP routing rule (host/path → app:port + TLS) | 4th |
| [`Domain`](#domain) | An owned hostname and its default TLS policy | 1st |
| [`Project`](#project) | Bundles the resources above into one unit | — |

Ordering is automatic: dependencies are created before their dependants and torn down after them, so
a bundle that creates a database and the app using it converges in a single apply.

---

## Application

A long-running container workload.

```yaml
apiVersion: miabi.io/v1
kind: Application
metadata:
  name: web
spec:
  image: ghcr.io/acme/web
  tag: "1.4.0"
  digest: sha256:…            # immutable pin; wins over tag
  registry: ghcr              # credential for a private image
  command: ["server", "--port=8080"]
  stack: shop                 # join a Stack (must be declared in the bundle)
  externalLabel: shop         # pins the public URL to shop.<base-domain>
  ports:
    - container: 8080
      scheme: http            # http | https (default http) — how the proxy talks to it
      protocol: tcp           # tcp | udp (default tcp)
      externalAccess: true    # public HTTPS URL through the reverse proxy
    - container: 9090
      publish: true           # bind to a host port, like `docker -p`
      hostPort: 19090         # omit or 0 to auto-allocate
  env:
    APP_ENV: production
    DATABASE_URL: "{{ .databases.shop-db.uri }}"
  secretEnv:                  # env keys stored encrypted at rest
    - DATABASE_URL
  mounts:
    - volume: web-data        # must be a Volume in the same bundle
      path: /data
      readOnly: false
  resources:
    memory: 512Mi             # Ki/Mi/Gi; empty = unlimited
    cpu: "0.5"                # cores; empty = unlimited
    gpu: 1                    # whole GPU devices
    gpuKind: nvidia           # narrow to a vendor/model
  containerLabels:            # stamped on the container for label-reading tools
    traefik.enable: "true"
```

| Field | Notes |
|---|---|
| `image` | **Required.** Repository without a tag, e.g. `ghcr.io/acme/web`. |
| `tag` | Defaults to `latest` when composing the pull reference. |
| `digest` | A `sha256:…` pin. CI writes it; GitOps converges the runtime to it. |
| `registry` | Names a [`Registry`](#registry) credential. It need not be declared in the same bundle — an undeclared name resolves against the workspace's existing credentials. An unknown name is an error, not a silent anonymous pull. |
| `command` | Overrides the image's command (argv form). |
| `stack` | Must name a [`Stack`](#stack) **in the same bundle**. Members share a network and resolve each other by name. |
| `externalLabel` | Pins the external-access subdomain. Platform-wide unique: if taken, it is ignored and a generated label is used — the apply still succeeds. |
| `ports` | See [port exposure](#port-exposure). |
| `env` / `secretEnv` | Every `secretEnv` key must also appear in `env`. Values support [interpolation](#interpolation). |
| `mounts` | `volume` must name a [`Volume`](#volume) in the same bundle. Privileged host binds are **not** manifest-expressible. |
| `resources` | Omitted fields mean unlimited / none. |
| `containerLabels` | Reserved namespaces (`io.miabi.*`, `com.docker.*`) are stripped rather than rejected. See [container labels](/docs/applications/container-labels). |

### Port exposure

The two exposure knobs are orthogonal, and a port may use either, both, or neither:

- **`externalAccess: true`** — a public HTTPS URL at `<externalLabel>.<base-domain>`, served through
  the reverse proxy (L7). Requires a platform base domain. For a custom hostname, use a
  [`Route`](#route) instead.
- **`publish: true`** (with optional `hostPort`) — binds the container port to a raw port on the node
  (L4), like `docker -p`. Host ports are bounded by `MIABI_HOST_PORT_MIN`/`MAX` (1024 and up by
  default); omit `hostPort` to auto-allocate.

A port with neither is reachable only from inside the app's networks — which is what you want when a
[label-driven proxy](/docs/networking/reverse-proxy-and-traefik) fronts it.

---

## Stack

Groups applications into one logical unit with a shared network, so members resolve each other by
name.

```yaml
apiVersion: miabi.io/v1
kind: Stack
metadata:
  name: shop
spec:
  description: Storefront — web, worker and its datastores
```

---

## Database

Requests a managed database. Miabi provisions the instance, or reuses a compatible one, and creates a
dedicated logical database with its own credentials.

```yaml
apiVersion: miabi.io/v1
kind: Database
metadata:
  name: shop-db
spec:
  engine: postgres      # postgres | mysql | mariadb | redis
  version: "17-alpine"
  placement: auto       # auto | dedicated | shared
```

| `placement` | Behaviour |
|---|---|
| `auto` (default) | Reuse a compatible running instance; provision a dedicated one if none exists. |
| `dedicated` | Always provision a fresh instance. Forced for Redis, which has no logical databases. |
| `shared` | Require an existing compatible instance. Rejected for engines without logical databases. |

Reference the result from an app's env with `{{ .databases.shop-db.* }}` — see
[interpolation](#interpolation). The database is also attached to the app that references it, so it
appears under that app with its scoped connection revealable there.

:::warning
Engine and version changes are **not** converged in place — that would recreate the data. Such a
change fails the apply rather than destroying the database; migrate with a
[version upgrade](/docs/databases/version-upgrades) instead.
:::

---

## Volume

Persistent storage, mounted into an application through its `mounts`.

```yaml
apiVersion: miabi.io/v1
kind: Volume
metadata:
  name: web-data
spec:
  size: 5Gi     # accepted, but see below
```

Volumes are compared by **presence only** — an existing volume never shows as drift, since its
attributes are fixed at creation.

:::caution
`spec.size` is accepted by the parser but **not currently applied**: a volume created from a manifest
is always unbounded. Set a size through the console or the API if you need one recorded for quota.
:::

Shared (NFS/CIFS) and host-path volumes, and placement on a specific node, are not
manifest-expressible — create those through the API or console.

---

## Secret

A named encrypted value, referenced from app env and from credentials.

```yaml
apiVersion: miabi.io/v1
kind: Secret
metadata:
  name: app-key
spec:
  value: "s3cr3t"     # or:
  generate: true      # let Miabi generate a strong random value
  length: 48          # generated length (default 32)
```

Secret values are **write-only**: never read back, never shown in a plan, and never diffed. An
existing secret is treated as in sync, so a bundle can safely re-apply without churning values.
Rotate through the [vault](/docs/secrets/overview) or the API.

---

## Registry

A container-registry credential for pulling private images. Applications select one by name through
`spec.registry`.

```yaml
apiVersion: miabi.io/v1
kind: Registry
metadata:
  name: ghcr
spec:
  server: ghcr.io                       # omit for Docker Hub; host[:port], no scheme
  username: acme
  password: "${{ secrets.GHCR_TOKEN }}" # or {{ .secrets.ghcr-token }} — see below
```

Two ways to supply the password, and the difference is **when it is read**:

| Form | Behaviour |
|---|---|
| `${{ secrets.NAME }}` | Stored as a live **reference**. The value is read from the vault at every pull, so rotating that secret rotates the credential with no re-apply. |
| `{{ .secrets.name }}` | Rendered at apply time into a stored **copy**. Rotating the secret needs another apply, which then reports `password: (current) → (rotated)`. |
| A literal | Stored encrypted. Avoid in a repository. |

Omitting `password` entirely is valid on an *existing* credential — the stored value is kept, so a
token can be managed out-of-band while the rest stays declarative. Creating one with no password
fails.

The password is never read back and never appears in a plan; a rotation is reported through an
unreadable fingerprint. Deleting a credential leaves apps running — they fall back to anonymous pulls.

---

## Route

An HTTP routing rule: hostnames (and an optional path) to an application's port, with a TLS mode.

```yaml
apiVersion: miabi.io/v1
kind: Route
metadata:
  name: shop-web
spec:
  hosts:                    # one route can answer on several hostnames
    - example.com
    - www.example.com
  app: web                  # must be an Application in the same bundle
  port: 8080
  path: /                   # default /
  tls: acme                 # acme | custom | off (default acme)
```

---

## Domain

An owned hostname or zone: the default TLS policy routes under it inherit, and whether a wildcard
certificate covers `*.name`. The hostname is `metadata.name`.

```yaml
apiVersion: miabi.io/v1
kind: Domain
metadata:
  name: example.com
spec:
  tls: acme          # acme | custom (default acme)
  wildcard: true     # also cover *.example.com (needs a DNS provider)
```

DNS-ownership verification is a runtime action, not a declarable field: a freshly applied domain
starts unverified, and you verify it after apply. Domains carry no ownership label, so a
[prune](#prune) never deletes one.

---

## Project

Bundles resources authored in one place. Children may be inlined under `spec.resources`; the parser
flattens them into the document set, so a Project is organisational — it is never itself created,
updated or pruned.

```yaml
apiVersion: miabi.io/v1
kind: Project
metadata:
  name: shop
spec:
  description: Storefront and its dependencies
  resources:
    - apiVersion: miabi.io/v1
      kind: Volume
      metadata: { name: web-data }
      spec: { size: 5Gi }
    - apiVersion: miabi.io/v1
      kind: Application
      metadata: { name: web }
      spec:
        image: ghcr.io/acme/web
        mounts:
          - volume: web-data
            path: /data
```

---

## Interpolation

Application `env` values and a Registry `password` are rendered as templates before they are applied.
Four collections are available:

| Reference | Resolves to |
|---|---|
| `{{ .databases.<name>.host }}` | A managed database's connection details. Also `.port`, `.user`, `.password`, `.name`, `.uri`. Bare `{{ .databases.<name> }}` yields the URI. |
| `{{ .secrets.<name> }}` | A workspace secret's value, resolved **at apply time**. |
| `{{ .inputs.<key> }}` | Marketplace templates only — see [creating a template](/docs/marketplace/creating-a-template). |

Helper functions: `randAlphaNum`, `randHex`, `base64`, `default`, `lower`, `upper`.

An unresolvable reference is a **hard error**, never a silently empty value. Names containing hyphens
work (`{{ .databases.shop-db.uri }}`).

To address another application, put both in the same [`Stack`](#stack) and use its name as the
hostname — stack members resolve each other by name on the stack network. (`{{ .applications.* }}`
appears in the template grammar but is not resolvable in apply or GitOps.)

:::tip Two secret syntaxes
`{{ .secrets.NAME }}` is resolved once, at apply time, and the value is stored. `${{ secrets.NAME }}`
— the runtime form used in [env vars](/docs/applications/environment-variables) and credentials — is
stored as a reference and resolved at every deploy, so rotating the secret takes effect without a
re-apply.
:::

---

## What converges, and what doesn't

The plan compares desired state against a live snapshot. Not every field participates, so a converged
resource never shows phantom drift:

**Diffed** — image, tag, digest, command, registry, resource caps, non-secret env, container labels,
and per-port exposure (`externalAccess` / `publish` as present-or-not).

**Not diffed** — create-time structure that cannot be mapped back unambiguously: ports themselves,
mounts, and stack membership. Change one and the resource is updated on the next apply that touches
it for another reason; recreate it to be certain.

**Never diffed** — secret values, and the `secretEnv` values in a plan (shown as `(secret)`). A
registry password is compared through a fingerprint, so a rotation converges without the plan
carrying anything derived from the token.

The auto-allocated host port and the generated external-access subdomain are live state, not
manifest state — they are compared by presence, so they are never churned.

## Prune

By default, apply and GitOps only create and update: a resource removed from the manifest is left
running. Opt into **prune** to have removals converge too.

Prune only ever deletes resources this engine created (labelled `managed-by: gitops`), so a
hand-created app or a database provisioned in the console can never be removed by a manifest. Under
GitOps it is scoped further, to the project that owns the resource — two sources backed by the same
repository don't see each other's apps as orphans.

:::warning
An empty manifest set with prune enabled would delete everything the source owns. Miabi refuses it
unless the source explicitly sets **Allow empty**, so a wiped directory or a wrong path can't tear
down a workspace.
:::

## Applying

```bash
miabi apply -f stack.yaml --dry-run     # print the plan, change nothing
miabi apply -f stack.yaml               # converge
miabi apply -f stack.yaml --prune       # converge, and remove what's gone
miabi delete -f stack.yaml              # delete exactly what the bundle names
```

Or over HTTP:

```http
POST /api/v1/workspaces/{workspace}/apply
{ "manifests": "<YAML>", "prune": false, "dry_run": true, "delete": false }
```

`delete` is the inverse of apply: it removes exactly the resources the bundle names, regardless of
which subsystem owns them, and ignores entries that don't exist. It honours `dry_run`.

## Related

- [GitOps](/docs/cicd/gitops) — continuous reconciliation from a Git source.
- [CLI](/docs/cicd/cli) — `miabi apply`, `miabi delete`, and the rest.
- [Creating a marketplace template](/docs/marketplace/creating-a-template) — the same resources,
  packaged with user inputs.
