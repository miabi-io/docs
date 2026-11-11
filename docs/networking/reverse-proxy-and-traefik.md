---
sidebar_position: 6
title: Using Traefik instead of Goma
description: Run Miabi behind Traefik as an alternative edge proxy, the features that require Goma Gateway, and securing the Miabi console route on Goma.
---

# Using Traefik instead of Goma

Miabi ships with **Goma Gateway** as its default edge proxy. Goma is deeply integrated: Miabi
configures routes, TLS, and middlewares for you automatically from the [domains](/docs/networking/domains)
and apps you define (see [Routing & Middlewares](/docs/networking/routing-and-middlewares)).

You can instead run Miabi behind **[Traefik](https://traefik.io/)**, which routes by reading Docker
labels off your containers. This is a supported deployment, but because Miabi's proxy integration is
Goma-native today, a few features work differently — or require Goma. Read this page before choosing
Traefik.

## Deployment

Use the Traefik compose variant shipped in the repository:

```bash
cp .env.example .env    # set MIABI_DOMAIN + secrets
docker compose -f compose.traefik.yaml up -d
```

It replaces the `gateway` (Goma) service with Traefik, which terminates TLS via Let's Encrypt and
routes by Docker labels on the shared `miabi-proxy` network. The Miabi panel itself is routed by labels on
its own service; **your apps get their labels from you** (next section).

## Routing is by manual labels

With Traefik, Miabi does **not** generate routing configuration for your apps — its automatic
Domain/Route management is a Goma feature. To expose an app, add its `traefik.*`
[container labels](/docs/applications/container-labels) yourself under **App → Settings → Container
labels**:

```
traefik.enable                                        = true
traefik.http.routers.<app>.rule                       = Host(`app.example.com`)
traefik.http.routers.<app>.entrypoints                = websecure
traefik.http.routers.<app>.tls.certresolver           = le
traefik.http.services.<app>.loadbalancer.server.port  = 8080
```

Managed **DNS-01 (wildcard) certificates** are likewise a Goma feature. Miabi can still issue them as
workspace Certificates, but they are **inert on Traefik** — Traefik owns TLS entirely and issues its
own ACME certificates, so use its resolver for wildcard domains.

## Features that require Goma Gateway

| Feature | Works on Traefik? | Notes |
|---|---|---|
| Basic app routing | ✅ (manual) | You add `traefik.*` labels per app |
| Automatic domain → route config | ❌ | Goma-only; add labels manually instead |
| One-click external access URLs | ❌ | Generated routes are Goma routes; expose each app with labels |
| Managed DNS-01 / wildcard certs | ❌ | Traefik issues its own certs (ACME) |
| **Rolling deployments** | ❌ | Requires Goma — see below |
| **Canary deployments** | ❌ | Requires Goma — see below |
| **Built-in container registry** | ❌ | Requires Goma — see below |
| **Workspace Analytics** | ❌ | Requires Goma — see below |
| Recreate deployments | ✅ | Use this strategy on Traefik |

### Rolling and canary deployments require Goma

[Rolling and canary](/docs/applications/releases-and-rollbacks) strategies work by **reweighting the
proxy's backends** — shifting traffic from the old release to the new one — which only Miabi's Goma
integration drives. Traefik routes by static per-container labels that Miabi does not reconfigure
mid-deploy.

On a Traefik stack, use the **Recreate** deploy strategy for every app (the container is replaced,
with a brief moment of downtime). If you need zero-downtime rolling or progressive canary releases,
run the default Goma stack.

### The built-in container registry requires Goma

The [built-in container registry](/docs/registry/overview)'s **user/workspace authentication** is
enforced by Goma's `forwardAuth` middleware: Goma forwards each request to Miabi to validate the
Docker credentials (username = workspace name, password = API key) and scope the repository path to
that workspace. Goma also holds the credential the registry itself requires. Traefik is not wired for that
callback, so on a Traefik stack keep the built-in registry **off** (`MIABI_REGISTRY_ENABLED=false`,
the default) and use an external registry (Docker Hub, GHCR, …) instead.

### Workspace Analytics requires Goma

[Workspace Analytics](/docs/operations/analytics) is a rollup of a **per-request event stream that
only Goma publishes**: Goma writes one event per request to a Redis stream, and Miabi's consumer folds
those into minute buckets. Traefik emits no such stream, and there is no fallback — requests to your
apps never pass through the Miabi control plane, so it has nothing of its own to count.

The consequence is absence, not degradation: **every** panel — Traffic, Performance, Web Analytics,
and the live-visitor count — stays empty on a Traefik stack. GeoIP country data is part of the same
pipeline (Goma resolves the country at the edge), so it is unavailable too.

Set `MIABI_ANALYTICS_ENABLED=false` so no consumer runs waiting on a stream nothing writes, and use
Traefik's own [metrics and access logs](https://doc.traefik.io/traefik/observability/metrics/overview/)
for traffic visibility instead.

## Which should I choose?

- **Choose Goma (default)** if you want automatic routing, one-click app URLs, managed wildcard
  certificates, zero-downtime rolling/canary deploys, the built-in registry, or Workspace Analytics.
  This is the recommended path.
- **Choose Traefik** if you already run Traefik as your edge and prefer label-based routing, and you
  can accept manual per-app labels and the Recreate deploy strategy.

## Securing the Miabi console route

On the default Goma stack, the route that serves the Miabi console and API is not managed from the
console: it lives in the gateway's base config, `goma.yml`. The file ships with three opt-in
protections for that route, written out but switched off so a fresh install stays reachable.

| Install | File | Apply a change with |
|---|---|---|
| Stack (`miabi setup`) | `/etc/miabi/goma.yml` | `sudo miabi system restart miabi-gateway` |
| Compose | `goma.yml` beside `compose.yaml` | `docker compose restart gateway` |

Goma does not hot-reload this file, so a restart is required. On a stack install the config is
validated before the gateway is stopped, so a broken edit cannot take it down. Once you edit the
file, upgrades stop replacing it with the shipped default, so later improvements to that default
reach you only if you merge them yourself.

All three protections attach to the `miabi` route under `gateway.routes`, whose `middlewares` list
holds them as commented lines:

```yaml
      middlewares:
        - miabi-https-redirect
        #- miabi-ip-allowlist
        #- miabi-auth-ratelimit
        #- miabi-block-admin
```

### Restrict the console to trusted IPs

1. In the top-level `middlewares` list, replace the example `sourceRanges` of `miabi-ip-allowlist`
   with your office, VPN or admin addresses (IPv4 and IPv6, single hosts or CIDRs).
2. Uncomment `- miabi-ip-allowlist` on the `miabi` route.

Every other address is refused for the whole console and API. Your [nodes](/docs/nodes/cluster-mode)
and runners call the same API, so include their addresses, or move them to a separate control
hostname (below).

### Rate-limit sign-in

Uncomment `- miabi-auth-ratelimit`. It limits only the credential endpoints (sign-in, token sign-in,
password reset and two-factor verification) to 10 requests a minute per client, with a burst of 5,
and bans a client for 15 minutes after repeated violations. Tune the numbers in its `rule`.

:::caution Behind a proxy or CDN
Both of these act on the client IP. If Cloudflare, nginx or a load balancer sits in front of the
gateway, configure the `proxy:` block in the same file first, with `trustedProxies` set, so Goma
sees real client addresses. Otherwise every request appears to come from the proxy: the allowlist
sees one address and all clients share one rate-limit bucket. See
[Goma Gateway 0.14 notes](/docs/upgrades/upgrading#goma-gateway-014--forwarded-headers-are-only-believed-from-a-trusted-proxy).
:::

### Move administration to a separate hostname

You can serve workspaces on the public panel hostname and keep platform administration on a
second, control hostname, the one your nodes and runners dial back on (the install's control URL).
This takes two blocks, enabled together:

1. Uncomment the `miabi-control` route under `gateway.routes` and set its `hosts` to your control
   hostname. It must resolve from your nodes, and from the browsers you administer from. It does not
   have to be public, but a certificate from Let's Encrypt needs a name it can validate from the
   internet; for a private name, serve it over plain HTTP or give it a certificate of your own.
2. Uncomment the `miabi-block-admin` middleware in the top-level `middlewares` list, then
   `- miabi-block-admin` on the `miabi` route.

The panel hostname then answers `404` for `/admin` pages and the `/api/v1/admin/` API, while the
control hostname serves everything.

:::danger Never enable the admin block on its own
The gateway serves only the hostnames its routes name. With `miabi-block-admin` on and no
`miabi-control` route, there is nowhere left to administer the platform from, and the only fix is
editing `goma.yml` on the host. If you only want to limit who reaches administration, the IP
allowlist is the gentler option and needs no second hostname.
:::

The `miabi-control` route is also what you need, on its own, when your control URL is a different
hostname from the panel's: without a route the gateway does not answer on that name at all.
