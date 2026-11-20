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

Routing is never imported for you. [Compose import](/docs/applications/stacks#importing-a-docker-compose-file)
ignores `labels`, so `traefik.*` and `caddy.*` labels are dropped, and nginx config lives outside
the containers. Bring the apps in first, then rebuild their routing with this page.

## The mental model

| Concept | Traefik | Caddy | nginx | Miabi |
|---|---|---|---|---|
| Which requests | router `rule` | site address + `handle` | `server_name` + `location` | route **hosts** + **path** (+ **methods**) |
| Where they go | service + `loadbalancer.server.port` | `reverse_proxy app:3000` | `proxy_pass http://app:3000` | route **application** + **port** |
| Certificates | `certresolver` | automatic | certbot | route **TLS**: ACME by default |
| Request policies | middlewares | directives | directives | route **middlewares**, in order |
| Shared policies | `@file` middlewares | snippets + `import` | `include` | workspace middlewares, listed by name on any route |
| What is live | dashboard | admin API | `nginx -T` | **Networking → Routes**: each route is *live* or *offline* with a reason |

Four differences matter in every migration:

- **You point at an application, not an address.** No container names, IPs or upstream blocks:
  Miabi resolves the app's containers itself, across redeploys, replicas and canaries. The port is
  a container port number, or the name of a port the app declares (`http`).
- **HTTPS redirects are explicit.** Caddy redirects to HTTPS on its own; Miabi does not. Attach the
  workspace's **`force-https`** middleware, first in the chain.
- **Hosts must be under a verified domain.** Register each domain under **Networking → Domains**
  and verify it before its routes go live. You can do this while the old proxy is still serving.
- **A middleware is defined once and shared.** It belongs to the workspace, not to one route, so
  the `admin-auth` you create for one app can protect ten. Editing it changes every route that lists it.

### Middlewares your workspace already has

A new workspace is seeded with ready-made middlewares for the policies most proxy configs repeat.
They do nothing until a route lists them:

| Name | Does |
|---|---|
| `force-https` | Redirects HTTP to HTTPS (301) |
| `compression` | Compresses responses with zstd, Brotli or gzip, whichever the client accepts |
| `redirect-to-www` / `redirect-to-apex` | Adds or removes `www.`, keeping the path and query |
| `security-headers` | `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` |
| `hsts` | `Strict-Transport-Security` for a year |
| `rate-limit` | 100 requests per minute per client |
| `noindex` | `X-Robots-Tag: noindex, nofollow`, for staging hosts |

Seeding happens once, when the workspace has no middlewares yet, so an older workspace may lack
some of these. Create a missing one from the preset of the same name under
**Networking → Middlewares → New**.

### Ordering a chain

Middlewares run in the order the route lists them, and any of them can answer before the next runs.
Proxy configs rarely make the order this visible, so choose it on purpose:

1. **Redirects**: `force-https`, then `redirect-to-www` or `redirect-to-apex`, so a visitor is
   redirected once instead of being challenged on the wrong host first.
2. **Cheap filters**: IP and country policies, user-agent blocks, rate limits, so unwanted traffic
   is rejected before any authentication work.
3. **Authentication**: basic, forward, OIDC, JWT or LDAP.
4. **Everything that shapes the request or response**: headers, rewrites, body limits, caching,
   compression.

See [Order matters](/docs/middlewares/overview#order-matters) for a worked example.

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
      - traefik.http.routers.guestbook.middlewares=gzip
      - traefik.http.services.guestbook.loadbalancer.server.port=8080
      - traefik.http.routers.guestbook-http.rule=Host(`guestbook.example.com`) || Host(`www.guestbook.example.com`)
      - traefik.http.routers.guestbook-http.entrypoints=web
      - traefik.http.routers.guestbook-http.middlewares=to-https
      - traefik.http.middlewares.to-https.redirectscheme.scheme=https
      - traefik.http.middlewares.gzip.compress=true
```

The two routers, the two middlewares and the cert resolver collapse into **one route**.

**In the console**

1. Declare container port **8080** on the `guestbook` app (**Ports → Container ports → Add port**).
2. **Networking → Routes → New route**: application `guestbook`, port `8080`, hosts
   `guestbook.example.com` and `www.guestbook.example.com`, TLS *ACME (automatic)*.
3. Attach `force-https`, then `compression`.

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
  middlewares: [force-https, compression]
```

### Certificate resolvers

| Traefik | Miabi |
|---|---|
| `certresolver` with `httpchallenge` or `tlschallenge` | nothing: ACME HTTP-01 is the route default |
| `certresolver` with `dnschallenge` | connect a [DNS provider](/docs/networking/dns-providers), then issue a [managed wildcard certificate](/docs/networking/tls-certificates#2-managed-wildcard--dns-01-certificates); routes under it use it |
| `tls.domains[0].main=example.com`, `sans=*.example.com` | the same managed wildcard certificate |
| several resolvers (public + internal CA) | named providers in the gateway's `certManager`, picked per route with `tls.provider` |
| a file-provider certificate | upload it under **Networking → Certificates**, then set `tls.certificate` |

### Rules

| Traefik rule | Miabi |
|---|---|
| ``Host(`a.com`)`` | hosts: `a.com` |
| ``Host(`a.com`) \|\| Host(`b.com`)``, ``Host(`a.com`, `b.com`)`` | hosts: `a.com`, `b.com` |
| ``Host(`a.com`) && PathPrefix(`/api`)`` | hosts: `a.com`, path: `/api` |
| ``Path(`/health`)`` (exact) | path `/health`, which is a **prefix**: it also matches `/health/x` |
| ``Method(`POST`)`` | methods: `POST` |
| ``HostRegexp(...)`` | no equivalent; list each host |
| `Header`, `Query` matchers | no route equivalent; a [canary](/docs/applications/canary-deployments) can split by header, cookie or query between two releases of one app |
| `ClientIP` matcher | [IP access policy](/docs/middlewares/access-policy) |
| router `priority` | not needed: the longest path wins |
| TCP / UDP routers | not routes; publish a [host port](/docs/applications/exposing-your-app#method-3--a-published-host-port) or use [port forwarding](/docs/networking/port-forwarding) |

### Middlewares

| Traefik middleware | Miabi |
|---|---|
| `redirectscheme` | the seeded `force-https` ([Force scheme](/docs/middlewares/redirect-scheme)) |
| `redirectregex` for www ↔ apex | the seeded `redirect-to-www` / `redirect-to-apex` ([Redirect host](/docs/middlewares/redirect-host)) |
| `redirectregex`, other | [Redirect (regex)](/docs/middlewares/redirect-regex) |
| `stripprefix` | route **rewrite** `/`; no middleware needed |
| `addprefix` | [Add path prefix](/docs/middlewares/add-prefix) |
| `replacepath`, `replacepathregex` | [Rewrite path (regex)](/docs/middlewares/rewrite-regex) |
| `compress` | the seeded `compression` ([Compression](/docs/middlewares/compress)), which adds Brotli and zstd |
| `basicauth` | [Basic authentication](/docs/middlewares/basic-auth): existing htpasswd hashes work (bcrypt, APR1-MD5, SHA-1) |
| `forwardauth` | [Forward authentication](/docs/middlewares/forward-auth): Authelia and oauth2-proxy keep working |
| `forwardauth` to oauth2-proxy, only for SSO | [OpenID Connect](/docs/middlewares/oidc), at the gateway, with no proxy container to run |
| JWT plugins | [JWT authentication](/docs/middlewares/jwt-auth) (shared secret, public key or JWKS) |
| LDAP plugins | [LDAP authentication](/docs/middlewares/ldap-auth) |
| `ratelimit` | [Rate limit](/docs/middlewares/rate-limit), or the seeded `rate-limit` |
| `ipallowlist` / `ipwhitelist` | [IP access policy](/docs/middlewares/access-policy) |
| GeoIP / geoblock plugins | [Country access policy](/docs/middlewares/geo-block) |
| `headers.customRequestHeaders` | [Request headers](/docs/middlewares/request-headers) |
| `headers.customResponseHeaders`, CORS | [Response headers](/docs/middlewares/response-headers) |
| `headers.stsSeconds`, `frameDeny`, `contentTypeNosniff` | the seeded `hsts` and `security-headers` |
| `buffering.maxRequestBodyBytes` | [Request body limit](/docs/middlewares/body-limit) |
| `errors` | [Error interceptor](/docs/middlewares/error-interceptor) |
| `chain` | list the middlewares on the route in the same order |
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
www.example.com {
    redir https://example.com{uri} permanent
}

example.com {
    encode zstd gzip
    reverse_proxy frontend:8080

    handle_path /api/* {
        reverse_proxy api:3000
    }

    basicauth /admin/* {
        ops $2a$14$Zkx19XLiW6VYouLHR5NmfOFU0z2GTNmpkT/5qqR7hx4IjWJPDhjvG
    }
}
```

That is two routes, a www redirect, compression and a basic-auth middleware scoped to `/admin`. The
redirect needs no site block of its own: put both hosts on the route and attach `redirect-to-apex`.

**In the console**

1. Route `site`: application `frontend`, port `8080`, hosts `example.com` and `www.example.com`,
   TLS *ACME*.
2. Route `site-api`: application `api`, port `3000`, same hosts, path `/api`, rewrite `/`.
3. **Networking → Middlewares → New** → *Basic authentication*, named `admin-auth`, with **Paths**
   `^/admin/.*`. Paste the bcrypt hash as the password.
4. Attach `force-https`, `redirect-to-apex`, `admin-auth` and `compression` to `site`, in that
   order, and `force-https`, `redirect-to-apex` and `compression` to `site-api`.

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
  middlewares: [force-https, redirect-to-apex, admin-auth, compression]
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
  middlewares: [force-https, redirect-to-apex, compression]
```

The two Application documents are left out of this example; a real manifest declares `frontend`
and `api` alongside these routes.

| Caddy | Miabi |
|---|---|
| site address | route hosts |
| automatic HTTPS | TLS ACME (the default) **plus** the `force-https` middleware |
| `reverse_proxy app:PORT` | route application + port |
| `handle /api/*` | route path `/api` |
| `handle_path /api/*` | route path `/api`, rewrite `/` |
| `encode zstd gzip` | the seeded `compression` |
| `redir` to www or the bare domain | the seeded `redirect-to-www` / `redirect-to-apex` |
| `redir`, other | [Redirect](/docs/middlewares/redirect) or [Redirect (regex)](/docs/middlewares/redirect-regex) |
| `uri strip_prefix` / `rewrite` | route rewrite, or [Rewrite path (regex)](/docs/middlewares/rewrite-regex) |
| `basicauth` | [Basic authentication](/docs/middlewares/basic-auth): bcrypt hashes carry over |
| `forward_auth` | [Forward authentication](/docs/middlewares/forward-auth) |
| caddy-security / OIDC plugins | [OpenID Connect](/docs/middlewares/oidc) |
| JWT plugins | [JWT authentication](/docs/middlewares/jwt-auth) |
| `header` | [Response headers](/docs/middlewares/response-headers) |
| `request_header` | [Request headers](/docs/middlewares/request-headers) |
| `request_body max_size` | [Request body limit](/docs/middlewares/body-limit) |
| `@bots header User-Agent …` + `respond 403` | [Block user agents](/docs/middlewares/user-agent-block) |
| `remote_ip` matcher + `respond 403` | [IP access policy](/docs/middlewares/access-policy) |
| `respond` with a status | [Block access](/docs/middlewares/access), or the route's [maintenance mode](/docs/networking/routing-and-middlewares#maintenance-mode) |
| `handle_errors` | [Error interceptor](/docs/middlewares/error-interceptor) |
| `rate_limit` plugin | [Rate limit](/docs/middlewares/rate-limit) |
| cache plugins | [HTTP cache](/docs/middlewares/http-cache) |
| `tls internal` | `tls.provider` pointing at an internal CA, or an uploaded certificate in `tls.certificate` |
| `tls { dns <provider> … }`, wildcard sites | a [DNS provider](/docs/networking/dns-providers) and a [managed wildcard certificate](/docs/networking/tls-certificates#2-managed-wildcard--dns-01-certificates) |
| `file_server` | deploy the static files as an app (an nginx or Caddy image), then route to it |

**caddy-docker-proxy** labels say the same things: `caddy: example.com` is the hosts,
`caddy.reverse_proxy: "{{upstreams 8080}}"` is the port, and `caddy.encode: zstd gzip` is
`compression`.

## From nginx

A server block, typically with certbot:

```nginx
server {
    listen 80;
    server_name example.com www.example.com;
    return 301 https://example.com$request_uri;
}

server {
    listen 443 ssl;
    server_name www.example.com;
    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    return 301 https://example.com$request_uri;
}

server {
    listen 443 ssl;
    server_name example.com;
    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    client_max_body_size 50m;
    gzip on;
    gzip_types text/css application/javascript application/json;

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

The first two server blocks become `force-https` and `redirect-to-apex`. The certbot lines
disappear, because the gateway issues certificates itself. `gzip` becomes `compression`, which
already covers the usual text types. The `/ws` location needs no route of its own: WebSocket
upgrades pass through the gateway on any route. What remains is two routes and a body limit.

**In the console**

1. **Networking → Middlewares → New** → *Request body limit*, named `body-50m`, limit 50 MB.
2. Route `site`: application for the `:8080` service, hosts `example.com` and `www.example.com`,
   TLS *ACME*, middlewares `force-https`, `redirect-to-apex`, `body-50m`, `compression`.
3. Route `site-api`: application for the `:3000` service, same hosts, path `/api`, rewrite `/`,
   middlewares `force-https`, `redirect-to-apex`, `compression`.

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
  middlewares: [force-https, redirect-to-apex, body-50m, compression]
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
  middlewares: [force-https, redirect-to-apex, compression]
```

| nginx | Miabi |
|---|---|
| `server_name` | route hosts |
| `location /path` | route path `/path` |
| `limit_except GET POST` | route methods |
| `proxy_pass http://upstream:PORT` | route application + port |
| `proxy_pass http://upstream:PORT/` (trailing slash) | route path + rewrite `/` |
| `return 301 https://$host…` | `force-https` |
| `return 301 https://example.com…` from `www` | `redirect-to-apex` (or `redirect-to-www` the other way) |
| `ssl_certificate` from certbot | TLS ACME; remove certbot |
| certbot `--dns-<provider>` for a wildcard | a [DNS provider](/docs/networking/dns-providers) and a [managed wildcard certificate](/docs/networking/tls-certificates#2-managed-wildcard--dns-01-certificates) |
| `ssl_certificate` you bought | `tls.certificate`, with the certificate uploaded under **Networking → Certificates** |
| WebSocket `Upgrade` / `Connection` headers | nothing; upgrades pass through |
| `proxy_set_header X-Forwarded-*`, `Host` | nothing for the standard headers; [Request headers](/docs/middlewares/request-headers) for your own |
| `add_header` | [Response headers](/docs/middlewares/response-headers), or the seeded `hsts` / `security-headers` |
| `gzip on`, `brotli on` | the seeded `compression` |
| `client_max_body_size` | [Request body limit](/docs/middlewares/body-limit) |
| `auth_basic` + `.htpasswd` | [Basic authentication](/docs/middlewares/basic-auth): the htpasswd hashes carry over |
| `auth_request` | [Forward authentication](/docs/middlewares/forward-auth) |
| `auth_request` to oauth2-proxy, only for SSO | [OpenID Connect](/docs/middlewares/oidc) |
| `auth_jwt` (NGINX Plus) | [JWT authentication](/docs/middlewares/jwt-auth) |
| `auth_ldap` module | [LDAP authentication](/docs/middlewares/ldap-auth) |
| `limit_req` | [Rate limit](/docs/middlewares/rate-limit) |
| `allow` / `deny` | [IP access policy](/docs/middlewares/access-policy) |
| `geoip2` + `map` + `return 403` | [Country access policy](/docs/middlewares/geo-block) |
| `if ($http_user_agent ~* …) { return 403; }` | [Block user agents](/docs/middlewares/user-agent-block) |
| `location /private { return 403; }` | [Block access](/docs/middlewares/access) |
| `rewrite … redirect`/`permanent` | [Redirect (regex)](/docs/middlewares/redirect-regex) |
| `rewrite … break` | [Rewrite path (regex)](/docs/middlewares/rewrite-regex) |
| `error_page` | [Error interceptor](/docs/middlewares/error-interceptor) |
| `proxy_cache` | [HTTP cache](/docs/middlewares/http-cache) |
| `upstream` with several servers | run the app as a [replicated service](/docs/applications/scaling-and-resources); the gateway balances its replicas |
| `root` / static files | deploy the files as an app (an nginx image), then route to it |

**nginx-proxy** (`VIRTUAL_HOST` environment variables) maps the same way: `VIRTUAL_HOST` is the
hosts, `VIRTUAL_PORT` the port, `VIRTUAL_PATH` the path, and `LETSENCRYPT_HOST` means TLS ACME.

## Settings with no middleware

Some settings sit on the route rather than in a middleware:

- **Maintenance page.** A route's `maintenance` block answers with a 503 (or another 4xx/5xx) and
  your message instead of the app. It replaces the nginx `if (-f maintenance.html)` trick and
  Traefik's swap-the-router workflow. See
  [Maintenance mode](/docs/networking/routing-and-middlewares#maintenance-mode).
- **WAF-style filtering.** `security.exploitProtection` rejects common injection and traversal
  signatures at the gateway, where you might have used ModSecurity or a Traefik WAF plugin. See
  [Route security](/docs/networking/routing-and-middlewares#route-security).
- **Anything else Goma supports.** A route's **Advanced** tab (`advancedConfig` in a manifest)
  takes raw [Goma route YAML](/docs/routes/creating-routes#advanced-raw-goma-route-yaml) for gateway
  options the form does not model. Miabi still owns the hosts, path, target and TLS.

## Switching over

**1. Check the app before its routing.** Turn on
[one-click external access](/docs/applications/exposing-your-app#method-1--one-click-external-access)
for the app's port. It gives the app a working HTTPS URL on the cluster's domain, with no domain or
route of your own, so a broken app is not mistaken for a broken route. Turn it off once your routes
work.

**2. Create the routes.** Domain verification and route creation do not need ports 80 and 443, so
do both while the old proxy still serves. From a manifest, preview the changes first:

```bash
miabi apply -f migration.yaml --dry-run
miabi apply -f migration.yaml
```

A manifest describes its routes completely: once a route is managed by a manifest, a console edit
lasts only until the next apply. Pick one place to manage each route.

**3. Switch and test.** Stop the old proxy so the gateway takes ports 80 and 443, then test each host
directly against the server:

```bash
curl -I --resolve example.com:443:<server-ip> https://example.com/
curl -I --resolve example.com:443:<server-ip> https://example.com/api/health
curl -sI -H 'Accept-Encoding: zstd, br, gzip' --resolve example.com:443:<server-ip> https://example.com/ | grep -i content-encoding
```

A `404` from the gateway means no route matches that host and path. See
[Checking your work](/docs/routes/creating-routes#checking-your-work) for the other answers.
Keep the old proxy's config until every host answers: starting it again is your rollback.

**4. Watch it.** **Networking → Routes** replaces the proxy dashboard: a route stuck *offline* says
why, most often an unverified domain. [Workspace Analytics](/docs/operations/analytics) replaces
access logs and proxy metrics, with requests, status codes, latency and visitors, filterable by app.

## What has no equivalent

- **Matching on headers, query strings or regex hosts.** Routes match on host, path prefix and
  method. A [canary](/docs/applications/canary-deployments) can pin traffic by header, cookie or
  query, but only between two releases of the same app.
- **Proxying to something that is not an app.** A route always targets a Miabi application, even
  with `advancedConfig`. To front an external service, run a small proxy container as an app and
  route to it.
- **Serving files from the host.** Package them in an image and deploy it as an app.
- **TCP and UDP routing.** Publish a host port or use
  [port forwarding](/docs/networking/port-forwarding).
