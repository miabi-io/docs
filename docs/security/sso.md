---
sidebar_position: 4
title: Single Sign-On (SSO)
description: Sign in with OAuth2/OIDC providers — Google or generic OIDC — and Enterprise LDAP/AD, SAML and SCIM.
---

# Single Sign-On (SSO)

Single sign-on lets users authenticate with an external identity provider instead of a Miabi password. Miabi supports **OAuth 2.0 / OpenID Connect (OIDC)** out of the box, with a built-in **Google** connector plus a **generic OIDC** option for any compliant provider.

![Single sign-on](/img/screenshots/sso.png)

## Supported providers

| Provider | Protocol |
|----------|----------|
| Google | OAuth 2.0 / OIDC (well-known discovery) |
| Generic OIDC | OpenID Connect (any compliant IdP) |

There is no GitHub connector. GitHub is not an OIDC provider, so it is reachable neither as a
built-in option nor through the generic OIDC path.

## Configuring a provider

1. Go to **Admin → Identity → OAuth Providers** and click **Add provider**.
2. Enter a **Display name** and choose the **Type**: **Google** or **Generic OIDC**.
3. Enter the **Client ID** and **Client Secret** from your identity provider.
4. For generic OIDC, supply the **Issuer** (the OIDC discovery base URL, e.g. `https://id.example.com`) so Miabi can read the provider's endpoints. You can override the auth, token and userinfo URLs, the email/name/username claims, and the scopes.
5. Register Miabi's callback URL with your provider. It isn't shown in the form: it is `https://<your-miabi-host>/api/v1/auth/oauth/<name>/callback`, where `<name>` is the provider's **Name**.
6. Optionally restrict **Allowed domains**, and set **Auto-join workspace** so new SSO users join a workspace with a chosen role.
7. Optionally pick an **Organization**. Accounts registered through this provider then belong to that
   [tenant realm](/docs/workspaces/organizations) — see [Which organization SSO users land in](#which-organization-sso-users-land-in).
8. Leave **Auto-register users** checked to create a Miabi account on a person's first sign-in; unchecked, only people who already have an account can sign in.
9. Leave **Accept addresses the provider has not verified** off unless your provider never sends `email_verified` (see below).
10. Make sure **Enabled** is checked, then save. There is no connection test, so try signing in.

The client secret is treated as a secret and is [encrypted at rest](/docs/security/encryption).

### Unverified email addresses

The first time someone signs in through a provider, Miabi links the provider identity to an existing
Miabi account with the same email address, but only when the provider asserts `email_verified: true`
in its userinfo response. Otherwise the sign-in is refused.

**Accept addresses the provider has not verified** removes that check. Turn it on only for a
directory you control that never sends `email_verified`.

:::caution
Never turn it on for a public provider. There, an unverified address is only a claim: anyone who
registers an account at the provider with your address could sign in as you and take over the
matching Miabi account.
:::

## Signing in with SSO

Once a provider is configured, users see a **Sign in with…** button on the login screen. Authenticating with the provider creates or links a Miabi account, and the user lands in their workspace.

:::note
SSO governs how users sign in. Their permissions inside a workspace are still determined by their [role](/docs/workspaces/roles-and-permissions).
:::

## Workspace roles from OIDC groups

:::info Enterprise
Group mapping needs the `sso_group_mapping` license feature.
:::

A generic OIDC provider can manage workspace membership and the platform admin role from the groups
your identity provider puts in its userinfo response. Configure it on the provider itself:
**Admin → Identity → OAuth Providers**, edit a **Generic OIDC** provider, **Group mapping** section.

| Setting | Description |
|---|---|
| **Groups claim** | The userinfo claim that holds the user's groups, usually `groups`. It may be a list or a comma-separated string. Add the scope that releases it to **Scopes**. Blank turns group mapping off |
| **Group prefix** | Turns on structured groups (below). Blank accepts only the explicit mappings |
| **Group mappings** | Explicit rules: a **Group**, and **Platform admin** and/or a **Workspace** with a **Role** (`viewer`, `developer`, `admin` or `owner`). Save the provider first, then add mappings and click **Save mappings** |

With a prefix set, a group named `prefix:workspace:role` grants that role in that workspace. With
prefix `miabi`, the group `miabi:acme:developer` makes the user a developer in workspace `acme`.

Mappings are applied at every sign-in, and on a [back-channel logout](#back-channel-logout) that
carries the groups claim:

- A user in several matching groups gets the highest role.
- A membership the provider granted is removed when the user leaves the group. Members added by hand
  in a workspace that only structured groups touch are left alone.
- A workspace named in an explicit mapping is governed by the provider: membership there follows the
  groups, including for people who were added by hand.
- Once any mapping grants **Platform admin**, that role follows the groups too: users outside the
  group lose it. The last platform admin is never demoted.
- A workspace's last owner is never removed or demoted. When a user has reached their owned-workspace
  limit, an `owner` mapping grants `admin` instead.

Group matching ignores case. Every change is recorded in the audit log.

## Back-channel logout

Miabi accepts [OpenID Connect Back-Channel Logout](https://openid.net/specs/openid-connect-backchannel-1_0.html)
from generic OIDC providers, so ending a session at your identity provider also signs the user out of
Miabi. Register this URL as the client's back-channel logout URI at your provider:

```
https://<your-miabi-host>/api/v1/auth/oauth/<name>/backchannel-logout
```

`<name>` is the provider's **Name**, as in the callback URL. The provider must be enabled and have an
**Issuer** set; the built-in Google type doesn't support it.

When the provider posts a `logout_token`, Miabi:

1. Verifies it: an RS256 or ES256 signature from the keys in the issuer's discovery document, the
   issuer, your client ID as audience, the back-channel logout event, and no `nonce`. A token seen
   before is rejected as a replay.
2. Finds the Miabi account linked to the token's `sub`.
3. Re-applies [group mapping](#workspace-roles-from-oidc-groups) if the token carries the groups
   claim (Enterprise).
4. Ends **all** of that user's Miabi sessions, not just the one started through the provider, and
   records `user.logout.backchannel` in the audit log.

An unknown `sub` is acknowledged without effect. Front-channel logout is not supported.

## Profiles of provisioned accounts

An account **created by a provider** — OAuth/OIDC, SAML, LDAP or SCIM — is recorded with that
provider as its auth source, and its **name and username become read-only**. The Profile page shows
them but offers no Save, and the API refuses the edit, because the provider is the source of truth
for the identity: a local rename would only drift from the directory everyone else reads.

Change the name at the provider instead. Email is already admin-managed for every account, and
workspace roles are unaffected.

Linking is not provisioning: when SSO matches an **account that already exists** by email or handle,
that account keeps the auth source it had. A local account whose owner also signs in through SSO
stays theirs to edit.

:::note
Accounts provisioned before this was recorded are still marked local, since nothing distinguishes
them after the fact. They become read-only only if the provider creates them again.
:::

## Which organization SSO users land in

An account created through a provider belongs to the provider's
[organization](/docs/workspaces/organizations), so a customer's people sign in with the customer's
identity provider and land in the customer's realm. A provider with no organization registers into
the default one.

- **Only registration decides a realm.** Signing in never moves an account that already exists — a
  person who already belongs to one organization stays there, whichever provider they authenticate
  with.
- **A provider's organization is set once**, when it is created, and is read-only afterwards.
  Changing it would only split that provider's users across two realms, since the ones already
  registered do not move.

## Community vs Enterprise

| Capability | Community | Enterprise |
|------------|:---------:|:----------:|
| OAuth2 / OIDC providers | **One** provider | **Multiple** providers |
| Hidden providers | — | ✅ |
| LDAP / Active Directory | — | ✅ |
| Workspace roles from OIDC group claims | — | ✅ |
| SAML 2.0 | — | ✅ (API only) |
| Enforced SSO (disable password login) | — | ✅ |
| SCIM 2.0 user provisioning | — | ✅ (API only) |

The **Community** edition supports a single configured SSO provider. The **Enterprise** edition adds multiple simultaneous providers, **hidden** providers, **group mapping**, **LDAP / Active Directory**, **SAML 2.0**, **enforced SSO**, and **SCIM 2.0** for automated user provisioning and deprovisioning. See [Community vs Enterprise](/docs/editions/community-vs-enterprise) for the full comparison.

- **Hidden providers.** Check **Hidden** on a provider to keep its button off the login page. Users reach it through **Continue with SSO**, which asks for their email address to find their sign-in provider.
- **SAML, SCIM and enforced SSO** have no console page yet; you set them up through the API. See [SAML & SCIM](/docs/security/saml-and-scim).

## LDAP / Active Directory

On Enterprise (`sso_ldap`), Miabi can authenticate users against an LDAP or Active Directory server. Configure a directory under **Admin → Identity → LDAP / AD**: host, port, TLS mode, bind DN and password, user base DN and filter, attribute names, and optional group lookup. Use the **Test connection** button on a saved connection to check it.

Directory users sign in on the normal login form: when a password doesn't match a local account, Miabi tries the directory. A successful bind creates the Miabi account on first sign-in (or links an existing one by email). **Group mappings** then grant platform-admin rights, or a workspace role, to members of a directory group. Without mappings, directory users get an account but no admin or workspace access.

:::tip
Pair SSO with [Two-Factor Authentication](/docs/security/two-factor-auth) at your identity provider for layered protection.
:::
