---
sidebar_position: 3
title: Migrating from Traefik, Caddy and nginx
description: Translate Traefik labels, Caddyfiles and nginx server blocks into Miabi routes and middlewares, in the console or in a manifest.
---

# Migrating from Traefik, Caddy and nginx

Most of what a reverse proxy configuration says maps directly onto a Miabi
[route](/docs/routes/overview) and its [middlewares](/docs/middlewares/overview). This page
translates the three most common setups, with each example shown both as console steps and as a
manifest.

If you are moving a whole server, read
[Installing on an existing server](/docs/getting-started/existing-server) first. It covers freeing
ports 80 and 443 and [importing the running containers](/docs/nodes/docker-import), and you then
create the routes using this page.

## The mental model

| Concept | Traefik | Caddy | nginx | Miabi |
|---|---|---|---|---|
| Which requests | router `rule` | site address + `handle` | `server_name` + `location` | route **hosts** + **path** |
| Where they go | service + `loadbalancer.server.port` | `reverse_proxy app:3000` | `proxy_pass http://app:3000` | route **application** + **target port** |
| Certificates | `certresolver` | automatic | certbot | route **TLS** `acme` |
| Request policies | middlewares | directives | directives | route **middlewares**, in order |

Three differences matter in every migration:

- **You point at an application, not an address.** No container names, IPs or upstream blocks:
  Miabi resolves the app's containers itself, across redeploys, replicas and canaries.
- **HTTPS redirects are explicit.** Caddy redirects to HTTPS on its own; Miabi does not. Attach the
  workspace's **`force-https`** middleware, first in the chain.
- **Hosts must be under a verified domain.** Register each domain under **Networking → Domains**
  and verify it before its routes go live. You can do this while the old proxy is still serving.

## From Traefik

### Labels to a route

A typical Docker Compose service behind Traefik:

```yaml
services:
  guestbook:
    image: miabi/guestbook:2.0.0
    labels:
      - traefik.enable=true
      - traefik.http.routers.guestbook.rule=Host(`guestbook.example.com`) || Host(`www.guestbook.example.com`)
      - traefik.http.routers.guestbook.entrypoints=websecure
      - traefik.http.routers.guestbook.tls.certresolver=letsencrypt
      - traefik.http.services.guestbook.loadbalancer.server.port=8080
      - traefik.http.routers.guestbook-http.rule=Host(`guestbook.example.com`) || Host(`www.guestbook.example.com`)
      - traefik.http.routers.guestbook-http.entrypoints=web
      - traefik.http.routers.guestbook-http.middlewares=to-https
      - traefik.http.middlewares.to-https.redirectscheme.scheme=https
```

The two routers, the redirect middleware and the cert resolver collapse into **one route**.

**In the console**

1. Declare container port **8080** on the `guestbook` app (**Ports → Container ports → Add port**).
2. **Networking → Routes → New route**: application `guestbook`, target port `8080`, hosts
   `guestbook.example.com` and `www.guestbook.example.com`, TLS *ACME (automatic)*.
3. Attach the `force-https` middleware.

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

### Rules

