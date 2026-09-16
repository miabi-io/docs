---
sidebar_position: 3
title: TLS Certificates
description: Automatic HTTP-01, managed wildcard DNS-01, and uploaded custom certificates.
---

# TLS Certificates

Miabi serves traffic over HTTPS by default. There are **three certificate paths**, and most
of the time you don't have to think about any of them — verified
[domains](/docs/networking/domains) get a certificate automatically.

![TLS certificates](/img/screenshots/tls-certificates.png)

## The three paths

### 1. Default HTTP-01 (handled inside Goma)

By default, [Goma Gateway](/docs/networking/routing-and-middlewares) terminates TLS
and obtains certificates from **Let's Encrypt using the HTTP-01 challenge**. This runs
**globally inside Goma** — when a route serves a host under a verified domain, Goma requests,
installs, and renews the certificate with no extra configuration. This is the right
choice for ordinary single-hostname domains.

A route can also be set to TLS **None** (`tls: off` in a manifest), in which case it answers plain
HTTP only.

#### Choosing the issuer

The gateway's `certManager` can define more than one named provider — a public ACME issuer
and an internal CA, say — with one of them as the default. Routes use the default unless
told otherwise:

- **Per route** — a [declarative Route](/docs/cicd/manifest-reference) sets `tlsProvider` to
  pick the provider for its automatic certificate.
- **Per cluster** — the one-click URLs generated for apps in a cluster use that cluster's
  **certificate provider**, set by a platform admin next to its external domain in the
  cluster's **Edit** dialog (`MIABI_EXTERNAL_BASE_PROVIDER` pins it for the default cluster). See
  [Cluster mode](/docs/nodes/cluster-mode#external-access).

Leaving either empty uses the gateway's default provider.

### 2. Managed wildcard / DNS-01 certificates

For **wildcard** domains (`*.example.com`) — or any case where HTTP-01 isn't suitable —
Miabi issues certificates **itself** using `go-acme/lego` and the **DNS-01 challenge**,
solved through your connected [DNS provider](/docs/networking/dns-providers). These are
stored as workspace **Certificates** and served through Goma's custom-cert path. They are
**auto-renewed** before expiry.

### 3. Uploaded custom certificates

If you already have a certificate (for example, from a corporate CA), upload the
certificate and private key directly. Miabi stores it as a workspace Certificate and
serves it for the matching domain.

## Auto-renewal

- **HTTP-01** certs are renewed by Goma automatically.
- **Managed DNS-01** certs are renewed by Miabi ahead of expiry, as long as the DNS
  provider stays connected.
- **Uploaded** certs are **not** renewed automatically — you must upload a new one
  before it expires. Miabi warns you as the expiry approaches.

## Encryption at rest

Private keys for managed and uploaded certificates are **encrypted at rest** and never
logged or returned in plaintext. See [Encryption](/docs/security/encryption) for details
on how secrets are protected.

:::caution
All TLS termination for routed traffic happens at Goma, so certificates live in one place
rather than being copied into each container. A [published host port](/docs/applications/exposing-your-app)
bypasses the gateway — any TLS on it is the application's own.
:::

:::note
A single domain uses one active certificate at a time. When both a managed wildcard and a
more specific certificate match a hostname, **Goma Gateway 0.15.1 or newer** serves the more
specific one. Older gateways can serve the wildcard instead, so on those avoid overlapping
certificates for the same host.
:::
