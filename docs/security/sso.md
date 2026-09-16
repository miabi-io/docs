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
7. Make sure **Enabled** is checked, then save. There is no connection test, so try signing in.

The client secret is treated as a secret and is [encrypted at rest](/docs/security/encryption).

## Signing in with SSO

Once a provider is configured, users see a **Sign in with…** button on the login screen. Authenticating with the provider creates or links a Miabi account, and the user lands in their workspace.

:::note
SSO governs how users sign in. Their permissions inside a workspace are still determined by their [role](/docs/workspaces/roles-and-permissions).
:::

## Community vs Enterprise

| Capability | Community | Enterprise |
|------------|:---------:|:----------:|
| OAuth2 / OIDC providers | **One** provider | **Multiple** providers |
| Hidden providers | — | ✅ |
| LDAP / Active Directory | — | ✅ |
| SAML 2.0 | — | ✅ (API only) |
| Enforced SSO (disable password login) | — | ✅ |
| SCIM 2.0 user provisioning | — | ✅ (API only) |

The **Community** edition supports a single configured SSO provider. The **Enterprise** edition adds multiple simultaneous providers, **hidden** providers, **LDAP / Active Directory**, **SAML 2.0**, **enforced SSO**, and **SCIM 2.0** for automated user provisioning and deprovisioning. See [Community vs Enterprise](/docs/editions/community-vs-enterprise) for the full comparison.

- **Hidden providers.** Check **Hidden** on a provider to keep its button off the login page. Users reach it through **Continue with SSO**, which asks for their email address to find their sign-in provider.
- **SAML and SCIM** have no console page yet. Manage SAML connections with `/api/v1/admin/sso/saml`, SCIM tokens with `/api/v1/admin/scim/tokens`, and the enforced-SSO policy with `PUT /api/v1/admin/organization` — see the API reference at `/docs` on your instance.

## LDAP / Active Directory

On Enterprise (`sso_ldap`), Miabi can authenticate users against an LDAP or Active Directory server. Configure a directory under **Admin → Identity → LDAP / AD**: host, port, TLS mode, bind DN and password, user base DN and filter, attribute names, and optional group lookup. Use the **Test connection** button on a saved connection to check it.

Directory users sign in on the normal login form: when a password doesn't match a local account, Miabi tries the directory. A successful bind creates the Miabi account on first sign-in (or links an existing one by email). **Group mappings** then grant platform-admin rights, or a workspace role, to members of a directory group. Without mappings, directory users get an account but no admin or workspace access.

:::tip
Pair SSO with [Two-Factor Authentication](/docs/security/two-factor-auth) at your identity provider for layered protection.
:::
