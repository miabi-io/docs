---
sidebar_position: 6
title: Using Traefik instead of Goma
description: Run Miabi behind Traefik as an alternative edge proxy, and the features that require Goma Gateway.
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
routes by Docker labels on the shared `miabi` network. The Miabi panel itself is routed by labels on
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
enforced by Goma's `forwardAuth` middleware: the registry runs auth-less behind the gateway, and Goma
forwards each request to Miabi to validate the Docker credentials (username = workspace name,
password = API key) and scope the repository path to that workspace. Traefik is not wired for that
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

- **Choose Goma (default)** if you want automatic routing, managed wildcard certificates,
  zero-downtime rolling/canary deploys, the built-in registry, or Workspace Analytics. This is the
  recommended path.
- **Choose Traefik** if you already run Traefik as your edge and prefer label-based routing, and you
  can accept manual per-app labels and the Recreate deploy strategy.
