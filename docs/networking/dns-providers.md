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

Once connected, link the provider to a [domain](/docs/networking/domains) from the **DNS**
column of the domain list or the domain's detail page; it is also used automatically for
certificate challenges.

## What it unlocks

A connected DNS provider enables three things:

- **Ownership checks** — Miabi publishes the verification record for you, so verifying
  a [domain](/docs/networking/domains) is a single click instead of a manual
  copy-paste. The check itself reads live DNS — the domain's **authoritative
  nameservers** first, then the system resolver — never the provider's API: a record
  that exists only in a pending zone proves nothing.
- **Automatic address records** — when a route serves a host under a verified, connected
  domain, Miabi creates the `A`/`AAAA` (or `CNAME`) record pointing it at the public
  address of the gateway that serves the route, re-syncs it when the route changes, and
  removes it when the route goes away. A reconcile job restores managed records deleted
  out of band.
- **DNS-01 challenges** — required for issuing **wildcard** (`*.example.com`) and
  other [managed certificates](/docs/networking/tls-certificates) via DNS-01. Only a
  connected provider can solve these challenges.

:::tip
Wildcard certificates **require** a DNS provider. HTTP-01 (the default in Goma) works
without one but can't issue wildcards.
:::

## Supported providers

Fields marked `*` are optional. The console renders this form from the same catalog, so
what you see there always matches this table.

| Type | Host | Credential fields | Where to create them |
|---|---|---|---|
| `cloudflare` | Cloudflare | `api_token` | [Console](https://dash.cloudflare.com/profile/api-tokens) |
| `digitalocean` | DigitalOcean | `api_token` | [Console](https://cloud.digitalocean.com/account/api/tokens) |
| `route53` | AWS Route 53 | `access_key_id`, `secret_access_key`, `region` * | [Console](https://console.aws.amazon.com/iam/home#/security_credentials) |
| `hetzner` | Hetzner DNS | `api_token` | [Console](https://dns.hetzner.com/settings/api-token) |
| `googleclouddns` | Google Cloud DNS | `project`, `service_account_json` | [Console](https://console.cloud.google.com/iam-admin/serviceaccounts) |
| `azure` | Azure DNS | `subscription_id`, `resource_group`, `tenant_id`, `client_id`, `client_secret` | [Console](https://portal.azure.com/) |
| `linode` | Linode / Akamai | `api_token` | [Console](https://cloud.linode.com/profile/tokens) |
| `godaddy` | GoDaddy | `api_token` | [Console](https://developer.godaddy.com/keys) |
| `namecheap` | Namecheap | `api_key`, `username`, `client_ip` *, `api_endpoint` * | [Console](https://ap.www.namecheap.com/settings/tools/apiaccess/) |
| `ovh` | OVHcloud | `endpoint`, `application_key`, `application_secret`, `consumer_key` | [Console](https://api.ovh.com/createToken/) |
| `gandi` | Gandi | `api_token` | [Console](https://admin.gandi.net/organizations/account/pat) |
| `powerdns` | PowerDNS | `server_url`, `server_id` *, `api_token` | [Console](https://doc.powerdns.com/authoritative/http-api/index.html) |
| `acmedns` | acme-dns **(DNS-01 only)** | `server_url`, `username`, `password`, `subdomain` | [Console](https://github.com/joohoi/acme-dns) |
| `scaleway` | Scaleway | `secret_key`, `organization_id` | [Console](https://console.scaleway.com/iam/api-keys) |
| `netcup` | netcup | `customer_number`, `api_key`, `api_password` | [Console](https://www.netcup-wiki.de/wiki/CCP_API) |
| `infomaniak` | Infomaniak | `api_token` | [Console](https://manager.infomaniak.com/v3/infomaniak-api) |
| `transip` | TransIP | `account_name`, `private_key` | [Console](https://www.transip.nl/cp/account/api/) |
| `glesys` | GleSYS | `project`, `api_key` | [Console](https://glesys.com/) |
| `cloudns` | ClouDNS | `auth_id` *, `sub_auth_id` *, `auth_password` | [Console](https://www.cloudns.net/api-settings/) |
| `tencentcloud` | Tencent Cloud DNSPod | `secret_id`, `secret_key`, `region` * | [Console](https://console.cloud.tencent.com/cam/capi) |
| `huaweicloud` | Huawei Cloud DNS | `access_key_id`, `secret_access_key`, `region_id` * | [Console](https://console.huaweicloud.com/iam/) |
| `bunny` | Bunny.net | `access_key` | [Console](https://dash.bunny.net/account/settings) |
| `luadns` | LuaDNS | `email`, `api_key` | [Console](https://api.luadns.com/settings) |
| `namesilo` | NameSilo | `api_token` | [Console](https://www.namesilo.com/account/api-manager) |

Miabi discovers which zone hosts your domain automatically. Most providers expose a
zone-listing API; for the rest, Miabi probes the domain and its parents. Either way a
subdomain resolves to the zone that actually manages it.

### Self-hosted DNS

Two entries are worth calling out for homelabs and small hosting providers, where the
DNS server is yours rather than a vendor's:

- **`powerdns`** — PowerDNS through its authoritative HTTP API. Needs `api-key` set in
  `pdns.conf` and the webserver enabled.
- **`acmedns`** — [acme-dns](https://github.com/joohoi/acme-dns) delegation. This one is
  **DNS-01 only**: it answers for the single subdomain issued at registration and nothing
  else, so it can obtain certificates but cannot host your ownership `TXT` or an app's
  A/AAAA records. Miabi refuses to link it to a domain for record automation and says so.

## Managing credentials

**Rotate** on a provider replaces its stored credentials without disconnecting, so every
domain stays linked. Supply a test zone and the new credential is verified before it
displaces the working one — a bad token fails the rotation instead of breaking automation.

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
