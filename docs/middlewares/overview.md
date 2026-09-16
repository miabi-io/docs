---
sidebar_position: 1
title: Using middlewares
description: What a middleware is in Miabi, how to attach one to a route, why the order matters, and how secret fields are handled.
---

# Using middlewares

A **middleware** is a reusable rule that runs against a request before it reaches your application:
require a login, cap the request rate, add a header, block a country. You define it once in a
workspace and attach it to as many routes as you like — editing it updates every route that uses it.

Middlewares are executed by [Goma Gateway](https://goma.jkaninda.dev), the reverse proxy in front of
your apps. Miabi gives each curated type a form, validates it on save, and encrypts any field that
holds a credential. See **[All middlewares](/docs/middlewares/reference)** for the full list and every
field of each.

## Creating and attaching one

1. **Networking → Middlewares → New** — pick a type and fill in its form. Some types ship with a
   **preset** (a basic-auth login, a sensible rate limit, an SSO policy) that fills the form in for
   you; adjust and save.
2. **Networking → Routes → the route → Middlewares** — attach it.

A middleware belongs to the workspace, not to a route, so the same rate limit can guard a dozen
routes and be tuned in one place.

### Or declare it

Middlewares are a [declarative resource](/docs/cicd/manifest-reference#middleware), so the same
policy can live in Git and be applied with the rest of a stack:

```yaml
apiVersion: miabi.io/v1
kind: Middleware
metadata: { name: api-ratelimit }
spec:
  type: rateLimit
  paths: ["/api"]
  rule: { unit: minute, requestsPerUnit: 60 }
---
apiVersion: miabi.io/v1
kind: Route
metadata: { name: web }
spec:
  hosts: [app.example.com]
  app: web
  middlewares: [api-ratelimit]     # the chain, in execution order
```

A route may name a middleware it does not declare — one created here in the console, or seeded with
the workspace — so adopting the declarative form is incremental. Credentials inside a `rule` should
be `{{ .secrets.name }}` references rather than literals; see
[Secret fields](#secret-fields) below.

## Order matters

A route's middlewares run **in the order they are listed**, and any one of them can answer or reject
a request before the next is reached. The order is behaviour, not presentation:

```yaml
middlewares: ["rate-limit", "basic-auth"]   # throttle first, then authenticate
middlewares: ["basic-auth", "rate-limit"]   # authenticate first, then throttle
```

In the first, an anonymous flood is rejected by the rate limiter before it reaches the auth check —
the cheap filter runs first, which is usually what you want. In the second, every request is
authenticated before the limiter sees it, so the limiter counts only credentialed traffic and
unauthenticated floods still pay for the auth work.

Reorder on the route's page: each entry is numbered by execution position, with arrows to move it.
Nothing is sent until you press **Save order**, so a multi-step rearrangement reaches the gateway as
one change rather than one reload per move.

## Paths

Most middlewares take a `paths` list deciding which requests they apply to. Leave it empty and the
middleware applies to the whole route.

Patterns are **regular expressions**, matched **case-insensitively**. Where a pattern may match
depends on the gateway version:

| Gateway | A pattern without `^` | `/admin` matches |
|---|---|---|
| **Goma Gateway 0.15.0 or newer** | Anchored to the **start** of the path | `/admin`, `/ADMIN/users` — not `/x/admin` |
| Older gateways | Matched **anywhere** in the path | `/admin`, `/ADMIN/users` and `/x/admin` |

Write patterns that mean the same thing on both — start them with `^`, and end with `$` when you
mean the whole path:

```
^/admin/.*     everything under /admin
^/admin/.*$    the same, anchored at both ends
^/health$      only /health
```

The older `/admin/*` wildcard form still works, but the regex form is what the gateway prefers and
what the form teaches.

## Secret fields

Fields marked **secret** — a basic-auth password, an OIDC client secret, a JWT signing key — are
encrypted at rest with your workspace's key and are **never returned by the API**. The form shows
them blank when you edit an existing middleware.

That means an empty secret box says *keep what is stored*, not *clear it*. To rotate a credential,
type the new value; to leave it alone, leave the box empty and save.

## Types Miabi does not curate

Goma has more middleware types than Miabi puts a form in front of, and new ones arrive with each
gateway release. An uncatalogued type still works: create it through the API or a
[declarative manifest](/docs/cicd/manifest-reference#middleware), and Miabi passes the rule to the
gateway as written. The console's type picker offers only curated types; opening an uncatalogued
middleware there shows its rule as raw YAML, which you can edit.

What it does not get is a form, validation on save, or encryption — a credential in an uncatalogued
rule is **stored in the clear**. Prefer a curated type where one exists, and
[open an issue](https://github.com/miabi-io/miabi/issues) for one you would like curated.

## When a route stops loading

The gateway validates a middleware when it loads the route. A rule it cannot accept — a type this
gateway version does not have, a field it rejects — takes the **route** down, not just the
middleware, and the gateway logs which middleware and why.

The most common cause is a **version gap**: a middleware added in a newer gateway than the one this
install runs. Pages for those types say which version they need. Miabi does not read the running
gateway's version, so nothing stops you saving one — the route is what reports it.

## Related

- **[All middlewares](/docs/middlewares/reference)** — the full reference, field by field.
- **[Routing](/docs/networking/routing-and-middlewares)** — how routes reach your applications.
- **[Manifest reference](/docs/cicd/manifest-reference#middleware)** — declaring middlewares and
  attaching them to routes in Git.
- **[Goma Gateway docs](https://goma.jkaninda.dev/middlewares/)** — the gateway's own reference.
