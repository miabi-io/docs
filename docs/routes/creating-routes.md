---
sidebar_position: 2
title: Creating routes
description: Create a route in the console or declare it in a manifest — the same route, both ways.
---

# Creating routes

Every route can be made two ways: in the **console**, or in a **manifest** you apply with
`miabi apply` or keep in Git. They produce the same thing. Each example below shows both.

Before you start:

- The app has a **container port** declared — the port its process listens on inside the container.
  See [Declare a container port](/docs/applications/exposing-your-app#first-declare-a-container-port).
- The host's **domain is registered** in the workspace, and verified for the route to go live. See
  [Domains](/docs/networking/domains).
- The host's DNS **points at the gateway**, so certificates can be issued and visitors arrive.

## A single app on a hostname

The common case: `guestbook.example.com` to the `guestbook` app on port 8080, with HTTPS.

**In the console**

1. **Networking → Routes → New route**, or the app's **Routes** tab.
2. **Name** `guestbook`, **Application** `guestbook`, **Target port** `8080`.
3. **Hosts**: subdomain `guestbook`, domain `example.com`. Use **Add host** for `www` or other names.
4. **TLS**: *ACME (automatic)*.
5. **Middlewares**: tick `force-https` so plain-HTTP visitors are redirected.
6. Save. The route is **live** within seconds.

**In a manifest**

```yaml
apiVersion: miabi.io/v1
kind: Application
metadata: { name: guestbook }
spec:
  image: miabi/guestbook
  tag: "2.0.0"
  ports:
    - container: 8080
---
apiVersion: miabi.io/v1
kind: Route
metadata: { name: guestbook }
spec:
  hosts: [guestbook.example.com, www.guestbook.example.com]
  app: guestbook
  port: 8080
  tls: acme
  middlewares: [force-https]
```

```bash
miabi apply -f guestbook.yaml --dry-run   # see the plan
miabi apply -f guestbook.yaml
```

A route's `app` must be an Application **in the same manifest**. To route an app you created in the
console, declare it in the manifest too, or create the route in the console.

## Several apps on one hostname

Frontend on `/`, API on `/api`. The API expects paths without the `/api` prefix.

**In the console** — create two routes on the same host:

| | Route `site` | Route `site-api` |
|---|---|---|
| Application | `frontend` | `api` |
| Hosts | `example.com` | `example.com` |
| Path | `/` | `/api` |
| Rewrite | — | `/` |

**In a manifest**

```yaml
apiVersion: miabi.io/v1
kind: Route
metadata: { name: site }
spec:
  hosts: [example.com]
  app: frontend
  middlewares: [force-https]
---
apiVersion: miabi.io/v1
kind: Route
metadata: { name: site-api }
spec:
  hosts: [example.com]
  app: api
  path: /api
  rewrite: /                # /api/orders reaches the app as /orders
  middlewares: [force-https]
```

The longest matching path wins, so `/api/orders` goes to `api` and everything else to `frontend`,
whatever order the routes were created in. See
[How a request finds its route](/docs/routes/overview#how-a-request-finds-its-route).

## A protected route

An admin tool behind a login and a rate limit. Middlewares are workspace resources: create them once,
attach them to any number of routes.

**In the console**

1. **Networking → Middlewares → New** → *Basic authentication*. Name it `admin-auth`, add a user.
2. **Networking → Middlewares → New** → *Rate limit*. Name it `admin-ratelimit`.
3. On the route, under **Middlewares**, attach `force-https`, `admin-ratelimit` and `admin-auth`, in
   that order, and **Save order**.

**In a manifest**

```yaml
apiVersion: miabi.io/v1
kind: Middleware
metadata: { name: admin-auth }
spec:
  type: basicAuth
  rule:
    realm: Admin
    users:
      - username: ops
        password: "{{ .secrets.ops_password }}"   # from the workspace vault
---
apiVersion: miabi.io/v1
kind: Middleware
metadata: { name: admin-ratelimit }
spec:
  type: rateLimit
  rule: { unit: minute, requestsPerUnit: 60 }
---
apiVersion: miabi.io/v1
kind: Route
metadata: { name: admin }
spec:
  hosts: [admin.example.com]
  app: admin
  middlewares: [force-https, admin-ratelimit, admin-auth]   # execution order
```

The order is behaviour: here the rate limit rejects a flood before any password is checked. See
[Order matters](/docs/middlewares/overview#order-matters).

## Restricting methods and using your own certificate

A webhook receiver that only accepts `POST`, served with an uploaded certificate.

**In the console** — on the route, tick only **POST** under **Methods**, set **TLS** to *Custom*
and pick the certificate. Upload it first under **Networking → Certificates**.

**In a manifest**

```yaml
apiVersion: miabi.io/v1
kind: Route
metadata: { name: hooks }
spec:
  hosts: [hooks.example.com]
  app: receiver
  methods: [POST]
  tls: custom
  certificate: example-wildcard   # a Certificate already stored in the workspace
```

Certificates are never declared in a manifest, since they carry a private key. Upload the certificate
first, then name it.

## Advanced: raw Goma route YAML

The route form has a **Simple** and an **Advanced** tab. Advanced takes the route as
[Goma route YAML](https://goma.jkaninda.dev), for a gateway feature the form does not model. In a
manifest the same thing is `advancedConfig`.

Miabi still owns the parts that decide **who the route answers for and where traffic goes**, and
overwrites them whatever the YAML says:

| Owned by Miabi | Why |
|---|---|
| `hosts`, `path` | A route must not claim another workspace's hostname, or outrank another route by declaring a longer path. |
| `backends` / `target` | Always the app's containers, resolved by Miabi. |
| `tls` | Certificates are domain-validated; a hand-written TLS block could smuggle one in. |
| `priority` | Matching stays longest-path-first. |

Everything else is passed to the gateway as written, without validation beyond being YAML. Prefer the
structured fields when they cover what you need.

:::warning A manifest route is fully described by its manifest
Each apply writes every field, so a field missing from the manifest is cleared. A rewrite set in the
console disappears the first time a manifest without `rewrite` is applied to that route. Copy a
route's current settings into the manifest before putting it under GitOps.
:::

## Checking your work

From any machine, before or after DNS points at the server:

```bash
curl -I --resolve guestbook.example.com:443:<server-ip> https://guestbook.example.com/
```

| You get | Meaning |
|---|---|
| Your app's response | The route is live. |
| `404` from the gateway | No route matches that host and path — check the hosts and path. |
| `401` / `429` | A middleware answered — auth or rate limit — before the app was reached. |
| `502` | The route matched but the app did not answer — check the target port and that the app is running. |
| `503` | The route is in maintenance. |
| A certificate error | The certificate is not issued yet; port 80 must be reachable for ACME. See [TLS certificates](/docs/networking/tls-certificates). |

The route's page shows its sync status and, when it is offline, the reason.
