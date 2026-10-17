---
sidebar_position: 1
title: Understanding routes
description: What a route is in Miabi, the fields it is made of, and how Goma Gateway matches a request to one.
---

# Understanding routes

A **route** tells the gateway which requests belong to which application: *requests for
`shop.example.com` under `/api` go to port `8080` of the `api` app, over HTTPS, after a rate limit.*
Every request that reaches an app through the gateway does so because a route matched it.

Routes are served by [Goma Gateway](https://goma.jkaninda.dev), the reverse proxy Miabi runs in front
of your apps. You never write Goma's configuration yourself: you create the route in the console or
in a [manifest](/docs/cicd/manifest-reference#route), and Miabi renders it for the gateway that serves
the app, which picks it up within seconds.

If you are coming from Traefik, Caddy or nginx, a route is roughly a Traefik router plus its service,
a Caddy site block, or an nginx `server` + `location` with a `proxy_pass`. See
[Migrating from Traefik, Caddy and nginx](/docs/routes/migrating).

## What a route is made of

| Field | What it does |
|---|---|
| **Hosts** | The hostnames the route answers, such as `example.com` and `www.example.com`. Each must sit under a [domain](/docs/networking/domains) registered in the workspace. |
| **Path** | The path prefix the route covers. Defaults to `/`, the whole host. |
| **Application** | The app that receives the traffic. A route always points at exactly one app. |
| **Target port** | Which of the app's [declared container ports](/docs/applications/exposing-your-app#first-declare-a-container-port) receives the request. Blank means the app's first port. |
| **Rewrite** | Replaces the matched path prefix before the app sees the request. |
| **Methods** | Restricts the route to some HTTP methods. Blank accepts all. |
| **TLS** | `acme` (an automatic certificate), `custom` (one you [uploaded](/docs/networking/tls-certificates)) or none (plain HTTP). |
| **Middlewares** | The [policies](/docs/middlewares/overview) the request passes through first — auth, rate limits, headers, redirects — in order. |
| **Maintenance** | Parks the route: the gateway answers with your notice and never reaches the app. See [Maintenance mode](/docs/networking/routing-and-middlewares#maintenance-mode). |
| **Exploit protection** | Rejects common injection and traversal signatures at the gateway. See [Route security](/docs/networking/routing-and-middlewares#route-security). |

Notice what a route does **not** contain: a backend address. You point it at an *application*, and
Miabi works out where that app's containers are — on which node, under which network alias, and,
during a [canary rollout](/docs/applications/canary-deployments), how traffic is split between two
releases. Redeploying, scaling or moving the app never requires touching its routes.

## How a request finds its route

The gateway picks a route in two steps:

1. **Host.** Only routes listing the request's hostname are candidates. A hostname no route lists gets
   no answer from your apps.
2. **Path.** Among those, the route with the **longest matching path prefix** wins. The order you
   created routes in does not matter.

So on one host you can split traffic by path:

| Route | Path | App | `/` | `/api/orders` | `/api/admin/users` |
|---|---|---|---|---|---|
| `web` | `/` | `frontend` | ✅ | | |
| `api` | `/api` | `api` | | ✅ | |
| `admin-api` | `/api/admin` | `admin` | | | ✅ |

If a route lists **methods**, a request with another method is not matched by it.

### Rewriting the path

By default the app receives the path exactly as the client sent it. If the `api` app above expects
`/orders` rather than `/api/orders`, set **Rewrite** to `/`:

| Path | Rewrite | Client requests | App receives |
|---|---|---|---|
| `/api` | *(none)* | `/api/orders` | `/api/orders` |
| `/api` | `/` | `/api/orders` | `/orders` |
| `/api` | `/v2/` | `/api/orders` | `/v2/orders` |

This is Traefik's `stripPrefix`, Caddy's `handle_path`, and nginx's `proxy_pass` with a trailing
slash. For anything a prefix swap cannot express, use the
[Rewrite path (regex)](/docs/middlewares/rewrite-regex) middleware.

## TLS and HTTPS redirects

With TLS set to `acme`, the gateway issues a certificate for every host on the route and renews it,
with nothing to configure. The host's DNS must point at the gateway so the certificate authority can
reach it over port 80. Routes on a domain with a wildcard certificate use that instead; see
[TLS certificates](/docs/networking/tls-certificates).

A route answers **both** HTTP and HTTPS. To send plain-HTTP visitors to HTTPS, attach the
**`force-https`** middleware, which every workspace starts with. Put it first in the chain, so the
redirect happens before anything else runs.

## Where routes come from

| Source | How it is made | Editable |
|---|---|---|
| **Console** | **Networking → Routes → New route**, or an app's **Routes** tab | Yes |
| **Manifest** | A `kind: Route` in a manifest, applied with `miabi apply` or synced by [GitOps](/docs/cicd/manifest-reference) | Yes, but the next apply overwrites console edits |
| **External access** | Turning on [one-click external access](/docs/applications/exposing-your-app#method-1--one-click-external-access) for an app port | No — managed by Miabi. Only maintenance can be set. |

All three render the same way and show up in the same list.

## Route status

The route list shows whether the gateway is actually serving each route:

| Status | Meaning |
|---|---|
| **live** | The gateway is serving it. |
| **offline** | Stored but not served, with the reason on the route — most often *domain not verified*. It comes online by itself once the reason is fixed. |
| **maintenance** badge | Live, but answering with the maintenance notice. |

A route on an unverified domain is deliberately kept offline: proving the domain is yours comes
before the gateway answers for it. See [Domains](/docs/networking/domains).

## Next

- **[Creating routes](/docs/routes/creating-routes)** — in the console and in a manifest, side by
  side.
- **[Migrating from Traefik, Caddy and nginx](/docs/routes/migrating)** — translating your existing
  configuration.
