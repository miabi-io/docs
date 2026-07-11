---
sidebar_position: 3
title: TLS Certificates
description: Automatic HTTP-01, managed wildcard DNS-01, and uploaded custom certificates.
---

# TLS Certificates

Miabi serves all traffic over HTTPS. There are **three certificate paths**, and most
of the time you don't have to think about any of them — verified
[domains](/docs/networking/domains) get a certificate automatically.

![TLS certificates](/img/screenshots/tls-certificates.png)

## The three paths

### 1. Default HTTP-01 (handled inside Goma)

By default, [Goma Gateway](/docs/networking/routing-and-middlewares) terminates TLS
and obtains certificates from **Let's Encrypt using the HTTP-01 challenge**. This runs
**globally inside Goma** — when a verified domain is attached to an app, Goma requests,
installs, and renews the certificate with no extra configuration. This is the right
choice for ordinary single-hostname domains.

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
Miabi never exposes app or database ports directly to the host. All TLS termination
happens at Goma on the internal network, so certificates live in one place rather than
being copied into each container.
:::

:::note
A single domain uses one active certificate at a time. If both a managed wildcard and a
specific cert could match a hostname, the more specific certificate wins.
:::
