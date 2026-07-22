---
sidebar_position: 2
title: Workspace Analytics
description: HTTP traffic, performance and web analytics for your apps — derived from the gateway, no instrumentation, no cookies.
---

# Workspace Analytics

Workspace Analytics answers *"who is hitting my apps, how fast, and is anything
failing?"* — without adding a single line of code to your app. Every request
already flows through **Goma Gateway**; Miabi turns that stream into
minute-bucketed rollups and four dashboards, scoped per workspace (and per app).

It is **privacy-first by design**: cookieless, the client IP is resolved to a
country at the edge and then dropped, unique visitors are counted with a
daily-salted hash, and no per-request rows or PII are ever stored.

![Workspace Analytics data pipeline](/img/analytics-pipeline.svg)

## The four views

Open **Analytics** in the sidebar. A shared header carries the time range
(30 min · 1h · 24h · 7d · 30d) and an app filter across all tabs.

- **Overview** — headline tiles (requests, unique visitors, data served, and
  **server errors (5xx)** with client errors (4xx) beside it), a
  requests-over-time chart that separates success / 4xx / 5xx, and a status
  breakdown.

  ![Analytics Overview: headline tiles, requests over time, and the status breakdown](/img/screenshots/analytics-overview.png)

- **HTTP Traffic** — a world **map of requests by country** (from GeoIP), plus
  breakdowns by country, method, status code and path.

  ![Analytics HTTP Traffic: the requests-by-country map with method, status and path breakdowns](/img/screenshots/analytics-http-traffic.png)

- **Performance** — request vs. upstream latency percentiles (p50/p95/p99),
  gateway overhead (total − upstream), p95 over time, and the slowest routes.
- **Web Analytics** — cookieless visitors, page views, and audience breakdowns:
  browsers, operating systems, devices, referrers, countries, and a
  human-vs-bot split.

:::tip 4xx and 5xx are not the same
Client errors (4xx — 404s, failed auth, bots) are usually noise; server errors
(5xx) are the real health signal. Analytics keeps them separate everywhere, and
the Overview error tile leads with the 5xx rate so a flood of 404s never reads
as an outage.
:::

## Enabling it

Analytics is on by default, but it needs the gateway to emit events and both
sides to share the **same Redis database**.

1. **Goma Gateway** — enable the event stream (and, for the country map, mount a
   GeoIP database):

   ```bash
   GOMA_ANALYTICS_ENABLED=true
   GOMA_ANALYTICS_STREAM=goma:analytics
   GOMA_REDIS_DB=0            # must equal Miabi's MIABI_REDIS_DB
   GOMA_GEOIP_DB=/etc/goma/GeoLite2-Country.mmdb   # optional; see "GeoIP database" below
   ```

2. **Miabi** — the consumer reads that stream (defaults shown):

   ```bash
   MIABI_ANALYTICS_ENABLED=true
   MIABI_ANALYTICS_STREAM=goma:analytics
   MIABI_ANALYTICS_FLUSH_SECONDS=15
   MIABI_ANALYTICS_RETENTION_DAYS=90
   MIABI_REDIS_DB=0          # must equal Goma's GOMA_REDIS_DB
   ```

Data appears a couple of minutes after traffic starts (closed minute buckets
flush on a short grace window).

## GeoIP database

The country map and the [geo-block middleware](/docs/networking/routing-and-middlewares)
need a GeoIP database on the gateway. **Miabi ships and downloads none** — see
[why](#why-miabi-does-not-ship-one) — so this is a one-time manual step:

1. Download a country-level database in MaxMind-DB (`.mmdb`) format — the options are
   below.
2. Save it as **`/etc/miabi/country.mmdb`** (beside `goma.yml`; if you moved the config
   with `MIABI_ETC`, put it there instead). The name `GeoLite2-Country.mmdb` is also
   recognized.
3. Restart the gateway: `miabi restart miabi-gateway`.

Countries start appearing on the next traffic. To turn geo off again without deleting
the file, set `MIABI_GEOIP=off`.

### Where to get one

| Database | License | Cost |
|---|---|---|
| [DB-IP IP-to-Country Lite](https://db-ip.com/db/lite.php) | CC BY 4.0 — **you must credit DB-IP** wherever the data is shown | Free, monthly |
| [IP2Location LITE DB1](https://lite.ip2location.com/) | CC BY-SA 4.0 — attribution + share-alike | Free, monthly, registration |
| [MaxMind GeoLite2 Country](https://dev.maxmind.com/geoip/geolite2-free-geolocation-data) | MaxMind GeoLite EULA — no redistribution | Free, needs a MaxMind account + license key |
| MaxMind GeoIP2 / DB-IP commercial | Commercial terms, no attribution clause | Paid |

Any of them works — Goma reads the MMDB format, not a specific vendor. The free ones
are accurate enough for country-level traffic analytics.

:::note Attribution
The free DB-IP and IP2Location databases require you to credit the source on pages that
display their data. If you pick one of those and expose the analytics UI to anyone
beyond your own team, add that credit. It is your obligation, not Miabi's — which is
part of why Miabi does not choose for you.
:::

### Why Miabi does not ship one

MaxMind's [GeoLite EULA](https://www.maxmind.com/en/geolite/eula) forbids disclosing
their databases to third parties without written consent, so Miabi cannot bundle or
mirror GeoLite2 — and the community GitHub mirrors that do are neither licensed to nor
stable (they prune old releases, so pinned URLs break within the month).

The permissive alternatives *are* redistributable, but they oblige whoever displays the
data to credit the source. Auto-downloading one would silently make that promise on your
behalf, for your deployment, without you knowing it had been made. Handing you the choice
is the honest version — and it costs one download.

## Retention & export (Community vs Enterprise)

The full dashboards — every tab, the world map, all breakdowns — are
**Community**. Enterprise adds *scale and export*, not visibility:

| | Community | Enterprise |
|---|---|---|
| All dashboards + world map | ✅ | ✅ |
| Retention | up to **7 days** | configurable (30/90d+) |
| CSV export + read API | — | ✅ (`analytics_export`) |

In Community the range picker locks windows past the retention cap; the
**Export** button is enabled with an Enterprise license.

## Troubleshooting

**The dashboard is empty even though there's traffic.** In almost every case the
gateway and Miabi are on **different Redis databases**, so the events never reach
the consumer. Confirm `GOMA_REDIS_DB` equals `MIABI_REDIS_DB`, then check the
stream is filling:

```bash
redis-cli -n <db> XLEN goma:analytics          # should grow with traffic
redis-cli -n <db> XINFO GROUPS goma:analytics   # a "miabi-analytics" group, lag ~0
```

Also make sure real traffic reached a **routed app** (the gateway only emits on
proxied requests — hitting the dashboard itself doesn't count), and that the
event's route name looks like `mb-ws<id>-<slug>` (that prefix is how a request is
attributed to a workspace).

**No country data / empty map.** The gateway has no GeoIP database — Miabi never
installs one. See [GeoIP database](#geoip-database); analytics keeps working
without it, just without countries. If you did place the file, check the install
log for `GeoIP: using …` (it is picked up when the gateway is created, not while
it runs) and confirm the name is `country.mmdb`.

## What it is not

Workspace Analytics is request/traffic analytics, distinct from
[Monitoring](/docs/operations/monitoring) (container CPU/memory/health) and the
[Audit Log](/docs/operations/audit-log) (a compliance record of user actions).
