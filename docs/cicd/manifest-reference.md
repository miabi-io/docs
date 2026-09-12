---
sidebar_position: 6
title: Manifest reference
description: Every miabi.io/v1 kind and field accepted by apply and GitOps — Application, Stack, Database, Volume, Secret, Config, Registry, Route, Domain and Project.
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
| [`Config`](#config) | A set of configuration files mounted into apps | 1st |
| [`Registry`](#registry) | A container-registry credential for private images | 2nd |
| [`Middleware`](#middleware) | A gateway policy — rate limit, auth, access rules — routes reference by name | 1st |
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
  placement:                  # where it runs
    location: eu-central      # omit for its stack's, its databases' or the workspace default
    constraints:              # service only, Swarm syntax
      - node.labels.disk==ssd
  deployment:                 # how it runs and rolls out
    runtime: service          # container (default) | service — a replicated Swarm service
    replicas: 3               # service only; omit to keep the current count
    strategy: rolling         # recreate | rolling | canary; omit to keep the app's
    update:                   # service only — how a release rolls out
      parallelism: 1
      delaySeconds: 10
  security:                   # what it may do
    runAsUser: "1000:1000"    # account the container runs as; omit to keep the image's
    readOnlyRootFilesystem: true
    noNewPrivileges: true
    capabilities:
      add: [NET_BIND_SERVICE] # allow-listed grants
      drop: [ALL]             # any Linux capability, or ALL
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
    - config: web-conf        # …or a Config — exactly one of volume/config
      key: nginx.conf         # one file; omit to project the whole set under path
      path: /etc/nginx/nginx.conf
      mode: "0444"
  reloadPolicy: restart       # restart (default) | none — on a mounted config's change
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
| `placement.location` | The [location](/docs/nodes/cluster-mode#locations) the app is created in, by name. Omit it to use its stack's location; else, when every database it references sits in one location, that location; else the workspace default. An app that mounts a volume is created on that volume's node. Fixed once created — see [locations](#locations). |
| `placement.constraints` | Service only. Swarm placement constraints, such as `node.labels.disk==ssd` or `node.role!=manager`, narrowing the nodes of the app's location it runs on. An empty list clears them; omitting the field keeps them. A plan's [node pool](/docs/nodes/cluster-mode#node-pools) still applies on top. |
| `deployment.runtime` | `container` (default) runs one Docker container; `service` runs a replicated Swarm service, which needs a location that runs a swarm — see [cluster mode](/docs/nodes/cluster-mode). Omitted, a new app is a container and an existing app keeps its runtime; stated, a change converges. |
| `deployment.replicas` | Service only, 1–100. Omit it to keep the count the app runs at, so a scale made in the console is not undone. |
| `deployment.strategy` | How a new release replaces the running one: `recreate`, `rolling` (default) or `canary`. **Omit it** to leave whatever the app is configured with in the console. A canary needs a running release to shift traffic against, so the first deploy of an app is always a straight rollout. Canary weights and interval stay console-side — they tune a rollout in flight rather than describing desired state. |
| `deployment.update` | Service only. `parallelism` tasks are replaced at a time, with `delaySeconds` between batches. Omit it to keep the app's setting. Setting `deployment.replicas`, `deployment.update` or `placement.constraints` without `deployment.runtime: service` is an error, not a silent no-op. |
| `externalLabel` | Pins the external-access subdomain. Platform-wide unique: if taken, it is ignored and a generated label is used — the apply still succeeds. |
| `ports` | See [port exposure](#port-exposure). |
| `env` / `secretEnv` | Every `secretEnv` key must also appear in `env`. Values support [interpolation](#interpolation). |
| `mounts` | Exactly one of `volume` or `config`, and both must be declared in the same bundle. `key` and `mode` are valid only with a `config` — setting them on a volume mount is an error, not a silent no-op. A config mount is always read-only. Privileged host binds are **not** manifest-expressible. |
| `reloadPolicy` | `restart` (default) redeploys the app when a mounted [`Config`](#config)'s content changes; `none` leaves it running, for apps that watch their own config file. |
| `security.runAsUser` | The account the container runs as — `uid`, `uid:gid`, `name` or `name:group` — like `docker run --user`. Omit to keep the image's own user. A workspace under the [restricted security profile](/docs/security/container-security-profile) must give a non-root **numeric** uid; a name is refused there, since the image decides what it maps to. Attached volumes are chowned to it on deploy. |
| `security.readOnlyRootFilesystem` | Mounts the container's root filesystem read-only. Volumes stay writable, so an image that writes elsewhere, such as `/tmp`, needs a volume there or it fails to start. One-off jobs keep a writable filesystem. |
| `security.noNewPrivileges` | Stops a process gaining privileges through setuid binaries. The restricted security profile always sets it, so `false` is refused there rather than silently overridden. |
| `security.capabilities` | `add` grants [capabilities](/docs/applications/capabilities-and-devices) from the allow-list, in a privileged workspace; `drop` removes any Linux capability, or `ALL` to keep only what `add` grants. The `CAP_` prefix is optional; a capability both added and dropped is an error. |
| `security.devices` | Host devices exposed to the container — see [capabilities & devices](/docs/applications/capabilities-and-devices). Not allowed on a service. |
| `resources` | Omitted fields mean unlimited / none. |
| `source` | Build the image from Git instead of pulling one — see [Building from source](#building-from-source). Mutually exclusive with `image`. |
| `containerLabels` | Reserved namespaces (`io.miabi.*`, `com.docker.*`) are stripped rather than rejected. See [container labels](/docs/applications/container-labels). |

Every `security` field is the manifest's to state: an omitted one means the container default, so
removing a field from the file converges the app back to it. Hardening layers on top of the
workspace's security profile and can only take more away.

:::note Older spellings
Manifests written before these fields were grouped still apply. Top-level `runAsUser` and `strategy`,
and `security.addCapabilities`, are read as `security.runAsUser`, `deployment.strategy` and
`security.capabilities.add`. Setting an old spelling together with its new one is an error, and an
export always writes the new ones.
:::

### Building from source

An application either **pulls** an image or **builds** one. `source` is the second: point it at a
repository and Miabi builds and deploys it, exactly as an app created from a Git repository in the
console does.

```yaml
kind: Application
metadata: { name: web }
spec:
  source:
    git: https://github.com/acme/web
    ref: main                     # branch, tag or commit; default branch when omitted
    buildMethod: auto             # auto | dockerfile | buildpack
    builder: paketobuildpacks/builder-jammy-base   # buildpack builds only
    buildpacks: [paketo-buildpacks/go]             # buildpack builds only
    buildEnv:                     # available to the BUILD, not the running container
      BP_GO_VERSION: "1.26"
    repository: acme-github       # stored Git credential, for a private repo
  ports: [{ container: 8080 }]
```

`image` and `source` are **mutually exclusive** — a manifest declaring both is refused rather than
having the engine pick one. `buildEnv` is build-time only; variables the running container needs
belong in `env`.

`repository` names a stored Git credential in the workspace. Like `registry`, it is not a declarable
kind: it resolves against credentials that already exist, so a token created once in the console can
be reused across manifests.

:::tip Generate it from an existing app
An application created in the console can be exported as a manifest: **App → Settings → GitOps
manifest → Generate**. It carries the source (or image), ports, environment, resources and the
volumes it mounts — a working starting point for moving an app into Git. Secret values are not
included; each is listed by name under `secretEnv`.
:::

### Port exposure

The two exposure knobs are orthogonal, and a port may use either, both, or neither:

- **`externalAccess: true`** — a public HTTPS URL at `<externalLabel>.<base-domain>`, served through
  the reverse proxy (L7). Requires a platform base domain. For a custom hostname, use a
  [`Route`](#route) instead.
- **`publish: true`** (with optional `hostPort`) — binds the container port to a raw port on the node
  (L4), like `docker -p`. Host ports are bounded by `MIABI_HOST_PORT_MIN`/`MAX` (1024 and up by
  default); omit `hostPort` to auto-allocate one from that window. A **privileged** workspace may
  request any host port (`1`–`65535`), so infrastructure that has to sit on a fixed port — `25`,
  `53`, `443` — can be published from a manifest.

A port with neither is reachable only from inside the app's networks — which is what you want when a
[label-driven proxy](/docs/networking/reverse-proxy-and-traefik) fronts it.

---

## Stack

Groups applications into one logical unit with a shared network, so members resolve each other by
name. Grouping is no longer required just to make one app reachable from another — see
[Addressing another application](#addressing-another-application) — so reach for a Stack when the
apps genuinely belong together, not to solve a hostname.

```yaml
apiVersion: miabi.io/v1
kind: Stack
metadata:
  name: shop
spec:
  description: Storefront — web, worker and its datastores
  placement:
    location: eu-central # optional; the workspace default when omitted
```

Member applications that declare no `placement.location` of their own are created in the stack's location. One
that declares a different location is refused, naming both.

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
  instance: auto        # auto | dedicated | shared
  placement:
    location: eu-central # optional; the workspace default when omitted
```

| `instance` | Behaviour |
|---|---|
| `auto` (default) | Reuse a compatible running instance; provision a dedicated one if none exists. |
| `dedicated` | Always provision a fresh instance. Forced for Redis, which has no logical databases. |
| `shared` | Require an existing compatible instance. Rejected for engines without logical databases. |

`instance` used to be spelled `placement: auto`, before `placement` became a block. That spelling
still parses; setting it together with `instance` is an error.

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
  size: 5Gi              # accepted, but see below
  placement:
    location: eu-central # optional; the workspace default when omitted
```

Volumes are compared by **presence and location only** — an existing volume never shows as drift, since
its attributes are fixed at creation.

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
  symbols: true       # widen the alphabet beyond letters and digits
  minNumbers: 2       # guarantee at least this many digits
  minSpecial: 2       # guarantee at least this many symbols
```

| Field | Default | Meaning |
|---|---|---|
| `length` | `32` | Characters to generate. |
| `symbols` | `false` | Include punctuation (`!#$%&()*+,-./:;<=>?@[]^_{\|}~`). Quotes, backslash and backtick are excluded so a value survives being pasted into a shell, a YAML file or a connection string. |
| `minNumbers` | `0` | Minimum digits. |
| `minSpecial` | `0` | Minimum symbols. Setting it implies `symbols: true`. |

These are the same options the console's [generator](/docs/secrets/overview) exposes, drawing from
the same alphabet — so a policy written here and the same policy set in the UI produce comparable
values. Minimums that exceed `length` are trimmed rather than silently ignored, digits first.

Secret values are **write-only**: never read back, never shown in a plan, and never diffed. An
existing secret is treated as in sync, so a bundle can safely re-apply without churning values.
Rotate through the [vault](/docs/secrets/overview) or the API.

---

## Config

A set of named configuration files, mounted into applications as read-only files — the file-shaped
counterpart to a `Secret`. Content is encrypted at rest and rendered like app `env` before it is
stored. See [Configuration files](/docs/secrets/configs) for the full model.

```yaml
apiVersion: miabi.io/v1
kind: Config
metadata:
  name: prom-conf
spec:
  mode: "0644"                  # default octal mode for every file
  sensitive: false              # keep content out of plans; reveal is admin-only
  delimiters: ["<<", ">>"]      # interpolate on these instead of {{ }}
  data:
    prometheus.yml: |
      global:
        scrape_interval: 15s
    rules/alerts.yml: |
      groups: []
```

| Field | Notes |
|---|---|
| `data` | **Required**, at least one entry. Keys are **relative paths** matching `^[A-Za-z0-9]([A-Za-z0-9._-]*)?(/[A-Za-z0-9._-]+)*$` — no leading `/`, no `..`. Values are [interpolated](#interpolation). |
| `mode` | Default octal file mode, `0644` when omitted. A mount's `mode` overrides it per file. |
| `sensitive` | Content never enters a plan — only the digest and each key's present/absent state. |
| `delimiters` | Exactly two distinct, non-empty markers, replacing `{{ }}` for this config only. Use it for files whose own syntax is `{{ }}` (Prometheus annotations, Grafana dashboards). |

**Limits:** 256 KB per file, 512 KB total. The per-file cap is what matters — in
[cluster mode](/docs/nodes/cluster-mode) each file becomes a Docker config object, and Docker caps
those at 500 KB, so a larger file would validate here and fail at deploy.

Mount it from an [`Application`](#application):

```yaml
mounts:
  - config: prom-conf                # every file under a directory
    path: /etc/prometheus            #   → /etc/prometheus/prometheus.yml, /etc/prometheus/rules/alerts.yml
  - config: prom-conf                # a single file at an exact path
    key: rules/alerts.yml
    path: /etc/prometheus/rules/alerts.yml
    mode: "0444"
```

A content change **redeploys every application mounting the config**, unless that app sets
`reloadPolicy: none`. Deleting a config that is still mounted is refused.

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
  rewrite: /                # replace the matched prefix before the app sees it
  methods: [GET, POST]      # omit to accept every method
  tls: acme                 # acme | custom | off (default acme)
  tlsProvider: internal-ca  # tls: acme only — which certManager provider issues it
  middlewares:              # the gateway chain, IN EXECUTION ORDER
    - api-ratelimit
    - admin-auth
  security:
    exploitProtection: true # reject common injection/traversal signatures at the gateway
  maintenance:              # omit to serve normally
    enabled: true
    statusCode: 503         # 4xx or 5xx; omit for the gateway's 503
    message: Back at 14:00 UTC
```

**`maintenance`** parks the route: the gateway answers every request itself and never reaches the
backend, so the app keeps running while a migration or a deploy happens behind a deliberate
response. Because a manifest is the desired state, **removing the block resumes traffic** — an
apply un-parks a route that was parked by hand in the console. Details, including how the response
is rendered as plain text, JSON, or XML depending on the caller, are in
[Routing & middlewares](/docs/networking/routing-and-middlewares#maintenance-mode).

A parked route still reports its sync status as *live*: the gateway is serving it, it is simply
serving your notice.

### TLS

| `tls` | What it serves |
|---|---|
| `acme` (default) | A certificate the gateway issues and renews itself. `tlsProvider` picks which certManager provider issues it, for an install running more than one — a public ACME issuer and an internal CA, say. Omit it for the gateway's default. |
| `custom` | A certificate you imported. **`certificate: <name>` is required** — it names a stored Certificate in the workspace. |
| `off` | No TLS. The route answers plain HTTP only. |

```yaml
spec:
  hosts: [secure.example.com]
  app: web
  tls: custom
  certificate: example-wildcard   # imported out of band; see below
```

Certificates are **not a declarable kind**, and deliberately so: one carries a private key, which
does not belong in a Git repository. Import it through the console or the certificate API, then name
it here — the same rule [`registry`](#application) follows for a pull credential. A name that matches
nothing in the workspace fails the apply rather than creating a route that claims a hostname and
serves no TLS on it.

The combinations are checked when the manifest is parsed, because either half alone reads as
deliberate and behaves as a mistake: `tls: custom` without a `certificate` cannot serve TLS at all,
and a `certificate` on an `acme` route is silently ignored. Both are refused.

**`rewrite`** replaces the matched path prefix before the request reaches the app, so a route on
`/api` can serve a backend that expects `/`. **`methods`** narrows the route to those HTTP methods;
omitting it accepts every method, and the order does not matter.

**`advancedConfig`** takes raw Goma route YAML and **supersedes the structured fields above**. It is
the escape hatch for a gateway feature the manifest does not model — prefer the fields, because
nothing validates its contents beyond it being YAML without an inline certificate.

:::warning A route in a manifest is fully described by it
These fields are written on every apply, so **omitting one clears it**. A route that had a rewrite
set in the console loses it the first time a manifest that does not mention `rewrite` is applied to
it. That is the desired-state contract, and the same rule `maintenance` follows — but it is worth
knowing before you put an existing route under GitOps. Export or copy its current settings first.
:::

**`middlewares`** is the chain the gateway runs before the request reaches your app, and **the order
is behaviour, not presentation**: listing `api-ratelimit` before `admin-auth` throttles anonymous
requests, while the reverse makes every request authenticate first and rate-limits only those that
got through. Reordering the list is a real change and plans as an update.

A name does **not** have to be declared in the same bundle. One that is missing from it resolves
against the middlewares the workspace already has — including the defaults seeded when the workspace
was created — so a manifest can name `basic-auth` without owning it. A name that matches nothing at
all is refused on apply rather than stored, since a route referencing a middleware that does not
exist would render a broken gateway config.

---

## Middleware

A gateway policy — a rate limit, basic auth, an access policy — that [Routes](#route) reference by
name. It is a resource of its own rather than a block inside a route because one policy is normally
shared: writing the rate limit once and naming it from five routes is the point, and inlining it
would leave five copies to keep in step.

```yaml
apiVersion: miabi.io/v1
kind: Middleware
metadata:
  name: api-ratelimit
spec:
  type: rateLimit           # the gateway's middleware type
  paths: ["/api"]           # optional: narrow it to these request paths
  rule:                     # the type's own configuration, passed to the gateway
    unit: minute
    requestsPerUnit: 60
    burst: 10
---
apiVersion: miabi.io/v1
kind: Middleware
metadata:
  name: admin-auth
spec:
  type: basicAuth
  rule:
    realm: Admin
    users:
      - username: ops
        password: "{{ .secrets.ops_password }}"   # a vault reference, not a literal
```

**`rule` is free-form on purpose.** The shape belongs to the middleware type, and the gateway's own
catalogue owns it — validating it a second time here would be a copy that drifts the moment the
catalogue gains a field. A malformed rule is refused when you apply, naming the field at fault. The
[middleware reference](/docs/middlewares/overview) documents every type and its rule.

**Secrets in a rule are interpolated and then encrypted at rest.** Write `{{ .secrets.name }}`
rather than a literal password, so the credential lives in the vault and the manifest is safe to
commit. They are never read back: a plan shows a rule change as `rule (current) → (changed)`, never
the value. Rotating the secret behind the reference still converges — the engine compares a
fingerprint of the *rendered* rule, so a change nothing else can see is still a change.

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

Application `env` values, a Registry `password`, a Middleware `rule`, and a Config's file contents
are rendered as templates before they are applied. Four collections are available:

| Reference | Resolves to |
|---|---|
| `{{ .databases.<name>.host }}` | A managed database's connection details. Also `.port`, `.user`, `.password`, `.name`, `.uri` (or its alias `.url`). Bare `{{ .databases.<name> }}` yields the URI. |
| `{{ .applications.<name>.url }}` | Another application's address. Also `.host`, `.port`, `.scheme`. Bare `{{ .applications.<name> }}` yields the URL. |
| `{{ .secrets.<name> }}` | A workspace secret's value, resolved **at apply time**. |
| `{{ .inputs.<key> }}` | Marketplace templates only — see [creating a template](/docs/marketplace/creating-a-template). |

Helper functions: `randAlphaNum`, `randHex`, `base64`, `default`, `lower`, `upper`.

An unresolvable reference is a **hard error**, never a silently empty value. Names containing hyphens
work (`{{ .databases.shop-db.uri }}`).

### Addressing another application

An application is reachable from its siblings at **its own name**. Miabi registers that name as a DNS
alias on every network the workspace owns, so the value you write in the manifest is the value that
resolves at runtime:

```yaml
kind: Application
metadata: { name: api }
spec:
  image: ghcr.io/acme/api
  ports: [{ container: 8080 }]
---
kind: Application
metadata: { name: web }
spec:
  image: ghcr.io/acme/web
  env:
    API_URL: "{{ .applications.api }}"          # http://api:8080
    API_HOST: "{{ .applications.api.host }}"    # api
    API_PORT: "{{ .applications.api.port }}"    # 8080
```

`.port` and `.scheme` come from the referenced app's **first declared port**. The target need not be
in the same bundle — one already in the workspace resolves too — and declaration order does not
matter, because the address is the name, not something minted at creation.

`.alias` also resolves, to the container's exact identity (`mb-app-<token>-<id>`). Prefer `.host`:
the alias changes if the app is recreated, and means nothing to a human reading the environment.

:::warning Both apps must be able to reach each other
Private networks don't span [locations](#locations), and inside a location a workspace network is a
**node-local bridge** unless that location runs a swarm. So the name will not resolve when the two
apps sit in different locations, or on different nodes of a location without a swarm. Apply refuses
such a reference outright, naming both sides, rather than letting it fail as a connection error
later. In a location that runs a swarm the network is an overlay spanning its nodes, and the
reference is fine.

An application that has **not been deployed since Miabi 1.10** does not answer to its name yet —
aliases are set when a container is created. Redeploy the target once and it does.
:::

Apps in the same [`Stack`](#stack) additionally resolve each other by name on the stack network,
which is unchanged.

A [`Config`](#config) whose own file format uses `{{ }}` sets `delimiters` to render on different
markers, so only the references you meant are substituted.

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
the `security` block, and per-port exposure (`externalAccess` / `publish` as present-or-not).

**Diffed only when stated** — `deployment` (runtime, replicas, strategy, update) and `placement`
(location, constraints). A manifest silent about them leaves what the console set alone.

**Not diffed** — create-time structure that cannot be mapped back unambiguously: ports themselves,
mounts, and stack membership. Change one and the resource is updated on the next apply that touches
it for another reason; recreate it to be certain.

Mounts aren't diffed, but a mounted config's *content* still converges: each app carries a
fingerprint of every config it mounts, so editing a file plans as an update of the app itself. An app
with `reloadPolicy: none` carries no fingerprint, which is how that policy is honoured.

**Never diffed** — secret values, and the `secretEnv` values in a plan (shown as `(secret)`). A
registry password is compared through a fingerprint, so a rotation converges without the plan
carrying anything derived from the token. A `Middleware`'s `rule` works the same way: its
fingerprint covers the rendered rule, secrets included, and the plan reports only
`rule (current) → (changed)`.

**Diffed, but never echoed** — a `Config`'s files. The plan compares the content digest and reports
each changed key as `(absent)` → `(present)`, so you can see *which* file changed without its content
landing in a log. A `sensitive: true` config reports the digest alone.

The auto-allocated host port and the generated external-access subdomain are live state, not
manifest state — they are compared by presence, so they are never churned.

### Locations

`placement.location` on an `Application`, `Stack`, `Database` or `Volume` is compared only when the manifest
states it, so a manifest without one never drifts. A resource is never moved: a different location
fails the apply — delete the resource and apply again.

A new application that names no location follows what it depends on: its stack's location, else the
node of a volume it mounts, else the location every database it references sits in, else the
workspace default. An app deployed next to its database needs no `location` of its own.

Locations are checked when the plan is built, before anything in the bundle is applied. An unknown
location, one the workspace's plan does not allow, a cordoned one, a `deployment.runtime: service` app in a
location that runs no swarm, or an app declared in a different location from its stack fails the
whole apply. Resources that already exist are not re-checked.

Private networks don't span locations, so an app that references an application or database in
another location through [interpolation](#interpolation), or mounts a volume there, is refused with
a message naming both.

A location restricted to platform admins takes an apply only from a platform admin. A GitOps sync acts
on nobody's behalf, so it never creates anything there; resources already in such a location still
converge.

Exporting an application leaves out its location when that is the workspace default, so the bundle
applies unchanged in another workspace.

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
