---
sidebar_position: 1
title: Domains
description: Add domains, verify ownership over DNS, and route them to your apps.
---

# Domains

A **domain** connects a public hostname (like `app.example.com`) to one of your
applications. Before a domain goes live, Miabi verifies that you actually control
it — so no one can claim a name they don't own.

![Domains list](/img/screenshots/domains.png)

## Adding a domain

From the **Networking → Domains** view, choose **Add domain** and enter the
hostname you want to use. The domain is created in a **pending** state and belongs
to your current workspace. You can add apex domains (`example.com`), subdomains
(`app.example.com`), or wildcards (`*.example.com`) when a
[DNS provider](/docs/networking/dns-providers) is connected.

## Verifying ownership

Miabi requires **DNS-verified ownership** before a domain can serve traffic. When
you add a domain, Miabi shows the record you must publish — typically a `TXT`
record with a unique token, or the A/AAAA record pointing at your node.

![Domain verification](/img/screenshots/domain-verify.png)

You have two paths:

- **Manual** — copy the record into your DNS host, then click **Verify**. Miabi
  re-checks the public DNS and flips the domain to **verified**.
- **Automatic** — if you've connected a
  [DNS provider](/docs/networking/dns-providers), Miabi can publish and check the
  records for you, including the A/AAAA records that point the domain at the node.

:::tip
DNS changes can take a few minutes to propagate. If verification fails on the first
try, wait and retry — Miabi also re-checks pending domains periodically.
:::

## Attaching a domain to an app

Once verified, open the domain and **attach** it to an
[application](/docs/applications/overview). Traffic for that hostname is then routed
through [Goma Gateway](/docs/networking/routing-and-middlewares) to the app's
container. Miabi never exposes app ports directly on the host — everything flows
through Goma on the internal network.

Attaching a verified domain also triggers **automatic TLS**: Goma requests an
HTTP-01 certificate from Let's Encrypt, or serves a managed wildcard / uploaded
certificate if one applies. See [TLS certificates](/docs/networking/tls-certificates).

## Domain status

| Status | Meaning |
|--------|---------|
| **Pending** | Added but ownership not yet confirmed. |
| **Verified** | DNS ownership confirmed; ready to attach. |
| **Active** | Attached to an app and serving traffic. |
| **Error** | Verification or certificate issuance failed — check the record and DNS provider. |

:::note
Only Owners, Admins, and Developers can add or attach domains. Viewers have
read-only access.
:::
