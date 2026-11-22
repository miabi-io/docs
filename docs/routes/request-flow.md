---
sidebar_position: 3
title: Request flow
description: See how a request travels through a route — hosts, gateway, middlewares, canary split and the app — trace one through it, and watch live traffic.
---

# Request flow

A route's **Flow** tab draws how a request travels through it, from the visitor to the app:

| Stage | What it shows |
|---|---|
| **Visitors** | The route's hosts, each with its domain's state (verified, not verified, suspended) and, for a stored certificate, whether that certificate covers the host. Auto-generated hosts are marked as such. |
| **Gateway** | The gateway that serves the route (the platform's, a cluster's own, or a node's), the TLS mode, the path and its [rewrite](/docs/routes/overview#rewriting-the-path), the methods, exploit protection and maintenance. Other routes on the same hosts are listed here, because a longer path on the same host takes those requests. |
| **Middlewares** | The [chain](/docs/networking/routing-and-middlewares#workspace-middlewares) in the order it runs, each with the status it can answer with before the app is reached: `force-https` 301, an auth middleware 401, a policy 403, a rate limit 429. A middleware the route names but the workspace no longer has is flagged *missing*. |
| **Traffic split** | Only while a [canary](/docs/applications/canary-deployments) runs: its release, its rules, the weights, and what the rollout does next. |
| **Application** | The stable release and, with a canary, the canary release: version, running replicas and the internal address the gateway forwards to. |

Select any box to see its details and a link to where it is changed: the domain, the certificate, the
middleware, the app, or the route's **Settings**.

Open it from the route's page, from the **Request flow** button on a row of the app's **Routes** tab,
or from **See traffic flow** on the app's canary rollout. The tab is kept in the address
(`?tab=flow`), so a reload or a shared link opens it again.

## States

What stops a request is drawn, not only described. A banner names the state and links to the fix:

| State | Drawn as |
|---|---|
| **Domain not verified, suspended or not registered** | The link from the visitors to the gateway is broken and labelled *not served*. |
| **Disabled** | The route is greyed out; the gateway does not serve it. |
| **Maintenance** | The gateway answers itself, in a *Maintenance response* box; the app is greyed out but still running. |
| **Workspace suspended** | Like maintenance, with the suspension notice. |
| **No running replica** | The app's box is red: the gateway answers 502 until the app is back. |
| **Advanced YAML** | A note on the gateway: keys set in the route's [Advanced](/docs/routes/creating-routes#advanced-raw-goma-route-yaml) YAML are not drawn. |

The tab follows the route as it changes: a canary step, a promote, maintenance turned on, all appear
without reloading the page.

## Try a request

**Try a request** follows one request through the route's settings and says where it ends. Choose the
method, scheme, host and path, and add headers or a client IP if the route's rules read them. The
path the request takes is lit on the canvas, and the box it stopped at is outlined.

The trace follows the order the gateway applies its settings:

1. Is the route served at all? If not, the gateway answers 404.
2. Does a longer path on the same host take the request? Then that route handles it, and the trace
   links to it.
3. Is the path under this route's path, and is the method allowed?
4. Is the route in maintenance?
5. The middlewares, in order.
6. The canary rules and weights.
7. Is a replica running?

It ends at one of: the app (and the path the app receives after the rewrite), a redirect, an early
answer from a middleware, maintenance, another route, or *not served*.

**What it predicts, and what it does not.** The trace reads the route's configuration; it sends
nothing to your app. It knows what a redirect does, whether credentials are *present* for an auth
middleware, whether a path is blocked, whether an IP policy allows a given IP, and which canary rule
a request matches. It cannot know whether a token is valid, whether a client is over a rate limit or
which country an IP is in: those are decided by the gateway at run time, so the trace reports them as
notes ("can answer 429 under load"), never as the result.

Headers you enter may hold real credentials. They are never logged, stored or sent anywhere, and a
read-only [API key](/docs/security/api-tokens) may run a trace.

## Live traffic

With [Workspace Analytics](/docs/operations/analytics) on, a **Live traffic · last 15 min** switch
adds the route's recent traffic to the drawing, refreshed every 30 seconds while the tab is open:

- the request rate on the links, and requests and visitors on the visitors box;
- the average time spent **in the gateway**: total time minus the time the app took;
- **answered early** on the middlewares: how many requests got a status one of them can send, such
  as `26 × 301` from `force-https` or `38 × 401` from an auth middleware;
- p95 latency and the 5xx share on the app;
- a per-minute chart of requests with errors in red.

The numbers end at the last complete minute. Only codes some middleware in the chain can send are
counted as early answers, so a 401 from the app itself is not credited to a middleware that cannot
send it.

### Per release, during a canary

When the gateway reports which backend answered each request, the split shows the **measured**
share rather than the configured weight, and each release gets its own requests, p95 and 5xx rate. A
banner warns when the canary answers 5xx clearly more often than stable: at least 50 requests on
each side, and at least one percentage point apart. Older gateways do not report the backend; the
tab then shows the configured weights and the traffic of both releases together, and says so.

## The API

The tab is built on three endpoints, which the CLI and other tools can use too:

| Endpoint | Returns |
|---|---|
| `GET /api/v1/workspaces/{ws}/routes/{id}/flow` | The flow: hosts, TLS, gateway, chain, other routes on the hosts, backends with releases and replicas, and the canary rollout. |
| `POST /api/v1/workspaces/{ws}/routes/{id}/flow/trace` | A trace of the request in the body (`method`, `scheme`, `host`, `path`, `headers`, `ip`). Each step has a stable `code` with `params`, and an English `detail`. |
| `GET /api/v1/workspaces/{ws}/routes/{id}/flow/stats?range=15m` | The route's recent traffic, up to 24 hours, with `variants` per release when the gateway reports them. |
