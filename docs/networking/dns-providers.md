---
sidebar_position: 2
title: DNS Providers
description: Connect a DNS provider to automate ownership checks, records, and wildcard certs.
---

# DNS Providers

Connecting a **DNS provider** lets Miabi manage DNS on your behalf. Without one you
can still add domains and verify them manually, but a connected provider unlocks
the fully automated path — from ownership checks to wildcard certificates.

![DNS providers](/img/screenshots/dns-providers.png)

## Connecting a provider

From **Networking → DNS Providers**, choose **Connect provider**, pick your DNS
host, and supply the API credentials it needs (typically an API token or key/secret
pair). Credentials are **encrypted at rest** — see
[Encryption](/docs/security/encryption) — and scoped to your workspace.

Once connected, the provider can be selected when adding
[domains](/docs/networking/domains) and is used automatically for certificate
challenges.

## What it unlocks

A connected DNS provider enables three things:

- **Ownership checks** — Miabi publishes and reads back verification records itself,
  so verifying a [domain](/docs/networking/domains) is a single click instead of a
  manual copy-paste.
- **Automatic A/AAAA records** — when you attach a domain to an app, Miabi can create
  and maintain the `A`/`AAAA` records that point the hostname at the right node,
  keeping them in sync if the node's address changes.
- **DNS-01 challenges** — required for issuing **wildcard** (`*.example.com`) and
  other [managed certificates](/docs/networking/tls-certificates) via DNS-01. Only a
  connected provider can solve these challenges.

:::tip
Wildcard certificates **require** a DNS provider. HTTP-01 (the default in Goma) works
without one but can't issue wildcards.
:::

## Managing credentials

You can rotate or remove a provider's credentials at any time from the same view.
Removing a provider does not delete existing domains, but any feature that depends on
it — automatic records, DNS-01 renewals — stops until you reconnect.

:::caution
If you remove a provider that's renewing wildcard certificates, those certs will not
auto-renew. Reconnect a provider before they expire, or switch the affected domains to
HTTP-01 or an uploaded certificate.
:::

:::note
Managing DNS providers is restricted to Owners and Admins, since the credentials grant
control over your DNS zone.
:::
