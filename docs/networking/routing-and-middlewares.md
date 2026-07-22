---
sidebar_position: 4
title: Routing & Middlewares
description: How Goma Gateway routes traffic and how workspace middlewares shape requests.
---

# Routing & Middlewares

All inbound traffic to your apps flows through **Goma Gateway**. Miabi configures Goma
for you from the domains and apps you define — you describe *what* should be reachable,
and Miabi generates the routing.

![Routing and middlewares](/img/screenshots/routing-middlewares.png)

## How routing works

When you attach a verified [domain](/docs/networking/domains) to an
[application](/docs/applications/overview), Miabi **writes a route file into Goma's watched
file-provider directory** (`MIABI_GOMA_PROVIDER_DIR`, default `/etc/goma/providers`) that maps the
hostname to the app's container on the **internal network**. Goma's file provider continuously
watches that directory and hot-reloads the routes; it handles TLS termination (see
[TLS certificates](/docs/networking/tls-certificates)) and forwards the request to the right
container.

Miabi drives Goma **purely through that directory — there is no API endpoint or auth token** between
the two. Miabi writes YAML; Goma watches and reloads it. The gateway's own `goma.yml` supports
`${VAR}` environment-variable substitution (hosts, ACME email, Redis password, …), so a single
`.env` configures both Miabi and the gateway. See [Configuration](/docs/getting-started/configuration).

Because everything goes through Goma, **app and database ports are never published on the
host**. The only public surface is the gateway itself.

## The proxy abstraction

Goma sits behind a **pluggable proxy abstraction**. Miabi talks to a generic reverse-proxy
interface, and Goma is the default implementation. This keeps the door open for other
proxies later without changing how you define domains, routes, or middlewares. See the
[architecture overview](/docs/concepts/architecture) for where the abstraction sits in the
system.

## Workspace middlewares

Workspaces own **middlewares** — reusable request-processing rules you attach to routes.
Common examples:

- **Authentication** — require a login or token before traffic reaches the app.
- **Rate limiting** — cap requests per client to protect a backend.
- **Headers** — add, rewrite, or strip request/response headers (CORS, security headers,
  etc.).
- **Access control** — allow or deny by client IP/CIDR, User-Agent, or **country (GeoIP)**.

Define a middleware once in the workspace, then attach it to one or more routes. Updating
the middleware updates every route that uses it.

### Geo access control

The **Country access policy (GeoIP)** middleware allows or denies requests by the client's
country:

- **Allowlist** (`ALLOW`) — only the listed countries reach the app.
- **Blocklist** (`DENY`) — the listed countries are rejected; everyone else passes.

Countries are [ISO 3166-1 alpha-2](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2) codes
(`US`, `FR`, `DE`, …). Private and internal traffic is never geo-fenced, and when a country
can't be resolved the request is allowed by default (turn off **Allow unknown country** for
fail-closed). You can also inject the resolved country to the backend via a header (e.g.
`X-Country-Code`) for localization.

Geo rules need a **GeoIP database on the gateway**, which Miabi does not install for you:
put a `.mmdb` country database at `/etc/miabi/country.mmdb` and restart the gateway — see
[GeoIP database](/docs/operations/analytics#geoip-database) for where to get one and which
licenses apply. Without it, no request resolves to a country, so **every** geo rule falls
through to the fail-open/closed setting — worth knowing before you rely on one to block
traffic.
See the Goma [Geo Block middleware](https://goma.jkaninda.dev/middlewares/geo-block)
reference for the full rule schema.

:::tip
Stack middlewares to compose behavior — for example, rate limiting *and* an auth check on
the same route. They run in order on each request.
:::

## Edge gateways

Goma also provides a **per-node edge gateway**. In a multi-node deployment each node runs
its own Goma instance handling traffic for the apps scheduled on it, while routing and
middleware definitions remain workspace-level. See [Nodes](/docs/nodes/overview) for how
work is distributed across nodes.

:::note
Routes are generated from your domains and apps — you don't hand-edit Goma config. Manage
behavior through domains, app settings, and workspace middlewares.
:::