| Traefik rule | Miabi |
|---|---|
| ``Host(`a.com`)`` | hosts: `a.com` |
| ``Host(`a.com`) \|\| Host(`b.com`)``, ``Host(`a.com`, `b.com`)`` | hosts: `a.com`, `b.com` |
| ``Host(`a.com`) && PathPrefix(`/api`)`` | hosts: `a.com`, path: `/api` |
| ``Path(`/health`)`` (exact) | path `/health`, which is a **prefix** — it also matches `/health/x` |
| ``Method(`POST`)`` | methods: `POST` |
| ``HostRegexp(...)`` | no equivalent — list each host |
| `Header`, `Query`, `ClientIP` matchers | no route equivalent; use an [IP access policy](/docs/middlewares/access-policy) for `ClientIP` |
| router `priority` | not needed — the longest path wins |
| TCP / UDP routers | not routes — publish a [host port](/docs/applications/exposing-your-app#method-3--a-published-host-port) or use [port forwarding](/docs/networking/port-forwarding) |

### Middlewares

| Traefik middleware | Miabi |
|---|---|
| `redirectscheme` | the seeded `force-https` middleware |
| `stripprefix` | route **rewrite** `/` — no middleware needed |
| `addprefix` | [Add path prefix](/docs/middlewares/add-prefix) |
| `replacepathregex` | [Rewrite path (regex)](/docs/middlewares/rewrite-regex) |
| `redirectregex` | [Redirect (regex)](/docs/middlewares/redirect-regex) |
| `basicauth` | [Basic authentication](/docs/middlewares/basic-auth) — your existing htpasswd hashes work (bcrypt, APR1-MD5, SHA-1) |
| `forwardauth` | [Forward authentication](/docs/middlewares/forward-auth) — Authelia and oauth2-proxy keep working |
| `ratelimit` | [Rate limit](/docs/middlewares/rate-limit) |
| `ipallowlist` / `ipwhitelist` | [IP access policy](/docs/middlewares/access-policy) |
| `headers` (custom request headers) | [Request headers](/docs/middlewares/request-headers) |
| `headers` (custom response headers, CORS, security headers) | [Response headers](/docs/middlewares/response-headers), or the seeded `security-headers` |
| `buffering.maxRequestBodyBytes` | [Request body limit](/docs/middlewares/body-limit) |
| `errors` | [Error interceptor](/docs/middlewares/error-interceptor) |
| `chain` | list the middlewares on the route in the same order |
| `compress` | no equivalent — let the app compress its responses |
| weighted services, mirroring | [canary deployments](/docs/applications/canary-deployments) |

A basic-auth example carried over:

```yaml
# Traefik
- traefik.http.middlewares.admin-auth.basicauth.users=ops:$$apr1$$H6uskkkW$$IgXLP6ewTrSuBkTrqE8wj/
```

```yaml
# Miabi
apiVersion: miabi.io/v1
kind: Middleware
metadata: { name: admin-auth }
spec:
  type: basicAuth
  rule:
    users:
      - username: ops
        password: "{{ .secrets.ops_htpasswd }}"   # store $apr1$H6uskkkW$IgXLP6ewTrSuBkTrqE8wj/ in the vault
```

Compose escapes `$` as `$$`, so un-double them when you copy a hash out of a label.

## From Caddy

A Caddyfile:

```caddy
example.com, www.example.com {
    encode gzip
    reverse_proxy frontend:8080

    handle_path /api/* {
        reverse_proxy api:3000
    }

    basicauth /admin/* {
        ops $2a$14$Zkx19XLiW6VYouLHR5NmfOFU0z2GTNmpkT/5qqR7hx4IjWJPDhjvG
    }
}
```

That is two routes on the same hosts, plus a basic-auth middleware scoped to `/admin`.

**In the console**

1. Route `site`: application `frontend`, port `8080`, hosts `example.com` and `www.example.com`,
   TLS *ACME*.
2. Route `site-api`: application `api`, port `3000`, same hosts, path `/api`, rewrite `/`.
3. **Networking → Middlewares → New** → *Basic authentication*, named `admin-auth`, with **Paths**
   `^/admin/.*`. Paste the bcrypt hash as the password.
4. Attach `force-https`, then `admin-auth`, to `site`.

**In a manifest**

```yaml
apiVersion: miabi.io/v1
kind: Middleware
metadata: { name: admin-auth }
spec:
  type: basicAuth
  paths: ["^/admin/.*"]
  rule:
    users:
      - username: ops
        password: "{{ .secrets.ops_bcrypt }}"
---
apiVersion: miabi.io/v1
kind: Route
metadata: { name: site }
spec:
  hosts: [example.com, www.example.com]
  app: frontend
  port: 8080
  middlewares: [force-https, admin-auth]
---
apiVersion: miabi.io/v1
kind: Route
metadata: { name: site-api }
spec:
  hosts: [example.com, www.example.com]
  app: api
  port: 3000
  path: /api
  rewrite: /
  middlewares: [force-https]
```

The two Application documents are left out of this example; a real manifest declares `frontend`
and `api` alongside these routes.

| Caddy | Miabi |
|---|---|
| site address | route hosts |
| automatic HTTPS | TLS `acme` **plus** the `force-https` middleware |
| `reverse_proxy app:PORT` | route application + target port |
| `handle /api/*` | route path `/api` |
| `handle_path /api/*` | route path `/api`, rewrite `/` |
| `redir` | [Redirect](/docs/middlewares/redirect) or [Redirect (regex)](/docs/middlewares/redirect-regex) |
| `basicauth` | [Basic authentication](/docs/middlewares/basic-auth) — bcrypt hashes carry over |
| `forward_auth` | [Forward authentication](/docs/middlewares/forward-auth) |
| `header` | [Response headers](/docs/middlewares/response-headers) |
| `request_header` | [Request headers](/docs/middlewares/request-headers) |
| `request_body max_size` | [Request body limit](/docs/middlewares/body-limit) |
| `respond` with a status | [Block access](/docs/middlewares/access), or the route's [maintenance mode](/docs/networking/routing-and-middlewares#maintenance-mode) |
| `tls internal` | a `tlsProvider` pointing at an internal CA, or an uploaded certificate |
| `encode gzip` | no equivalent — let the app compress |
| `file_server` | deploy the static files as an app (an nginx or Caddy image), then route to it |

**caddy-docker-proxy** labels say the same things: `caddy: example.com` is the hosts,
`caddy.reverse_proxy: "{{upstreams 8080}}"` is the target port.

## From nginx

A server block, typically with certbot:

```nginx
server {
    listen 80;
    server_name example.com www.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name example.com www.example.com;
    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    client_max_body_size 50m;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000/;
    }

    location /ws {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

The port-80 server block becomes the `force-https` middleware. The certbot lines disappear, because
the gateway issues certificates itself. The `/ws` location needs no route of its own: WebSocket
upgrades pass through the gateway on any route. What remains is two routes and a body limit.

**In the console**

1. **Networking → Middlewares → New** → *Request body limit*, named `body-50m`, limit 50 MB.
2. Route `site`: application for the `:8080` service, hosts `example.com` and `www.example.com`,
   TLS *ACME*, middlewares `force-https`, `body-50m`.
3. Route `site-api`: application for the `:3000` service, same hosts, path `/api`, rewrite `/`,
   middleware `force-https`.

**In a manifest**

```yaml
apiVersion: miabi.io/v1
kind: Middleware
metadata: { name: body-50m }
spec:
  type: bodyLimit
  rule: { limit: 50MB }
---
apiVersion: miabi.io/v1
kind: Route
metadata: { name: site }
spec:
  hosts: [example.com, www.example.com]
  app: web
  port: 8080
  middlewares: [force-https, body-50m]
---
apiVersion: miabi.io/v1
kind: Route
metadata: { name: site-api }
spec:
  hosts: [example.com, www.example.com]
  app: api
  port: 3000
  path: /api
  rewrite: /                # what the trailing slash in proxy_pass did
  middlewares: [force-https]
```

| nginx | Miabi |
|---|---|
| `server_name` | route hosts |
| `location /path` | route path `/path` |
| `proxy_pass http://upstream:PORT` | route application + target port |
| `proxy_pass http://upstream:PORT/` (trailing slash) | route path + rewrite `/` |
| `return 301 https://…` | `force-https` middleware |
| `ssl_certificate` from certbot | TLS `acme` — remove certbot |
| `ssl_certificate` you bought | TLS `custom`, with the certificate uploaded |
| WebSocket `Upgrade` / `Connection` headers | nothing — upgrades pass through |
| `proxy_set_header X-Forwarded-*`, `Host` | nothing for the standard headers; [Request headers](/docs/middlewares/request-headers) for your own |
| `add_header` | [Response headers](/docs/middlewares/response-headers) |
| `client_max_body_size` | [Request body limit](/docs/middlewares/body-limit) |
| `auth_basic` + `.htpasswd` | [Basic authentication](/docs/middlewares/basic-auth) — the htpasswd hashes carry over |
| `auth_request` | [Forward authentication](/docs/middlewares/forward-auth) |
| `limit_req` | [Rate limit](/docs/middlewares/rate-limit) |
| `allow` / `deny` | [IP access policy](/docs/middlewares/access-policy) |
| `rewrite … redirect`/`permanent` | [Redirect (regex)](/docs/middlewares/redirect-regex) |
| `rewrite … break` | [Rewrite path (regex)](/docs/middlewares/rewrite-regex) |
| `proxy_cache` | [HTTP cache](/docs/middlewares/http-cache) |
| `upstream` with several servers | run the app as a [replicated service](/docs/applications/scaling-and-resources); the gateway balances its replicas |
| `gzip on` | no equivalent — let the app compress |
| `root` / static files | deploy the files as an app (an nginx image), then route to it |

**nginx-proxy** (`VIRTUAL_HOST` environment variables) maps the same way: `VIRTUAL_HOST` is the
hosts, `VIRTUAL_PORT` the target port, `VIRTUAL_PATH` the path, and `LETSENCRYPT_HOST` means TLS
`acme`.

## Verify before you switch

If the old proxy still holds ports 80 and 443, you cannot browse to the new routes yet. Domain
verification and route creation do not need those ports, so do both first. Then, right after the
switch, test each host directly against the server:

```bash
curl -I --resolve example.com:443:<server-ip> https://example.com/
curl -I --resolve example.com:443:<server-ip> https://example.com/api/health
```

A `404` from the gateway means no route matches that host and path. See
[Checking your work](/docs/routes/creating-routes#checking-your-work) for the other answers.

## What has no equivalent

- **Response compression** (`compress`, `encode gzip`, `gzip on`) — the gateway does not compress.
  Most frameworks can compress at the app.
- **Matching on headers, query strings or regex hosts** — routes match on host, path prefix and
  method. A [canary](/docs/applications/canary-deployments) can pin traffic by header, cookie or
  query, but only between two releases of the same app.
- **Proxying to something that is not an app** — a route always targets a Miabi application. To
  front an external service, run a small proxy container as an app and route to it.
- **Serving files from the host** — package them in an image and deploy it as an app.
