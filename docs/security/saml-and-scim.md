---
sidebar_position: 4.5
title: SAML & SCIM
description: Set up SAML 2.0 sign-in, SCIM 2.0 user provisioning and enforced SSO on Miabi Enterprise.
---

# SAML & SCIM

:::info Enterprise
SAML 2.0 and enforced SSO need the `sso_saml` license feature; SCIM 2.0 needs `scim`. Without them
the endpoints below refuse the request.
:::

Miabi can act as a **SAML 2.0 service provider** for identity providers such as Okta, Entra ID or
Keycloak, accept **SCIM 2.0** provisioning from them, and **enforce SSO** by turning off password
sign-in.

None of these has a console page yet. You set them up through the admin API with a platform admin's
[API key](/docs/security/api-tokens) that has the **Admin** scope. The full request and response
schemas are in the API reference at `/docs` on your instance. For OAuth 2.0 / OIDC providers, LDAP and
group mapping, see [Single Sign-On](/docs/security/sso).

## SAML 2.0

### 1. Create the connection

Create a connection from your identity provider's metadata, either a URL Miabi fetches or the XML
itself:

```bash
curl -X POST -H "Authorization: Bearer <ADMIN_KEY>" -H "Content-Type: application/json" \
  https://miabi.example.com/api/v1/admin/sso/saml \
  -d '{
    "display_name": "Okta",
    "name": "okta",
    "idp_metadata_url": "https://acme.okta.com/app/xyz/sso/saml/metadata"
  }'
```

| Field | Description |
|---|---|
| `display_name` | Required. A label for the connection |
| `name` | The handle used in the connection's URLs. Derived from `display_name` when omitted |
| `idp_metadata_url` / `idp_metadata_xml` | The IdP metadata. One of the two is required; the XML wins when both are set |
| `sp_entity_id` | Miabi's entity ID as the IdP knows it. Defaults to the metadata URL below |
| `attr_email` | The assertion attribute holding the email address. Defaults to `email` |
| `attr_name` | The attribute holding the display name. Defaults to `displayName` |
| `enabled` | Defaults to `true` |

List, update and delete connections with `GET /api/v1/admin/sso/saml` and
`PUT` / `DELETE /api/v1/admin/sso/saml/{id}`. An update replaces the metadata, entity ID and attribute
fields, so send them all.

### 2. Register Miabi at the identity provider

Each connection publishes service-provider metadata. Import it at your IdP, or copy the values from it:

| | URL |
|---|---|
| SP metadata | `https://<your-miabi-host>/api/v1/auth/saml/<name>/metadata` |
| Assertion consumer service (ACS), HTTP-POST | `https://<your-miabi-host>/api/v1/auth/saml/<name>/acs` |
| Entity ID | `sp_entity_id`, or the metadata URL when unset |

:::caution Check the URLs in the metadata
Miabi builds the ACS URL and the default entity ID from `MIABI_API_URL` followed by
`/auth/saml/<name>/…`. They come out right only when `MIABI_API_URL` is the full API base,
ending in `/api/v1` (for example `https://miabi.example.com/api/v1`). Open the metadata URL and check
the `AssertionConsumerService` location before you register it.
:::

The SP signing certificate in the metadata is generated when Miabi starts and changes on every
restart. Don't configure the IdP to encrypt assertions to it or to pin it.

### 3. Map the attributes

Release the user's email address in the assertion. Miabi reads it from the `attr_email` attribute,
then `email`, then `emailAddress`, and finally from the NameID if that is an email address. The
display name comes from `attr_name`, then `displayName`, then `name`. Attributes match by name or
friendly name. An assertion without an email address is refused.

### 4. Sign in

There is no SAML button on the login page. Users start at
`https://<your-miabi-host>/api/v1/auth/saml/<name>/login`, which redirects them to the IdP, or launch
Miabi from the IdP's app dashboard (IdP-initiated sign-in is accepted). Either way, assertion
signatures are fully validated.

After a successful assertion, Miabi signs in the account with that email address, creating it on
first sign-in. A new account is recorded with SAML as its
[auth source](/docs/security/sso#profiles-of-provisioned-accounts), has a verified email, and belongs
to the default [organization](/docs/workspaces/organizations). It gets no workspace role: invite the
user, or provision access another way.

:::caution
A SAML connection is trusted to assert email addresses: an assertion for an address that already has
a Miabi account signs in as that account. Only connect identity providers you control.
:::

## SCIM 2.0 provisioning

SCIM lets your identity provider create, update and deactivate Miabi accounts as people join, change
and leave.

### 1. Create a token

```bash
curl -X POST -H "Authorization: Bearer <ADMIN_KEY>" -H "Content-Type: application/json" \
  https://miabi.example.com/api/v1/admin/scim/tokens \
  -d '{"name": "okta-provisioning"}'
```

The response contains the token, which starts with `scim_`. It is shown **once**; Miabi stores only a
hash. List tokens (with their last use) with `GET /api/v1/admin/scim/tokens`, and revoke one with
`DELETE /api/v1/admin/scim/tokens/{id}`.

### 2. Configure the identity provider

| Setting | Value |
|---|---|
| SCIM base URL | `https://<your-miabi-host>/scim/v2` (at the root, not under `/api/v1`) |
| Authentication | HTTP header / bearer token: the `scim_…` token |
| Unique identifier | `userName`, set to the user's email address |

### What Miabi does with each request

| Request | Effect |
|---|---|
| `GET /Users?filter=userName eq "…"` | Looks the user up by email. Without a filter, lists up to 200 users. No other filters are supported |
| `POST /Users` | Creates the account from `userName` (or the first `emails` value) and `name.formatted` / `displayName`. If the email already has an account, returns it instead |
| `PUT /Users/{id}` | Updates the name and `active` |
| `PATCH /Users/{id}` | Applies `replace` / `add` operations on `active` and `name.formatted` |
| `DELETE /Users/{id}` | Deactivates the account. It is not deleted |
| `GET /Groups` | Always returns an empty list: groups are not provisioned |

Setting `active` to `false` disables the account, so it can no longer sign in. A provisioned account
has SCIM as its [auth source](/docs/security/sso#profiles-of-provisioned-accounts), a verified email,
a random password nobody knows, and no workspace membership until someone grants one. Service accounts are never listed or changed through
SCIM.

## Enforced SSO

Enforced SSO turns off password sign-in, so people must use single sign-on:

```bash
curl -X PUT -H "Authorization: Bearer <ADMIN_KEY>" -H "Content-Type: application/json" \
  https://miabi.example.com/api/v1/admin/organization \
  -d '{"enforce_sso": true}'
```

While it is on:

- Password and [passkey](/docs/security/passkeys) sign-in are refused for every non-admin user, with
  *password login is disabled for this organization; use single sign-on*.
- Invited people can't create a password account from an invitation.
- [LDAP / Active Directory](/docs/security/sso#ldap--active-directory) sign-in still works, since it is
  itself a directory sign-in.
- **Platform admins are exempt**, so a misconfigured IdP can never lock everyone out of the instance.

The setting is stored on the default organization and applies to every non-admin account. Send
`{"enforce_sso": false}` to turn it off; turning it off doesn't need a license.

## Related

- [Single Sign-On](/docs/security/sso): OAuth 2.0 / OIDC providers, group mapping, back-channel
  logout and LDAP.
- [Community vs Enterprise](/docs/editions/community-vs-enterprise)
