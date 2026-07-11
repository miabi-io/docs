---
sidebar_position: 4
title: Single Sign-On (SSO)
description: Sign in with OAuth2/OIDC providers — GitHub, Google, generic OIDC — and Enterprise SAML/SCIM.
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

1. Go to **Administration → SSO**.
2. Choose a provider (Google or Generic OIDC).
3. Enter the **client ID** and **client secret** from your identity provider.
4. For generic OIDC, supply the **issuer/discovery URL** so Miabi can read the provider's endpoints.
5. Register Miabi's **callback URL** (shown on the configuration page) with your provider.
6. Save and test the connection.

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
| SAML 2.0 | — | ✅ |
| Enforced SSO (disable password login) | — | ✅ |
| SCIM 2.0 user provisioning | — | ✅ |

The **Community** edition supports a single configured SSO provider. The **Enterprise** edition adds multiple simultaneous providers, **SAML 2.0**, **enforced SSO**, and **SCIM 2.0** for automated user provisioning and deprovisioning. See [Community vs Enterprise](/docs/editions/community-vs-enterprise) for the full comparison.

:::tip
Pair SSO with [Two-Factor Authentication](/docs/security/two-factor-auth) at your identity provider for layered protection.
:::
